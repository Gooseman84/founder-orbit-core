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
  { name: "Feed", href: "/feed", icon: Rss },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "North Star", href: "/north-star", icon: Target },
  { name: "Profile", href: "/profile", icon: User },
];

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50">
        <div className="flex items-center h-full px-6">
          <h1 className="text-xl font-bold text-primary">FounderOS</h1>
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
