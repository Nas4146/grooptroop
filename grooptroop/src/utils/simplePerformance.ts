/**
 * Simple performance monitoring utility
 */

// Store traces with their start times
const traces = new Map<string, { startTime: number, metadata?: Record<string, string> }>();

// Store completed measurements for analysis
const completedTraces: Array<{
  name: string,
  duration: number,
  startTime: number,
  endTime: number,
  metadata?: Record<string, string>
}> = [];

// For dev builds, we'll keep a log history
const MAX_LOG_ENTRIES = 100;
const logHistory: string[] = [];

/**
 * Add an entry to the performance log
 */
function logPerf(message: string): void {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const logMessage = `[PERF ${timestamp}] ${message}`;
  console.log(logMessage);
  
  // Keep log history for debugging
  logHistory.unshift(logMessage);
  if (logHistory.length > MAX_LOG_ENTRIES) {
    logHistory.pop();
  }
}

// Initialize the module
logPerf('Performance monitoring initialized');

export const SimplePerformance = {
  /**
   * Start measuring a performance trace
   */
  startTrace: (name: string, metadata?: Record<string, string>): string => {
    const id = `${name}_${Date.now()}`;
    traces.set(id, {
      startTime: Date.now(),
      metadata
    });
    logPerf(`Started trace: ${name} (${id})`);
    return id;
  },
  
  /**
   * End a performance trace and record its duration
   */
  endTrace: (id: string): number | null => {
    const trace = traces.get(id);
    if (!trace) {
      logPerf(`Error: No trace found with ID: ${id}`);
      return null;
    }
    
    const endTime = Date.now();
    const duration = endTime - trace.startTime;
    traces.delete(id);
    
    // Extract name from ID (remove timestamp)
    const name = id.split('_')[0];
    
    // Store the completed trace
    completedTraces.push({
      name,
      duration,
      startTime: trace.startTime,
      endTime,
      metadata: trace.metadata
    });
    
    logPerf(`Completed trace: ${name} - ${duration}ms`);
    return duration;
  },
  
  /**
   * Log a one-time performance event
   */
  logEvent: (category: string, name: string, metadata?: Record<string, string>): void => {
    logPerf(`Event [${category}] ${name}`);
  },
  
  /**
   * Get performance history
   */
  getHistory: (): typeof logHistory => {
    return [...logHistory];
  },
  
  /**
   * Get completed traces
   */
  getCompletedTraces: (): typeof completedTraces => {
    return [...completedTraces];
  },
  
  /**
   * Clear performance history
   */
  clearHistory: (): void => {
    logHistory.length = 0;
    completedTraces.length = 0;
    logPerf('History cleared');
  }
};

// Helper functions for React components
export function usePerformanceTracking(componentName: string) {
  return {
    logMount: () => SimplePerformance.logEvent('component', `${componentName} mounted`),
    logUnmount: () => SimplePerformance.logEvent('component', `${componentName} unmounted`),
    logRender: () => SimplePerformance.logEvent('render', componentName),
    startOperation: (operation: string) => 
      SimplePerformance.startTrace(`${componentName}_${operation}`),
    endOperation: (traceId: string) => 
      SimplePerformance.endTrace(traceId),
  };
}