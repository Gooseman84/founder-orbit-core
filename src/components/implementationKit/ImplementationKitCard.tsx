import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { ProUpgradeModal } from "@/components/billing/ProUpgradeModal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  FileText,
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
  ArrowRight,
  Copy,
  Lock,
  Terminal,
} from "lucide-react";
import { useImplementationKitByBlueprint, useCreateImplementationKit } from "@/hooks/useImplementationKit";
import { useBlueprint } from "@/hooks/useBlueprint";
import { useActiveVenture } from "@/hooks/useActiveVenture";
import { downloadAsMarkdown } from "@/lib/documentExport";
import { useToast } from "@/hooks/use-toast";
import { TechStackDialog } from "./TechStackDialog";
import { SpecValidationSection } from "./SpecValidationSection";
import type { TechStack, ImplementationKit } from "@/types/implementationKit";

function generateClaudeMd(productName: string): string {
  return `# TrueBlazer Implementation Manifest

This project was planned using TrueBlazer. Read the execution manifest before starting any work.

## Instructions for Claude Code

1. Read TRUEBLAZER_MANIFEST.md at project root before every task
2. Execute phases in the order defined by critical_path in the manifest
3. Use the agent_prompt_template for each phase verbatim as your prompt
4. Do not begin a phase until all criteria in phase_complete_when are verified
5. Do not build anything listed in out_of_scope
6. If blocked on a task, log the blocking criterion and halt — do not skip ahead

## Available Documents

The following Implementation Kit documents are in this project:

- TRUEBLAZER_MANIFEST.md (Thin Vertical Slice Plan — primary execution manifest)
- NORTH_STAR_SPEC.md (Product definition and scope)
- ARCHITECTURE_CONTRACT.md (Tech stack decisions and constraints)
- LAUNCH_PLAYBOOK.md (Go-to-market plan for first 10 customers)

## Execution Model

Always execute sequentially unless a phase explicitly marks tasks as parallel. Use subagents for distinct phases to prevent context overflow between phases.
`;
}

function downloadClaudeMd(productName: string) {
  const content = generateClaudeMd(productName);
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'CLAUDE.md';
  a.click();
  URL.revokeObjectURL(url);
}

interface ImplementationKitCardProps {
  ventureId: string;
}

const DOCUMENTS = [
  { key: "north_star_spec_id", label: "NORTH STAR SPEC", shortLabel: "SPEC" },
  { key: "architecture_contract_id", label: "ARCHITECTURE CONTRACT", shortLabel: "ARCH" },
  { key: "vertical_slice_plan_id", label: "VERTICAL SLICE PLAN", shortLabel: "SLICE" },
  { key: "launch_playbook_id", label: "LAUNCH PLAYBOOK", shortLabel: "LAUNCH" },
] as const;

type DocKey = typeof DOCUMENTS[number]["key"];

function getDocStatus(kit: ImplementationKit | null, key: DocKey): "complete" | "generating" | "locked" {
  if (!kit) return "locked";
  if (kit.status === "generating") return "generating";
  if (kit.status === "complete" && (kit as any)[key]) return "complete";
  if (kit.status === "complete") return "locked";
  return "locked";
}

