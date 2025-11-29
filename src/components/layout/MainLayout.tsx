import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingGuard } from "@/hooks/useOnboardingGuard";
import { useXP } from "@/hooks/useXP";
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
  Map
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LevelBadge } from "@/components/shared/LevelBadge";
import { Skeleton } from "@/components/ui/skeleton";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Daily Streak", href: "/streak", icon: Zap },
  { name: "Ideas", href: "/ideas", icon: Lightbulb },
  { name: "Feed", href: "/feed", icon: Rss },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Workspace", href: "/workspace", icon: FileText },
  { name: "Daily Pulse", href: "/daily-reflection", icon: Activity },
  { name: "Radar", href: "/radar", icon: Radar },
  { name: "North Star", href: "/north-star", icon: Target },
  { name: "Blueprint", href: "/blueprint", icon: Map },
  { name: "Profile", href: "/profile", icon: User },
  { name: "Billing", href: "/billing", icon: CreditCard },
];

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { signOut } = useAuth();
  const { xpSummary, loading } = useXP();
  useOnboardingGuard();

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50">
        <div className="flex items-center justify-between h-full px-6">
          <h1 className="text-xl font-bold text-primary">TrueBlazer.AI</h1>
          
          {/* XP Level Badge */}
          <div className="flex items-center gap-3">
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : xpSummary ? (
              <LevelBadge level={xpSummary.level} />
            ) : null}
          </div>
        </div>
      </header>

      {/* Layout Container */}
      <div className="flex pt-16">
        {/* Side Navigation */}
        <aside className="fixed left-0 top-16 bottom-0 w-64 bg-card border-r border-border overflow-y-auto">
          <nav className="flex flex-col gap-1 p-4">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg text-foreground hover:bg-accent transition-colors"
                activeClassName="bg-accent text-primary"
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </NavLink>
            ))}
            
            <div className="mt-auto pt-4 border-t border-border">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-4 py-3 text-sm font-medium"
                onClick={signOut}
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </Button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-64">
          <div className="container mx-auto py-8 px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
