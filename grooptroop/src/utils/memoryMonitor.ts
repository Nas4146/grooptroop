import { SentryService } from './sentryService';
import { Platform, NativeModules } from 'react-native';
import { MemorySnapshot } from './monitoringTypes';

/**
 * Utility for monitoring memory usage in the app
 */
export class MemoryMonitor {
  private static memorySnapshots: MemorySnapshot[] = [];
  private static memoryCheckInterval: NodeJS.Timeout | null = null;
  private static isMonitoring = false;
  
  /**
   * Take a snapshot of current memory usage
   * @param marker A label for this memory snapshot
   * @returns The memory snapshot data or null if there was an error
   */
  static async takeSnapshot(marker: string): Promise<MemorySnapshot | null> {
    try {
      let memoryInfo: {nativeMemory?: number; jsHeapSize?: number} = {};
      
      // Get JS heap size (works in development)
      if (global.performance && (global.performance as any).memory) {
        memoryInfo.jsHeapSize = (global.performance as any).memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
      }
      
      // On Android, we can get native memory
      if (Platform.OS === 'android' && NativeModules.MemoryInfo) {
        try {
          const nativeMemory = await NativeModules.MemoryInfo.getMemoryInfo();
          memoryInfo.nativeMemory = nativeMemory.usedMemory / (1024 * 1024); // Convert to MB
        } catch (e) {
          console.warn('Failed to get native memory info:', e);
        }
      }
      
      // Add snapshot to our history
      const snapshot: MemorySnapshot = {
        timestamp: Date.now(),
        ...memoryInfo,
        marker,
      };
      
      this.memorySnapshots.push(snapshot);
      
      // Keep history manageable (last 100 snapshots)
      if (this.memorySnapshots.length > 100) {
        this.memorySnapshots.shift();
      }
      
      // Log the snapshot using SentryService
      const jsMemoryStr = memoryInfo.jsHeapSize !== undefined ? 
        `JS Heap: ${memoryInfo.jsHeapSize.toFixed(2)} MB` : 'JS Heap: unavailable';
        
      const nativeMemoryStr = memoryInfo.nativeMemory !== undefined ? 
        `Native: ${memoryInfo.nativeMemory.toFixed(2)} MB` : 'Native: unavailable';
      
      SentryService.logEvent(
        'memory',
        `Snapshot [${marker}]: ${jsMemoryStr}, ${nativeMemoryStr}`
      );
      
      // Return the snapshot data
      return snapshot;
    } catch (error) {
      SentryService.logEvent(
        'memory', 
        `Error taking memory snapshot: ${(error as Error).message}`, 
        undefined, 
        true
      );
      return null;
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
    SentryService.logEvent('memory', `Starting continuous memory monitoring (${intervalMs}ms interval)`);
    
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
    
    SentryService.logEvent('memory', 'Stopped continuous memory monitoring');
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
        SentryService.logEvent(
          'memory', 
          `Possible memory leak detected: JS heap grew by ${growthPercent.toFixed(1)}% (${growth.toFixed(2)} MB)`,
          {
            oldHeap: oldest,
            newHeap: newest,
            growthMB: growth,
            growthPercent: growthPercent,
            timeSpan: recentSnapshots[2].timestamp - recentSnapshots[0].timestamp
          },
          true
        );
        
        // Report memory leak to Sentry as a performance issue
        try {
          const memoryTransaction = SentryService.startTransaction(
            'memory_leak_detection', 
            'memory'
          );
          
          memoryTransaction.setData('growth_percent', growthPercent);
          memoryTransaction.setData('growth_mb', growth);
          memoryTransaction.setData('start_heap', oldest);
          memoryTransaction.setData('end_heap', newest);
          
          memoryTransaction.setTag('has_memory_leak', 'true');
          memoryTransaction.setTag('severity', growthPercent > 50 ? 'high' : 'medium');
          
          memoryTransaction.setMeasurement('memory_growth_mb', growth, 'megabyte');
          memoryTransaction.setMeasurement('memory_growth_percent', growthPercent, 'percent');
          
          memoryTransaction.finish();
        } catch (e) {
          console.warn('[SENTRY] Error creating memory transaction:', e);
        }
      }
    }
  }
  
  /**
   * Get all memory snapshots
   */
  static getSnapshots(): MemorySnapshot[] {
    return [...this.memorySnapshots];
  }
  
  /**
   * Clear snapshot history
   */
  static clearSnapshots(): void {
    this.memorySnapshots = [];
  }
  
  /**
   * Calculate current memory usage metrics
   */
  static async getCurrentMemoryUsage(): Promise<{ jsHeapSize?: number; nativeMemory?: number }> {
    const snapshot = await this.takeSnapshot('current_usage');
    if (snapshot) {
      return {
        jsHeapSize: snapshot.jsHeapSize,
        nativeMemory: snapshot.nativeMemory
      };
    }
    return {};
  }
  
  /**
   * Calculate memory growth since the beginning of monitoring
   */
  static getMemoryGrowth(): { growth: number; growthPercent: number } | null {
    if (this.memorySnapshots.length < 2) return null;
    
    const firstSnapshot = this.memorySnapshots.find(s => s.jsHeapSize !== undefined);
    const lastSnapshot = [...this.memorySnapshots].reverse().find(s => s.jsHeapSize !== undefined);
    
    if (firstSnapshot && lastSnapshot && firstSnapshot !== lastSnapshot) {
      const growth = (lastSnapshot.jsHeapSize || 0) - (firstSnapshot.jsHeapSize || 0);
      const growthPercent = (growth / (firstSnapshot.jsHeapSize || 1)) * 100;
      
      return { growth, growthPercent };
    }
    
    return null;
  }
  
  /**
   * Force garbage collection if possible
   * This will only work if the app is started with `--expose-gc` flag
   */
  static forceGarbageCollection(): void {
    if (global.gc) {
      SentryService.logEvent('memory', 'Manually triggering garbage collection');
      global.gc();
    } else {
      SentryService.logEvent(
        'memory', 
        'Cannot force garbage collection. Launch with --expose-gc flag to enable this feature.'
      );
    }
  }
}