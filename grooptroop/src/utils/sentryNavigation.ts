import * as Sentry from '@sentry/react-native';
import { SentryHelper } from './sentryHelper';

/**
 * Monitor navigation changes for performance
 * @param navigation React Navigation reference
 */
export function monitorNavigationPerformance(navigation: any): () => void {
  let lastRoute = '';
  let currentNavSpan: Sentry.Span | null = null;
  
  const unsubscribe = navigation.addListener('state', (e: any) => {
    const currentRoute = navigation.getCurrentRoute()?.name;
    
    // If we have a new route, track it
    if (currentRoute && currentRoute !== lastRoute) {
      // Finish the previous navigation span if it exists
      if (currentNavSpan) {
        currentNavSpan.finish();
      }
      
      // Start a new navigation span
      currentNavSpan = SentryHelper.startTransaction(
        `navigation.${currentRoute}`, 
        'navigation'
      );
      
      // Add breadcrumb for the navigation
      SentryHelper.addBreadcrumb({
        category: 'navigation',
        message: `Navigated to ${currentRoute}`,
        data: { 
          from: lastRoute || 'initial',
          to: currentRoute 
        }
      });
      
      lastRoute = currentRoute;
      
      // Set a timeout to finish the span (in case component mount events don't occur)
      setTimeout(() => {
        if (currentNavSpan) {
          currentNavSpan.finish();
          currentNavSpan = null;
        }
      }, 5000);
    }
  });
  
  return unsubscribe;
}