import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
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
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeButton } from "@/components/billing/UpgradeButton";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Navigation structure organized by founder journey
const nowSection = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Daily Pulse", href: "/daily-reflection", icon: Activity },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
];

const createSection = [
  { name: "Idea Lab", href: "/ideas", icon: Lightbulb },
  { name: "Fusion Lab", href: "/fusion-lab", icon: Combine },
  { name: "Niche Radar", href: "/radar", icon: Radar },
];

const buildSection = [
  { name: "Blueprint", href: "/blueprint", icon: Map },
  { name: "Workspace", href: "/workspace", icon: FileText },
];

const alignSection = [
  { name: "North Star", href: "/north-star", icon: Target },
];

const systemSection = [
  { name: "AI Co-Founder", href: "/context-inspector", icon: Eye },
  { name: "Profile", href: "/profile", icon: User },
  { name: "Billing", href: "/billing", icon: CreditCard },
];

interface SidebarNavProps {
  onNavigate?: () => void;
}

interface NavSectionProps {
  label: string;
  items: typeof nowSection;
  defaultOpen?: boolean;
  onNavigate?: () => void;
}

function NavSection({ label, items, defaultOpen = false, onNavigate }: NavSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>{label}</span>
          <ChevronRight 
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isOpen && "rotate-90"
            )} 
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={onNavigate}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg text-foreground/80 hover:bg-secondary hover:text-foreground transition-colors ml-2"
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

  const handleSignOut = () => {
    signOut();
    onNavigate?.();
  };

  return (
    <nav className="flex flex-col gap-1 p-4 h-full">
      {/* NOW Section - Always visible, never collapsed */}
      <div className="mb-2">
        <span className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
          Now
        </span>
        <div className="space-y-1">
          {nowSection.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg text-foreground/80 hover:bg-secondary hover:text-foreground transition-colors"
              activeClassName="bg-primary text-primary-foreground font-semibold ring-1 ring-primary/40 hover:bg-primary/90"
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* CREATE Section - Collapsible */}
      <NavSection 
        label="Create" 
        items={createSection} 
        defaultOpen={false}
        onNavigate={onNavigate}
      />

      {/* BUILD Section - Collapsible */}
      <NavSection 
        label="Build" 
        items={buildSection} 
        defaultOpen={false}
        onNavigate={onNavigate}
      />

      {/* ALIGN Section - Collapsible */}
      <NavSection 
        label="Align" 
        items={alignSection} 
        defaultOpen={false}
        onNavigate={onNavigate}
      />

      {/* SYSTEM Section - Collapsible */}
      <NavSection 
        label="System" 
        items={systemSection} 
        defaultOpen={false}
        onNavigate={onNavigate}
      />
      
      {/* Bottom section - always pinned */}
      <div className="mt-auto pt-4 border-t border-border space-y-2">
        <UpgradeButton variant="sidebar" />
        
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-4 py-3 text-sm font-medium"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign Out
        </Button>
      </div>
    </nav>
  );
}