export function ImplementationKitCard({ ventureId }: ImplementationKitCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPro } = useFeatureAccess();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showTechStackDialog, setShowTechStackDialog] = useState(false);
  const { blueprint, loading: blueprintLoading } = useBlueprint();
  const { venture } = useActiveVenture();
  const blueprintId = blueprint?.id;

  const { data: kit, isLoading: kitLoading } = useImplementationKitByBlueprint(blueprintId);
  const createKit = useCreateImplementationKit();
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const handleGenerateClick = () => {
    if (!hasPro) {
      setShowUpgradeModal(true);
      return;
    }
    if (kit?.status === "complete") {
      navigate("/workspace");
      return;
    }
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
      { onSuccess: () => setShowTechStackDialog(false) }
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
      toast({ title: "Download started", description: `${filename}.md is downloading` });
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

  const handleCopy = async (docId: string) => {
    try {
      // Placeholder: in a real implementation, fetch content and copy
      await navigator.clipboard.writeText(`Document ID: ${docId}`);
      toast({ title: "Copied", description: "Document reference copied to clipboard" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  // Loading state
  if (blueprintLoading || kitLoading) {
    return (
      <div className="border border-border" style={{ background: "hsl(240 12% 7%)" }}>
        <div className="p-6 space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  // No kit exists - show CTA
  if (!kit) {
    return (
      <>
        {/* Header */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-[1px]" style={{ background: "hsl(43 52% 54%)" }} />
              <span className="font-mono-tb text-[0.68rem] uppercase tracking-wider" style={{ color: "hsl(43 52% 54%)" }}>
                IMPLEMENTATION KIT
              </span>
            </div>
            <h2 className="font-display font-bold text-2xl" style={{ color: "hsl(40 15% 93%)" }}>
              Your build is <em className="text-primary" style={{ fontStyle: "italic" }}>ready</em>.
            </h2>
            {venture && (
              <p className="font-mono-tb text-[0.72rem] uppercase mt-2 text-primary">
                {venture.name || "Untitled Venture"}
              </p>
            )}
          </div>

          {/* Progress Indicators */}
          <div className="flex gap-6">
            {DOCUMENTS.map((doc) => (
              <div key={doc.key} className="flex flex-col items-center gap-2">
                <div
                  className="w-2.5 h-2.5 border"
                  style={{
                    borderColor: "hsl(220 12% 58%)",
                    background: "transparent",
                  }}
                />
                <span className="font-mono-tb text-[0.58rem] uppercase" style={{ color: "hsl(220 12% 58%)" }}>
                  {doc.shortLabel}
                </span>
              </div>
            ))}
          </div>

          {/* Generate CTA */}
          <div
            className="border border-dashed p-8 flex flex-col items-center gap-4"
            style={{ borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}
          >
            <Package className="h-6 w-6 text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: "hsl(40 15% 93%)" }}>
                Generate your Implementation Kit
              </p>
              <p className="text-xs mt-1" style={{ color: "hsl(220 12% 58%)" }}>
                Tech specs, architecture, and a roadmap for your venture
              </p>
            </div>
            <button
              onClick={handleGenerateClick}
              className="bg-primary text-primary-foreground font-medium text-[0.78rem] tracking-[0.06em] uppercase px-5 py-2.5 transition-opacity hover:opacity-90"
            >
              GENERATE KIT
              <ArrowRight className="h-3 w-3 ml-2 inline" />
            </button>
          </div>
        </div>

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
  if (kit.status === "generating") {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-5 h-[1px]" style={{ background: "hsl(43 52% 54%)" }} />
            <span className="font-mono-tb text-[0.68rem] uppercase tracking-wider" style={{ color: "hsl(43 52% 54%)" }}>
              IMPLEMENTATION KIT
            </span>
          </div>
          <h2 className="font-display font-bold text-2xl" style={{ color: "hsl(40 15% 93%)" }}>
            Your build is <em className="text-primary" style={{ fontStyle: "italic" }}>ready</em>.
          </h2>
        </div>

        {/* Progress Indicators */}
        <div className="flex gap-6">
          {DOCUMENTS.map((doc, i) => (
            <div key={doc.key} className="flex flex-col items-center gap-2">
              <div
                className={`w-2.5 h-2.5 border ${i === 0 ? "animate-pulse" : ""}`}
                style={{
                  borderColor: "hsl(43 52% 54%)",
                  background: "transparent",
                }}
              />
              <span className="font-mono-tb text-[0.58rem] uppercase" style={{ color: "hsl(220 12% 58%)" }}>
                {doc.shortLabel}
              </span>
            </div>
          ))}
        </div>

        <div
          className="border p-6 flex items-center gap-3"
          style={{ borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}
        >
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <p className="font-medium text-sm" style={{ color: "hsl(40 15% 93%)" }}>
              Generating Implementation Kit...
            </p>
            <p className="text-xs" style={{ color: "hsl(220 12% 58%)" }}>
              This usually takes 1-2 minutes
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Kit has error
  if (kit.status === "error") {
    return (
      <>
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-[1px]" style={{ background: "hsl(43 52% 54%)" }} />
              <span className="font-mono-tb text-[0.68rem] uppercase tracking-wider" style={{ color: "hsl(43 52% 54%)" }}>
                IMPLEMENTATION KIT
              </span>
            </div>
          </div>

          <div
            className="border p-6 flex items-center gap-3"
            style={{ borderColor: "hsl(0 65% 52% / 0.3)", background: "hsl(0 65% 52% / 0.05)" }}
          >
            <AlertCircle className="h-5 w-5 shrink-0" style={{ color: "hsl(0 65% 52%)" }} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm" style={{ color: "hsl(0 65% 52%)" }}>
                Kit Generation Failed
              </p>
              <p className="text-xs truncate" style={{ color: "hsl(220 12% 58%)" }}>
                {kit.error_message || "An error occurred"}
              </p>
            </div>
            <button
              onClick={handleGenerateClick}
              className="border px-4 py-2 font-mono-tb text-[0.65rem] uppercase transition-colors hover:text-foreground"
              style={{ borderColor: "hsl(240 10% 14%)", color: "hsl(220 12% 58%)" }}
            >
              RETRY
            </button>
          </div>
        </div>

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

  // Kit is complete - full tabbed document viewer
  const activeDoc = DOCUMENTS[activeTab];
  const activeDocId = (kit as any)[activeDoc.key] as string | null;
  const docStatus = getDocStatus(kit, activeDoc.key);

  return (
    <>
      <div className="space-y-0">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-5 h-[1px]" style={{ background: "hsl(43 52% 54%)" }} />
            <span className="font-mono-tb text-[0.68rem] uppercase tracking-wider" style={{ color: "hsl(43 52% 54%)" }}>
              IMPLEMENTATION KIT
            </span>
          </div>
          <h2 className="font-display font-bold text-2xl" style={{ color: "hsl(40 15% 93%)" }}>
            Your build is <em className="text-primary" style={{ fontStyle: "italic" }}>ready</em>.
          </h2>
          {venture && (
            <p className="font-mono-tb text-[0.72rem] uppercase mt-2 text-primary">
              {venture.name || "Untitled Venture"}
            </p>
          )}
        </div>

        {/* Progress Indicators */}
        <div className="flex gap-4 sm:gap-6 mb-6">
          {DOCUMENTS.map((doc) => {
            const status = getDocStatus(kit, doc.key);
            return (
              <div key={doc.key} className="flex flex-col items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 ${status === "generating" ? "animate-pulse" : ""}`}
                  style={{
                    background: status === "complete" ? "hsl(43 52% 54%)" : "transparent",
                    border: status === "complete"
                      ? "none"
                      : status === "generating"
                        ? "1px solid hsl(43 52% 54%)"
                        : "1px solid hsl(220 12% 58%)",
                  }}
                />
                <span className="font-mono-tb text-[0.58rem] uppercase" style={{ color: "hsl(220 12% 58%)" }}>
                  {doc.shortLabel}
                </span>
              </div>
            );
          })}
        </div>

        {/* Document Tabs */}
        <div className="flex overflow-x-auto scrollbar-hide" style={{ borderBottom: "1px solid hsl(240 10% 14%)" }}>
          {DOCUMENTS.map((doc, i) => {
            const isActive = i === activeTab;
            return (
              <button
                key={doc.key}
                onClick={() => setActiveTab(i)}
                className="transition-colors cursor-pointer whitespace-nowrap min-h-[44px]"
                style={{
                  padding: "14px 16px",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "0.68rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: isActive ? "hsl(43 52% 54%)" : "hsl(220 12% 58%)",
                  borderBottom: isActive ? "2px solid hsl(43 52% 54%)" : "2px solid transparent",
                  marginBottom: isActive ? "-1px" : "0",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = "hsl(40 15% 93%)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = "hsl(220 12% 58%)";
                }}
              >
                {doc.shortLabel}
              </button>
            );
          })}
        </div>

        {/* Document Content Area */}
        <div
          className="relative border border-t-0"
          style={{
            background: "hsl(240 12% 7%)",
            borderColor: "hsl(240 10% 14%)",
          }}
        >
          {/* Export buttons */}
          {docStatus === "complete" && activeDocId && (
            <div className="absolute top-4 right-3 sm:right-4 flex gap-1.5 sm:gap-2 z-10">
              <button
                onClick={() => handleCopy(activeDocId)}
                className="border px-3 sm:px-4 py-2 min-h-[44px] font-mono-tb text-[0.65rem] uppercase transition-colors hover:text-foreground"
                style={{
                  borderColor: "hsl(240 10% 14%)",
                  color: "hsl(220 12% 58%)",
                  background: "transparent",
                }}
              >
                <Copy className="h-3 w-3 inline mr-1.5" />
                COPY
              </button>
              <button
                onClick={() => handleDownload(activeDocId, activeDoc.label)}
                disabled={downloadingDoc === activeDocId}
                className="border px-3 sm:px-4 py-2 min-h-[44px] font-mono-tb text-[0.65rem] uppercase transition-colors hover:opacity-80 disabled:opacity-50"
                style={{
                  background: "hsl(43 52% 54% / 0.1)",
                  borderColor: "hsl(43 52% 54% / 0.35)",
                  color: "hsl(43 52% 54%)",
                }}
              >
                {downloadingDoc === activeDocId ? (
                  <Loader2 className="h-3 w-3 animate-spin inline" />
                ) : (
                  <>
                    <Download className="h-3 w-3 inline mr-1.5" />
                    EXPORT PDF
                  </>
                )}
              </button>
            </div>
          )}

          {/* Content */}
          <div className="px-4 py-8 sm:px-12 sm:py-10 max-w-[680px]">
            {docStatus === "complete" && activeDocId ? (
              <div className="space-y-4">
                <div
                  className="font-mono-tb text-[0.68rem] uppercase pb-2 mb-4"
                  style={{
                    color: "hsl(43 52% 54%)",
                    borderBottom: "1px solid hsl(240 10% 14%)",
                  }}
                >
                  {activeDoc.label}
                </div>
                <p className="text-[0.88rem] font-light leading-[1.75]" style={{ color: "hsl(40 15% 93%)" }}>
                  Document generated successfully. View the full document in your workspace.
                </p>
                <Link
                  to={`/workspace/${activeDocId}`}
                  className="inline-flex items-center gap-2 text-primary font-mono-tb text-[0.68rem] uppercase hover:opacity-80 transition-opacity mt-4"
                >
                  <ExternalLink className="h-3 w-3" />
                  OPEN IN WORKSPACE
                </Link>
              </div>
            ) : (
              /* Locked overlay */
              <div
                className="absolute inset-0 flex flex-col items-center justify-center z-20"
                style={{ background: "hsl(240 14% 4% / 0.92)" }}
              >
                <Lock className="h-6 w-6 mb-4" style={{ color: "hsl(43 52% 54%)" }} />
                <p className="font-display italic text-lg" style={{ color: "hsl(40 15% 93%)" }}>
                  This document is not yet available.
                </p>
                <button
                  onClick={handleGenerateClick}
                  className="mt-6 w-64 bg-primary text-primary-foreground font-medium text-[0.78rem] tracking-[0.06em] uppercase py-3 transition-opacity hover:opacity-90"
                >
                  GENERATE KIT
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Generate CLAUDE.md */}
        {kit.status === "complete" && (
          <div
            className="mt-4 border"
            style={{
              borderColor: "hsl(240 10% 14%)",
              background: "hsl(240 12% 7%)",
            }}
          >
            <button
              onClick={() => downloadClaudeMd(venture?.name || "Venture")}
              className="w-full flex items-center gap-3 sm:gap-4 min-h-[44px] transition-colors"
              style={{ padding: "16px 16px" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "hsl(240 10% 10%)";
                e.currentTarget.style.borderLeftColor = "hsl(43 60% 65%)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderLeftColor = "hsl(43 52% 54%)";
              }}
            >
              <Terminal className="h-4 w-4 shrink-0" style={{ color: "hsl(43 52% 54%)" }} />
              <div className="text-left">
                <span
                  className="font-mono-tb text-[0.72rem] uppercase tracking-wider block"
                  style={{ color: "hsl(40 15% 93%)" }}
                >
                  Generate CLAUDE.md
                </span>
                <span
                  className="font-mono-tb text-[0.6rem] block mt-0.5"
                  style={{ color: "hsl(220 12% 58%)" }}
                >
                  For use with Claude Code
                </span>
              </div>
              <Download className="h-3 w-3 ml-auto" style={{ color: "hsl(220 12% 58%)" }} />
            </button>
          </div>
        )}

        {/* Spec validation */}
        {kit.spec_validation && (
          <div className="mt-4">
            <SpecValidationSection validation={kit.spec_validation} />
          </div>
        )}
      </div>

      <ProUpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reasonCode="EXPORT_REQUIRES_PRO"
      />
    </>
  );
}
