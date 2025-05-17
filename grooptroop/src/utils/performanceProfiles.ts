import { SimplePerformance } from './simplePerformance';
import { CPUMonitor } from './cpuMonitor';
import { MemoryMonitor } from './memoryMonitor';
import { FrameRateMonitor } from './frameRateMonitor';

/**
 * Performance profiles for different use cases
 */
export class PerformanceProfiler {
  static currentProfile: string | null = null;
  
  /**
   * Start a comprehensive profiling session
   */
  static startProfile(profileName: string): void {
    if (this.currentProfile) {
      this.stopProfile();
    }
    
    this.currentProfile = profileName;
    SimplePerformance.logEvent('profile', `Starting performance profile: ${profileName}`);
    
    // Start monitoring everything
    CPUMonitor.startMonitoring(1000);
    MemoryMonitor.startMonitoring(5000);
    
    SimplePerformance.startTrace(`profile_${profileName}`, 
      { profile: profileName }, 
      'performance-profile');
  }
  
  /**
   * Stop profiling session and gather results
   */
  static stopProfile(): any {
    if (!this.currentProfile) return null;
    
    const profileName = this.currentProfile;
    const profileTraceId = `profile_${profileName}`;
    
    // Stop all monitoring
    CPUMonitor.stopMonitoring();
    MemoryMonitor.stopMonitoring();
    
    // End profile trace
    SimplePerformance.endTrace(profileTraceId);
    
    // Gather results
    const results = {
      name: profileName,
      cpuSamples: CPUMonitor.getSamples(),
      memorySnapshots: MemoryMonitor.getSnapshots(),
      traces: SimplePerformance.getCompletedTraces(),
      violations: SimplePerformance.getBudgetViolations()
    };
    
    SimplePerformance.logEvent('profile', `Performance profile complete: ${profileName}`);
    
    this.currentProfile = null;
    return results;
  }
  
  /**
   * Run a diagnostic session for a specific feature
   */
  static async runDiagnostic(featureName: string, testFn: () => Promise<void>): Promise<any> {
    SimplePerformance.logEvent('diagnostic', `Starting diagnostic for feature: ${featureName}`);
    
    // Clear previous data
    SimplePerformance.clearHistory();
    CPUMonitor.clearSamples();
    MemoryMonitor.clearSnapshots();
    
    // Take baseline measurements
    MemoryMonitor.takeSnapshot(`diagnostic_${featureName}_start`);
    CPUMonitor.takeSnapshot(`diagnostic_${featureName}_start`);
    
    // Start frame rate monitoring
    FrameRateMonitor.startMonitoring(`diagnostic_${featureName}`);
    
    const diagnosticId = SimplePerformance.startTrace(`diagnostic_${featureName}`, 
      { feature: featureName }, 
      'diagnostic');
    
    try {
      // Run the feature test
      await testFn();
    } catch (error) {
      SimplePerformance.logEvent('diagnostic', 
        `Error during diagnostic: ${error.message}`, undefined, true);
    }
    
    // Stop frame rate monitoring
    FrameRateMonitor.stopMonitoring();
    
    // Take final measurements
    MemoryMonitor.takeSnapshot(`diagnostic_${featureName}_end`);
    CPUMonitor.takeSnapshot(`diagnostic_${featureName}_end`);
    
    // End diagnostic trace
    SimplePerformance.endTrace(diagnosticId);
    
    // Gather results
    const results = {
      feature: featureName,
      traces: SimplePerformance.getCompletedTraces().filter(t => 
        t.startTime >= Date.now() - 60000 // Last minute
      ),
      cpuSamples: CPUMonitor.getSamples(),
      memorySnapshots: MemoryMonitor.getSnapshots(),
      violations: SimplePerformance.getBudgetViolations()
    };
    
    SimplePerformance.logEvent('diagnostic', `Diagnostic complete for feature: ${featureName}`);
    
    return results;
  }
}