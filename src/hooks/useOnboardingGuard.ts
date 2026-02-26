import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useQuery } from "@tanstack/react-query";

export const useOnboardingGuard = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const { data: onboardingStatus } = useQuery({
    queryKey: ["onboarding-status", user?.id],
    queryFn: async () => {
      const [profileResult, interviewResult] = await Promise.all([
        supabase
          .from("founder_profiles")
          .select("id, interview_completed_at")
          .eq("user_id", user!.id)
          .maybeSingle(),
        supabase
          .from("founder_interviews")
          .select("id")
          .eq("user_id", user!.id)
          .eq("status", "completed")
          .limit(1)
          .maybeSingle(),
      ]);

      if (profileResult.error) {
        console.error("Error checking onboarding status:", profileResult.error);
        return { error: true };
      }

      return {
        profile: profileResult.data,
        hasCompletedInterview: !!interviewResult.data,
        error: false,
      };
    },
    enabled: !!user && !loading,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (loading || !user || !onboardingStatus) return;
    if (onboardingStatus.error) return;

    const exemptPaths = ["/auth", "/onboarding", "/discover", "/discover/summary", "/discover/results", "/commit"];
    if (exemptPaths.some(path => location.pathname.startsWith(path))) return;

    // Has a profile row → they're onboarded (grandfathered or completed)
    if (onboardingStatus.profile) return;

    // No profile at all → redirect to /discover (Mavrik interview)
    navigate("/discover", { replace: true });
  }, [user, loading, location.pathname, navigate, onboardingStatus]);
};
