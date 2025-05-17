import { SimplePerformance } from './simplePerformance';
import { RemotePerformanceLogger } from './remotePerformanceLogger';
import { NetworkMonitor } from './networkMonitor';
import { CPUMonitor } from './cpuMonitor';
import { MemoryMonitor } from './memoryMonitor';

export const setupProductionMonitoring = () => {
  // Only run this in production builds
  if (__DEV__) return;
  
  // Initialize remote logging (if you've set up a backend)
  // RemotePerformanceLogger.initialize('https://your-analytics-endpoint.com/perf');
  
  // Set performance budgets appropriate for production
  SimplePerformance.setBudget('network-request', 2000); // More lenient in production
  SimplePerformance.setBudget('render', 33); // Lower to 30fps threshold
  SimplePerformance.setBudget('component-operation', 100);
  
  // Initialize network monitoring
  NetworkMonitor.initializeFetchMonitoring();
  
  // Set up periodic sampling of performance metrics
  setInterval(() => {
    // Take occasional snapshots
    CPUMonitor.takeSnapshot('periodic_production_check');
    MemoryMonitor.takeSnapshot('periodic_production_check');
    
    // Check for major issues that might need addressing
    const violations = SimplePerformance.getBudgetViolations();
    if (violations.length > 10) {
      // Log significant performance issues for later analysis
      RemotePerformanceLogger.queueEvent('violations_summary', {
        count: violations.length,
        types: violations.map(v => v.category)
      });
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
};