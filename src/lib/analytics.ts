import posthog from "posthog-js";
import { ANALYTICS_CONFIG } from "@/config/analytics";

export function initAnalytics() {
  if (typeof window === "undefined") return;
  const { enabled, posthogKey, posthogHost } = ANALYTICS_CONFIG;
  if (enabled && posthogKey) {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      person_profiles: "identified_only",
      capture_pageview: false,
    });
  }
}

export function trackEvent(name: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const { enabled, posthogKey, logEvents } = ANALYTICS_CONFIG;
  if (enabled && posthogKey) {
    posthog.capture(name, properties);
  }
  if (logEvents) {
    console.log(`[Analytics Event]: ${name}`, properties);
  }
}
