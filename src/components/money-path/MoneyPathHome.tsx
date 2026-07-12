// MoneyPathHome — the Bet + 2 Also Considered, plus quick loggers to prove the loop.
// This is deliberately minimal. Visual polish comes after the intelligence loop works.

import { useCallback, useEffect, useState } from "react";
import { Loader2, ArrowRight, CheckCircle2, XCircle, Send, DollarSign, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import type { Venture } from "@/types/venture";

type Alternate = { code: string; title: string; why_now: string; done_looks_like: string; estimated_minutes: number };
type Primary = Alternate & { deliverable: string; personalized: boolean; reasons: string[]; deliverable_kind: string };

interface NbaResponse {
  state: { stage: string; bottleneck: string; evidence: Record<string, number> };
  selection: {
    primary: Primary;
    alternates: Alternate[];
    library_exhausted: boolean;
  } | null;
  message?: string;
}

export function MoneyPathHome({ venture }: { venture: Venture }) {
  const [data, setData] = useState<NbaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [handle, setHandle] = useState("");
  const [amount, setAmount] = useState("");

  const fetchNba = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await invokeAuthedFunction<NbaResponse>("compute-next-best-action", {
        body: { ventureId: venture.id },
      });
      if (error) throw error;
      setData(data);
    } catch (e) {
      toast.error("Couldn't compute your next action. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [venture.id]);

  useEffect(() => { void fetchNba(); }, [fetchNba]);

  const logConversation = async (status: "contacted" | "replied") => {
    if (!handle.trim()) return toast.error("Add a name or handle first.");
    setBusy(true);
    try {
      const { error } = await invokeAuthedFunction("log-buyer-conversation", {
        body: { ventureId: venture.id, handle: handle.trim(), status },
      });
      if (error) throw error;
      setHandle("");
      toast.success(`Logged as ${status}.`);
      await fetchNba();
    } catch (e: any) {
      toast.error(e.message || "Log failed");
    } finally { setBusy(false); }
  };

  const logRevenue = async () => {
    const cents = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) return toast.error("Enter an amount in dollars.");
    setBusy(true);
    try {
      const { error } = await invokeAuthedFunction("log-revenue-event", {
        body: { ventureId: venture.id, amountCents: cents },
      });
      if (error) throw error;
      setAmount("");
      toast.success("Revenue logged.");
      await fetchNba();
    } catch (e: any) {
      toast.error(e.message || "Log failed");
    } finally { setBusy(false); }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-24 w-full" /></div>;

  if (!data?.selection?.primary) {
    return (
      <Card className="p-6 rounded-none">
        <p className="font-serif text-lg">No action available yet.</p>
        <p className="text-sm text-muted-foreground mt-2">{data?.message ?? "Complete your offer first."}</p>
      </Card>
    );
  }

  const { primary, alternates, library_exhausted } = data.selection;

  return (
    <div className="space-y-6">
      {/* State header */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-mono uppercase text-muted-foreground">
        <span className="px-2 py-1 border rounded-none">{data.state.stage}</span>
        <span className="px-2 py-1 border rounded-none">{data.state.bottleneck}</span>
        {library_exhausted && <span className="px-2 py-1 border border-primary text-primary rounded-none">library exhausted — cooldown</span>}
      </div>

      {/* THE BET */}
      <Card className="p-6 rounded-none border-primary/40">
        <div className="text-xs font-mono uppercase text-primary mb-2">The Bet</div>
        <h2 className="font-serif text-2xl mb-3">{primary.title}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          <span className="font-mono uppercase text-xs mr-2">Why now:</span>{primary.why_now || "This unblocks your current bottleneck."}
        </p>
        <div className="border-l-2 border-primary/40 pl-4 mb-4">
          <div className="text-xs font-mono uppercase text-muted-foreground mb-1">Deliverable</div>
          <pre className="whitespace-pre-wrap text-sm font-sans">{primary.deliverable}</pre>
          {!primary.personalized && (
            <div className="text-xs text-muted-foreground mt-2 italic">Showing the template — AI personalization unavailable right now.</div>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          Done looks like: {primary.done_looks_like} · ~{primary.estimated_minutes} min
        </div>
      </Card>

      {/* Also considered */}
      {alternates.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {alternates.map((alt) => (
            <Card key={alt.code} className="p-4 rounded-none">
              <div className="text-xs font-mono uppercase text-muted-foreground mb-1">Also considered</div>
              <div className="font-serif text-base mb-2">{alt.title}</div>
              <div className="text-xs text-muted-foreground">~{alt.estimated_minutes} min · {alt.done_looks_like}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Loop-closing loggers */}
      <Card className="p-6 rounded-none space-y-4">
        <div className="text-xs font-mono uppercase text-muted-foreground">Log an outcome</div>
        <div className="flex flex-col md:flex-row gap-2">
          <Input placeholder="Buyer name or handle" value={handle} onChange={(e) => setHandle(e.target.value)} className="rounded-none" />
          <Button onClick={() => logConversation("contacted")} disabled={busy} variant="outline" className="rounded-none">
            <Send className="w-4 h-4 mr-1" />Contacted
          </Button>
          <Button onClick={() => logConversation("replied")} disabled={busy} variant="outline" className="rounded-none">
            <MessageSquarePlus className="w-4 h-4 mr-1" />Replied
          </Button>
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <Input placeholder="Revenue in dollars" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="rounded-none" />
          <Button onClick={logRevenue} disabled={busy} className="rounded-none">
            <DollarSign className="w-4 h-4 mr-1" />Log revenue
          </Button>
        </div>
        <Button onClick={fetchNba} variant="ghost" size="sm" className="rounded-none">
          {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-1" />}
          Recompute Next Best Action
        </Button>
      </Card>
    </div>
  );
}
