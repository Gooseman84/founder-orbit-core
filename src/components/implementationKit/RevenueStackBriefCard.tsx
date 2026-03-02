import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  FileText,
  ExternalLink,
  Download,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useToast } from "@/hooks/use-toast";
import { downloadAsMarkdown } from "@/lib/documentExport";
import { ProUpgradeModal } from "@/components/billing/ProUpgradeModal";

interface RevenueStackBriefCardProps {
  ventureId: string;
}

export function RevenueStackBriefCard({ ventureId }: RevenueStackBriefCardProps) {
  const { user } = useAuth();
  const { hasPro } = useFeatureAccess();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [generating, setGenerating] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { data: doc, isLoading } = useQuery({
    queryKey: ["revenue-stack-brief", ventureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_documents")
        .select("id, title, content, status")
        .eq("venture_id", ventureId)
        .eq("doc_type", "revenue_stack_brief")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!ventureId && !!user,
  });

  const handleGenerate = async () => {
    if (!hasPro) { setShowUpgradeModal(true); return; }
    if (!user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-revenue-stack-brief", {
        body: { venture_id: ventureId, user_id: user.id },
      });
      if (error) throw error;
      toast({ title: "Revenue Stack Brief Generated", description: "Your monetization analysis is ready." });
      queryClient.invalidateQueries({ queryKey: ["revenue-stack-brief", ventureId] });
    } catch (err) {
      toast({
        title: "Generation Failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!hasPro) { setShowUpgradeModal(true); return; }
    if (!doc) return;
    setDownloading(true);
    try {
      await downloadAsMarkdown(doc.id, "Revenue Stack Brief");
      toast({ title: "Download started", description: "Revenue Stack Brief.md is downloading" });
    } catch (err) {
      toast({
        title: "Download failed",
        description: err instanceof Error ? err.message : "Failed to download",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="border p-5" style={{ borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (generating) {
    return (
      <div
        className="border p-4 flex items-center gap-3"
        style={{ borderColor: "hsl(43 52% 54% / 0.35)", background: "hsl(240 12% 7%)" }}
      >
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <div>
          <p className="font-medium text-sm" style={{ color: "hsl(40 15% 93%)" }}>Generating Revenue Stack Brief...</p>
          <p className="text-xs" style={{ color: "hsl(220 12% 58%)" }}>Analyzing revenue layers for your venture</p>
        </div>
      </div>
    );
  }

  if (doc) {
    return (
      <>
        <div
          className="flex items-center gap-2 py-2 px-2 hover:bg-secondary/30 transition-colors"
        >
          <TrendingUp className="h-4 w-4 shrink-0" style={{ color: "hsl(220 12% 58%)" }} />
          <span className="text-sm flex-1 truncate" style={{ color: "hsl(40 15% 93%)" }}>Revenue Stack Brief</span>
          <span
            className="font-mono-tb text-[0.58rem] uppercase border px-2 py-0.5 mr-1"
            style={{ borderColor: "hsl(43 52% 54% / 0.35)", color: "hsl(43 52% 54%)" }}
          >
            READY
          </span>
          <div className="flex gap-1 shrink-0">
            <Link
              to={`/workspace/${doc.id}`}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs hover:text-foreground transition-colors"
              style={{ color: "hsl(220 12% 58%)" }}
            >
              <ExternalLink className="h-3 w-3" />
              <span className="hidden sm:inline">View</span>
            </Link>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs hover:text-foreground transition-colors disabled:opacity-50"
              style={{ color: "hsl(220 12% 58%)" }}
            >
              {downloading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Download className="h-3 w-3" />
                  <span className="hidden sm:inline">Download</span>
                </>
              )}
            </button>
          </div>
        </div>
        <ProUpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} reasonCode="EXPORT_REQUIRES_PRO" />
      </>
    );
  }

  return (
    <>
      <div
        className="border border-dashed p-5 flex items-center gap-4"
        style={{ borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}
      >
        <div className="h-10 w-10 flex items-center justify-center bg-primary/10 shrink-0">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm" style={{ color: "hsl(40 15% 93%)" }}>Revenue Stack Brief</p>
          <p className="text-xs" style={{ color: "hsl(220 12% 58%)" }}>
            Revenue layers, expansion plays, and monetization sequencing
          </p>
        </div>
        <button
          onClick={handleGenerate}
          className="shrink-0 bg-primary text-primary-foreground font-medium text-[0.78rem] tracking-[0.06em] uppercase px-4 py-2 transition-opacity hover:opacity-90"
        >
          GENERATE
          <ArrowRight className="h-3 w-3 ml-1 inline" />
        </button>
      </div>
      <ProUpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} reasonCode="IMPLEMENTATION_KIT_REQUIRES_PRO" />
    </>
  );
}
