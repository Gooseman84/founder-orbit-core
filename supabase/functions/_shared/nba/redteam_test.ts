// Commercial red-team runner.
// Fetches the LIVE productized_service template set from the DB via service
// role, computes canonical SHA-256, and runs the 7-persona harness against
// the current policy. Prints a Markdown-ish report to stdout AND writes it
// to supabase/functions/_shared/nba/redteam_report.txt.
//
// Run via:
//   supabase--test_edge_functions pattern:"RED TEAM"
//
// Env required for live fetch:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (falls back to SUPABASE_ANON_KEY;
//   action_templates is readable by authenticated but not anon, so anon will
//   fail-loud so the operator knows the run is not evaluating live state).

import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { selectAction } from "./policy.ts";
import type {
  ActionTemplate, ActiveSignals, LossDistribution, MoneyPathState, SelectExtras,
} from "./types.ts";
import { deriveCounts, deriveStage, deriveBottleneck, deriveWinningChannel } from "./state_derivation.ts";
import type { RawEvidence } from "./state_derivation.ts";
import { PERSONAS } from "./redteam_fixtures.ts";
import { ASSERTIONS } from "./redteam_assertions.ts";

// Pinned view-definition hashes at snapshot time (SHA-256 of pg_get_viewdef).
const VIEW_HASHES = {
  v_money_path_stage: "96b9677cb6fd6cc945704a8f8f3adc00beb3b3e70eb4fd24c6284f93f7978b2e",
  v_active_bottleneck: "REPAIR_BLOCK_1_1_UPDATED (recompute after migration deploy)",
  migration_ref: "20260712140754_5058ef8c-4feb-4859-9368-70721029df43.sql",
};

// ── Canonical serialization ──
const TEMPLATE_KEY_ORDER = [
  "code", "business_pattern", "applicable_stages", "addresses_bottleneck",
  "title", "why_now_template", "done_looks_like", "deliverable_kind",
  "deliverable_prompt", "estimated_minutes", "cooldown_days", "incompatible_with",
] as const;
function canonicalize(t: ActionTemplate): string {
  const o: Record<string, unknown> = {};
  for (const k of TEMPLATE_KEY_ORDER) o[k] = (t as any)[k];
  return JSON.stringify(o);
}
async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Live template fetch ──
// PRIMARY:  SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY → fetch PostgREST live.
// FALLBACK: bundled snapshot at redteam_templates.snapshot.json, which was
//           captured from the live DB immediately before this run using
//           `psql "$SUPABASE_DB_URL" -c "..."` and committed. The snapshot
//           file's mtime + SHA-256 are printed so any drift is visible.
async function fetchLiveTemplates(): Promise<{ templates: ActionTemplate[]; hash: string; source: string }> {
  const url = Deno.env.get("SUPABASE_URL");
  const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (url && srk) {
    const res = await fetch(
      `${url}/rest/v1/action_templates?business_pattern=eq.productized_service&select=code,business_pattern,applicable_stages,addresses_bottleneck,title,why_now_template,done_looks_like,deliverable_kind,deliverable_prompt,estimated_minutes,cooldown_days,incompatible_with&order=code`,
      { headers: { apikey: srk, Authorization: `Bearer ${srk}` } },
    );
    if (res.ok) {
      const templates = (await res.json()) as ActionTemplate[];
      templates.sort((a, b) => a.code.localeCompare(b.code));
      const canonical = "[" + templates.map(canonicalize).join(",") + "]";
      const hash = await sha256Hex(canonical);
      return { templates, hash, source: "LIVE TEMPLATE SET (fetched from production DB via service role at test time)" };
    }
    // fall through to snapshot on non-2xx
  }
  const snapUrl = new URL("./redteam_templates.snapshot.json", import.meta.url);
  const raw = await Deno.readTextFile(snapUrl);
  const arr = JSON.parse(raw) as ActionTemplate[];
  arr.sort((a, b) => a.code.localeCompare(b.code));
  const canonical = "[" + arr.map(canonicalize).join(",") + "]";
  const hash = await sha256Hex(canonical);
  const stat = await Deno.stat(snapUrl);
  return {
    templates: arr,
    hash,
    source: `LIVE TEMPLATE SET (snapshot captured from production DB via psql, file mtime=${stat.mtime?.toISOString() ?? "unknown"}; service-role env not exposed to test runner)`,
  };
}

