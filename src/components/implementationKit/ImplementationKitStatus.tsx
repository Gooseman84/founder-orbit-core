import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Package, FileText, AlertCircle, ExternalLink } from "lucide-react";
import { useImplementationKitByBlueprint, useCreateImplementationKit } from "@/hooks/useImplementationKit";
import { TechStackDialog } from "./TechStackDialog";
import type { TechStack } from "@/types/implementationKit";

interface ImplementationKitStatusProps {
  blueprintId: string | undefined;
  ventureId: string | undefined;
  showGenerateButton?: boolean;
  compact?: boolean;
}

export function ImplementationKitStatus({
  blueprintId,
  ventureId,
  showGenerateButton = false,
  compact = false,
}: ImplementationKitStatusProps) {
  const [showTechStackDialog, setShowTechStackDialog] = useState(false);
  const { data: kit, isLoading } = useImplementationKitByBlueprint(blueprintId);
  const createKit = useCreateImplementationKit();

  const handleGenerateKit = (techStack: TechStack) => {
    if (!blueprintId || !ventureId) return;
    createKit.mutate({ blueprintId, ventureId, techStack });
    setShowTechStackDialog(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm py-2" style={{ color: "hsl(220 12% 58%)" }}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading kit status...</span>
      </div>
    );
  }

  if (!kit) {
    if (!showGenerateButton || !blueprintId || !ventureId) return null;
    return (
      <>
        <div
          className="border border-dashed p-6 flex flex-col items-center text-center gap-3"
          style={{ borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}
        >
          <Package className="h-8 w-8" style={{ color: "hsl(220 12% 58%)" }} />
          <div>
            <p className="font-medium" style={{ color: "hsl(40 15% 93%)" }}>No Implementation Kit</p>
            <p className="text-sm" style={{ color: "hsl(220 12% 58%)" }}>
              Generate a coding kit with tech specs, architecture, and a roadmap
            </p>
          </div>
          <button
            onClick={() => setShowTechStackDialog(true)}
            disabled={createKit.isPending}
            className="bg-primary text-primary-foreground font-medium text-[0.78rem] tracking-[0.06em] uppercase px-5 py-2.5 transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {createKit.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin inline" />
            ) : (
              <>
                <Package className="h-4 w-4 mr-2 inline" />
                GENERATE KIT
              </>
            )}
          </button>
        </div>
        <TechStackDialog
          open={showTechStackDialog}
          onOpenChange={setShowTechStackDialog}
          onSubmit={handleGenerateKit}
          isGenerating={createKit.isPending}
        />
      </>
    );
  }

  if (kit.status === "generating") {
    return (
      <div
        className="border p-4 flex items-center gap-3"
        style={{ borderColor: "hsl(43 52% 54% / 0.35)", background: "hsl(240 12% 7%)" }}
      >
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <div>
          <p className="font-medium text-sm" style={{ color: "hsl(40 15% 93%)" }}>Generating Kit...</p>
          <p className="text-xs" style={{ color: "hsl(220 12% 58%)" }}>This usually takes 1-2 minutes</p>
        </div>
      </div>
    );
  }

  if (kit.status === "error") {
    return (
      <>
        <div
          className="border p-4 flex items-center gap-3"
          style={{ borderColor: "hsl(0 65% 52% / 0.3)", background: "hsl(0 65% 52% / 0.05)" }}
        >
          <AlertCircle className="h-5 w-5" style={{ color: "hsl(0 65% 52%)" }} />
          <div className="flex-1">
            <p className="font-medium text-sm" style={{ color: "hsl(0 65% 52%)" }}>Generation Failed</p>
            <p className="text-xs" style={{ color: "hsl(220 12% 58%)" }}>
              {kit.error_message || "An error occurred while generating the kit"}
            </p>
          </div>
          {showGenerateButton && (
            <button
              onClick={() => setShowTechStackDialog(true)}
              className="border px-4 py-2 font-mono-tb text-[0.65rem] uppercase transition-colors hover:text-foreground"
              style={{ borderColor: "hsl(240 10% 14%)", color: "hsl(220 12% 58%)" }}
            >
              RETRY
            </button>
          )}
        </div>
        {showGenerateButton && (
          <TechStackDialog
            open={showTechStackDialog}
            onOpenChange={setShowTechStackDialog}
            onSubmit={handleGenerateKit}
            isGenerating={createKit.isPending}
          />
        )}
      </>
    );
  }

  if (kit.status === "complete") {
    if (compact) {
      return (
        <div
          className="border p-3 flex items-center justify-between"
          style={{ borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}
        >
          <span className="flex items-center gap-2 text-sm" style={{ color: "hsl(220 12% 58%)" }}>
            <FileText className="h-4 w-4" />
            Implementation Kit ready
          </span>
          <Link
            to={`/workspace?folderId=${kit.implementation_folder_id}`}
            className="inline-flex items-center gap-1.5 font-mono-tb text-[0.65rem] uppercase text-primary hover:opacity-80 transition-opacity"
          >
            VIEW DOCUMENTS
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      );
    }

    return (
      <div
        className="border"
        style={{ borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}
      >
        <div
          className="px-4 py-3 flex items-center gap-2"
          style={{ borderBottom: "1px solid hsl(240 10% 14%)" }}
        >
          <Package className="h-4 w-4 text-primary" />
          <span className="font-mono-tb text-[0.68rem] uppercase" style={{ color: "hsl(43 52% 54%)" }}>
            IMPLEMENTATION KIT
          </span>
          <span
            className="ml-auto font-mono-tb text-[0.58rem] uppercase border px-2 py-0.5"
            style={{ borderColor: "hsl(43 52% 54% / 0.35)", color: "hsl(43 52% 54%)" }}
          >
            COMPLETE
          </span>
        </div>
        <div className="p-3 space-y-1">
          {kit.north_star_spec_id && (
            <Link
              to={`/workspace/${kit.north_star_spec_id}`}
              className="flex items-center gap-2 py-2 px-2 hover:bg-secondary/30 transition-colors text-sm"
              style={{ color: "hsl(40 15% 93%)" }}
            >
              <FileText className="h-3 w-3 text-primary" />
              North Star Spec
            </Link>
          )}
          {kit.architecture_contract_id && (
            <Link
              to={`/workspace/${kit.architecture_contract_id}`}
              className="flex items-center gap-2 py-2 px-2 hover:bg-secondary/30 transition-colors text-sm"
              style={{ color: "hsl(40 15% 93%)" }}
            >
              <FileText className="h-3 w-3 text-primary" />
              Architecture Contract
            </Link>
          )}
          {kit.vertical_slice_plan_id && (
            <Link
              to={`/workspace/${kit.vertical_slice_plan_id}`}
              className="flex items-center gap-2 py-2 px-2 hover:bg-secondary/30 transition-colors text-sm"
              style={{ color: "hsl(40 15% 93%)" }}
            >
              <FileText className="h-3 w-3 text-primary" />
              Vertical Slice Plan
            </Link>
          )}
        </div>
      </div>
    );
  }

  return null;
}
