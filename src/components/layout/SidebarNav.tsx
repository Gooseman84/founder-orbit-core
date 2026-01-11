import { useState, useMemo, useEffect } from "react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useNorthStarVenture } from "@/hooks/useNorthStarVenture";
import { useVentureState } from "@/hooks/useVentureState";
import { getNavVisibility, type NavSection } from "@/lib/navVisibility";
import { 
  Home,
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
  ChevronRight
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

  // Now section items - ONLY Home (Daily Pulse integrated into Home page)
  const nowItems: NavItem[] = [
    { name: "Home", href: "/dashboard", icon: Home, section: "home" },
  ];

  // Create section items - filtered by visibility (reordered: Idea Lab, Niche Radar, Fusion Lab)
  const createItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [];
    if (isAllowed("idea-lab")) items.push({ name: "Idea Lab", href: "/ideas", icon: Lightbulb, section: "idea-lab" });
    if (isAllowed("radar")) items.push({ name: "Niche Radar", href: "/radar", icon: Radar, section: "radar" });
    if (isAllowed("fusion-lab")) items.push({ name: "Fusion Lab", href: "/fusion-lab", icon: Combine, section: "fusion-lab" });
    return items;
  }, [ventureState]);

  // Build section items - filtered by visibility
  const buildItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [];
    if (isAllowed("blueprint")) items.push({ name: "Blueprint", href: blueprintHref, icon: Map, section: "blueprint" });
    if (isAllowed("workspace")) items.push({ name: "Workspace", href: "/workspace", icon: FileText, section: "workspace" });
    return items;
  }, [ventureState, blueprintHref]);

  // Vision section items (renamed from Align) - filtered by visibility
  const visionItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [];
    if (isAllowed("north-star")) items.push({ name: "North Star", href: "/north-star", icon: Target, section: "north-star" });
    return items;
  }, [ventureState]);

  // Utilities section items (renamed from System)
  const utilitiesItems: NavItem[] = [
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
      {buildItems.length > 0 && <NavSectionComponent label="Build" items={buildItems} defaultOpen={isExecuting} onNavigate={onNavigate} />}
      {visionItems.length > 0 && <NavSectionComponent label="Vision" items={visionItems} defaultOpen={false} onNavigate={onNavigate} />}
      <NavSectionComponent label="Utilities" items={utilitiesItems} defaultOpen={false} onNavigate={onNavigate} />
      
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
