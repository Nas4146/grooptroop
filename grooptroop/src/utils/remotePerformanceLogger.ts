import { SimplePerformance } from './simplePerformance';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

/**
 * Send performance data to a remote analytics service
 */
export class RemotePerformanceLogger {
  private static apiEndpoint: string | null = null;
  private static isEnabled = false;
  private static queue: any[] = [];
  private static sendIntervalId: NodeJS.Timeout | null = null;
  private static deviceInfo: any = null;
  
  /**
   * Initialize remote logging
   */
  static initialize(apiEndpoint: string): void {
    this.apiEndpoint = apiEndpoint;
    this.isEnabled = true;
    
    // Get device info
    this.collectDeviceInfo();
    
    // Setup batch sending
    this.sendIntervalId = setInterval(() => {
      this.sendQueuedEvents();
    }, 30000); // Send every 30 seconds
    
    SimplePerformance.logEvent('remote', 'Remote performance logging initialized');
    
    // Subscribe to performance events
    const originalEndTrace = SimplePerformance.endTrace;
    SimplePerformance.endTrace = (id: string) => {
      const result = originalEndTrace(id);
      
      // Only log if it's a significant operation (over 100ms)
      if (result && result > 100) {
        const trace = SimplePerformance.getCompletedTraces().find(t => 
          t.name === id.split('_')[0] && Math.abs(t.duration - result) < 5
        );
        
        if (trace) {
          this.queueEvent('trace', {
            name: trace.name,
            duration: trace.duration,
            category: trace.metadata?.category || 'uncategorized'
          });
        }
      }
      
      return result;
    };
  }
  
  /**
   * Queue an event to send
   */
  static queueEvent(type: string, data: any): void {
    if (!this.isEnabled) return;
    
    this.queue.push({
      type,
      timestamp: Date.now(),
      data,
      device: this.deviceInfo
    });
  }
  
  /**
   * Send queued events to the server
   */
  private static async sendQueuedEvents(): Promise<void> {
    if (!this.isEnabled || !this.apiEndpoint || this.queue.length === 0) return;
    
    const eventsToSend = [...this.queue];
    this.queue = [];
    
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          events: eventsToSend
        }),
        // Don't track this network request to avoid infinite loop
        _noTrack: true
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      SimplePerformance.logEvent('remote', 
        `Successfully sent ${eventsToSend.length} events to remote logger`);
    } catch (error) {
      SimplePerformance.logEvent('remote', 
        `Failed to send events: ${error.message}`, undefined, true);
      
      // Put events back in queue
      this.queue = [...eventsToSend, ...this.queue];
    }
  }
  
  /**
   * Collect device information
   */
  private static async collectDeviceInfo(): Promise<void> {
    try {
      const deviceName = Device.deviceName || 'unknown';
      const deviceYear = Device.deviceYearClass || 0;
      const isEmulator = (await Device.isDevice) === false;
      
      this.deviceInfo = {
        deviceName,
        deviceYear,
        platform: Platform.OS,
        osVersion: Platform.Version,
        appVersion: Platform.constants?.reactNativeVersion?.minor || '0.0.0',
        isEmulator,
        totalMemory: Device.totalMemory ? Math.round(Device.totalMemory / (1024 * 1024)) : 0
      };
    } catch (error) {
      this.deviceInfo = {
        platform: Platform.OS,
        osVersion: Platform.Version
      };
    }
  }
  
  /**
   * Stop remote logging and flush queue
   */
  static async shutdown(): Promise<void> {
    if (this.sendIntervalId) {
      clearInterval(this.sendIntervalId);
    }
    
    await this.sendQueuedEvents();
    this.isEnabled = false;
  }
}