import * as Sentry from '@sentry/react-native';
import { SimplePerformance } from './simplePerformance';
import { Platform } from 'react-native';

const MIN_BREADCRUMB_LEVEL = 'info'; // 'debug', 'info', 'warning', 'error', 'fatal'

export class SentryPerformance {
  private static initialized = false;
  
  /**
   * Initialize Sentry performance monitoring
   * @param dsn Your Sentry DSN
   */
  static initialize(dsn: string = process.env.SENTRY_DSN || ''): void {
    if (this.initialized) return;
    
    Sentry.init({
      dsn,
      integrations: [
        new Sentry.ReactNativeTracing({
          idleTimeout: 5000,
          routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),
        }),
      ],
      tracesSampleRate: __DEV__ ? 1.0 : 0.2, // Sample rate lower in production
      enableAutoPerformanceTracking: true,
      // Customize what context data is included
      attachStacktrace: true,
      // Environment
      environment: __DEV__ ? 'development' : 'production',
      // Device context
      beforeSend: (event) => {
        // Add platform info
        event.contexts = {
          ...event.contexts,
          app: {
            ...event.contexts?.app,
            platform: Platform.OS,
            version: Platform.Version,
          },
        };
        return event;
      },
      // Adjust console log levels
      debug: __DEV__,
      enableNative: true,
    });
    
    // Connect SimplePerformance to Sentry
    this.connectSimplePerformance();
    
    this.initialized = true;
    SimplePerformance.logEvent('monitoring', 'Sentry performance monitoring initialized');
  }
  
  /**
   * Connect SimplePerformance to Sentry
   */
  private static connectSimplePerformance(): void {
    // Listen to all performance events from SimplePerformance
    const originalLogEvent = SimplePerformance.logEvent;
    SimplePerformance.logEvent = (category: string, message: string, metadata?: Record<string, string>, isWarning?: boolean) => {
      // Original behavior
      originalLogEvent(category, message, metadata, isWarning);
      
      // Send to Sentry as breadcrumb
      const level = isWarning ? 'warning' : 'info';
      if (MIN_BREADCRUMB_LEVEL === 'info' || isWarning) {
        Sentry.addBreadcrumb({
          category: `performance.${category}`,
          message,
          data: metadata,
          level,
        });
      }
    };
    
    // Track completed traces
    const originalEndTrace = SimplePerformance.endTrace;
    SimplePerformance.endTrace = (id: string) => {
      const result = originalEndTrace(id);
      
      // Only track significant traces
      if (result && result > 50) { // Only send traces longer than 50ms
        const trace = SimplePerformance.getCompletedTraces().find(t => t.id === id);
        if (trace) {
          const transaction = Sentry.startTransaction({
            name: trace.name,
            op: trace.metadata?.category || 'performance',
          });
          
          // Add trace data
          Object.entries(trace.metadata || {}).forEach(([key, value]) => {
            transaction.setTag(key, value.toString());
          });
          
          transaction.setData('duration', trace.duration);
          transaction.setMeasurement('duration', trace.duration, 'millisecond');
          
          // Set status based on performance budget
          const category = trace.metadata?.category;
          if (category && SimplePerformance.getBudget(category) && 
              trace.duration > SimplePerformance.getBudget(category)) {
            transaction.setTag('budget_exceeded', 'true');
          }
          
          // Transaction was already completed
          transaction.finish();
        }
      }
      
      return result;
    };
  }
  
  /**
   * Start a performance transaction
   * @param name Transaction name
   * @param operation Transaction operation type
   * @returns Sentry Transaction
   */
  static startTransaction(name: string, operation: string): Sentry.Transaction {
    return Sentry.startTransaction({
      name,
      op: operation
    });
  }
  
  /**
   * Track a fetch request with Sentry
   * @param url Request URL
   * @param options Request options
   */
  static trackFetchRequest(url: string, options: RequestInit = {}): {
    span: Sentry.Span,
    finishWithResponse: (response: Response) => void,
    finishWithError: (error: Error) => void
  } {
    const transaction = this.startTransaction(`HTTP ${options.method || 'GET'}`, 'http.client');
    const span = transaction.startChild({
      op: 'http.request',
      description: `${options.method || 'GET'} ${url}`
    });
    
    span.setTag('http.url', url);
    span.setTag('http.method', options.method || 'GET');
    
    return {
      span,
      finishWithResponse: (response: Response) => {
        span.setTag('http.status_code', String(response.status));
        span.setData('response.status', response.status);
        span.setData('response.statusText', response.statusText);
        
        if (response.status >= 400) {
          span.setStatus('internal_error');
        }
        
        span.finish();
        transaction.finish();
      },
      finishWithError: (error: Error) => {
        span.setStatus('internal_error');
        span.setData('error', error.message);
        span.finish();
        transaction.finish();
        
        // Also capture the error
        Sentry.captureException(error);
      }
    };
  }
  
  /**
   * Set a global tag for all future events
   * @param key Tag key
   * @param value Tag value
   */
  static setTag(key: string, value: string): void {
    Sentry.setTag(key, value);
  }
  
  /**
   * Set user information
   * @param user User data
   */
  static setUser(user: { id?: string; email?: string; username?: string; }): void {
    Sentry.setUser(user);
  }
}

// Export the initialized Sentry instance for convenience
export { Sentry };