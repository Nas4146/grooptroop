import { SentryService } from './sentryService';

/**
 * Utility for monitoring memory usage in the app
 */
export class MemoryMonitor {
  private static snapshots: Record<string, any> = {};

  /**
   * Take a snapshot of current memory usage
   * @param name A label for this memory snapshot
   * @returns The memory snapshot data or null if there was an error
   */
  static takeSnapshot(name: string): any {
    try {
      const snapshot = {
        timestamp: Date.now(),
        jsHeapSize: global.performance?.memory?.usedJSHeapSize || 0,
        totalJSHeapSize: global.performance?.memory?.totalJSHeapSize || 0,
      };
      
      this.snapshots[name] = snapshot;
      
      // Log using SentryService instead of direct Sentry
      SentryService.logEvent(
        'memory', 
        `Memory snapshot ${name}: ${Math.round(snapshot.jsHeapSize / 1024 / 1024)}MB`
      );
      
      return snapshot;
    } catch (error) {
      console.error('[MEMORY] Error taking snapshot:', error);
      return null;
    }
  }
  
  /**
   * Get a specific snapshot by name
   * @param name The name of the snapshot to retrieve
   * @returns The snapshot data or null if not found
   */
  static getSnapshot(name: string): any {
    return this.snapshots[name] || null;
  }
  
  /**
   * Compare two snapshots
   * @param snapshotName1 The name of the first snapshot
   * @param snapshotName2 The name of the second snapshot
   * @returns An object with the differences or null if either snapshot doesn't exist
   */
  static compareSnapshots(snapshotName1: string, snapshotName2: string): any {
    const snapshot1 = this.snapshots[snapshotName1];
    const snapshot2 = this.snapshots[snapshotName2];
    
    if (!snapshot1 || !snapshot2) {
      return null;
    }
    
    const diff = {
      timeDiff: snapshot2.timestamp - snapshot1.timestamp,
      jsHeapSizeDiff: snapshot2.jsHeapSize - snapshot1.jsHeapSize,
      percentChange: ((snapshot2.jsHeapSize - snapshot1.jsHeapSize) / snapshot1.jsHeapSize) * 100
    };
    
    // Use SentryService instead of direct Sentry
    SentryService.logEvent(
      'memory', 
      `Memory comparison ${snapshotName1} → ${snapshotName2}: ${Math.round(diff.jsHeapSizeDiff / 1024 / 1024)}MB (${diff.percentChange.toFixed(1)}%)`,
      diff
    );
    
    return diff;
  }
}