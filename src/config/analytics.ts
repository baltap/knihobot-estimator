/**
 * Analytics configuration.
 * Toggle and keys are mapped from environment variables.
 * PostHog runs in no-keys mode out of the box if config is disabled or key is empty.
 */

export const ANALYTICS_CONFIG = {
  enabled: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
  posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  posthogHost:
    process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
  logEvents: process.env.NODE_ENV === "development",
} as const;
