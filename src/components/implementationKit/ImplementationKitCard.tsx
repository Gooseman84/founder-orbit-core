import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { ProUpgradeModal } from "@/components/billing/ProUpgradeModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Package, 
  FileText, 
  Download, 
  ExternalLink, 
  Loader2, 
  AlertCircle,
  ArrowRight 
} from "lucide-react";
import { useImplementationKitByBlueprint, useCreateImplementationKit } from "@/hooks/useImplementationKit";
import { useBlueprint } from "@/hooks/useBlueprint";
import { downloadAsMarkdown } from "@/lib/documentExport";
import { useToast } from "@/hooks/use-toast";
import { TechStackDialog } from "./TechStackDialog";
import { SpecValidationSection } from "./SpecValidationSection";
import type { TechStack } from "@/types/implementationKit";

interface ImplementationKitCardProps {
  ventureId: string;
}

interface DocumentRowProps {
  documentId: string | null;
  name: string;
  onDownload: (docId: string, filename: string) => void;
  isDownloading: boolean;
}

function DocumentRow({ documentId, name, onDownload, isDownloading }: DocumentRowProps) {
  if (!documentId) return null;

  return (
    <div className="flex items-center gap-2 py-2 px-1 rounded-lg hover:bg-muted/50 transition-colors">
      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm flex-1 truncate">{name}</span>
      <div className="flex gap-1 shrink-0">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 text-xs" 
          asChild
        >
          <Link to={`/workspace/${documentId}`}>
            <ExternalLink className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">View</span>
          </Link>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 text-xs"
          onClick={() => onDownload(documentId, name)}
          disabled={isDownloading}
        >
          {isDownloading ? (
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
  );
}

export function ImplementationKitCard({ ventureId }: ImplementationKitCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPro } = useFeatureAccess();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showTechStackDialog, setShowTechStackDialog] = useState(false);
  const { blueprint, loading: blueprintLoading } = useBlueprint();
  const blueprintId = blueprint?.id;
  
  const { data: kit, isLoading: kitLoading } = useImplementationKitByBlueprint(blueprintId);
  const createKit = useCreateImplementationKit();
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);

  const handleGenerateClick = () => {
    // Pro gating
    if (!hasPro) {
      setShowUpgradeModal(true);
      return;
    }

    // If kit already exists and is complete, navigate to workspace
    if (kit?.status === 'complete') {
      navigate('/workspace');
      return;
    }

    // Open tech stack selection
    setShowTechStackDialog(true);
  };

  const handleTechStackSubmit = (techStack: TechStack) => {
    if (!blueprintId) {
      toast({
        title: "Blueprint required",
        description: "Please generate a Blueprint first before creating an Implementation Kit.",
        variant: "destructive",
      });
      return;
    }

    createKit.mutate(
      { blueprintId, ventureId, techStack },
      {
        onSuccess: () => {
          setShowTechStackDialog(false);
        },
      }
    );
  };

  const handleDownload = async (docId: string, filename: string) => {
    if (!hasPro) {
      setShowUpgradeModal(true);
      return;
    }
    setDownloadingDoc(docId);
    try {
      await downloadAsMarkdown(docId, filename);
      toast({
        title: "Download started",
        description: `${filename}.md is downloading`,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download document",
        variant: "destructive",
      });
    } finally {
      setDownloadingDoc(null);
    }
  };

  // Loading state
  if (blueprintLoading || kitLoading) {
    return (
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  // No kit exists - show CTA to generate
  if (!kit) {
    return (
      <>
        <Card className="border-dashed border-primary/20">
          <CardContent className="py-5">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Implementation Kit</p>
                <p className="text-xs text-muted-foreground">
                  Get tech specs, architecture, and a roadmap for your venture
                </p>
              </div>
              <Button 
                size="sm"
                onClick={handleGenerateClick}
                className="shrink-0"
              >
                Generate
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <TechStackDialog
          open={showTechStackDialog}
          onOpenChange={setShowTechStackDialog}
          onSubmit={handleTechStackSubmit}
          isGenerating={createKit.isPending}
        />

        <ProUpgradeModal
          open={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          reasonCode="IMPLEMENTATION_KIT_REQUIRES_PRO"
        />
      </>
    );
  }

  // Kit is generating
  if (kit.status === 'generating') {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="font-medium text-sm">Generating Implementation Kit...</p>
              <p className="text-xs text-muted-foreground">
                This usually takes 1-2 minutes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Kit has error
  if (kit.status === 'error') {
    return (
      <>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-destructive">Kit Generation Failed</p>
                <p className="text-xs text-muted-foreground truncate">
                  {kit.error_message || "An error occurred"}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/blueprint?ventureId=${ventureId}`)}
                >
                  View on Blueprint
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleGenerateClick}
                >
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <TechStackDialog
          open={showTechStackDialog}
          onOpenChange={setShowTechStackDialog}
          onSubmit={handleTechStackSubmit}
          isGenerating={createKit.isPending}
        />

        <ProUpgradeModal
          open={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          reasonCode="IMPLEMENTATION_KIT_REQUIRES_PRO"
        />
      </>
    );
  }

  // Kit is complete - show document list
  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Implementation Kit
            <Badge variant="secondary" className="ml-auto text-xs">Ready</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-3">
          <div className="space-y-1">
            <DocumentRow 
              documentId={kit.north_star_spec_id} 
              name="North Star Spec"
              onDownload={handleDownload}
              isDownloading={downloadingDoc === kit.north_star_spec_id}
            />
            <DocumentRow 
              documentId={kit.architecture_contract_id} 
              name="Architecture Contract"
              onDownload={handleDownload}
              isDownloading={downloadingDoc === kit.architecture_contract_id}
            />
            <DocumentRow 
              documentId={kit.vertical_slice_plan_id} 
              name="Thin Vertical Slice Plan"
              onDownload={handleDownload}
              isDownloading={downloadingDoc === kit.vertical_slice_plan_id}
            />
            <DocumentRow 
              documentId={(kit as any).launch_playbook_id} 
              name="Launch Playbook"
              onDownload={handleDownload}
              isDownloading={downloadingDoc === (kit as any).launch_playbook_id}
            />
          </div>
          {(() => {
            console.log('spec_validation:', kit.spec_validation);
            return kit.spec_validation ? (
              <SpecValidationSection validation={kit.spec_validation} />
            ) : null;
          })()}
        </CardContent>
      </Card>

      <ProUpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reasonCode="EXPORT_REQUIRES_PRO"
      />
    </>
  );
}
