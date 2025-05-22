import { NativeModules, Platform } from 'react-native';
import { SentryService } from './sentryService';

interface MemoryUsageData {
  jsHeapSize: number;       // JavaScript heap size in bytes
  nativeMemoryUsage: number; // Native memory usage in bytes
  totalMemory?: number;     // Total device memory (when available)
}

/**
 * Monitors memory usage in the app
 */
export class MemoryMonitor {
  private static memorySnapshots: Array<{timestamp: number; usage: MemoryUsageData}> = [];
  
  /**
   * Get current memory usage
   */
  static async getCurrentMemoryUsage(): Promise<MemoryUsageData> {
    const memory: MemoryUsageData = {
      jsHeapSize: 0,
      nativeMemoryUsage: 0
    };
    
    try {
      // Get JavaScript heap size
      if (global.performance && (global.performance as any).memory) {
        memory.jsHeapSize = (global.performance as any).memory.usedJSHeapSize || 0;
      }
      
      // Use platform-specific methods for native memory
      if (Platform.OS === 'ios') {
        if (NativeModules.PerformanceMonitor) {
          const nativeMetrics = await NativeModules.PerformanceMonitor.getMemoryInfo();
          memory.nativeMemoryUsage = nativeMetrics.memoryUsage || 0;
          memory.totalMemory = nativeMetrics.totalMemory;
        }
      } else if (Platform.OS === 'android') {
        if (NativeModules.PerformanceMonitor) {
          const nativeMetrics = await NativeModules.PerformanceMonitor.getMemoryInfo();
          memory.nativeMemoryUsage = nativeMetrics.usedMemory || 0;
          memory.totalMemory = nativeMetrics.totalMemory;
        }
      }
      
      // Fallback if native modules not available
      if (memory.nativeMemoryUsage === 0) {
        memory.nativeMemoryUsage = memory.jsHeapSize;
      }
      
      // Take a snapshot
      this.takeSnapshot(memory);
      
      return memory;
    } catch (error) {
      console.error('[MEMORY_MONITOR] Error getting memory usage:', error);
      
      // Return default values
      return {
        jsHeapSize: 0,
        nativeMemoryUsage: 0
      };
    }
  }
  
  /**
   * Take a memory snapshot for historical tracking
   */
  static takeSnapshot(memoryData?: MemoryUsageData): void {
    const snapshot = {
      timestamp: Date.now(),
      usage: memoryData || { jsHeapSize: 0, nativeMemoryUsage: 0 }
    };
    
    // If no memory data provided, get it now
    if (!memoryData) {
      this.getCurrentMemoryUsage().then(memory => {
        snapshot.usage = memory;
        this.memorySnapshots.push(snapshot);
      });
    } else {
      this.memorySnapshots.push(snapshot);
    }
    
    // Keep a reasonable history size
    if (this.memorySnapshots.length > 100) {
      this.memorySnapshots.shift();
    }
    
    // Log using SentryService instead of direct Sentry
    SentryService.logEvent(
      'memory', 
      `Memory snapshot: ${Math.round(snapshot.usage.jsHeapSize / 1024 / 1024)}MB`,
      snapshot.usage
    );
  }
  
  /**
   * Get memory usage snapshots
   */
  static getSnapshots(): Array<{timestamp: number; usage: MemoryUsageData}> {
    return [...this.memorySnapshots];
  }
  
  /**
   * Clear all memory snapshots
   */
  static clearSnapshots(): void {
    this.memorySnapshots = [];
  }
  
  /**
   * Get memory growth rate over time
   * @returns Memory growth in bytes per second
   */
  static getMemoryGrowthRate(): number {
    if (this.memorySnapshots.length < 2) {
      return 0;
    }
    
    // Get oldest and newest snapshots
    const oldest = this.memorySnapshots[0];
    const newest = this.memorySnapshots[this.memorySnapshots.length - 1];
    
    // Calculate time difference in seconds
    const timeDiffSeconds = (newest.timestamp - oldest.timestamp) / 1000;
    
    // Calculate memory growth
    const memoryGrowth = newest.usage.jsHeapSize - oldest.usage.jsHeapSize;
    
    // Return bytes per second
    return timeDiffSeconds > 0 ? memoryGrowth / timeDiffSeconds : 0;
  }
  
  /**
   * Check if the app might have a memory leak
   * @returns true if memory is growing steadily over time
   */
  static detectPotentialMemoryLeak(): boolean {
    // Need at least 5 snapshots for reliable detection
    if (this.memorySnapshots.length < 5) {
      return false;
    }
    
    // Calculate growth rate
    const growthRate = this.getMemoryGrowthRate();
    
    // If growing more than 100KB per second over a significant time period, likely a leak
    return growthRate > 100 * 1024;
  }
  
  /**
   * Get the current memory usage as a string
   */
  static async getMemoryUsage(): Promise<number> {
    try {
      const memory = await this.getCurrentMemoryUsage();
      return memory.jsHeapSize;
    } catch (e) {
      console.error('[MEMORY_MONITOR] Error getting memory usage:', e);
      return 0;
    }
  }
}