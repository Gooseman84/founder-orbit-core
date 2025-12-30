import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useVentureState } from "@/hooks/useVentureState";
import { isRouteAllowed, getRedirectPath, getLockedMessage } from "@/lib/navVisibility";
import { useToast } from "@/hooks/use-toast";

interface VentureStateGuardProps {
  children: React.ReactNode;
}

/**
 * Route guard that enforces venture state-based access control.
 * Redirects users to appropriate pages when accessing forbidden routes.
 * 
 * STRICT MODE:
 * - When executing: blocks ideation routes + unknown routes
 * - When reviewed: blocks most routes, forces review completion
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
      const message = getLockedMessage(ventureState);
      
      console.log(`[VentureStateGuard] Blocking "${currentPath}" (state: ${ventureState}) -> redirecting to "${redirectTo}"`);
      
      toast({
        title: "Section Locked",
        description: message,
        variant: "default",
      });
      
      navigate(redirectTo, { replace: true });
    }
  }, [location.pathname, ventureState, isLoading, navigate, toast]);

  return <>{children}</>;
}
