import { SimplePerformance } from './simplePerformance';

/**
 * Utility to track JavaScript thread CPU usage
 */
export class CPUMonitor {
  private static samples: Array<{
    timestamp: number;
    usage: number;
    marker: string;
  }> = [];
  
  private static monitoringInterval: NodeJS.Timeout | null = null;
  private static isMonitoring = false;
  private static lastMeasurementTime = 0;
  private static lastEventLoopLag = 0;
  
  /**
   * Take a CPU usage snapshot
   */
  static takeSnapshot(marker: string): void {
    const now = performance.now();
    
    // Calculate event loop lag as an approximation of CPU usage
    // Higher lag indicates CPU is busy
    const elapsed = now - this.lastMeasurementTime;
    const lag = Math.max(0, elapsed - 16.67); // 16.67ms is target frame time (60fps)
    
    const usage = elapsed > 0 ? (lag / elapsed) * 100 : 0;
    
    this.samples.push({
      timestamp: now,
      usage,
      marker
    });
    
    SimplePerformance.logEvent('cpu', 
      `CPU snapshot [${marker}]: ${usage.toFixed(1)}% load (${lag.toFixed(2)}ms event loop lag)`);
    
    this.lastMeasurementTime = now;
    this.lastEventLoopLag = lag;
  }
  
  /**
   * Start continuous CPU monitoring
   */
  static startMonitoring(intervalMs: number = 1000): void {
    if (this.isMonitoring) {
      this.stopMonitoring();
    }
    
    this.isMonitoring = true;
    this.lastMeasurementTime = performance.now();
    
    SimplePerformance.logEvent('cpu', `Starting CPU monitoring (${intervalMs}ms interval)`);
    
    // Take initial snapshot
    this.takeSnapshot('monitoring_start');
    
    let frameCount = 0;
    let lastFrameTime = performance.now();
    
    // Measure event loop lag regularly
    this.monitoringInterval = setInterval(() => {
      this.takeSnapshot('periodic');
      
      // Check for heavy CPU usage
      if (this.lastEventLoopLag > 100) {
        SimplePerformance.logEvent('cpu', 
          `High CPU usage detected: ${this.lastEventLoopLag.toFixed(1)}ms event loop lag`, 
          undefined, true);
      }
    }, intervalMs);
  }
  
  /**
   * Stop CPU monitoring
   */
  static stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.takeSnapshot('monitoring_end');
    SimplePerformance.logEvent('cpu', 'CPU monitoring stopped');
    this.isMonitoring = false;
  }
  
  /**
   * Get all CPU samples
   */
  static getSamples(): typeof CPUMonitor.samples {
    return [...this.samples];
  }
  
  /**
   * Clear sample history
   */
  static clearSamples(): void {
    this.samples = [];
  }
}