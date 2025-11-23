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

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border">
        <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-primary">FounderOS</h1>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              activeClassName="bg-sidebar-accent text-sidebar-primary"
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="pl-64">
        <div className="container mx-auto py-8 px-8">
          {children}
        </div>
      </main>
    </div>
  );
};
