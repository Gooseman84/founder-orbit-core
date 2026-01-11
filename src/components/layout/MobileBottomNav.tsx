import { useState, useMemo } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { Home, Lightbulb, Map, FileText, MoreHorizontal, Radar, Combine, Target, Eye, User, CreditCard, LogOut, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNorthStarVenture } from "@/hooks/useNorthStarVenture";
import { useVentureState } from "@/hooks/useVentureState";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { northStarVenture } = useNorthStarVenture();
  const { activeVenture } = useVentureState();
  const [moreOpen, setMoreOpen] = useState(false);

  // Check if venture is in executing state
  const isExecuting = activeVenture?.venture_state === "executing";

  // Compute blueprintHref same as SidebarNav
  const ventureId = northStarVenture?.id ?? activeVenture?.id;
  const blueprintHref = ventureId ? `/blueprint?ventureId=${ventureId}` : "/blueprint";

  // Build primary tabs based on execution state
  const primaryTabs = useMemo(() => {
    if (isExecuting) {
      // Execution mode: Home, Tasks, Blueprint, Workspace
      return [
        { label: "Home", path: "/dashboard", icon: Home },
        { label: "Tasks", path: "/tasks", icon: ListChecks },
        { label: "Blueprint", path: blueprintHref, icon: Map },
        { label: "Workspace", path: "/workspace", icon: FileText },
      ];
    }
    // Default: Home, Idea Lab, Blueprint, Workspace
    return [
      { label: "Home", path: "/dashboard", icon: Home },
      { label: "Idea Lab", path: "/ideas", icon: Lightbulb },
      { label: "Blueprint", path: blueprintHref, icon: Map },
      { label: "Workspace", path: "/workspace", icon: FileText },
    ];
  }, [isExecuting, blueprintHref]);

  const moreItems = [
    { label: "Niche Radar", path: "/radar", icon: Radar },
    { label: "Fusion Lab", path: "/fusion-lab", icon: Combine },
    { label: "North Star", path: "/north-star", icon: Target },
    { label: "AI Co-Founder", path: "/context-inspector", icon: Eye },
    { label: "Profile", path: "/profile", icon: User },
    { label: "Billing", path: "/billing", icon: CreditCard },
  ];

  const isTabActive = (path: string) => {
    // Handle blueprint with query params
    if (path.startsWith("/blueprint")) {
      return location.pathname === "/blueprint";
    }
    // Handle tasks route
    if (path === "/tasks") {
      return location.pathname === "/tasks" || location.pathname.startsWith("/tasks/");
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const isMoreActive = moreItems.some(item => isTabActive(item.path));

  const handleTap = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleMoreItemClick = (path: string) => {
    handleTap();
    navigate(path);
    setMoreOpen(false);
  };

  const handleSignOut = () => {
    handleTap();
    signOut();
    setMoreOpen(false);
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 bg-background/90 backdrop-blur border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex items-center justify-around h-14">
        {primaryTabs.map(({ label, path, icon: Icon }) => {
          const isActive = isTabActive(path);

          return (
            <Link
              key={label}
              to={path}
              onClick={handleTap}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-150 active:scale-95",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative flex flex-col items-center">
                <Icon
                  className={cn(
                    "w-5 h-5 transition-transform duration-150",
                    isActive && "scale-110"
                  )}
                />
                {isActive && (
                  <span className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[11px] font-medium mt-1">{label}</span>
            </Link>
          );
        })}

        {/* More Tab with Sheet */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              onClick={handleTap}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-150 active:scale-95",
                isMoreActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative flex flex-col items-center">
                <MoreHorizontal
                  className={cn(
                    "w-5 h-5 transition-transform duration-150",
                    isMoreActive && "scale-110"
                  )}
                />
                {isMoreActive && (
                  <span className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[11px] font-medium mt-1">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="pb-[env(safe-area-inset-bottom)] rounded-t-xl">
            <SheetHeader className="pb-2">
              <SheetTitle>More</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3 py-4">
              {moreItems.map(({ label, path, icon: Icon }) => {
                const isActive = isTabActive(path);
                return (
                  <button
                    key={label}
                    onClick={() => handleMoreItemClick(path)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-4 rounded-lg transition-colors",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "bg-secondary/50 text-foreground hover:bg-secondary"
                    )}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-medium text-center leading-tight">{label}</span>
                  </button>
                );
              })}
            </div>
            <div className="border-t pt-4">
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 text-muted-foreground"
                onClick={handleSignOut}
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
