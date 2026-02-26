import { useLocation, Link } from "react-router-dom";
import {
  Home,
  Lightbulb,
  Map,
  FolderOpen,
  Target,
  Search,
  Menu,
  GitMerge,
  User,
  CreditCard,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TrialStatusBadge } from "@/components/shared/TrialStatusBadge";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useVentureState } from "@/hooks/useVentureState";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface NavTab {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MoreItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function MobileBottomNav() {
  const location = useLocation();
  const { isTrialing, isTrialExpired, isLockedOut, daysRemaining, hasPro } =
    useFeatureAccess();
  const { activeVenture } = useVentureState();
  const [moreOpen, setMoreOpen] = useState(false);

  const ventureState = activeVenture?.venture_state ?? null;
  const isExecutionMode =
    ventureState === "executing" || ventureState === "reviewed";
  const ventureName = activeVenture?.name ?? "Venture";
  const ventureId = activeVenture?.id;

  const canShowRadar = hasPro;
  const canShowFusion = hasPro;

  const getTabs = (): NavTab[] => {
    if (isExecutionMode && ventureId) {
      return [
        { label: ventureName, path: "/dashboard", icon: Target },
        {
          label: "Blueprint",
          path: `/blueprint?ventureId=${ventureId}`,
          icon: Map,
        },
        { label: "Tasks", path: "/tasks", icon: ClipboardCheck },
        { label: "Workspace", path: "/workspace", icon: FolderOpen },
      ];
    }
    const tabs: NavTab[] = [
      { label: "Home", path: "/dashboard", icon: Home },
      { label: "Ideas", path: "/ideas", icon: Lightbulb },
    ];
    if (canShowRadar) {
      tabs.push({ label: "Radar", path: "/radar", icon: Search });
    }
    return tabs;
  };

  const getMoreItems = (): MoreItem[] => {
    if (isExecutionMode) {
      const items: MoreItem[] = [
        { label: "Idea Lab", path: "/ideas", icon: Lightbulb },
      ];
      if (canShowRadar) items.push({ label: "Niche Radar", path: "/radar", icon: Search });
      if (canShowFusion) items.push({ label: "Fusion Lab", path: "/fusion-lab", icon: GitMerge });
      items.push({ label: "Profile", path: "/profile", icon: User });
      items.push({ label: "Billing", path: "/billing", icon: CreditCard });
      return items;
    }
    const items: MoreItem[] = [];
    if (canShowFusion) items.push({ label: "Fusion Lab", path: "/fusion-lab", icon: GitMerge });
    items.push({ label: "Profile", path: "/profile", icon: User });
    items.push({ label: "Billing", path: "/billing", icon: CreditCard });
    return items;
  };

  const tabs = getTabs();
  const moreItems = getMoreItems();

  const showTrialBanner =
    !hasPro &&
    (isTrialExpired ||
      isLockedOut ||
      (isTrialing && daysRemaining !== null && daysRemaining <= 2));

  return (
    <>
      {showTrialBanner && (
        <div className="fixed inset-x-0 bottom-14 z-30 px-3 pb-2 md:hidden">
          <div className="flex justify-center">
            <TrialStatusBadge compact />
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 bg-background/90 backdrop-blur border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex items-center justify-around h-14">
          {tabs.map(({ label, path, icon: Icon }) => {
            const basePath = path.split("?")[0];
            const isActive =
              location.pathname === basePath ||
              location.pathname.startsWith(`${basePath}/`);

            const handleTap = () => {
              if (navigator.vibrate) navigator.vibrate(10);
            };

            return (
              <Link
                key={path}
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
                <span className="text-[11px] font-medium mt-1 truncate max-w-[70px]">
                  {label}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(10);
              setMoreOpen(true);
            }}
            className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-150 active:scale-95 text-muted-foreground"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[11px] font-medium mt-1">More</span>
          </button>
        </div>
      </nav>

      {/* More bottom sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-left text-base">More</SheetTitle>
          </SheetHeader>
          <div className="space-y-1">
            {moreItems.map(({ label, path, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/80 hover:bg-secondary"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
