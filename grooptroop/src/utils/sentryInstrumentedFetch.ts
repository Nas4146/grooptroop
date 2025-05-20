import { SentryHelper } from './sentryHelper';

/**
 * Fetch wrapper that automatically reports performance to Sentry
 */
export async function sentryFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const tracker = SentryHelper.trackNetworkRequest(url, options);
  
  try {
    const response = await fetch(url, options);
    tracker.finish(response);
    return response;
  } catch (error) {
    tracker.finish(error as Error);
    throw error;
  }
}