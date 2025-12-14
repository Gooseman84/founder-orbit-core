import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { 
  LayoutDashboard, 
  Lightbulb, 
  Target, 
  Rss, 
  CheckSquare,
  Activity,
  Radar,
  User,
  FileText,
  Zap,
  CreditCard,
  LogOut,
  Map,
  Eye,
  Combine
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeButton } from "@/components/billing/UpgradeButton";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Daily Streak", href: "/streak", icon: Zap },
  { name: "Ideas", href: "/ideas", icon: Lightbulb },
  { name: "Fusion Lab", href: "/fusion-lab", icon: Combine },
  { name: "Feed", href: "/feed", icon: Rss },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Workspace", href: "/workspace", icon: FileText },
  { name: "Daily Pulse", href: "/daily-reflection", icon: Activity },
  { name: "Radar", href: "/radar", icon: Radar },
  { name: "North Star", href: "/north-star", icon: Target },
  { name: "Blueprint", href: "/blueprint", icon: Map },
  { name: "AI Context", href: "/context-inspector", icon: Eye },
  { name: "Profile", href: "/profile", icon: User },
  { name: "Billing", href: "/billing", icon: CreditCard },
];

interface SidebarNavProps {
  onNavigate?: () => void;
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const { signOut } = useAuth();

  const handleSignOut = () => {
    signOut();
    onNavigate?.();
  };

  return (
    <nav className="flex flex-col gap-1 p-4 h-full">
      {navigation.map((item) => (
        <NavLink
          key={item.name}
          to={item.href}
          onClick={onNavigate}
          className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg text-foreground hover:bg-accent transition-colors"
          activeClassName="bg-accent text-primary"
        >
          <item.icon className="w-5 h-5 shrink-0" />
          <span className="truncate">{item.name}</span>
        </NavLink>
      ))}
      
      <div className="mt-auto pt-4 border-t border-border space-y-2">
        {/* Upgrade CTA for free users */}
        <UpgradeButton variant="sidebar" />
        
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-4 py-3 text-sm font-medium"
          onClick={handleSignOut}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          Sign Out
        </Button>
      </div>
    </nav>
  );
}
