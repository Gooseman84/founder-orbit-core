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
      const exemptPaths = ["/auth", "/onboarding", "/onboarding/interview", "/onboarding/extended", "/discover", "/discover/summary", "/discover/results"];
      if (exemptPaths.some(path => location.pathname.startsWith(path))) return;

      try {
        // Check both founder_profiles and founder_interviews
        const [profileResult, interviewResult] = await Promise.all([
          supabase
            .from("founder_profiles")
            .select("id, interview_completed_at")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("founder_interviews")
            .select("id")
            .eq("user_id", user.id)
            .eq("status", "completed")
            .limit(1)
            .maybeSingle(),
        ]);

        if (profileResult.error) {
          console.error("Error checking onboarding status:", profileResult.error);
          return;
        }

        const profile = profileResult.data;
        const hasCompletedInterview = !!interviewResult.data;

        // Has a profile row → they're onboarded (grandfathered or completed)
        if (profile) return;

        // No profile at all → redirect to /discover (Mavrik interview)
        if (!profile) {
          navigate("/discover", { replace: true });
        }
      } catch (error) {
        console.error("Unexpected error in onboarding guard:", error);
      }
    };

    checkOnboardingStatus();
  }, [user, loading, location.pathname, navigate]);
};
