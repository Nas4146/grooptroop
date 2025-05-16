import { useEffect, useRef } from 'react';
import { SimplePerformance } from './simplePerformance';

/**
 * Hook to track React component performance
 */
export function useComponentPerformance(componentName: string) {
  const renderCount = useRef(0);
  const mountTime = useRef(0);

  // Track component mount
  useEffect(() => {
    renderCount.current = 0;
    mountTime.current = Date.now();
    const traceId = SimplePerformance.startTrace(`${componentName}_mount`);
    
    SimplePerformance.logEvent('component', `${componentName} mounted`);
    
    // Track unmount
    return () => {
      const mountDuration = Date.now() - mountTime.current;
      SimplePerformance.endTrace(traceId);
      SimplePerformance.logEvent('component', `${componentName} unmounted after ${mountDuration}ms (rendered ${renderCount.current} times)`);
    };
  }, [componentName]);
  
  // Track render
  renderCount.current += 1;
  const currentRender = renderCount.current;
  
  // Skip logging first render as it's captured in mount
  if (currentRender > 1) {
    SimplePerformance.logEvent('render', `${componentName} render #${currentRender}`);
  }
  
  return {
    // Helper to manually track operations within the component
    trackOperation: (name: string, operation: () => void) => {
      const traceId = SimplePerformance.startTrace(`${componentName}_${name}`);
      try {
        operation();
      } finally {
        SimplePerformance.endTrace(traceId);
      }
    },
    
    // Track async operation
    trackAsyncOperation: async (name: string, operation: () => Promise<any>) => {
      const traceId = SimplePerformance.startTrace(`${componentName}_${name}`);
      try {
        return await operation();
      } finally {
        SimplePerformance.endTrace(traceId);
      }
    }
  };
}