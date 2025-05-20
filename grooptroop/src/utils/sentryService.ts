import * as Sentry from '@sentry/react-native';
import React, { useState, useEffect, useRef } from 'react';
import { 
  PerformanceTrace, 
  PerformanceMetrics, 
  SentrySpan,
  LogEntry,
  ChatPerformanceMetrics,
  NetworkRequest,
  PerformanceBudgetViolation
} from './monitoringTypes';
import { SpanStatus } from '@sentry/core';
import { NavigationContainerRef } from '@react-navigation/native';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/**
 * Comprehensive Sentry service that handles all error tracking and performance monitoring
 */
export class SentryService {
  private static _initialized = false;
  private static _eventHistory: LogEntry[] = [];
  private static _transactionHistory: PerformanceTrace[] = [];
  private static _budgetViolations: PerformanceBudgetViolation[] = [];
  private static _performanceBudgets: Record<string, number> = {
    'render': 16,
    'network-request': 500,
    'component-operation': 50
  };
  private static _chatMetrics: ChatPerformanceMetrics | null = null;

  /**
   * Initialize Sentry with your configuration
   */
  static initialize(dsn: string, debug: boolean = __DEV__): void {
    if (this._initialized) {
      console.log('[SENTRY] Already initialized, skipping');
      return;
    }
    
    try {
      // Only configure if not already initialized globally
      Sentry.init({
        dsn,
        debug,
        enableAutoSessionTracking: true,
        tracesSampleRate: __DEV__ ? 1.0 : 0.2,
        enableAutoPerformanceTracing: true,
        attachStacktrace: true,
        environment: __DEV__ ? 'development' : 'production',
      });

      console.log('[SENTRY] Initialized successfully');
      this._initialized = true;
    } catch (e) {
      console.error('[SENTRY] Initialization error:', e);
    }
  }

  /**
   * Check if Sentry is properly initialized
   */
  static isInitialized(): boolean {
    return this._initialized && typeof Sentry.startTransaction === 'function';
  }

  /**
   * Create a new transaction for performance monitoring
   */
  static startTransaction(name: string, operation: string): SentrySpan {
    if (!this.isInitialized()) {
      console.warn('[SENTRY] Tried to start transaction but Sentry is not properly initialized');
      return this.getFallbackSpan();
    }
    
    try {
      const transaction = Sentry.startTransaction({
        name,
        op: operation
      });
      
      // Store transaction in history for later retrieval
      this._transactionHistory.push({
        name,
        startTime: Date.now(),
        category: operation
      });
      
      return transaction;
    } catch (e) {
      console.error('[SENTRY] Error creating transaction:', e);
      return this.getFallbackSpan();
    }
  }

  /**
   * Create a fallback span object to prevent crashes
   */
  private static getFallbackSpan(): SentrySpan {
    const returnFallback: SentrySpan = {
      finish: () => {},
      setData: () => {},
      setTag: () => {},
      setStatus: (status: SpanStatus): SentrySpan => { return returnFallback; },
      setMeasurement: () => {},
      startChild: (childName: string, childOp: string): SentrySpan => {
        return returnNestedFallback;
      }
    };

    const returnNestedFallback: SentrySpan = {
      finish: () => {},
      setData: () => {},
      setTag: () => {},
      setStatus: (status: SpanStatus): SentrySpan => { return returnNestedFallback; },
      setMeasurement: () => {},
      startChild: (nestedName: string, nestedOp: string): SentrySpan => {
        return deepNestedFallback;
      }
    };

    const deepNestedFallback: SentrySpan = {
      finish: () => {},
      setData: () => {},
      setTag: () => {},
      setStatus: (status: SpanStatus): SentrySpan => { return deepNestedFallback; },
      setMeasurement: () => {},
      startChild: (): SentrySpan => {
        console.warn('[SENTRY] Maximum nesting depth exceeded');
        return deepNestedFallback;
      }
    };

    return returnFallback;
  }

  /**
   * Log an event (high-level wrapper around breadcrumbs)
   */
  static logEvent(
    category: string, 
    message: string, 
    data?: Record<string, any>, 
    isWarning: boolean = false
  ): void {
    // Create log entry
    const logEntry: LogEntry = {
      category,
      message,
      timestamp: Date.now(),
      level: isWarning ? 'warning' : 'info',
      metadata: data
    };

    // Store in local history
    this._eventHistory.push(logEntry);

    // Only keep the last 100 events
    if (this._eventHistory.length > 100) {
      this._eventHistory.shift();
    }

    // Log to console for debugging
    console.log(`[${category}] ${message}`);

    // Add as Sentry breadcrumb
    if (this.isInitialized()) {
      try {
        Sentry.addBreadcrumb({
          category,
          message,
          data,
          level: isWarning ? 'warning' : 'info'
        });
      } catch (e) {
        console.error('[SENTRY] Error adding breadcrumb:', e);
      }
    }
  }

