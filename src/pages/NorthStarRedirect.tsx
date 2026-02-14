import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useVentureState } from "@/hooks/useVentureState";

/**
 * Redirect component that handles legacy /north-star URLs.
 * Routes to:
 * - /blueprint if user has an active venture
 * - /ideas if no active venture
 */
export default function NorthStarRedirect() {
  const navigate = useNavigate();
  const { activeVenture } = useVentureState();

  useEffect(() => {
    if (activeVenture?.id) {
      navigate(`/blueprint?ventureId=${activeVenture.id}`, { replace: true });
    } else {
      navigate("/ideas", { replace: true });
    }
  }, [activeVenture?.id, navigate]);

  return null;
}
