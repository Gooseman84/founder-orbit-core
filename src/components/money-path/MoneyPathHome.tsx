// MoneyPathHome — polished founder command surface.
// Presentation only. Never modify policy, stage, bottleneck, selection, or envelope logic.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2, Copy, Check, DollarSign, Send, MessageSquarePlus, XCircle,
  Target, TrendingUp, AlertCircle, ArrowRight, Users, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { supabase } from "@/integrations/supabase/client";
import type { Venture } from "@/types/venture";

type Alternate = {
  code: string; title: string; why_now: string;
  done_looks_like: string; estimated_minutes: number;
};
type Primary = Alternate & {
  deliverable: string; personalized: boolean; reasons: string[]; deliverable_kind: string;
};

interface NbaContext {
  offer_title: string | null;
  offer_description: string | null;
  buyer_segment: string | null;
  delivery_format: string | null;
  price_cents: number | null;
}
interface NbaState {
  stage: string;
  bottleneck: string;
  evidence: {
    revenue_cents: number; revenue_count: number;
    contacted_count: number; replied_count: number; offer_sent_count: number;
  };
}
interface NbaResponse {
  state: NbaState;
  context: NbaContext | null;
  selection: {
    primary: Primary;
    alternates: Alternate[];
    library_exhausted: boolean;
  } | null;
  message?: string;
}

interface RecentConv {
  id: string;
  handle: string;
  status: string;
  channel: string | null;
  last_activity_at: string;
}

// ── Plain-language commercial truth for each bottleneck ─────────────────
const BOTTLENECK_COPY: Record<string, { title: string; blurb: string }> = {
  B_NO_OFFER:            { title: "You haven't committed to an offer yet.",       blurb: "Lock the offer before spending time on buyers." },
  B_NO_BUYER_LIST:       { title: "You don't have anyone specific to reach out to.", blurb: "You need a short, real list before outreach works." },
  B_NO_OUTREACH:         { title: "Nobody has seen the offer yet.",               blurb: "Contact matters more than more research." },
  B_NO_REPLIES:          { title: "Your current outreach isn't earning replies.", blurb: "Change the message, the channel, or the ask." },
  B_REPLIES_NO_CALLS:    { title: "Interest exists, but it isn't turning into calls.", blurb: "Ask for the call directly — don't drift into pen-pal mode." },
  B_CALLS_NO_OFFERS:     { title: "You're talking to buyers but not asking them to buy.", blurb: "The call has to end with a proposal or a next step." },
  B_OFFERS_NO_CLOSE:     { title: "Offers are going out, but they aren't closing.", blurb: "Handle the objection directly. Don't rewrite the offer yet." },
  B_PRICE_OBJECTION:     { title: "Buyers are hesitating on price.",              blurb: "Reframe value, not discount." },
  B_CHANNEL_EXHAUSTED:   { title: "Your current channel is played out.",          blurb: "Bring the offer where the buyers already are." },
  B_DELIVERY_STUCK:      { title: "Delivery is blocking the next sale.",          blurb: "Unblock fulfillment before pushing more outreach." },
  B_NOT_YET_REPEATABLE:  { title: "You proved someone will pay. Now reproduce the win.", blurb: "Don't redesign the offer. Reproduce the conditions that worked." },
  B_LOSS_REASON_UNKNOWN: { title: "You're losing deals without knowing why.",     blurb: "Every loss needs a reason on file — or the pattern is invisible." },
};

// ── Concrete first-target text when revenue is $0 ───────────────────────
function firstTargetFor(bottleneck: string): string {
  switch (bottleneck) {
    case "B_NO_OFFER":        return "Lock your offer";
    case "B_NO_BUYER_LIST":   return "Line up 5 real buyers to contact";
    case "B_NO_OUTREACH":     return "Send your first buyer message";
    case "B_NO_REPLIES":      return "Earn your first reply";
    case "B_REPLIES_NO_CALLS":return "Book your first call";
    case "B_CALLS_NO_OFFERS": return "Send your first offer";
    case "B_OFFERS_NO_CLOSE": return "Close your first deal";
    default:                  return "Move one buyer forward today";
  }
}

