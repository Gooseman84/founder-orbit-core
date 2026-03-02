import { NavLink } from "@/components/NavLink";
import { 
  LayoutDashboard, 
  Lightbulb, 
  Target, 
  Rss, 
  CheckSquare, 
  User 
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Ideas", href: "/ideas", icon: Lightbulb },
  { name: "North Star", href: "/north-star", icon: Target },
  { name: "Feed", href: "/feed", icon: Rss },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Profile", href: "/profile", icon: User },
];

const inactiveClass =
  "flex items-center gap-2.5 py-3 px-5 text-[0.72rem] tracking-[0.08em] uppercase transition-colors text-[hsl(220_12%_58%)] hover:text-[hsl(40_15%_93%)] hover:bg-[hsl(240_10%_10%)]";
const activeClass =
  "!text-[hsl(43_52%_54%)] !bg-[hsl(240_10%_10%)] border-l-2 border-l-[hsl(43_52%_54%)]";

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-[hsl(240_14%_4%)]">
      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 w-[220px] border-r border-[hsl(240_10%_14%)]"
        style={{ background: "hsl(240 14% 4%)" }}
      >
        <div
          className="flex items-center h-[60px] px-6 border-b border-[hsl(240_10%_14%)]"
        >
          <h1 className="font-display text-[1.25rem] font-bold">
            <span className="text-[hsl(40_15%_93%)]">True</span>
            <span className="text-[hsl(43_52%_54%)]">Blazer</span>
          </h1>
        </div>
        <nav className="flex flex-col gap-[2px] py-2" style={{ fontFamily: "'DM Mono', monospace" }}>
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={inactiveClass}
              activeClassName={activeClass}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="pl-[220px]">
        <div className="py-10 px-12" style={{ background: "hsl(240 14% 4%)" }}>
          {children}
        </div>
      </main>
    </div>
  );
};
