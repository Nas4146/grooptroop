import { Platform } from 'react-native';
import { SentryService } from './sentryService';

/**
 * Frame rate metrics interface
 */
interface FrameRateMetrics {
  fps: number;          // frames per second
  droppedFrames: number; // number of dropped frames
  lastMeasurement: number; // timestamp of last measurement
}

/**
 * Monitors frame rate performance
 */
export class FrameRateMonitor {
  private static isMonitoring: boolean = false;
  private static frameCount: number = 0;
  private static droppedFrameCount: number = 0;
  private static lastFrameTimestamp: number = 0;
  private static monitoringStartTime: number = 0;
  private static metrics: FrameRateMetrics = {
    fps: 60,
    droppedFrames: 0,
    lastMeasurement: 0
  };
  private static animationFrameId: number | null = null;
  private static monitoringInterval: NodeJS.Timeout | null = null;
  
  /**
   * Start monitoring frame rate
   */
  static startMonitoring(): void {
    // Skip if already monitoring
    if (this.isMonitoring) return;
    
    console.log('[FRAME_MONITOR] Starting frame rate monitoring');
    this.isMonitoring = true;
    this.frameCount = 0;
    this.droppedFrameCount = 0;
    this.lastFrameTimestamp = performance.now();
    this.monitoringStartTime = Date.now();
    
    // Reset metrics
    this.metrics = {
      fps: 60,
      droppedFrames: 0,
      lastMeasurement: this.monitoringStartTime
    };
    
    // Start frame counting
    this.scheduleFrameCallback();
    
    // Calculate metrics every second
    this.monitoringInterval = setInterval(() => {
      this.calculateMetrics();
    }, 1000);
  }
  
  /**
   * Stop monitoring frame rate
   */
  static stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    console.log('[FRAME_MONITOR] Stopping frame rate monitoring');
    this.isMonitoring = false;
    
    // Cancel animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Clear interval
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
  
  /**
   * Schedule the next frame callback
   */
  private static scheduleFrameCallback(): void {
    if (!this.isMonitoring) return;
    
    this.animationFrameId = requestAnimationFrame((timestamp) => {
      // Count this frame
      this.frameCount++;
      
      // Check if frame is delayed
      const elapsed = timestamp - this.lastFrameTimestamp;
      const expectedFrameDuration = 1000 / 60; // expecting 60fps
      
      // If frame took more than 150% of expected time, count as dropped frames
      if (elapsed > expectedFrameDuration * 1.5) {
        const droppedFrames = Math.floor(elapsed / expectedFrameDuration) - 1;
        this.droppedFrameCount += droppedFrames;
      }
      
      // Update timestamp
      this.lastFrameTimestamp = timestamp;
      
      // Schedule next callback
      this.scheduleFrameCallback();
    });
  }
  
  /**
   * Calculate current metrics
   */
  private static calculateMetrics(): void {
    if (!this.isMonitoring) return;
    
    const now = Date.now();
    const elapsedSeconds = (now - this.metrics.lastMeasurement) / 1000;
    
    // Skip if less than 0.5 seconds passed (avoid division by very small numbers)
    if (elapsedSeconds < 0.5) return;
    
    // Calculate FPS
    const fps = Math.round(this.frameCount / elapsedSeconds);
    
    // Update metrics
    this.metrics = {
      fps: Math.min(60, fps), // Cap at 60fps
      droppedFrames: this.droppedFrameCount,
      lastMeasurement: now
    };
    
    // Log significant drops
    if (this.droppedFrameCount > 10) {
      SentryService.logEvent(
        'performance',
        `Frame drops detected: ${this.droppedFrameCount} over ${elapsedSeconds.toFixed(1)}s`,
        { 
          droppedFrames: this.droppedFrameCount,
          fps,
          duration: elapsedSeconds
        }
      );
    }
    
    // Reset counters
    this.frameCount = 0;
    this.droppedFrameCount = 0;
  }
  
  /**
   * Get current frame rate metrics
   */
  static getMetrics(): FrameRateMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Reset metrics
   */
  static reset(): void {
    this.frameCount = 0;
    this.droppedFrameCount = 0;
    
    this.metrics = {
      fps: 60,
      droppedFrames: 0,
      lastMeasurement: Date.now()
    };
  }
}