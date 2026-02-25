import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  FileText,
  ExternalLink,
  Download,
  Loader2,
  AlertCircle,
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

  // Check for existing revenue_stack_brief document
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
    if (!hasPro) {
      setShowUpgradeModal(true);
      return;
    }
    if (!user) return;

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-revenue-stack-brief",
        { body: { venture_id: ventureId, user_id: user.id } }
      );
      if (error) throw error;

      toast({
        title: "Revenue Stack Brief Generated",
        description: "Your monetization analysis is ready.",
      });
      queryClient.invalidateQueries({
        queryKey: ["revenue-stack-brief", ventureId],
      });
    } catch (err) {
      toast({
        title: "Generation Failed",
        description:
          err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!hasPro) {
      setShowUpgradeModal(true);
      return;
    }
    if (!doc) return;
    setDownloading(true);
    try {
      await downloadAsMarkdown(doc.id, "Revenue Stack Brief");
      toast({
        title: "Download started",
        description: "Revenue Stack Brief.md is downloading",
      });
    } catch (err) {
      toast({
        title: "Download failed",
        description:
          err instanceof Error ? err.message : "Failed to download",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  // Loading
  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-5">
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Generating state
  if (generating) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="font-medium text-sm">
                Generating Revenue Stack Brief...
              </p>
              <p className="text-xs text-muted-foreground">
                Analyzing revenue layers for your venture
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Document exists — show view/download row
  if (doc) {
    return (
      <>
        <div className="flex items-center gap-2 py-2 px-1 rounded-lg hover:bg-muted/50 transition-colors">
          <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm flex-1 truncate">Revenue Stack Brief</span>
          <Badge variant="secondary" className="text-xs mr-1">
            Ready
          </Badge>
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              asChild
            >
              <Link to={`/workspace/${doc.id}`}>
                <ExternalLink className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">View</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Download className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Download</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <ProUpgradeModal
          open={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          reasonCode="EXPORT_REQUIRES_PRO"
        />
      </>
    );
  }

  // No doc — show generate CTA
  return (
    <>
      <Card className="border-dashed border-primary/20">
        <CardContent className="py-5">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Revenue Stack Brief</p>
              <p className="text-xs text-muted-foreground">
                Revenue layers, expansion plays, and monetization sequencing for
                your specific venture
              </p>
            </div>
            <Button size="sm" onClick={handleGenerate} className="shrink-0">
              Generate
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <ProUpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reasonCode="IMPLEMENTATION_KIT_REQUIRES_PRO"
      />
    </>
  );
}
