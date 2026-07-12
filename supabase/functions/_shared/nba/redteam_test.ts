// Commercial red-team runner. Prints a Markdown report to stdout.
// Run:  deno test --allow-read --allow-env supabase/functions/_shared/nba/redteam_test.ts
//
// Snapshot: supabase/functions/_shared/nba/redteam_templates.snapshot.json
// (regenerate manually; hash + version printed in the report header).

import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { selectAction } from "./policy.ts";
import type { ActionTemplate, MoneyPathState } from "./types.ts";
import { deriveCounts, deriveStage, deriveBottleneck } from "./state_derivation.ts";
import { PERSONAS } from "./redteam_fixtures.ts";
import { ASSERTIONS } from "./redteam_assertions.ts";

// ── Snapshot metadata ───────────────────────────────────────────────────────
const SNAPSHOT_PATH = new URL("./redteam_templates.snapshot.json", import.meta.url);
const SNAPSHOT_VERSION = "v1-2026-07-12";

// Pinned view-definition hashes at snapshot time (SHA-256 of pg_get_viewdef).
// If the SQL views change, these become stale and the parity claim is void —
// refresh intentionally, do not silently regenerate.
const VIEW_HASHES = {
  v_money_path_stage: "96b9677cb6fd6cc945704a8f8f3adc00beb3b3e70eb4fd24c6284f93f7978b2e",
  v_active_bottleneck: "4f74ab99e99d6ab04b1a86b4bfa70efedf497812438fd93db5eb1e84e7409611",
  migration_ref: "20260712074539_6be83e11-4074-4eda-877a-0fda5b911587.sql",
};

async function loadTemplates(): Promise<{ templates: ActionTemplate[]; hash: string; count: number }> {
  const raw = await Deno.readTextFile(SNAPSHOT_PATH);
  const arr = JSON.parse(raw) as ActionTemplate[];
  const canonical = JSON.stringify(arr);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  return { templates: arr, hash, count: arr.length };
}

