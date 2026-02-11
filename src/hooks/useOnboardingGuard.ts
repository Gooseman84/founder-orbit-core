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

      // Don't redirect from these pages
      const exemptPaths = ["/auth", "/onboarding", "/onboarding/interview", "/onboarding/extended", "/discover"];
      if (exemptPaths.some(path => location.pathname.startsWith(path))) return;

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

        // No profile exists - redirect to onboarding
        if (!profile) {
          navigate("/onboarding", { replace: true });
        }
      } catch (error) {
        console.error("Unexpected error in onboarding guard:", error);
      }
    };

    checkOnboardingStatus();
  }, [user, loading, location.pathname, navigate]);
};
