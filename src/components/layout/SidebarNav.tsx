import { useAuth } from "@/hooks/useAuth";
import { useNorthStarVenture } from "@/hooks/useNorthStarVenture";
import { useVentureState } from "@/hooks/useVentureState";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { TrialStatusBadge } from "@/components/shared/TrialStatusBadge";
import { NavLink } from "@/components/NavLink";
import {
  Home,
  Lightbulb,
  Map,
  FileText,
  Target,
  User,
  CreditCard,
  LogOut,
  ChevronRight,
  Search,
  GitMerge,
  FolderOpen,
  ClipboardCheck,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  onNavigate?: () => void;
}

const linkClass =
  "flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md text-foreground/80 hover:bg-secondary hover:text-foreground transition-colors";
const activeClass =
  "bg-primary text-primary-foreground font-semibold ring-1 ring-primary/40 hover:bg-primary/90";

const RESEARCH_TOOLS_KEY = "tb-research-tools-open";

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const { signOut } = useAuth();
  const { northStarVenture } = useNorthStarVenture();
  const { activeVenture } = useVentureState();
  const { features } = useFeatureAccess();

  const canShowRadar = features.canUseRadar !== "none";
  const canShowFusion = features.canUseFusionLab;

  const ventureState = activeVenture?.venture_state ?? null;
  const isExecutionMode =
    ventureState === "executing" || ventureState === "reviewed";

  const ventureId = northStarVenture?.id ?? activeVenture?.id;
  const blueprintHref = ventureId
    ? `/blueprint?ventureId=${ventureId}`
    : "/dashboard";
  const ventureName = activeVenture?.name ?? "My Venture";

  const [researchOpen, setResearchOpen] = useState(() => {
    try {
      return localStorage.getItem(RESEARCH_TOOLS_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(RESEARCH_TOOLS_KEY, String(researchOpen));
    } catch {}
  }, [researchOpen]);

  const handleSignOut = () => {
    signOut();
    onNavigate?.();
  };

  return (
    <nav className="flex flex-col gap-0.5 p-3 h-full">
      {/* Trial Status Badge */}
      <div className="px-1 mb-2">
        <TrialStatusBadge />
      </div>

      {isExecutionMode ? (
        /* ── EXECUTION MODE ── */
        <>
          <NavLink to="/dashboard" onClick={onNavigate} className={linkClass} activeClassName={activeClass}>
            <Target className="w-4 h-4 shrink-0" />
            <span className="truncate">{ventureName}</span>
          </NavLink>
          <NavLink to={blueprintHref} onClick={onNavigate} className={linkClass} activeClassName={activeClass}>
            <Map className="w-4 h-4 shrink-0" />
            <span className="truncate">Blueprint</span>
          </NavLink>
          <NavLink to="/tasks" onClick={onNavigate} className={linkClass} activeClassName={activeClass}>
            <ClipboardCheck className="w-4 h-4 shrink-0" />
            <span className="truncate">Tasks</span>
          </NavLink>
          <NavLink to="/workspace" onClick={onNavigate} className={linkClass} activeClassName={activeClass}>
            <FolderOpen className="w-4 h-4 shrink-0" />
            <span className="truncate">Workspace</span>
          </NavLink>

          <Separator className="my-2" />

          {/* Research Tools — collapsible section */}
          <button
            onClick={() => setResearchOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span>Research Tools</span>
            <ChevronRight
              className={cn(
                "w-3 h-3 ml-auto transition-transform duration-200",
                researchOpen && "rotate-90"
              )}
            />
          </button>
          {researchOpen && (
            <div className="ml-4 space-y-0.5">
              <NavLink to="/ideas" onClick={onNavigate} className={linkClass} activeClassName={activeClass}>
                <Lightbulb className="w-4 h-4 shrink-0" />
                <span className="truncate">Idea Lab</span>
              </NavLink>
              {canShowRadar && (
                <NavLink to="/radar" onClick={onNavigate} className={linkClass} activeClassName={activeClass}>
                  <Search className="w-4 h-4 shrink-0" />
                  <span className="truncate">Niche Radar</span>
                </NavLink>
              )}
              {canShowFusion && (
                <NavLink to="/fusion-lab" onClick={onNavigate} className={linkClass} activeClassName={activeClass}>
                  <GitMerge className="w-4 h-4 shrink-0" />
                  <span className="truncate">Fusion Lab</span>
                </NavLink>
              )}
            </div>
          )}
        </>
      ) : (
        /* ── DISCOVERY MODE ── */
        <>
          <NavLink to="/dashboard" onClick={onNavigate} className={linkClass} activeClassName={activeClass}>
            <Home className="w-4 h-4 shrink-0" />
            <span className="truncate">Home</span>
          </NavLink>
          <NavLink to="/ideas" onClick={onNavigate} className={linkClass} activeClassName={activeClass}>
            <Lightbulb className="w-4 h-4 shrink-0" />
            <span className="truncate">Idea Lab</span>
          </NavLink>
          {canShowRadar && (
            <NavLink to="/radar" onClick={onNavigate} className={linkClass} activeClassName={activeClass}>
              <Search className="w-4 h-4 shrink-0" />
              <span className="truncate">Niche Radar</span>
            </NavLink>
          )}
          {canShowFusion && (
            <NavLink to="/fusion-lab" onClick={onNavigate} className={linkClass} activeClassName={activeClass}>
              <GitMerge className="w-4 h-4 shrink-0" />
              <span className="truncate">Fusion Lab</span>
            </NavLink>
          )}
        </>
      )}

      <Separator className="my-2" />

      {/* System items — shared between modes */}
      <NavLink to="/profile" onClick={onNavigate} className={linkClass} activeClassName={activeClass}>
        <User className="w-4 h-4 shrink-0" />
        <span className="truncate">Profile</span>
      </NavLink>
      <NavLink to="/billing" onClick={onNavigate} className={linkClass} activeClassName={activeClass}>
        <CreditCard className="w-4 h-4 shrink-0" />
        <span className="truncate">Billing</span>
      </NavLink>

      {/* Bottom section */}
      <div className="mt-auto pt-3 border-t border-border space-y-1">
        <UpgradeButton variant="sidebar" />
        <Button
          variant="ghost"
          className="w-full justify-start gap-2.5 px-3 py-2 text-sm font-medium"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign Out
        </Button>
      </div>
    </nav>
  );
}