  /**
   * Capture an error with optional context
   */
  static captureError(error: Error, context?: Record<string, any>): void {
    if (!this.isInitialized()) {
      console.error('[SENTRY] Error:', error.message);
      return;
    }

    try {
      if (context) {
        Sentry.withScope(scope => {
          Object.entries(context).forEach(([key, value]) => {
            scope.setExtra(key, value);
          });
          Sentry.captureException(error);
        });
      } else {
        Sentry.captureException(error);
      }
    } catch (e) {
      console.error('[SENTRY] Error capturing exception:', e);
    }
  }

  /**
   * Configure navigation tracking
   */
  static configureNavigation(navigationRef: NavigationContainerRef<any>): () => void {
    if (!this.isInitialized() || !navigationRef) return () => {};

    let lastRoute = '';
    let currentNavSpan: SentrySpan | null = null;

    const handleNavigationChange = () => {
      try {
        const currentRoute = navigationRef.getCurrentRoute()?.name;

        // If we have a new route, track it
        if (currentRoute && currentRoute !== lastRoute) {
          // Finish the previous navigation span if it exists
          if (currentNavSpan) {
            currentNavSpan.finish();
          }

          // Start a new navigation span
          currentNavSpan = this.startTransaction(`navigation.${currentRoute}`, 'navigation');

          // Add breadcrumb for the navigation
          this.logEvent('navigation', `Navigation state changed, current route: ${currentRoute}`);

          lastRoute = currentRoute;
        }
      } catch (e) {
        console.error('[SENTRY] Error handling navigation change:', e);
      }
    };

    // Setup listener when ready
    const unsubscribe = navigationRef.addListener('state', handleNavigationChange);

    return unsubscribe;
  }

  /**
   * Track memory usage
   */
  static trackMemoryUsage(jsHeapSize?: number): PerformanceMetrics {
    const metrics: PerformanceMetrics = { 
      jsHeapSize: undefined, 
      memoryUsage: undefined 
    };

    try {
      // Get JS heap size if passed or available
      if (jsHeapSize !== undefined) {
        metrics.jsHeapSize = jsHeapSize;
      } else if (global.performance && (global.performance as any).memory) {
        metrics.jsHeapSize = (global.performance as any).memory.usedJSHeapSize / (1024 * 1024);
      }

      // Add memory metrics to Sentry session
      if (this.isInitialized() && metrics.jsHeapSize) {
        Sentry.setTag('memory.jsHeapSize', `${Math.round(metrics.jsHeapSize)}MB`);
      }
    } catch (e) {
      console.error('[SENTRY] Error tracking memory usage:', e);
    }

    return metrics;
  }

  /**
   * Track scroll performance
   */
  static trackScrollPerformance(
    event: NativeSyntheticEvent<NativeScrollEvent>,
    componentName: string
  ): void {
    try {
      const { velocity } = event.nativeEvent;
      
      if (velocity && (Math.abs(velocity.x) > 5 || Math.abs(velocity.y) > 5)) {
        this.logEvent('scroll', `Fast scroll detected in ${componentName}`, {
          velocityX: velocity.x,
          velocityY: velocity.y
        });
      }
    } catch (e) {
      console.error('[SENTRY] Error tracking scroll performance:', e);
    }
  }

