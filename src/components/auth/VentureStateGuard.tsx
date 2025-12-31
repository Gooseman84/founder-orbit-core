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
      
      console.log(`[VentureStateGuard] Blocking "${currentPath}" (state: ${ventureState}, ideation: ${isIdeation}) -> redirecting to "${redirectTo}"`);
      
      // Only show toast for ideation attempts during execution
      // This is "soft guidance" not "locked room" messaging
      if (ventureState === "executing" && isIdeation) {
        toast({
          title: "Focus Mode",
          description: getLockedMessage(ventureState),
        });
        navigate(redirectTo, { replace: true });
        return;
      }
      
      // For reviewed state, show gentle guidance
      if (ventureState === "reviewed") {
        toast({
          title: "Review Pending",
          description: "Complete your Venture Review to proceed.",
        });
        navigate(redirectTo, { replace: true });
        return;
      }
      
      // For other blocked routes, soft redirect without aggressive messaging
      navigate(redirectTo, { replace: true });
    }
  }, [location.pathname, ventureState, isLoading, navigate, toast]);

  return <>{children}</>;
}
