/**
 * Lightweight analytics helpers for TrueBlazer.
 *
 * These are intentionally simple and framework-agnostic.
 * You can later wire them to Supabase, PostHog, Segment, etc.
 */

type AnalyticsEventName =
  | "onboarding_completed"
  | "idea_generated"
  | "idea_vetted"
  | "opportunity_scored"
  | "blueprint_refreshed"
  | "task_completed"
  | "upgrade_clicked"
  | "checkout_completed"
  | "page_view";

export interface AnalyticsEvent {
  name: AnalyticsEventName | string;
  properties?: Record<string, any>;
  timestamp: string;
}

/**
 * Internal buffer in case you want to batch events later.
 */
const eventBuffer: AnalyticsEvent[] = [];

/**
 * Core event tracker. Right now it:
 * - Logs to console in dev
 * - Pushes to window.dataLayer if present (Google Tag Manager)
 * - Stores in a simple in-memory buffer
 */
export function trackEvent(
  name: AnalyticsEventName | string,
  properties?: Record<string, any>
): void {
  const event: AnalyticsEvent = {
    name,
    properties: properties ?? {},
    timestamp: new Date().toISOString(),
  };

  // Basic console logging (safe in all envs)
  if (typeof console !== "undefined") {
    console.debug("[Analytics]", event);
  }

  // GTM / gtag style
  if (typeof window !== "undefined") {
    const w = window as any;
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({ event: name, ...properties });
    }
    if (typeof w.gtag === "function") {
      w.gtag("event", name, properties ?? {});
    }
  }

  eventBuffer.push(event);
}

/**
 * Track a page view.
 */
export function trackPageView(path: string): void {
  trackEvent("page_view", { path });
}

/**
 * Get a snapshot of the in-memory buffer (useful for debugging).
 */
export function getBufferedEvents(): AnalyticsEvent[] {
  return [...eventBuffer];
}

/**
 * Clear the in-memory buffer.
 */
export function clearBufferedEvents(): void {
  eventBuffer.length = 0;
}
