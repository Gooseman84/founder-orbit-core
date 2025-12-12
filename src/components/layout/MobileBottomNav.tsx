import { useLocation, Link } from "react-router-dom";
import { Home, Lightbulb, CheckSquare, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Dashboard", path: "/dashboard", icon: Home },
  { label: "Ideas", path: "/ideas", icon: Lightbulb },
  { label: "Tasks", path: "/tasks", icon: CheckSquare },
  { label: "Workspace", path: "/workspace", icon: FolderKanban },
];

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 bg-background border-t border-border md:hidden">
      <div className="flex items-center justify-around h-14">
        {tabs.map(({ label, path, icon: Icon }) => {
          const isActive = location.pathname === path || location.pathname.startsWith(`${path}/`);
          
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-transform",
                  isActive && "scale-105"
                )}
              />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
