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
    if (!isRouteAllowed(currentPath, ventureState)) {
      const redirectTo = getRedirectPath(ventureState);
      const message = getLockedMessage(ventureState);
      
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
