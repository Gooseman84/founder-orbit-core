import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useOnboardingGuard = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      // Don't run if still loading auth or no user
      if (loading || !user) return;

      // Don't redirect from auth page
      if (location.pathname === "/auth") return;

      try {
        const { data: profile, error } = await supabase
          .from("founder_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error checking onboarding status:", error);
          return;
        }

        // No profile exists - redirect to onboarding if not already there
        if (!profile && location.pathname !== "/onboarding") {
          navigate("/onboarding", { replace: true });
        }

        // Profile exists - redirect away from onboarding
        if (profile && location.pathname === "/onboarding") {
          navigate("/ideas", { replace: true });
        }
      } catch (error) {
        console.error("Unexpected error in onboarding guard:", error);
      }
    };

    checkOnboardingStatus();
  }, [user, loading, location.pathname, navigate]);
};
