import { SimplePerformance } from './simplePerformance';

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
    SimplePerformance.logEvent(
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
      
      // Report the results
      SimplePerformance.logEvent(
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
    }
    
    this.isMonitoring = false;
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