Deno.test("RED TEAM — 7 personas, production-evidence pass", async () => {
  const { templates, hash, count } = await loadTemplates();

  const lines: string[] = [];
  lines.push("");
  lines.push("═════════════════════════════════════════════════════════════════════");
  lines.push("  TRUEBLAZER RED TEAM — Money Path NBA Loop");
  lines.push("═════════════════════════════════════════════════════════════════════");
  lines.push(`  Template snapshot     : ${SNAPSHOT_VERSION}`);
  lines.push(`  Template snapshot hash: ${hash}`);
  lines.push(`  Templates in snapshot : ${count}`);
  lines.push(`  View hash — stage     : ${VIEW_HASHES.v_money_path_stage}`);
  lines.push(`  View hash — bottleneck: ${VIEW_HASHES.v_active_bottleneck}`);
  lines.push(`  Parity migration ref  : ${VIEW_HASHES.migration_ref}`);
  lines.push(`  LLM personalization   : ${Deno.env.get("REDTEAM_LLM") === "1" ? "ON" : "OFF (template text only)"}`);
  lines.push("");

  type Row = { id: string; name: string; diagnosis: string; prescription: string; pay: string; winner: string; };
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
    };

    const sel = selectAction(templates, state, p.context, []);
    const top3 = templates
      .map(tpl => {
        const scored = selectAction([tpl], state, p.context, []);
        return { code: tpl.code, score: scored.primary?.score ?? -Infinity };
      })
      .filter(x => Number.isFinite(x.score))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const winner = sel.primary?.template ?? null;
    const assertion = (ASSERTIONS as any)[p.id](winner, stage, bn);

    lines.push(`─── ${p.id} — ${p.name} ─────────────────────────────────────`);
    lines.push(`  Narrative       : ${p.narrative}`);
    lines.push(`  Raw evidence    : offer_locked=${!!p.evidence.offer_locked_at}, conv=${counts.total_conv} (contacted=${counts.contacted_count}, replied=${counts.replied_count}, offer_sent=${counts.offer_sent_count}, won=${counts.won_count}, lost=${counts.lost_count}), revenue=$${(counts.revenue_cents/100).toFixed(0)}`);
    lines.push(`  Derived stage   : ${stage}`);
    lines.push(`  Derived btlnck  : ${bn}`);
    lines.push(`  Winning template: ${winner?.code ?? "— none —"}   (score ${sel.primary?.score ?? "n/a"})`);
    lines.push(`  Top 3 eligible  : ${top3.map(x => `${x.code} ${x.score}`).join(" | ") || "(none eligible)"}`);
    lines.push(`  Reasons         : ${sel.primary?.reasons?.join(", ") ?? "-"}`);
    lines.push(`  Deliverable text:`);
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
    if (p.counterfactual) {
      lines.push(`  ┌─ COUNTERFACTUAL — IF TRUEBLAZER KNEW THIS ─────────────────────`);
      lines.push(`  │  Hypothetical evidence not in production schema:`);
      for (const [k, val] of Object.entries(p.counterfactual)) {
        lines.push(`  │    ${k} = ${JSON.stringify(val)}`);
      }
      // Simple counterfactual re-diagnosis for P1 + P6 specifically.
      if (p.id === "P1") {
        lines.push(`  │  With 12 known accessible past clients, commercially correct diagnosis is B_NO_OUTREACH (or a new B_HAS_ACCESSIBLE_BUYERS state) — not B_NO_BUYER_LIST. Prescription becomes direct warm-ask, not list-building.`);
      }
      if (p.id === "P6") {
        lines.push(`  │  With rejection_notes present, diagnosis should split into B_PRICE_OBJECTION vs B_ROI_UNCLEAR. Neither exists in production evidence today.`);
      }
      lines.push(`  └────────────────────────────────────────────────────────────────`);
    }
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

  let verdict = "STRONG";
  if (wrongDiag > 0 || weakPresc >= 3 || noPay >= 2) verdict = "WEAK";
  else if (questionableDiag >= 1 || weakPresc >= 1 || marginalPay >= 1) verdict = "MIXED";

  lines.push("═════════════════════════════════════════════════════════════════════");
  lines.push("  RESULT MATRIX");
  lines.push("═════════════════════════════════════════════════════════════════════");
  lines.push("  ID  | Diagnosis     | Prescription | Pay?     | Winner");
  lines.push("  ----+---------------+--------------+----------+------------------------");
  for (const r of matrix) {
    lines.push(`  ${r.id}  | ${r.diagnosis.padEnd(13)} | ${r.prescription.padEnd(12)} | ${r.pay.padEnd(8)} | ${r.winner}`);
  }
  lines.push("");
  lines.push(`  Wrong diagnoses      : ${wrongDiag}`);
  lines.push(`  Questionable diags   : ${questionableDiag}`);
  lines.push(`  Weak prescriptions   : ${weakPresc}`);
  lines.push(`  Would-not-pay        : ${noPay}`);
  lines.push(`  Would-marginally-pay : ${marginalPay}`);
  lines.push("");
  lines.push(`  ═══ FINAL VERDICT: ${verdict} ═══`);
  lines.push("");
  lines.push("  Verdict thresholds:");
  lines.push("    STRONG : 0 wrong diagnoses, ≤0 weak prescriptions, 0 would-not-pay, 0 marginal-pay.");
  lines.push("    MIXED  : ≥1 questionable diagnosis OR ≥1 weak prescription OR ≥1 marginal pay.");
  lines.push("    WEAK   : any wrong diagnosis, or ≥3 weak prescriptions, or ≥2 would-not-pay.");
  lines.push("═════════════════════════════════════════════════════════════════════");

  const report = lines.join("\n");
  console.log(report);
  await Deno.writeTextFile(new URL("./redteam_report.txt", import.meta.url), report);

  // The harness itself should not fail the test suite — the whole point is to
  // let a WEAK verdict surface without breaking CI. We only assert the runner ran.
  assert(matrix.length === PERSONAS.length);
});
