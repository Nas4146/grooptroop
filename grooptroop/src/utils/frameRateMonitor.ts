import { SentryService } from './sentryService';
import { FrameRateMetrics, SentrySpan } from './monitoringTypes';

/**
 * Utility for monitoring frame rates during animations
 */
export class FrameRateMonitor {
  private static isMonitoring: boolean = false;
  private static frameCount: number = 0;
  private static startTime: number = 0;
  private static lastFrameTime: number = 0;
  private static frameTimes: number[] = [];
  private static monitorName: string = '';
  private static animationFrameId: number | null = null;
  
  /**
   * Start monitoring frame rate
   * @param name Identifier for this monitoring session
   */
  static startMonitoring(name: string): void {
    if (this.isMonitoring) {
      this.stopMonitoring();
    }
    
    this.monitorName = name;
    this.frameCount = 0;
    this.frameTimes = [];
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.isMonitoring = true;
    
    // Log the start of monitoring
    SentryService.logEvent(
      'animation', 
      `Started frame rate monitoring: ${name}`
    );
    
    // Start the monitoring loop
    this.animationFrameId = requestAnimationFrame(this.frameCallback);
  }
  
  /**
   * Stop monitoring and report results
   */
  static stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    // Cancel the animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    
    // Only report if we've captured some frames
    if (this.frameCount > 0) {
      const fps = Math.round((this.frameCount * 1000) / duration);
      
      // Calculate frame time statistics
      const avgFrameTime = this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length;
      const maxFrameTime = Math.max(...this.frameTimes);
      
      // Find frames that missed the 16.7ms target (60fps)
      const droppedFrames = this.frameTimes.filter(time => time > 16.7).length;
      const droppedFramePercentage = Math.round((droppedFrames / this.frameCount) * 100);
      
      // Create metrics object using the defined type
      const metrics: FrameRateMetrics = {
        fps,
        duration: Math.round(duration),
        framesCount: this.frameCount,
        avgFrameTime: Math.round(avgFrameTime),
        maxFrameTime: Math.round(maxFrameTime),
        droppedFrames,
        droppedFramePercentage
      };
      
      // Log metrics to Sentry
      SentryService.logEvent(
        'animation', 
        `Frame rate report for ${this.monitorName}: ${fps} fps over ${Math.round(duration)}ms`,
        {
          fps: String(fps),
          duration: String(Math.round(duration)),
          framesCount: String(this.frameCount),
          avgFrameTime: String(Math.round(avgFrameTime)),
          maxFrameTime: String(Math.round(maxFrameTime)),
          droppedFrames: String(droppedFrames),
          droppedFramePercentage: String(droppedFramePercentage)
        },
        fps < 55 // Consider it a warning if fps is below 55
      );
      
      // For significant frame drops, add a specific Sentry transaction
      if (droppedFramePercentage > 20) {
        try {
          const transaction: SentrySpan = SentryService.startTransaction(
            `FrameDrop.${this.monitorName}`,
            'performance.frames'
          );
          
          // Add error handling around each method call
          try {
            transaction.setData('metrics', metrics);
            transaction.setTag('animation_name', this.monitorName);
            transaction.setTag('has_frame_drops', 'true');
            
            // Set measurements for Sentry Performance
            transaction.setMeasurement('fps', fps, 'none');
            transaction.setMeasurement('dropped_frames', droppedFrames, 'none');
            transaction.setMeasurement('dropped_frame_percentage', droppedFramePercentage, 'none');
            transaction.setMeasurement('avg_frame_time', avgFrameTime, 'millisecond');
            transaction.setMeasurement('max_frame_time', maxFrameTime, 'millisecond');
          } catch (methodError) {
            console.warn('[SENTRY] Error setting transaction data:', methodError);
          } finally {
            // Always finish the transaction
            transaction.finish();
          }
        } catch (e) {
          console.warn('[SENTRY] Error creating frame drop transaction:', e);
        }
      }
    }
    
    this.isMonitoring = false;
  }
  
  /**
   * Get frame rate metrics from current monitoring session
   */
  static getMetrics(): FrameRateMetrics | null {
    if (!this.isMonitoring || this.frameCount === 0) return null;
    
    const duration = performance.now() - this.startTime;
    const fps = Math.round((this.frameCount * 1000) / duration);
    
    // Calculate statistics
    const avgFrameTime = this.frameTimes.length > 0 ? 
      this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length : 
      0;
    
    const maxFrameTime = this.frameTimes.length > 0 ? 
      Math.max(...this.frameTimes) : 
      0;
    
    const droppedFrames = this.frameTimes.filter(time => time > 16.7).length;
    const droppedFramePercentage = this.frameTimes.length > 0 ?
      Math.round((droppedFrames / this.frameCount) * 100) : 
      0;
      
    return {
      fps,
      duration: Math.round(duration),
      framesCount: this.frameCount,
      avgFrameTime: Math.round(avgFrameTime),
      maxFrameTime: Math.round(maxFrameTime),
      droppedFrames,
      droppedFramePercentage
    };
  }
  
  /**
   * Callback to count frames
   */
  private static frameCallback = (timestamp: number): void => {
    if (!this.isMonitoring) return;
    
    const now = performance.now();
    const frameDelta = now - this.lastFrameTime;
    
    // Record frame time
    if (this.frameCount > 0) { // Skip first frame
      this.frameTimes.push(frameDelta);
      
      // Detect severe frame drops (> 32ms = less than 30fps)
      if (frameDelta > 32) {
        // Log significant frame drops individually, but don't spam
        if (this.frameCount % 10 === 0) {  // Only log every 10th severe drop
          SentryService.logEvent(
            'animation',
            `Severe frame drop detected: ${Math.round(frameDelta)}ms in ${this.monitorName}`,
            undefined,
            true
          );
        }
      }
    }
    
    this.frameCount++;
    this.lastFrameTime = now;
    
    // Continue the monitoring loop
    this.animationFrameId = requestAnimationFrame(this.frameCallback);
    
    // Safety check - stop after 10 seconds to prevent indefinite monitoring
    if (now - this.startTime > 10000) {
      this.stopMonitoring();
    }
  };
}