function formatUsd(cents: number | null): string {
  if (cents == null || !Number.isFinite(cents)) return "—";
  const usd = cents / 100;
  return usd >= 1000
    ? `$${(usd).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
    : `$${usd.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function pipelineLabel(status: string): string {
  switch (status) {
    case "identified":  return "Identified";
    case "contacted":   return "Contacted";
    case "replied":     return "Replied";
    case "call_booked": return "Call booked";
    case "offer_sent":  return "Offer sent";
    case "won":         return "Won";
    case "lost":        return "Lost";
    case "ghosted":     return "Ghosted";
    default: return status;
  }
}

// Which outcome buttons make sense given the current bottleneck.
function quickOutcomes(bottleneck: string): Array<{ status: string; label: string; icon: JSX.Element }> {
  if (bottleneck === "B_NO_OUTREACH" || bottleneck === "B_NO_BUYER_LIST") {
    return [
      { status: "contacted", label: "Sent",     icon: <Send className="w-3.5 h-3.5" /> },
      { status: "replied",   label: "Replied",  icon: <MessageSquarePlus className="w-3.5 h-3.5" /> },
    ];
  }
  if (bottleneck === "B_NO_REPLIES") {
    return [
      { status: "replied",   label: "Got a reply", icon: <MessageSquarePlus className="w-3.5 h-3.5" /> },
      { status: "ghosted",   label: "No response", icon: <XCircle className="w-3.5 h-3.5" /> },
    ];
  }
  if (bottleneck === "B_REPLIES_NO_CALLS") {
    return [
      { status: "call_booked", label: "Call booked", icon: <Check className="w-3.5 h-3.5" /> },
      { status: "ghosted",     label: "Went cold",   icon: <XCircle className="w-3.5 h-3.5" /> },
    ];
  }
  if (bottleneck === "B_CALLS_NO_OFFERS") {
    return [
      { status: "offer_sent", label: "Offer sent",  icon: <Send className="w-3.5 h-3.5" /> },
      { status: "lost",       label: "No fit",      icon: <XCircle className="w-3.5 h-3.5" /> },
    ];
  }
  if (bottleneck === "B_OFFERS_NO_CLOSE") {
    return [
      { status: "won",  label: "Won",   icon: <Check className="w-3.5 h-3.5" /> },
      { status: "lost", label: "Lost",  icon: <XCircle className="w-3.5 h-3.5" /> },
    ];
  }
  return [
    { status: "contacted", label: "Contacted", icon: <Send className="w-3.5 h-3.5" /> },
    { status: "replied",   label: "Replied",   icon: <MessageSquarePlus className="w-3.5 h-3.5" /> },
  ];
}

export function MoneyPathHome({ venture }: { venture: Venture }) {
  const [data, setData] = useState<NbaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [handle, setHandle] = useState("");
  const [amount, setAmount] = useState("");
  const [showRevenue, setShowRevenue] = useState(false);
  const [pipeline, setPipeline] = useState<RecentConv[]>([]);

  const fetchNba = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await invokeAuthedFunction<NbaResponse>("compute-next-best-action", {
        body: { ventureId: venture.id },
      });
      if (error) throw error;
      setData(data);
    } catch {
      toast.error("Couldn't compute your next action. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [venture.id]);

  const fetchPipeline = useCallback(async () => {
    // Fetch recent buyer conversations for this venture's money path via view lookup.
    const { data: mp } = await supabase
      .from("money_paths")
      .select("id")
      .eq("venture_id", venture.id)
      .maybeSingle();
    if (!mp?.id) { setPipeline([]); return; }
    const { data: rows } = await supabase
      .from("buyer_conversations")
      .select("id, handle, status, channel, last_activity_at")
      .eq("money_path_id", mp.id)
      .order("last_activity_at", { ascending: false })
      .limit(5);
    setPipeline((rows ?? []) as RecentConv[]);
  }, [venture.id]);

  useEffect(() => { void fetchNba(); void fetchPipeline(); }, [fetchNba, fetchPipeline]);

  const logConversation = async (status: string, useHandle?: string) => {
    const h = (useHandle ?? handle).trim();
    if (!h) { toast.error("Add a name or handle first."); return; }
    setBusy(true);
    try {
      const { error } = await invokeAuthedFunction("log-buyer-conversation", {
        body: { ventureId: venture.id, handle: h, status },
      });
      if (error) throw error;
      setHandle("");
      toast.success(`Logged: ${pipelineLabel(status)}`);
      await Promise.all([fetchNba(), fetchPipeline()]);
    } catch (e: any) {
      toast.error(e?.message || "Log failed");
    } finally { setBusy(false); }
  };

  const logRevenue = async () => {
    const cents = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) { toast.error("Enter an amount in dollars."); return; }
    setBusy(true);
    try {
      const { error } = await invokeAuthedFunction("log-revenue-event", {
        body: { ventureId: venture.id, amountCents: cents },
      });
      if (error) throw error;
      setAmount(""); setShowRevenue(false);
      toast.success("Revenue logged.");
      await Promise.all([fetchNba(), fetchPipeline()]);
    } catch (e: any) {
      toast.error(e?.message || "Log failed");
    } finally { setBusy(false); }
  };

  const copyDeliverable = async () => {
    if (!data?.selection?.primary?.deliverable) return;
    try {
      await navigator.clipboard.writeText(data.selection.primary.deliverable);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast.success("Copied.");
    } catch {
      toast.error("Copy failed.");
    }
  };

  const revenueMath = useMemo(() => {
    const price = data?.context?.price_cents;
    if (!price || price <= 0) return null;
    const target = 1_000_000; // $10,000 in cents
    const needed = Math.ceil(target / price);
    return { needed, priceUsd: price / 100 };
  }, [data?.context?.price_cents]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-none" />
        <Skeleton className="h-24 w-full rounded-none" />
        <Skeleton className="h-64 w-full rounded-none" />
      </div>
    );
  }

  if (!data?.selection?.primary) {
    return (
      <Card className="p-6 rounded-none">
        <p className="font-serif text-lg">No action available yet.</p>
        <p className="text-sm text-muted-foreground mt-2">{data?.message ?? "Complete your offer first."}</p>
      </Card>
    );
  }

  const { primary, alternates, library_exhausted } = data.selection;
  const ctx = data.context;
  const ev = data.state.evidence;
  const revCents = ev.revenue_cents ?? 0;
  const goalCents = 1_000_000;
  const pct = Math.min(100, Math.round((revCents / goalCents) * 100));
  const revUsd = revCents / 100;
  const remaining = revenueMath ? Math.max(0, revenueMath.needed - ev.revenue_count) : null;

  const bn = BOTTLENECK_COPY[data.state.bottleneck] ?? {
    title: "Move one buyer forward today.",
    blurb: "Every action should shrink the distance to a paying customer.",
  };

  const outcomes = quickOutcomes(data.state.bottleneck);

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* ─── THE BET ───────────────────────────────────────────── */}
      <Card className="p-5 md:p-6 rounded-none card-gold-accent">
        <div className="flex items-center gap-2 text-[0.65rem] font-mono uppercase tracking-[0.14em] text-primary mb-3">
          <Target className="w-3.5 h-3.5" /> The Bet
        </div>
        <h1 className="font-serif text-2xl md:text-3xl leading-tight mb-2 break-words">
          {ctx?.offer_title ?? primary.title}
        </h1>
        {ctx?.buyer_segment && (
          <div className="text-sm text-muted-foreground mb-3">
            For <span className="text-foreground">{ctx.buyer_segment}</span>
          </div>
        )}
        {ctx?.offer_description && (
          <p className="text-sm text-foreground/85 leading-relaxed mb-4">
            {ctx.offer_description}
          </p>
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-mono uppercase tracking-[0.08em] text-muted-foreground pt-3 border-t border-border/50">
          {ctx?.delivery_format && <span>{ctx.delivery_format.replace(/_/g, " ")}</span>}
          {ctx?.price_cents && <span className="text-foreground">{formatUsd(ctx.price_cents)}</span>}
          {revenueMath && (
            <span>
              <span className="text-foreground">{formatUsd(ctx!.price_cents)}</span> × {revenueMath.needed} = <span className="text-primary">$10,000</span>
            </span>
          )}
        </div>
      </Card>

      {/* ─── PROGRESS TO $10K ──────────────────────────────────── */}
      <Card className="p-5 rounded-none">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[0.65rem] font-mono uppercase tracking-[0.14em] text-muted-foreground">
            <TrendingUp className="w-3.5 h-3.5" /> Progress to $10K
          </div>
          <div className="font-mono text-xs text-muted-foreground">{pct}%</div>
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <div className="font-serif text-3xl md:text-4xl text-foreground">${revUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
          <div className="font-mono text-sm text-muted-foreground">/ $10,000</div>
        </div>
        <div className="h-1.5 w-full bg-muted overflow-hidden mb-3">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        {revCents === 0 ? (
          <p className="text-sm text-muted-foreground">
            Your first target: <span className="text-foreground">{firstTargetFor(data.state.bottleneck)}</span>.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {ev.revenue_count} paying customer{ev.revenue_count === 1 ? "" : "s"}
            {remaining != null && remaining > 0 && (
              <> · <span className="text-foreground">{remaining} more</span> at current price</>
            )}
          </p>
        )}
      </Card>

      {/* ─── CURRENT BOTTLENECK ───────────────────────────────── */}
      <div className="border-l-2 border-primary/60 pl-4 py-2">
        <div className="flex items-center gap-2 text-[0.65rem] font-mono uppercase tracking-[0.14em] text-primary mb-1">
          <AlertCircle className="w-3.5 h-3.5" /> Current Bottleneck
        </div>
        <div className="font-serif text-lg leading-snug text-foreground">{bn.title}</div>
        <div className="text-sm text-muted-foreground mt-1">{bn.blurb}</div>
      </div>

      {/* ─── NEXT BEST ACTION — HERO ──────────────────────────── */}
      <Card className="p-5 md:p-6 rounded-none border-primary/40 bg-primary/[0.03]">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2 text-[0.65rem] font-mono uppercase tracking-[0.14em] text-primary">
            <Sparkles className="w-3.5 h-3.5" /> Next Best Action
          </div>
          <div className="font-mono text-[0.65rem] uppercase text-muted-foreground">
            ~{primary.estimated_minutes} min
          </div>
        </div>
        <h2 className="font-serif text-xl md:text-2xl leading-tight mb-2">{primary.title}</h2>
        {primary.why_now && (
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{primary.why_now}</p>
        )}

        {/* Deliverable */}
        <div className="bg-background border border-border/70 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[0.6rem] font-mono uppercase tracking-[0.14em] text-muted-foreground">
              {primary.deliverable_kind?.replace(/_/g, " ") ?? "Deliverable"}
            </div>
            {!primary.personalized && (
              <div className="text-[0.6rem] font-mono uppercase text-muted-foreground italic">template</div>
            )}
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/95 break-words">
            {primary.deliverable}
          </pre>
        </div>

        {/* Primary CTA + quick outcome */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={copyDeliverable}
            className="rounded-none flex-1 h-11"
            disabled={busy}
          >
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "Copied" : "Copy message"}
          </Button>
        </div>

        {/* Quick log after acting */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="text-[0.6rem] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-2">
            When you send it, log the outcome
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Who did you contact?"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              className="rounded-none h-11"
            />
            <div className="flex gap-2">
              {outcomes.map((o) => (
                <Button
                  key={o.status}
                  variant="outline"
                  onClick={() => logConversation(o.status)}
                  disabled={busy || !handle.trim()}
                  className="rounded-none h-11 flex-1 sm:flex-none"
                >
                  {o.icon}<span className="ml-1.5">{o.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {library_exhausted && (
          <div className="mt-4 text-[0.7rem] font-mono uppercase text-primary/80 border border-primary/30 px-2 py-1 inline-block">
            library exhausted — cooldown
          </div>
        )}
      </Card>

      {/* ─── BUYER PIPELINE ───────────────────────────────────── */}
      {pipeline.length > 0 && (
        <Card className="p-5 rounded-none">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[0.65rem] font-mono uppercase tracking-[0.14em] text-muted-foreground">
              <Users className="w-3.5 h-3.5" /> Buyer Pipeline
            </div>
            <div className="font-mono text-[0.65rem] uppercase text-muted-foreground">
              {ev.contacted_count} contacted · {ev.replied_count} replied · {ev.offer_sent_count} offers
            </div>
          </div>
          <div className="divide-y divide-border/50">
            {pipeline.map((c) => (
              <div key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm text-foreground truncate">{c.handle}</div>
                  {c.channel && <div className="text-[0.7rem] font-mono uppercase text-muted-foreground">{c.channel}</div>}
                </div>
                <div className="text-[0.65rem] font-mono uppercase tracking-[0.1em] text-primary shrink-0">
                  {pipelineLabel(c.status)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ─── SECONDARY: log revenue + alternates ──────────────── */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4 rounded-none">
          <div className="flex items-center gap-2 text-[0.65rem] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-2">
            <DollarSign className="w-3.5 h-3.5" /> Log Revenue
          </div>
          {!showRevenue ? (
            <Button variant="outline" onClick={() => setShowRevenue(true)} className="rounded-none w-full h-10">
              Someone paid
            </Button>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Amount in dollars"
                value={amount}
                inputMode="decimal"
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-none h-10"
                autoFocus
              />
              <Button onClick={logRevenue} disabled={busy} className="rounded-none h-10">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log"}
              </Button>
            </div>
          )}
        </Card>

        {alternates[0] && (
          <Card className="p-4 rounded-none">
            <div className="text-[0.65rem] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-2">
              Also considered
            </div>
            <div className="font-serif text-sm leading-snug mb-1">{alternates[0].title}</div>
            <div className="text-[0.7rem] font-mono uppercase text-muted-foreground">
              ~{alternates[0].estimated_minutes} min
            </div>
          </Card>
        )}
      </div>

      <button
        onClick={fetchNba}
        className="text-[0.7rem] font-mono uppercase tracking-[0.14em] text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
        Recompute
      </button>
    </div>
  );
}
