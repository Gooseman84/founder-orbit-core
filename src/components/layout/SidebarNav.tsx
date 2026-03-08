import { useAuth } from "@/hooks/useAuth";
import { useNorthStarVenture } from "@/hooks/useNorthStarVenture";
import { useVentureState } from "@/hooks/useVentureState";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useNextStep } from "@/hooks/useNextStep";
import { NavLink } from "@/components/NavLink";
import {
  Home,
  Lightbulb,
  Map,
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
import { cn } from "@/lib/utils";

const STEP_ORDER = [
  "complete_interview",
  "complete_lightning_round",
  "generate_ideas",
  "calculate_fvs",
  "start_venture",
  "generate_blueprint",
  "generate_kit",
  "generate_tasks",
  "checkin_today",
];
const TOTAL_STEPS = STEP_ORDER.length;

interface SidebarNavProps {
  onNavigate?: () => void;
}

const navItemBase =
  "flex items-center gap-2.5 py-3 px-5 text-[0.72rem] tracking-[0.08em] uppercase transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary";
const navItemActive =
  "!text-primary !bg-secondary border-l-2 border-l-primary";

const RESEARCH_TOOLS_KEY = "tb-research-tools-open";

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const { signOut } = useAuth();
  const { northStarVenture } = useNorthStarVenture();
  const { activeVenture } = useVentureState();
  const { features } = useFeatureAccess();
  const { data: nextStep } = useNextStep();

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

  const stepNumber = nextStep ? STEP_ORDER.indexOf(nextStep.id) + 1 : null;
  const progressPercent = stepNumber ? Math.round((stepNumber / TOTAL_STEPS) * 100) : 100;
  const phase = isExecutionMode ? "Execution" : "Discovery";

  return (
    <nav className="flex flex-col gap-[2px] h-full font-mono text-[0.72rem]">
      {/* Journey Progress */}
      <div className="px-5 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[0.6rem] tracking-[0.12em] uppercase text-primary font-medium">
            {phase} Phase
          </span>
          {stepNumber && (
            <span className="text-[0.6rem] tracking-[0.08em] text-muted-foreground">
              {stepNumber}/{TOTAL_STEPS}
            </span>
          )}
        </div>
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="py-2">
        {isExecutionMode ? (
          <>
            <NavLink to="/dashboard" onClick={onNavigate} className={navItemBase} activeClassName={navItemActive}>
              <Target className="w-4 h-4 shrink-0" />
              <span className="truncate">{ventureName}</span>
            </NavLink>
            <NavLink to={blueprintHref} onClick={onNavigate} className={navItemBase} activeClassName={navItemActive}>
              <Map className="w-4 h-4 shrink-0" />
              <span className="truncate">Blueprint</span>
            </NavLink>
            <NavLink to="/tasks" onClick={onNavigate} className={navItemBase} activeClassName={navItemActive}>
              <ClipboardCheck className="w-4 h-4 shrink-0" />
              <span className="truncate">Tasks</span>
            </NavLink>
            <NavLink to="/workspace" onClick={onNavigate} className={navItemBase} activeClassName={navItemActive}>
              <FolderOpen className="w-4 h-4 shrink-0" />
              <span className="truncate">Workspace</span>
            </NavLink>

            <div className="my-2 mx-5 border-t border-border" />

            <button
              onClick={() => setResearchOpen((o) => !o)}
              className="flex items-center gap-2 px-5 py-2 text-[0.65rem] tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span>Research</span>
              <ChevronRight
                className={cn(
                  "w-3 h-3 ml-auto transition-transform duration-200",
                  researchOpen && "rotate-90"
                )}
              />
            </button>
            {researchOpen && (
              <div className="ml-4">
                <NavLink to="/ideas" onClick={onNavigate} className={navItemBase} activeClassName={navItemActive}>
                  <Lightbulb className="w-4 h-4 shrink-0" />
                  <span className="truncate">Idea Lab</span>
                </NavLink>
                {canShowRadar && (
                  <NavLink to="/radar" onClick={onNavigate} className={navItemBase} activeClassName={navItemActive}>
                    <Search className="w-4 h-4 shrink-0" />
                    <span className="truncate">Niche Radar</span>
                  </NavLink>
                )}
                {canShowFusion && (
                  <NavLink to="/fusion-lab" onClick={onNavigate} className={navItemBase} activeClassName={navItemActive}>
                    <GitMerge className="w-4 h-4 shrink-0" />
                    <span className="truncate">Fusion Lab</span>
                  </NavLink>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <NavLink to="/dashboard" onClick={onNavigate} className={navItemBase} activeClassName={navItemActive}>
              <Home className="w-4 h-4 shrink-0" />
              <span className="truncate">Home</span>
            </NavLink>
            <NavLink to="/ideas" onClick={onNavigate} className={navItemBase} activeClassName={navItemActive}>
              <Lightbulb className="w-4 h-4 shrink-0" />
              <span className="truncate">Idea Lab</span>
            </NavLink>
            {canShowRadar && (
              <NavLink to="/radar" onClick={onNavigate} className={navItemBase} activeClassName={navItemActive}>
                <Search className="w-4 h-4 shrink-0" />
                <span className="truncate">Niche Radar</span>
              </NavLink>
            )}
            {canShowFusion && (
              <NavLink to="/fusion-lab" onClick={onNavigate} className={navItemBase} activeClassName={navItemActive}>
                <GitMerge className="w-4 h-4 shrink-0" />
                <span className="truncate">Fusion Lab</span>
              </NavLink>
            )}
          </>
        )}

        <div className="my-2 mx-5 border-t border-border" />

        <NavLink to="/profile" onClick={onNavigate} className={navItemBase} activeClassName={navItemActive}>
          <User className="w-4 h-4 shrink-0" />
          <span className="truncate">Profile</span>
        </NavLink>
        <NavLink to="/billing" onClick={onNavigate} className={navItemBase} activeClassName={navItemActive}>
          <CreditCard className="w-4 h-4 shrink-0" />
          <span className="truncate">Billing</span>
        </NavLink>
      </div>

      <div className="mt-auto border-t border-border">
        <div className="py-2">
          <UpgradeButton variant="sidebar" />
          <Button
            variant="ghost"
            className="w-full justify-start gap-2.5 px-5 py-3 text-[0.72rem] tracking-[0.08em] uppercase font-mono text-muted-foreground hover:text-foreground hover:bg-secondary"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </Button>
        </div>
      </div>
    </nav>
  );
}
