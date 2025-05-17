import { SimplePerformance } from './simplePerformance';

/**
 * User-perceived performance metrics tracking
 * Based on Web Vitals concepts adapted for React Native
 */
export class UserPerceptionMetrics {
  // First Paint equivalent
  private static appStartTime = Date.now();
  private static firstScreenTime: number | null = null;
  private static firstInteractionTime: number | null = null;
  private static interactionStartTimes: Map<string, number> = new Map();
  
  /**
   * Record when first meaningful screen is rendered
   */
  static recordFirstScreenRender(screenName: string): void {
    if (this.firstScreenTime === null) {
      this.firstScreenTime = Date.now();
      const timeToFirstScreen = this.firstScreenTime - this.appStartTime;
      
      SimplePerformance.logEvent('ux', 
        `First meaningful screen (${screenName}) rendered in ${timeToFirstScreen}ms`);
      
      // Add to performance traces
      SimplePerformance.startTrace('time_to_first_screen', 
        { screen: screenName }, 
        'user-perception');
      SimplePerformance.endTrace('time_to_first_screen');
    }
  }
  
  /**
   * Start tracking an interaction
   */
  static startInteractionTracking(interactionId: string): void {
    this.interactionStartTimes.set(interactionId, Date.now());
  }
  
  /**
   * End tracking an interaction and record metrics
   */
  static endInteractionTracking(interactionId: string, description: string): void {
    const startTime = this.interactionStartTimes.get(interactionId);
    if (!startTime) return;
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Record first interaction time
    if (this.firstInteractionTime === null) {
      this.firstInteractionTime = endTime;
      const timeToFirstInteraction = this.firstInteractionTime - this.appStartTime;
      
      SimplePerformance.logEvent('ux', 
        `First user interaction recorded after ${timeToFirstInteraction}ms`);
    }
    
    // Log interaction time
    const isLongInteraction = duration > 100; // Anything over 100ms feels sluggish
    SimplePerformance.logEvent('ux', 
      `User interaction (${description}) took ${duration}ms`,
      undefined,
      isLongInteraction);
    
    this.interactionStartTimes.delete(interactionId);
  }
  
  /**
   * Get user-perceived performance metrics
   */
  static getMetrics() {
    return {
      appStartTime: this.appStartTime,
      firstScreenTime: this.firstScreenTime,
      firstInteractionTime: this.firstInteractionTime,
      timeToFirstScreen: this.firstScreenTime ? (this.firstScreenTime - this.appStartTime) : null,
      timeToFirstInteraction: this.firstInteractionTime ? (this.firstInteractionTime - this.appStartTime) : null
    };
  }
  
  /**
   * Reset metrics (useful for tests)
   */
  static reset(): void {
    this.firstScreenTime = null;
    this.firstInteractionTime = null;
    this.interactionStartTimes.clear();
  }
}