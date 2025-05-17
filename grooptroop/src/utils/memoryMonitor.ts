import { SimplePerformance } from './simplePerformance';
import { Platform, NativeModules } from 'react-native';

/**
 * Utility for monitoring memory usage in the app
 */
export class MemoryMonitor {
  private static memorySnapshots: Array<{
    timestamp: number;
    nativeMemory?: number;
    jsHeapSize?: number;
    marker: string;
  }> = [];
  
  private static memoryCheckInterval: NodeJS.Timeout | null = null;
  private static isMonitoring = false;
  
  /**
   * Take a snapshot of current memory usage
   * @param marker A label for this memory snapshot
   */
  static async takeSnapshot(marker: string): Promise<void> {
    try {
      let memoryInfo: {nativeMemory?: number; jsHeapSize?: number} = {};
      
      // Get JS heap size (works in development)
      if (global.performance && global.performance.memory) {
        memoryInfo.jsHeapSize = global.performance.memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
      }
      
      // On Android, we can get native memory
      if (Platform.OS === 'android' && NativeModules.MemoryInfo) {
        const nativeMemory = await NativeModules.MemoryInfo.getMemoryInfo();
        memoryInfo.nativeMemory = nativeMemory.usedMemory / (1024 * 1024); // Convert to MB
      }
      
      // Add snapshot to our history
      this.memorySnapshots.push({
        timestamp: Date.now(),
        ...memoryInfo,
        marker,
      });
      
      // Log the snapshot
      const jsMemoryStr = memoryInfo.jsHeapSize !== undefined ? 
        `JS Heap: ${memoryInfo.jsHeapSize.toFixed(2)} MB` : 'JS Heap: unavailable';
        
      const nativeMemoryStr = memoryInfo.nativeMemory !== undefined ? 
        `Native: ${memoryInfo.nativeMemory.toFixed(2)} MB` : 'Native: unavailable';
      
      SimplePerformance.logEvent(
        'memory',
        `Snapshot [${marker}]: ${jsMemoryStr}, ${nativeMemoryStr}`
      );
      
      return;
    } catch (error) {
      SimplePerformance.logEvent('memory', `Error taking memory snapshot: ${error.message}`, undefined, true);
    }
  }
  
  /**
   * Start monitoring memory at regular intervals
   * @param intervalMs How often to check memory (in ms)
   */
  static startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) {
      this.stopMonitoring();
    }
    
    this.isMonitoring = true;
    SimplePerformance.logEvent('memory', `Starting continuous memory monitoring (${intervalMs}ms interval)`);
    
    // Take initial snapshot
    this.takeSnapshot('monitoring_start');
    
    // Set up interval for regular snapshots
    this.memoryCheckInterval = setInterval(() => {
      this.takeSnapshot('periodic_check');
      
      // Check for significant memory increases that might indicate leaks
      this.checkForMemoryLeaks();
    }, intervalMs);
  }
  
  /**
   * Stop continuous memory monitoring
   */
  static stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
    
    // Take final snapshot
    this.takeSnapshot('monitoring_end');
    
    SimplePerformance.logEvent('memory', 'Stopped continuous memory monitoring');
    this.isMonitoring = false;
  }
  
  /**
   * Check for potential memory leaks based on snapshot history
   */
  private static checkForMemoryLeaks(): void {
    if (this.memorySnapshots.length < 3) return;
    
    // Get the most recent snapshots for comparison
    const recentSnapshots = this.memorySnapshots.slice(-3);
    
    // Check JS heap growth
    if (recentSnapshots.every(s => s.jsHeapSize !== undefined)) {
      const oldest = recentSnapshots[0].jsHeapSize!;
      const newest = recentSnapshots[2].jsHeapSize!;
      const growth = newest - oldest;
      const growthPercent = (growth / oldest) * 100;
      
      // Alert if memory grew by more than 20% across these snapshots
      if (growthPercent > 20) {
        SimplePerformance.logEvent(
          'memory', 
          `Possible memory leak detected: JS heap grew by ${growthPercent.toFixed(1)}% (${growth.toFixed(2)} MB)`,
          undefined,
          true
        );
      }
    }
  }
  
  /**
   * Get all memory snapshots
   */
  static getSnapshots(): typeof MemoryMonitor.memorySnapshots {
    return [...this.memorySnapshots];
  }
  
  /**
   * Clear snapshot history
   */
  static clearSnapshots(): void {
    this.memorySnapshots = [];
  }
}