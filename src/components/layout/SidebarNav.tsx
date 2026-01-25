import { useState, useMemo, useEffect } from "react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useNorthStarVenture } from "@/hooks/useNorthStarVenture";
import { useVentureState } from "@/hooks/useVentureState";
import { getNavVisibility, type NavSection } from "@/lib/navVisibility";
import { TrialStatusBadge } from "@/components/shared/TrialStatusBadge";
import { 
  Home,
  Activity,
  CheckSquare,
  Lightbulb,
  Combine,
  Radar,
  Map,
  FileText,
  Target,
  Eye,
  User,
  CreditCard,
  LogOut,
  ChevronRight,
  ClipboardCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type NavItem = { name: string; href: string; icon: React.ComponentType<{ className?: string }>; section: NavSection };

interface SidebarNavProps {
  onNavigate?: () => void;
}

interface NavSectionProps {
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
  onNavigate?: () => void;
}

function NavSectionComponent({ label, items, defaultOpen = false, onNavigate }: NavSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Update open state when defaultOpen changes
  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  if (items.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
          <span>{label}</span>
          <ChevronRight className={cn("h-3 w-3 transition-transform duration-200", isOpen && "rotate-90")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-0.5">
        {items.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={onNavigate}
            className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md text-foreground/80 hover:bg-secondary hover:text-foreground transition-colors ml-1"
            activeClassName="bg-primary text-primary-foreground font-semibold ring-1 ring-primary/40 hover:bg-primary/90"
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{item.name}</span>
          </NavLink>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const { signOut } = useAuth();
  const { northStarVenture } = useNorthStarVenture();
  const { activeVenture } = useVentureState();

  const ventureState = activeVenture?.venture_state ?? null;
  const visibility = getNavVisibility(ventureState);

  const isAllowed = (section: NavSection) => visibility.allowed.includes(section);

  // Build section with dynamic Blueprint link
  const ventureId = northStarVenture?.id ?? activeVenture?.id;
  const blueprintHref = ventureId ? `/blueprint?ventureId=${ventureId}` : "/blueprint";

  // Now section items - filtered by visibility
  const nowItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [
      { name: "Home", href: "/dashboard", icon: Home, section: "home" },
      { name: "Daily Pulse", href: "/daily-reflection", icon: Activity, section: "daily-pulse" },
    ];
    if (isAllowed("tasks")) {
      items.push({ name: "Tasks", href: "/tasks", icon: CheckSquare, section: "tasks" });
    }
    if (isAllowed("venture-review")) {
      items.push({ name: "Venture Review", href: "/venture-review", icon: ClipboardCheck, section: "venture-review" });
    }
    return items;
  }, [ventureState]);

  // Create section items - filtered by visibility
  const createItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [];
    if (isAllowed("idea-lab")) items.push({ name: "Idea Lab", href: "/ideas", icon: Lightbulb, section: "idea-lab" });
    if (isAllowed("fusion-lab")) items.push({ name: "Fusion Lab", href: "/fusion-lab", icon: Combine, section: "fusion-lab" });
    if (isAllowed("radar")) items.push({ name: "Niche Radar", href: "/radar", icon: Radar, section: "radar" });
    return items;
  }, [ventureState]);

  // Build section items - filtered by visibility
  const buildItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [];
    if (isAllowed("blueprint")) items.push({ name: "Blueprint", href: blueprintHref, icon: Map, section: "blueprint" });
    if (isAllowed("workspace")) items.push({ name: "Workspace", href: "/workspace", icon: FileText, section: "workspace" });
    return items;
  }, [ventureState, blueprintHref]);

  // Align section items - filtered by visibility
  const alignItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [];
    if (isAllowed("north-star")) items.push({ name: "North Star", href: "/north-star", icon: Target, section: "north-star" });
    return items;
  }, [ventureState]);

  // System section items
  const systemItems: NavItem[] = [
    { name: "AI Co-Founder", href: "/context-inspector", icon: Eye, section: "context-inspector" },
    { name: "Profile", href: "/profile", icon: User, section: "profile" },
    { name: "Billing", href: "/billing", icon: CreditCard, section: "billing" },
  ];

  const handleSignOut = () => {
    signOut();
    onNavigate?.();
  };

  // Determine if executing (to open Build section by default)
  const isExecuting = ventureState === "executing";

  return (
    <nav className="flex flex-col gap-0.5 p-3 h-full">
      {/* Trial Status Badge */}
      <div className="px-1 mb-2">
        <TrialStatusBadge />
      </div>

      {/* NOW Section - Always visible */}
      <div className="mb-1">
        <span className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Now</span>
        <div className="space-y-0.5">
          {nowItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md text-foreground/80 hover:bg-secondary hover:text-foreground transition-colors"
              activeClassName="bg-primary text-primary-foreground font-semibold ring-1 ring-primary/40 hover:bg-primary/90"
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {createItems.length > 0 && <NavSectionComponent label="Create" items={createItems} defaultOpen={false} onNavigate={onNavigate} />}
      {alignItems.length > 0 && <NavSectionComponent label="Align" items={alignItems} defaultOpen={false} onNavigate={onNavigate} />}
      {buildItems.length > 0 && <NavSectionComponent label="Build" items={buildItems} defaultOpen={isExecuting} onNavigate={onNavigate} />}
      <NavSectionComponent label="System" items={systemItems} defaultOpen={false} onNavigate={onNavigate} />
      
      <div className="mt-auto pt-3 border-t border-border space-y-1">
        <UpgradeButton variant="sidebar" />
        <Button variant="ghost" className="w-full justify-start gap-2.5 px-3 py-2 text-sm font-medium" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 shrink-0" />
          Sign Out
        </Button>
      </div>
    </nav>
  );
}