  /**
   * Set up network monitoring
   */
  static setupNetworkMonitoring(): void {
    if (!this.isInitialized()) return;
    
    try {
      // Create a wrapper around the global fetch
      const originalFetch = global.fetch;
      
      global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input.url;
        const method = init?.method || 'GET';
        
        // Start a transaction
        const transaction = this.startTransaction(`fetch.${method}`, 'network.request');
        const startTime = Date.now();
        
        transaction.setTag('url', url);
        transaction.setTag('method', method);
        
        try {
          const response = await originalFetch(input, init);
          
          // Add response info to the transaction
          transaction.setTag('status', String(response.status));
          transaction.setData('status_text', response.statusText);
          
          // Check if response time exceeds budget
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          if (duration > (this._performanceBudgets['network-request'] || 500)) {
            this.recordBudgetViolation('network', 'fetch', 
              this._performanceBudgets['network-request'] || 500, duration, {
              url,
              method,
              status: response.status
            });
          }
          
          transaction.finish();
          return response;
        } catch (error) {
          transaction.setStatus('internal_error');
          if (error instanceof Error) {
            transaction.setData('error', error.message);
          }
          transaction.finish();
          throw error;
        }
      };
    } catch (e) {
      console.error('[SENTRY] Error setting up network monitoring:', e);
    }
  }

  /**
   * Record a performance budget violation
   */
  static recordBudgetViolation(
    category: string,
    operation: string,
    budget: number,
    actual: number,
    metadata?: Record<string, any>
  ): void {
    const violation: PerformanceBudgetViolation = {
      category,
      operation,
      budget,
      actual,
      timestamp: Date.now(),
      metadata
    };
    
    this._budgetViolations.push(violation);
    
    // Only keep the last 50 violations
    if (this._budgetViolations.length > 50) {
      this._budgetViolations.shift();
    }
    
    // Log as warning
    this.logEvent(
      category,
      `⚠️ ${operation} exceeds budget: ${actual}ms / ${budget}ms`,
      metadata,
      true
    );
  }

  /**
   * Set performance budget for a category
   */
  static setBudget(category: string, budgetMs: number): void {
    this._performanceBudgets[category] = budgetMs;
  }

  /**
   * Get performance budget violations
   */
  static getBudgetViolations(): PerformanceBudgetViolation[] {
    return [...this._budgetViolations];
  }

  /**
   * Get event history
   */
  static getEventHistory(): LogEntry[] {
    return [...this._eventHistory];
  }

  /**
   * Get completed transactions
   */
  static getCompletedTransactions(): PerformanceTrace[] {
    return this._transactionHistory.filter(trace => trace.endTime !== undefined);
  }

  /**
   * Clear event and transaction history
   */
  static clearHistory(): void {
    this._eventHistory = [];
    this._transactionHistory = [];
    this._budgetViolations = [];
    console.log('Clearing Sentry event history');
  }

  /**
   * Set user context
   */
  static setUser(user: { id: string; username?: string; email?: string }): void {
    if (!this.isInitialized()) return;

    try {
      Sentry.setUser(user);
    } catch (e) {
      console.error('[SENTRY] Error setting user:', e);
    }
  }

  /**
   * Set a tag
   */
  static setTag(key: string, value: string): void {
    if (!this.isInitialized()) return;

    try {
      Sentry.setTag(key, value);
    } catch (e) {
      console.error('[SENTRY] Error setting tag:', e);
    }
  }

  /**
   * Store chat performance metrics
   */
  static storeChatPerformanceMetrics(metrics: ChatPerformanceMetrics): void {
    this._chatMetrics = metrics;
  }

  /**
   * Get chat performance metrics
   */
  static getChatPerformanceMetrics(): ChatPerformanceMetrics {
    return this._chatMetrics || {
      chatId: '',
      isActive: false,
      messagesSent: 0,
      messagesReceived: 0,
      avgNetworkLatency: 0,
      jsHeapSize: 0,
      frameDrops: 0,
      slowRenders: 0,
      sessionDuration: 0
    };
  }

  /**
   * React hook for performance monitoring
   */
  static useComponentPerformance(componentName: string) {
    // Implementation will be in a separate hook file
    // This is just a placeholder for the interface
    return {
      trackRender: () => {},
      trackOperation: (name: string, fn: () => any) => fn(),
      trackAsync: async (name: string, fn: () => Promise<any>) => await fn()
    };
  }

  /**
   * Mark Sentry as initialized externally (for cases where init is called in native code)
   */
  static markAsInitialized(): void {
    if (!this._initialized) {
      this._initialized = true;
      console.log('[SENTRY] Marked as initialized externally');
    }
  }
}

// Add React hook for performance monitoring
export const usePerformance = (componentName: string) => {
  const isMountedRef = useRef(false);

  useEffect(() => {
    if (!isMountedRef.current) {
      // Only log on the first mount, not on re-renders
      SentryService.logEvent('performance', `${componentName} mounted`);
      isMountedRef.current = true;
    }
    
    return () => {
      SentryService.logEvent('performance', `${componentName} unmounted`);
      isMountedRef.current = false;
    };
  }, []); // Empty dependency array
  
  return {
    trackRender: (renderTime?: number) => {
      const time = renderTime || 0;
      SentryService.logEvent('performance', `${componentName} rendered ${time ? 'in ' + time + 'ms' : ''}`);
    },
    trackMount: () => {
      // No need to do anything here now since we're handling it in the useEffect
    },
    trackOperation: (name: string, fn: () => any) => {
      const start = performance.now();
      const result = fn();
      const duration = performance.now() - start;
      SentryService.logEvent('performance', `${componentName}.${name} completed in ${duration.toFixed(1)}ms`);
      return result;
    },
    trackAsync: async (name: string, fn: () => Promise<any>) => {
      const start = performance.now();
      try {
        const result = await fn();
        const duration = performance.now() - start;
        SentryService.logEvent('performance', `${componentName}.${name} completed in ${duration.toFixed(1)}ms`);
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        SentryService.logEvent('performance', `${componentName}.${name} failed after ${duration.toFixed(1)}ms`, undefined, true);
        throw error;
      }
    }
  };
};

// Make sure to initialize Sentry right away
// Replace this with your actual DSN in your initialization code
// This should be called from App.tsx or a similar root component
// SentryService.initialize('YOUR_SENTRY_DSN');