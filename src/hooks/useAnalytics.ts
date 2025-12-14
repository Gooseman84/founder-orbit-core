import { useCallback } from "react";
import { trackEvent, trackPageView } from "@/lib/analytics";
import { useAuth } from "@/hooks/useAuth";

// Extend event types as needed
type TrueBlazerEvent =
  | "intake_completed"
  | "extended_intake_completed"
  | "interview_completed"
  | "idea_generated"
  | "idea_saved"
  | "idea_promoted"
  | "blueprint_created"
  | "blueprint_refreshed"
  | "task_completed"
  | "task_generated"
  | "reflection_submitted"
  | "weekly_review_viewed"
  | "opportunity_scored"
  | "radar_generated"
  | "workspace_doc_created"
  | "fusion_created"
  | "page_view"
  | "upgrade_clicked"
  | "checkout_started"
  | "checkout_completed"
  | "paywall_shown"
  | "locked_feature_clicked"
  | "pro_mode_clicked";

interface UseAnalyticsReturn {
  track: (event: TrueBlazerEvent, properties?: Record<string, any>) => void;
  trackPage: (path: string) => void;
}

/**
 * Hook for tracking analytics events throughout the app.
 * Currently logs to console; easily swappable to PostHog, Segment, etc.
 */
export function useAnalytics(): UseAnalyticsReturn {
  const { user } = useAuth();

  const track = useCallback(
    (event: TrueBlazerEvent, properties?: Record<string, any>) => {
      trackEvent(event, {
        ...properties,
        userId: user?.id,
        userEmail: user?.email,
      });
    },
    [user?.id, user?.email]
  );

  const trackPage = useCallback(
    (path: string) => {
      trackPageView(path);
    },
    []
  );

  return { track, trackPage };
}

// Export event names for type safety in components
export type { TrueBlazerEvent };
