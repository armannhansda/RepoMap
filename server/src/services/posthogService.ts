import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

/**
 * Returns the initialized PostHog server client, or null if API key is unconfigured.
 */
export function getPostHogClient(): PostHog | null {
  if (!posthogClient) {
    const apiKey = process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (apiKey) {
      posthogClient = new PostHog(apiKey, {
        host: process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      });
    }
  }
  return posthogClient;
}

/**
 * Safely capture a server-side telemetry event.
 * Will no-op gracefully if PostHog is not configured.
 */
export function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, any>
): void {
  try {
    const client = getPostHogClient();
    if (client) {
      client.capture({
        distinctId,
        event,
        ...(properties ? { properties } : {}),
      });
    }
  } catch (error) {
    console.error(`[PostHog] Failed to capture event "${event}":`, error);
  }
}

/**
 * Flush any queued telemetry events and cleanly shut down the PostHog client.
 */
export async function shutdownPostHog(): Promise<void> {
  if (posthogClient) {
    try {
      await posthogClient.shutdown();
      posthogClient = null;
      console.log('[PostHog] Server telemetry client shut down gracefully.');
    } catch (error) {
      console.error('[PostHog] Error during shutdown:', error);
    }
  }
}
