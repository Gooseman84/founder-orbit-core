import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "./SidebarNav";
import { MobileBottomNav } from "./MobileBottomNav";
import { LevelBadge } from "@/components/shared/LevelBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useXP } from "@/hooks/useXP";
import { useOnboardingGuard } from "@/hooks/useOnboardingGuard";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/BrandLogo";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { xpSummary, loading } = useXP();
  const location = useLocation();
  useOnboardingGuard();

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile nav is open
  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Top Bar - visible on < md */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-50 md:hidden">
        <div className="flex items-center justify-between h-full px-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="w-6 h-6" />
          </Button>
          
          <Link to="/" className="flex items-center">
            <BrandLogo height={28} className="select-none drop-shadow-[0_2px_10px_rgba(255,106,61,0.22)]" />
          </Link>
          
          <div className="w-10 flex justify-end">
            {loading ? (
              <Skeleton className="h-6 w-16" />
            ) : xpSummary ? (
              <LevelBadge level={xpSummary.level} />
            ) : null}
          </div>
        </div>
      </header>

      {/* Desktop Top Bar - visible on md+ */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 hidden md:block">
        <div className="flex items-center justify-between h-full px-6">
          <Link to="/" className="flex items-center">
            <BrandLogo height={32} className="select-none drop-shadow-[0_2px_10px_rgba(255,106,61,0.22)]" />
          </Link>
          
          <div className="flex items-center gap-3">
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : xpSummary ? (
              <LevelBadge level={xpSummary.level} />
            ) : null}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <div
        className={cn(
          "fixed inset-0 z-[60] md:hidden transition-opacity duration-300",
          mobileNavOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Dark overlay */}
        <div
          className="absolute inset-0 bg-black/60"
          onClick={() => setMobileNavOpen(false)}
        />
        
        {/* Slide-in drawer */}
        <aside
          className={cn(
            "absolute left-0 top-0 bottom-0 w-64 max-w-[80vw] bg-card border-r border-border",
            "transform transition-transform duration-300 ease-out",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between h-14 px-4 border-b border-border">
            <span className="text-lg font-bold text-primary">Menu</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="h-[calc(100%-3.5rem)] overflow-y-auto">
            <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </aside>
      </div>

      {/* Desktop Sidebar - visible on md+ */}
      <aside className="fixed left-0 top-16 bottom-0 w-64 bg-card border-r border-border overflow-y-auto hidden md:block z-40">
        <SidebarNav />
      </aside>

      {/* Main Content */}
      <main className="pt-14 pb-16 md:pt-16 md:pb-0 md:pl-64 min-w-0 overflow-x-hidden">
        <div className="container mx-auto py-4 px-3 md:py-8 md:px-8 max-w-7xl overflow-hidden">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
