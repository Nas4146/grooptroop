import { useEffect, useRef } from 'react';
import * as Sentry from '@sentry/react-native';

interface UseSentryPerformanceOptions {
  componentName: string;
  trackRenders?: boolean;
  trackProps?: boolean;
  trackChildren?: boolean;
}

export function useSentryPerformance({
  componentName,
  trackRenders = true,
  trackProps = false,
  trackChildren = false
}: UseSentryPerformanceOptions) {
  const renderCount = useRef(0);
  const mountSpan = useRef<Sentry.Span | null>(null);
  
  useEffect(() => {
    // Create a transaction for the component mount
    // Using the correct Sentry API to start a transaction
    const transaction = Sentry.startTransaction({
      name: `component.${componentName}.mount`,
      op: 'ui.render'
    });
    
    mountSpan.current = transaction;
    
    return () => {
      // End the transaction when component unmounts
      if (mountSpan.current) {
        mountSpan.current.setData('total_render_count', renderCount.current);
        mountSpan.current.finish();
      }
    };
  }, [componentName]);
  
  // Track render count
  useEffect(() => {
    if (trackRenders) {
      renderCount.current++;
      
      if (mountSpan.current) {
        mountSpan.current.setData('render_count', renderCount.current);
      }
      
      if (renderCount.current > 5) {
        // Track excessive renders
        Sentry.addBreadcrumb({
          category: 'performance.render',
          message: `${componentName} rendered ${renderCount.current} times`,
          level: renderCount.current > 10 ? Sentry.Severity.Warning : Sentry.Severity.Info
        });
      }
    }
  });
  
  return {
    trackInteraction: (name: string, metadata?: Record<string, any>) => {
      Sentry.addBreadcrumb({
        category: 'ui.interaction',
        message: `${componentName}: ${name}`,
        data: metadata,
        level: Sentry.Severity.Info
      });
    }
  };
}