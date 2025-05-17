import { SimplePerformance } from './simplePerformance';

/**
 * Middleware for monitoring state changes in Redux or other state management
 */
export const createPerformanceMiddleware = () => {
  return (store) => (next) => (action) => {
    // Start measuring
    const actionType = action.type || 'unknown';
    const traceId = SimplePerformance.startTrace(`redux_action_${actionType}`, 
      { actionType }, 
      'state-management');
    
    // Measure state size before
    const stateSizeBefore = JSON.stringify(store.getState()).length;
    
    // Execute action
    const result = next(action);
    
    // Measure after
    const stateSizeAfter = JSON.stringify(store.getState()).length;
    const stateChangeSize = stateSizeAfter - stateSizeBefore;
    
    // End measurement
    SimplePerformance.endTrace(traceId);
    
    // If state change is large, log it
    if (Math.abs(stateChangeSize) > 10000) { // 10KB
      SimplePerformance.logEvent('redux', 
        `Large state change (${(stateChangeSize/1024).toFixed(1)}KB) from action: ${actionType}`,
        undefined,
        true);
    }
    
    return result;
  };
};

/**
 * Hook to monitor local state updates in complex components
 */
export function useStateChangeMonitor(componentName: string) {
  return {
    trackStateUpdate: (stateName: string, updateFn: () => void) => {
      const traceId = SimplePerformance.startTrace(
        `${componentName}_state_${stateName}`,
        { component: componentName, state: stateName },
        'state-update'
      );
      
      try {
        updateFn();
      } finally {
        SimplePerformance.endTrace(traceId);
      }
    }
  };
}