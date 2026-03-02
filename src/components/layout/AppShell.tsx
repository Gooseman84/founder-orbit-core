import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "./SidebarNav";
import { MobileBottomNav } from "./MobileBottomNav";
import { LevelBadge } from "@/components/shared/LevelBadge";
import { HelpPopover } from "@/components/layout/HelpPopover";
import { Skeleton } from "@/components/ui/skeleton";
import { useXP } from "@/hooks/useXP";
import { useOnboardingGuard } from "@/hooks/useOnboardingGuard";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { xpSummary, loading } = useXP();
  const location = useLocation();
  useOnboardingGuard();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

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
      {/* Mobile Top Bar */}
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

          <h1 className="font-display text-lg font-bold">
            <span className="text-foreground">True</span>
            <span className="text-primary">Blazer</span>
          </h1>

          <div className="w-10 flex items-center justify-end gap-1">
            <HelpPopover />
            {loading ? (
              <Skeleton className="h-6 w-16" />
            ) : xpSummary ? (
              <LevelBadge level={xpSummary.level} />
            ) : null}
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside
        className="fixed left-0 top-0 bottom-0 w-[220px] border-r border-border overflow-y-auto hidden md:flex md:flex-col z-40"
        style={{ background: "hsl(240 14% 4%)" }}
      >
        {/* Logo */}
        <div className="flex items-center h-[60px] px-6 border-b border-border shrink-0">
          <h1 className="font-display text-[1.25rem] font-bold">
            <span className="text-foreground">True</span>
            <span className="text-primary">Blazer</span>
          </h1>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>

        {/* Support */}
        <div className="px-5 py-3 border-t border-border">
          <a
            href="mailto:support@trueblazer.ai"
            className="label-mono hover:text-foreground transition-colors"
          >
            support@trueblazer.ai
          </a>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      <div
        className={cn(
          "fixed inset-0 z-[60] md:hidden transition-opacity duration-300",
          mobileNavOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <div
          className="absolute inset-0 bg-black/60"
          onClick={() => setMobileNavOpen(false)}
        />
        <aside
          className={cn(
            "absolute left-0 top-0 bottom-0 w-[220px] max-w-[80vw] bg-card border-r border-border",
            "transform transition-transform duration-300 ease-out",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between h-14 px-4 border-b border-border">
            <span className="font-display text-lg font-bold text-primary">Menu</span>
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

      {/* Main Content */}
      <main className="pt-14 pb-16 md:pt-0 md:pb-0 md:pl-[220px] min-w-0 overflow-x-hidden">
        <div className="py-10 px-3 md:px-12 max-w-7xl overflow-hidden">
          {children}
        </div>
      </main>

      <MobileBottomNav />
      <FeedbackButton />
    </div>
  );
}
