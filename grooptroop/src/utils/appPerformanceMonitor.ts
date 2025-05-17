import { SimplePerformance } from './simplePerformance';
import { MemoryMonitor } from './memoryMonitor';
import { FrameRateMonitor } from './frameRateMonitor';
import { useRef, useEffect } from 'react';

// Store for shared monitoring state
const screenLoadTimes: Record<string, number> = {};
const activeTraces: Record<string, string> = {};

/**
 * Initialize app-wide performance monitoring
 * @param navigationRef Reference to React Navigation
 */
export function initializeAppPerformanceMonitoring(navigationRef: any): void {
  SimplePerformance.logEvent('app', 'App-wide performance monitoring initialized');
  
  // When the app is fully mounted
  setTimeout(() => {
    // Take initial memory snapshot
    MemoryMonitor.takeSnapshot('app_initialized');
  }, 1000);
  
  // Listen for navigation state changes
  if (navigationRef && navigationRef.current) {
    navigationRef.addListener('state', (e: any) => {
      const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;
      if (currentRouteName) {
        // Set the time this screen was loaded
        screenLoadTimes[currentRouteName] = Date.now();
        
        // Take memory snapshot on screen changes to track memory usage patterns
        MemoryMonitor.takeSnapshot(`navigate_to_${currentRouteName}`);
      }
    });
  }
}

/**
 * Setup app-wide monitoring with performance tracking
 * @param navigationRef Reference to React Navigation
 */
export function setupAppMonitoring(navigationRef: any) {
  // Initialize app monitoring
  initializeAppPerformanceMonitoring(navigationRef);
  
  // Schedule periodic memory snapshots to detect leaks
  if (__DEV__) { // Only in development builds
    MemoryMonitor.startMonitoring(15000); // Check every 15 seconds
  }
}

/**
 * Hook to monitor screen performance metrics
 * @param screenName The name of the screen
 */
export function useScreenPerformance(screenName: string) {
  const renderStartTime = useRef<number>(Date.now());
  const renderEndTime = useRef<number>(0);
  const dataLoadStartTime = useRef<Record<string, number>>({});
  
  useEffect(() => {
    // Track screen mount time
    const mountTraceId = SimplePerformance.startTrace(`screen_mount_${screenName}`, 
      undefined, 'screen-lifecycle');
      
    renderEndTime.current = Date.now();
    const initialRenderTime = renderEndTime.current - renderStartTime.current;
    
    SimplePerformance.logEvent(
      'screen', 
      `Screen ${screenName} initial render took ${initialRenderTime}ms`
    );
    
    // Take a memory snapshot when a screen mounts
    MemoryMonitor.takeSnapshot(`screen_mount_${screenName}`);
    
    return () => {
      // Track screen unmount
      SimplePerformance.endTrace(mountTraceId);
      
      // Log total time spent on screen
      const timeOnScreen = Date.now() - renderEndTime.current;
      SimplePerformance.logEvent(
        'screen',
        `User spent ${Math.round(timeOnScreen / 1000)}s on ${screenName}`
      );
      
      // Take a memory snapshot when a screen unmounts to detect leaks
      MemoryMonitor.takeSnapshot(`screen_unmount_${screenName}`);
    };
  }, [screenName]);
  
  // Helper function to trace data loading operations
  const trackDataLoad = (operationName: string, mode: 'start' | 'end') => {
    const fullName = `${screenName}_${operationName}`;
    
    if (mode === 'start') {
      dataLoadStartTime.current[operationName] = Date.now();
      activeTraces[fullName] = SimplePerformance.startTrace(fullName, 
        { screen: screenName, operation: operationName }, 
        'data-loading');
      return;
    }
    
    // Handle end
    if (activeTraces[fullName]) {
      SimplePerformance.endTrace(activeTraces[fullName]);
      delete activeTraces[fullName];
      
      // Log data load duration
      if (dataLoadStartTime.current[operationName]) {
        const duration = Date.now() - dataLoadStartTime.current[operationName];
        SimplePerformance.logEvent(
          'data',
          `${screenName} - ${operationName} loaded in ${duration}ms`
        );
      }
    }
  };
  
  // Helper to track animations
  const trackAnimation = (animationName: string, durationMs: number) => {
    FrameRateMonitor.startMonitoring(`${screenName}_${animationName}`);
    
    setTimeout(() => {
      FrameRateMonitor.stopMonitoring();
    }, durationMs + 100); // Add a small buffer to the timeout
  };
  
  return {
    trackDataLoad,
    trackAnimation
  };
}