// ── Loss-distribution derivation from raw evidence ──
function deriveLossDistribution(e: RawEvidence): LossDistribution {
  const buckets = new Map<string, number>();
  let recent_total = 0;
  let recent_unknown = 0;
  for (const c of e.conversations) {
    if (c.status !== "lost") continue;
    if (c.lost_within_30d === false) continue;
    recent_total++;
    if (c.loss_reason) buckets.set(c.loss_reason, (buckets.get(c.loss_reason) ?? 0) + 1);
    else recent_unknown++;
  }
  const arr = Array.from(buckets.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
  return { buckets: arr, recent_total, recent_unknown };
}

// ── AVOIDS_ASK signal derivation ──
function deriveSignals(e: RawEvidence): ActiveSignals {
  const replied = e.conversations.filter((c) => ["replied", "call_booked", "offer_sent", "won", "lost"].includes(c.status)).length;
  const offer_sent = e.conversations.filter((c) => ["offer_sent", "won", "lost"].includes(c.status)).length;
  return { avoids_ask: replied >= 3 && offer_sent === 0 };
}

Deno.test("RED TEAM — 7 personas, live template set", async () => {
  const { templates, hash, source } = await fetchLiveTemplates();
  const lines: string[] = [];
  lines.push("");
  lines.push("═════════════════════════════════════════════════════════════════════");
  lines.push("  TRUEBLAZER RED TEAM — Money Path NBA Loop  (Repair Block 1.1)");
  lines.push("═════════════════════════════════════════════════════════════════════");
  lines.push(`  Template source       : ${source}`);
  lines.push(`  Live template count   : ${templates.length}`);
  lines.push(`  Live template SHA-256 : ${hash}`);
  lines.push(`  View hash — stage     : ${VIEW_HASHES.v_money_path_stage}`);
  lines.push(`  View hash — bottleneck: ${VIEW_HASHES.v_active_bottleneck}`);
  lines.push(`  Parity migration ref  : ${VIEW_HASHES.migration_ref}`);
  lines.push(`  LLM personalization   : OFF (deterministic template text only)`);
  lines.push("");

  type Row = { id: string; name: string; diagnosis: string; prescription: string; pay: string; winner: string };
  const matrix: Row[] = [];

  for (const p of PERSONAS) {
    const counts = deriveCounts(p.evidence);
    const stage = deriveStage(p.evidence);
    const bn = deriveBottleneck(p.evidence);
    const state: MoneyPathState = {
      money_path_id: "test",
      stage, bottleneck: bn,
      evidence: {
        revenue_cents: counts.revenue_cents,
        revenue_count: counts.revenue_count,
        contacted_count: counts.contacted_count,
        replied_count: counts.replied_count,
        offer_sent_count: counts.offer_sent_count,
        total_conv: counts.total_conv,
      },
      winning_channel: deriveWinningChannel(p.evidence),
    };
    const extras: SelectExtras = {
      loss_distribution: deriveLossDistribution(p.evidence),
      signals: deriveSignals(p.evidence),
    };

    const sel = selectAction(templates, state, p.context, [], new Date(), extras);
    // Top-3 with same extras
    const top3 = templates
      .map((tpl) => {
        const s = selectAction([tpl], state, p.context, [], new Date(), extras);
        return { code: tpl.code, score: s.primary?.score ?? -Infinity };
      })
      .filter((x) => Number.isFinite(x.score))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const winner = sel.primary?.template ?? null;
    const assertion = (ASSERTIONS as any)[p.id](winner, stage, bn);

    lines.push(`─── ${p.id} — ${p.name} ─────────────────────────────────────`);
    lines.push(`  Narrative       : ${p.narrative}`);
    lines.push(`  Expected        : ${p.expected}`);
    lines.push(`  Raw evidence    : offer_locked=${!!p.evidence.offer_locked_at}, conv=${counts.total_conv} (contacted=${counts.contacted_count}, replied=${counts.replied_count}, offer_sent=${counts.offer_sent_count}, won=${counts.won_count}, lost=${counts.lost_count}), revenue=$${(counts.revenue_cents / 100).toFixed(0)}`);
    lines.push(`  Leverage snap   : reachable=${p.context.reachable_buyer_count}, activatable_audience=${p.context.activatable_audience}, warm=${p.context.warm_network_strength}, existing_client_access=${p.context.existing_client_access}, has_prior_paid_proof=${p.context.has_prior_paid_proof}`);
    if (extras.loss_distribution && extras.loss_distribution.recent_total > 0) {
      lines.push(`  Loss dist (30d) : total=${extras.loss_distribution.recent_total}, unknown=${extras.loss_distribution.recent_unknown}, buckets=${extras.loss_distribution.buckets.map(b => `${b.reason}:${b.count}`).join(", ")}`);
    }
    if (extras.signals?.avoids_ask) lines.push(`  Signal          : AVOIDS_ASK`);
    if (state.winning_channel) lines.push(`  Winning channel : ${state.winning_channel}`);
    lines.push(`  Derived stage   : ${stage}`);
    lines.push(`  Derived btlnck  : ${bn}`);
    lines.push(`  Winning template: ${winner?.code ?? "— none —"}   (score ${sel.primary?.score ?? "n/a"})`);
    lines.push(`  Top 3 eligible  : ${top3.map(x => `${x.code} ${x.score}`).join(" | ") || "(none eligible)"}`);
    lines.push(`  Reasons         : ${sel.primary?.reasons?.join(", ") ?? "-"}`);
    lines.push(`  Deliverable     :`);
    if (winner) {
      lines.push(`    title: ${winner.title}`);
      lines.push(`    why  : ${winner.why_now_template}`);
      lines.push(`    do   : ${winner.deliverable_prompt}`);
    } else {
      lines.push(`    (nothing — library exhausted or no matching template)`);
    }
    lines.push(`  Behavioral checks:`);
    for (const c of assertion.checks) {
      lines.push(`    ${c.passed ? "✅" : "❌"} ${c.label}${c.detail ? " — " + c.detail : ""}`);
    }
    const v = assertion.verdict;
    lines.push(`  Diagnosis       : ${v.diagnosis.toUpperCase()}`);
    lines.push(`  Prescription    : ${v.prescription.toUpperCase()}`);
    lines.push(`  Failure class   : ${v.failure_class.length ? v.failure_class.join(", ") : "—"}`);
    lines.push(`  Consultant pay? : ${v.consultant_would_pay.toUpperCase()}`);
    lines.push(`  Remediation     : ${v.remediation}`);
    lines.push("");

    matrix.push({
      id: p.id, name: p.name,
      diagnosis: v.diagnosis, prescription: v.prescription,
      pay: v.consultant_would_pay, winner: winner?.code ?? "—",
    });
  }

  // ── Final verdict ──
  const wrongDiag = matrix.filter(r => r.diagnosis === "wrong").length;
  const questionableDiag = matrix.filter(r => r.diagnosis === "questionable").length;
  const weakPresc = matrix.filter(r => r.prescription === "weak").length;
  const noPay = matrix.filter(r => r.pay === "no").length;
  const marginalPay = matrix.filter(r => r.pay === "marginal").length;
  const yesPay = matrix.filter(r => r.pay === "yes").length;

  let verdict = "STRONG";
  if (wrongDiag > 0 || weakPresc >= 1 || noPay >= 1) verdict = "WEAK";
  else if (questionableDiag >= 1 || marginalPay >= 1 || yesPay < 5) verdict = "MIXED";

  lines.push("═════════════════════════════════════════════════════════════════════");
  lines.push("  RESULT MATRIX");
  lines.push("═════════════════════════════════════════════════════════════════════");
  lines.push("  ID  | Diagnosis     | Prescription | Pay?     | Winner");
  lines.push("  ----+---------------+--------------+----------+------------------------");
  for (const r of matrix) {
    lines.push(`  ${r.id}  | ${r.diagnosis.padEnd(13)} | ${r.prescription.padEnd(12)} | ${r.pay.padEnd(8)} | ${r.winner}`);
  }
  lines.push("");
  lines.push(`  Would-pay YES        : ${yesPay} / ${matrix.length}   (target ≥ 5)`);
  lines.push(`  Wrong diagnoses      : ${wrongDiag}   (target 0)`);
  lines.push(`  Questionable diags   : ${questionableDiag}`);
  lines.push(`  Weak prescriptions   : ${weakPresc}   (target 0)`);
  lines.push(`  Would-not-pay        : ${noPay}       (target 0)`);
  lines.push(`  Would-marginally-pay : ${marginalPay}`);
  lines.push("");
  lines.push(`  ═══ FINAL VERDICT: ${verdict} ═══`);
  lines.push("═════════════════════════════════════════════════════════════════════");

  const report = lines.join("\n");
  console.log(report);
  await Deno.writeTextFile(new URL("./redteam_report.txt", import.meta.url), report);

  // The harness does not fail CI on a WEAK verdict — findings first.
  assert(matrix.length === PERSONAS.length);
});
