import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useVentureState } from "@/hooks/useVentureState";
import { isRouteAllowed, isIdeationRoute, getRedirectPath, getLockedMessage } from "@/lib/navVisibility";
import { useToast } from "@/hooks/use-toast";

interface VentureStateGuardProps {
  children: React.ReactNode;
}

/**
 * Route guard that provides soft guidance based on venture state.
 * 
 * SOFT GUIDANCE MODE:
 * - When executing: only redirect for ideation surfaces, allow contextual tools
 * - When reviewed: soft redirect to review with explanation
 * - No hard "locked room" blocking for workspace, blueprint, home
 */
export function VentureStateGuard({ children }: VentureStateGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeVenture, isLoading } = useVentureState();
  const { toast } = useToast();

  const ventureState = activeVenture?.venture_state ?? null;

  useEffect(() => {
    // Wait until venture state is loaded
    if (isLoading) return;

    const currentPath = location.pathname;
    
    // Check if current route is allowed
    const allowed = isRouteAllowed(currentPath, ventureState);
    
    if (!allowed) {
      const redirectTo = getRedirectPath(ventureState);
      const isIdeation = isIdeationRoute(currentPath);
      
      
      
      // SOFT GUIDANCE: Only redirect for truly blocked routes (like venture-review when not executing)
      // For ideation routes, show toast but DON'T block - let users access them
      if (isIdeation && ventureState === "executing") {
        // Show soft guidance toast only once per session
        const toastKey = "tb-focus-mode-toast-shown";
        if (!sessionStorage.getItem(toastKey)) {
          sessionStorage.setItem(toastKey, "true");
          toast({
            title: "Focus Mode Active",
            description: "You have an active venture. Consider focusing on execution, but feel free to explore.",
          });
        }
        // Don't redirect - let them through
        return;
      }
      
      // For reviewed state, gentle guidance to complete review
      if (ventureState === "reviewed") {
        toast({
          title: "Review Pending",
          description: "Complete your Venture Review when you're ready.",
        });
        // Only redirect if trying to access venture-specific routes like tasks
        if (currentPath === "/tasks") {
          navigate(redirectTo, { replace: true });
          return;
        }
        // Otherwise, let them through
        return;
      }
      
      // For truly blocked routes (like venture-review when not executing), redirect
      navigate(redirectTo, { replace: true });
    }
  }, [location.pathname, ventureState, isLoading, navigate, toast]);

  return <>{children}</>;
}
