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

// Track time spent in categories for overall analytics
const categoryTimings: Record<string, { count: number, totalTime: number }> = {};

// Track budget violations for analysis
const budgetViolations: Array<{
  name: string,
  category: string,
  budget: number,
  actual: number,
  timestamp: number
}> = [];

// Performance budgets - key values in milliseconds
const performanceBudgets: Record<string, number> = {
  // UI Rendering budgets
  'component-mount': 100,      // Component should mount in under 100ms
  'component-operation': 50,   // Component operations should be fast
  'render': 16,                // Individual renders should be within one frame (60fps)
  'screen-transition': 300,    // Screen transitions should be under 300ms
  
  // Network and data budgets
  'network-request': 1000,     // Network request should complete in 1 second
  'data-transform': 50,        // Data transformations should be quick
  
  // User interaction budgets
  'user-interaction': 100,     // Response to user input should be quick
  'animation': 16,             // Animations should run at 60fps
  
  // Background operations
  'background-task': 500,      // Background tasks should complete quickly
  'startup': 2000,             // App startup should be under 2 seconds
};

/**
 * Add an entry to the performance log
 */
function logPerf(message: string, isWarning = false): void {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = isWarning ? '⚠️ ' : '';
  const logMessage = `[PERF ${timestamp}] ${prefix}${message}`;
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
  startTrace: (name: string, metadata?: Record<string, string>, category?: string): string => {
    const id = `${name}_${Date.now()}`;
    traces.set(id, {
      startTime: Date.now(),
      metadata: {
        ...metadata,
        category: category || 'uncategorized'
      }
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
      logPerf(`Error: No trace found with ID: ${id}`, true);
      return null;
    }
    
    const endTime = Date.now();
    const duration = endTime - trace.startTime;
    traces.delete(id);
    
    // Extract name from ID (remove timestamp)
    const name = id.split('_')[0];
    
    // Track category timing
    const category = trace.metadata?.category || 'uncategorized';
    if (!categoryTimings[category]) {
      categoryTimings[category] = { count: 0, totalTime: 0 };
    }
    categoryTimings[category].count++;
    categoryTimings[category].totalTime += duration;
    
    // Store the completed trace
    completedTraces.push({
      name,
      duration,
      startTime: trace.startTime,
      endTime,
      metadata: trace.metadata
    });
    
    // Check if this operation exceeds its budget
    const budget = performanceBudgets[category];
    
    if (budget && duration > budget) {
      // Track budget violation
      budgetViolations.push({
        name,
        category,
        budget,
        actual: duration,
        timestamp: endTime
      });
      
      const overage = Math.round(duration - budget);
      const percentOver = Math.round((duration / budget - 1) * 100);
      logPerf(`Budget exceeded: ${name} took ${duration}ms (${percentOver}% over ${budget}ms budget)`, true);
    } else {
      logPerf(`Completed trace: ${name} - ${duration}ms`);
    }
    
    return duration;
  },
  
  /**
   * Log a one-time performance event
   */
  logEvent: (category: string, name: string, metadata?: Record<string, string>, isWarning = false): void => {
    logPerf(`Event [${category}] ${name}`, isWarning);
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
   * Get budget violations
   */
  getBudgetViolations: () => {
    return [...budgetViolations];
  },
  
  /**
   * Get performance budgets
   */
  getBudgets: () => {
    return {...performanceBudgets};
  },
  
  /**
   * Update or add a performance budget
   */
  setBudget: (category: string, timeInMs: number) => {
    performanceBudgets[category] = timeInMs;
    logPerf(`Performance budget set: ${category} = ${timeInMs}ms`);
  },
  
  /**
   * Get category timing statistics
   */
  getCategoryStats: () => {
    const result = Object.entries(categoryTimings).map(([category, stats]) => ({
      category,
      count: stats.count,
      totalTime: stats.totalTime,
      averageTime: Math.round(stats.totalTime / stats.count)
    }));
    
    return result.sort((a, b) => b.totalTime - a.totalTime);
  },
  
  /**
   * Get duration statistics by trace name
   */
  getTraceStats: () => {
    const statsByName: Record<string, { count: number, totalTime: number, min: number, max: number }> = {};
    
    completedTraces.forEach(trace => {
      if (!statsByName[trace.name]) {
        statsByName[trace.name] = { count: 0, totalTime: 0, min: trace.duration, max: trace.duration };
      }
      
      statsByName[trace.name].count++;
      statsByName[trace.name].totalTime += trace.duration;
      statsByName[trace.name].min = Math.min(statsByName[trace.name].min, trace.duration);
      statsByName[trace.name].max = Math.max(statsByName[trace.name].max, trace.duration);
    });
    
    return Object.entries(statsByName).map(([name, stats]) => ({
      name,
      count: stats.count,
      totalTime: stats.totalTime,
      averageTime: Math.round(stats.totalTime / stats.count),
      minTime: stats.min,
      maxTime: stats.max
    })).sort((a, b) => b.averageTime - a.averageTime);
  },
  
  /**
   * Clear performance history
   */
  clearHistory: (): void => {
    logHistory.length = 0;
    completedTraces.length = 0;
    budgetViolations.length = 0;
    Object.keys(categoryTimings).forEach(key => {
      delete categoryTimings[key];
    });
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
      SimplePerformance.startTrace(`${componentName}_${operation}`, undefined, 'component-operation'),
    endOperation: (traceId: string) => 
      SimplePerformance.endTrace(traceId),
  };
}