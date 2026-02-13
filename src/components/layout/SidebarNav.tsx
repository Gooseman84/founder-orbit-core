import { useAuth } from "@/hooks/useAuth";
import { useNorthStarVenture } from "@/hooks/useNorthStarVenture";
import { useVentureState } from "@/hooks/useVentureState";
import { TrialStatusBadge } from "@/components/shared/TrialStatusBadge";
import { NavLink } from "@/components/NavLink";
import {
  Home,
  Lightbulb,
  Compass,
  Map,
  FileText,
  Target,
  User,
  CreditCard,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
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

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const { signOut } = useAuth();
  const { northStarVenture } = useNorthStarVenture();
  const { activeVenture } = useVentureState();

  const ventureState = activeVenture?.venture_state ?? null;
  const isExecutionMode =
    ventureState === "executing" || ventureState === "reviewed";

  const ventureId = northStarVenture?.id ?? activeVenture?.id;
  const blueprintHref = ventureId
    ? `/blueprint?ventureId=${ventureId}`
    : "/blueprint";
  const ventureName = activeVenture?.name ?? "My Venture";

  const [discoveryOpen, setDiscoveryOpen] = useState(false);

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
          <NavLink to="/workspace" onClick={onNavigate} className={linkClass} activeClassName={activeClass}>
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">Workspace</span>
          </NavLink>

          <Separator className="my-2" />

          <NavLink to="/ideas" onClick={onNavigate} className={cn(linkClass, "opacity-50")} activeClassName={activeClass}>
            <Lightbulb className="w-4 h-4 shrink-0" />
            <span className="truncate">Idea Lab</span>
          </NavLink>
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

          {/* Discovery Tools — lightweight inline toggle */}
          <button
            onClick={() => setDiscoveryOpen((o) => !o)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md text-foreground/80 hover:bg-secondary hover:text-foreground transition-colors w-full"
          >
            <Compass className="w-4 h-4 shrink-0" />
            <span className="truncate">Discovery Tools</span>
            <ChevronRight
              className={cn(
                "w-3 h-3 ml-auto transition-transform duration-200",
                discoveryOpen && "rotate-90"
              )}
            />
          </button>
          {discoveryOpen && (
            <div className="ml-4 space-y-0.5">
              <NavLink to="/fusion-lab" onClick={onNavigate} className={linkClass} activeClassName={activeClass}>
                <span className="truncate">Fusion Lab</span>
              </NavLink>
              <NavLink to="/radar" onClick={onNavigate} className={linkClass} activeClassName={activeClass}>
                <span className="truncate">Niche Radar</span>
              </NavLink>
            </div>
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
