import { useLocation, Link } from "react-router-dom";
import { Home, Lightbulb, CheckSquare, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { TrialStatusBadge } from "@/components/shared/TrialStatusBadge";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

const tabs = [
  { label: "Dashboard", path: "/dashboard", icon: Home },
  { label: "Ideas", path: "/ideas", icon: Lightbulb },
  { label: "Tasks", path: "/tasks", icon: CheckSquare },
  { label: "Workspace", path: "/workspace", icon: FolderKanban },
];

export function MobileBottomNav() {
  const location = useLocation();
  const { isTrialing, isTrialExpired, isLockedOut, daysRemaining, hasPro } = useFeatureAccess();
  
  // Show trial banner if: expired, locked out, or trial with ≤2 days
  const showTrialBanner = !hasPro && (isTrialExpired || isLockedOut || (isTrialing && daysRemaining !== null && daysRemaining <= 2));

  return (
    <>
      {/* Trial status banner - only show for urgent states */}
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
            const isActive = location.pathname === path || location.pathname.startsWith(`${path}/`);
            
            const handleTap = () => {
              if (navigator.vibrate) {
                navigator.vibrate(10);
              }
            };

            return (
              <Link
                key={path}
                to={path}
                onClick={handleTap}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-150 active:scale-95",
                  isActive ? "text-[#FF6A00]" : "text-muted-foreground"
                )}
              >
                <div className="relative flex flex-col items-center">
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-transform duration-150",
                      isActive && "scale-110"
                    )}
                  />
                  {/* Active indicator dot */}
                  {isActive && (
                    <span className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-[#FF6A00]" />
                  )}
                </div>
                <span className="text-[11px] font-medium mt-1">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
