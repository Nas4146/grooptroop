import { useEffect, useRef } from 'react';
import { SentryService } from '../utils/sentryService';

/**
 * @deprecated Use usePerformance from sentryService.ts instead
 */
export function useSentryPerformance(componentName: string) {
  const renderCount = useRef(0);
  const transactionStartTime = useRef<number | null>(null);
  const transactionData = useRef<Record<string, any>>({});

  // mount / unmount
  useEffect(() => {
    console.warn('[SENTRY] useSentryPerformance is deprecated. Use usePerformance from sentryService.ts');
    // Use SentryService.logEvent instead of direct Sentry calls
    SentryService.logEvent('ui.lifecycle', `Component ${componentName} mounted`);
    transactionStartTime.current = Date.now();
    
    return () => {
      if (transactionStartTime.current) {
        // Calculate duration
        const duration = Date.now() - transactionStartTime.current;
        
        // Log component unmount
        SentryService.logEvent('ui.lifecycle', `Component ${componentName} unmounted`, {
          renders: renderCount.current,
          duration_ms: duration
        });
      }
    };
  }, [componentName]);

  // per-render bookkeeping
  useEffect(() => {
    renderCount.current += 1;
  });

  // Return a safe API that uses SentryService
  return {
    trackInteraction: (label: string, extra?: Record<string, unknown>) => {
      SentryService.logEvent('ui.interaction', `${componentName}:${label}`, extra);
    },
    
    trackOperation: (name: string) => {
      const operation = SentryService.startTransaction(
        `${componentName}_${name}`, 
        'component_operation'
      );
      
      return {
        finish: () => {
          operation.finish();
        }
      };
    }
  };
}