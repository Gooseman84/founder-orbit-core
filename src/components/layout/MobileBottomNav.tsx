import { useState, useMemo } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { Home, Lightbulb, Map, FileText, MoreHorizontal, Radar, Combine, Target, Eye, User, CreditCard, LogOut, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNorthStarVenture } from "@/hooks/useNorthStarVenture";
import { useVentureState } from "@/hooks/useVentureState";
import { useAuth } from "@/hooks/useAuth";
import { useDailyExecution } from "@/hooks/useDailyExecution";
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

  // Get daily tasks for badge count (for both execution mode Tasks badge and non-execution More indicator)
  const { dailyTasks, isLoadingTasks } = useDailyExecution(activeVenture);
  
  // Count incomplete tasks (hide during loading to avoid flicker)
  const incompleteTaskCount = useMemo(() => {
    if (isLoadingTasks || !dailyTasks) return 0;
    return dailyTasks.filter(task => !task.completed).length;
  }, [isLoadingTasks, dailyTasks]);

  // Show dot on More tab only when NOT in execution mode (since Tasks tab has badge in execution mode)
  const showMoreIndicator = !isExecuting && incompleteTaskCount > 0;

  // Compute blueprintHref same as SidebarNav
  const ventureId = northStarVenture?.id ?? activeVenture?.id;
  const blueprintHref = ventureId ? `/blueprint?ventureId=${ventureId}` : "/blueprint";

  // Build primary tabs based on execution state
  const primaryTabs = useMemo(() => {
    if (isExecuting) {
      // Execution mode: Home, Tasks, Blueprint, Workspace
      return [
        { label: "Home", path: "/dashboard", icon: Home, showBadge: false },
        { label: "Tasks", path: "/tasks", icon: ListChecks, showBadge: true },
        { label: "Blueprint", path: blueprintHref, icon: Map, showBadge: false },
        { label: "Workspace", path: "/workspace", icon: FileText, showBadge: false },
      ];
    }
    // Default: Home, Idea Lab, Blueprint, Workspace
    return [
      { label: "Home", path: "/dashboard", icon: Home, showBadge: false },
      { label: "Idea Lab", path: "/ideas", icon: Lightbulb, showBadge: false },
      { label: "Blueprint", path: blueprintHref, icon: Map, showBadge: false },
      { label: "Workspace", path: "/workspace", icon: FileText, showBadge: false },
    ];
  }, [isExecuting, blueprintHref]);

  // Grouped items for More sheet - conditionally include Idea Lab in execution mode
  const moreGroups = useMemo(() => {
    const createItems = isExecuting
      ? [
          { label: "Idea Lab", path: "/ideas", icon: Lightbulb },
          { label: "Niche Radar", path: "/radar", icon: Radar },
          { label: "Fusion Lab", path: "/fusion-lab", icon: Combine },
        ]
      : [
          { label: "Niche Radar", path: "/radar", icon: Radar },
          { label: "Fusion Lab", path: "/fusion-lab", icon: Combine },
        ];

    return [
      {
        label: "CREATE",
        items: createItems,
      },
      {
        label: "VISION",
        items: [
          { label: "North Star", path: "/north-star", icon: Target },
        ],
      },
      {
        label: "UTILITIES",
        items: [
          { label: "AI Co-Founder", path: "/context-inspector", icon: Eye },
          { label: "Profile", path: "/profile", icon: User },
          { label: "Billing", path: "/billing", icon: CreditCard },
        ],
      },
    ];
  }, [isExecuting]);

  // Flatten for isMoreActive check
  const allMoreItems = useMemo(() => moreGroups.flatMap(g => g.items), [moreGroups]);

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

  const isMoreActive = allMoreItems.some(item => isTabActive(item.path));

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
        {primaryTabs.map(({ label, path, icon: Icon, showBadge }) => {
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
                {/* Task count badge */}
                {showBadge && incompleteTaskCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-semibold bg-primary text-primary-foreground rounded-full">
                    {incompleteTaskCount > 99 ? "99+" : incompleteTaskCount}
                  </span>
                )}
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
                {/* Notification indicator dot */}
                {showMoreIndicator && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
                )}
                {isMoreActive && (
                  <span className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[11px] font-medium mt-1">More</span>
            </button>
          </SheetTrigger>
          <SheetContent 
            side="bottom" 
            className="pb-[env(safe-area-inset-bottom)] rounded-t-xl max-h-[80vh] overflow-y-auto"
          >
            <SheetHeader className="pb-2">
              <SheetTitle>More</SheetTitle>
            </SheetHeader>
            
            <div className="space-y-5 py-4">
              {moreGroups.map((group, groupIndex) => (
                <div 
                  key={group.label}
                  className="motion-safe:animate-fade-in motion-reduce:opacity-100"
                  style={{ 
                    animationDelay: `${groupIndex * 50}ms`,
                    animationFillMode: 'both'
                  }}
                >
                  {/* Section Header */}
                  <h3 
                    className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1 motion-safe:animate-fade-in motion-reduce:opacity-100"
                    style={{ 
                      animationDelay: `${groupIndex * 50 + 25}ms`,
                      animationFillMode: 'both'
                    }}
                  >
                    {group.label}
                  </h3>
                  
                  {/* Section Items */}
                  <div className="grid grid-cols-3 gap-2">
                    {group.items.map(({ label, path, icon: Icon }, itemIndex) => {
                      const isActive = isTabActive(path);
                      return (
                        <button
                          key={label}
                          onClick={() => handleMoreItemClick(path)}
                          className={cn(
                            "flex flex-col items-center justify-center gap-2 p-3 rounded-lg transition-colors motion-safe:transition-all motion-safe:duration-200",
                            isActive 
                              ? "bg-primary/10 text-primary" 
                              : "bg-secondary/50 text-foreground hover:bg-secondary motion-safe:active:scale-95"
                          )}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-[11px] font-medium text-center leading-tight">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Divider between groups (not after last group) */}
                  {groupIndex < moreGroups.length - 1 && (
                    <div className="border-b border-border/50 mt-4" />
                  )}
                </div>
              ))}
            </div>
            
            {/* Actions Section */}
            <div 
              className="border-t pt-3 motion-safe:animate-fade-in motion-reduce:opacity-100"
              style={{ 
                animationDelay: `${moreGroups.length * 50}ms`,
                animationFillMode: 'both'
              }}
            >
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                ACTIONS
              </h3>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground motion-safe:transition-colors"
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
