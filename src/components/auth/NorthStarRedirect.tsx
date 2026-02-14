import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useVentureState } from "@/hooks/useVentureState";
import { Loader2 } from "lucide-react";

/**
 * NorthStarRedirect: Gracefully redirects /north-star to appropriate destination
 * - If user has active venture → Blueprint page
 * - If no active venture → Idea Lab
 */
export function NorthStarRedirect() {
  const navigate = useNavigate();
  const { activeVenture } = useVentureState();

  useEffect(() => {
    if (activeVenture?.id) {
      navigate(`/blueprint?ventureId=${activeVenture.id}`, { replace: true });
    } else {
      navigate("/ideas", { replace: true });
    }
  }, [activeVenture, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}
