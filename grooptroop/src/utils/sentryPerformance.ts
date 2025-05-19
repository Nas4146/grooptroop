import * as Sentry from '@sentry/react-native';
import { SimplePerformance } from './simplePerformance';
import { Platform } from 'react-native';
import { AppState } from 'react-native';

const MIN_BREADCRUMB_LEVEL = 'info'; // 'debug', 'info', 'warning', 'error', 'fatal'

export class SentryPerformance {
  private static initialized = false;
  private static currentTransaction: Sentry.Transaction | null = null;
  private static activeSpans: Record<string, Sentry.Span> = {};
  
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
          // Track app state changes
          shouldCreateSpanForRequest: (url) => {
            // Filter out any unwanted requests (analytics, etc.)
            return !url.includes('analytics');
          },
          traceFetch: true,
          traceXHR: true,
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
          // Add custom context for GroopTroop
          grooptroop: {
            currentScreen: global._CURRENT_SCREEN || 'unknown',
            lastUIAction: global._LAST_UI_ACTION || 'none',
            memoryUsage: global._MEMORY_USAGE || 'unknown',
          }
        };
        return event;
      },
      // Adjust console log levels
      debug: __DEV__,
      enableNative: true,
    });
    
    // Connect SimplePerformance to Sentry
    this.connectSimplePerformance();
    
    // Monitor app state changes
    this.monitorAppState();
    
    this.initialized = true;
    SimplePerformance.logEvent('monitoring', 'Sentry performance monitoring initialized');
  }
  
  /**
   * Monitor app state changes for performance tracking
   */
  private static monitorAppState(): void {
    AppState.addEventListener('change', (nextAppState) => {
      // Track when app goes to background or comes to foreground
      Sentry.addBreadcrumb({
        category: 'app.state',
        message: `App state changed to ${nextAppState}`,
        level: 'info',
      });
      
      if (nextAppState === 'active') {
        // App came to foreground
        this.startTransaction('app.foreground', 'app.lifecycle');
      } else if (nextAppState === 'background') {
        // App went to background
        if (this.currentTransaction) {
          this.currentTransaction.finish();
          this.currentTransaction = null;
        }
      }
    });
  }
  
  /**
   * Set user information for Sentry
   */
  static setUser(user: { id: string, username?: string, email?: string }): void {
    Sentry.setUser(user);
  }
  
  /**
   * Connect SimplePerformance to Sentry
   */
  private static connectSimplePerformance(): void {
    // Listen to all performance events from SimplePerformance
    const originalLogEvent = SimplePerformance.logEvent;
    SimplePerformance.logEvent = (category: string, message: string, metadata?: Record<string, any>, isWarning?: boolean) => {
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
      if (result && result.duration > 50) {  // Only track traces over 50ms
        const traceData = {
          name: result.name,
          duration: result.duration,
          startTime: result.startTime,
          tags: result.tags || {}
        };
        
        // End the corresponding span if it exists
        if (this.activeSpans[id]) {
          const span = this.activeSpans[id];
          Object.entries(traceData.tags).forEach(([key, value]) => {
            span.setTag(key, String(value));
          });
          span.setData('duration_ms', traceData.duration);
          span.finish();
          delete this.activeSpans[id];
        }
        
        // Add as performance breadcrumb
        Sentry.addBreadcrumb({
          category: 'performance.trace',
          message: `Trace ${result.name} completed`,
          data: traceData,
          level: 'info'
        });
      }
      
      return result;
    };
    
    // Add spans for traces
    const originalStartTrace = SimplePerformance.startTrace;
    SimplePerformance.startTrace = (name: string, tags?: Record<string, any>) => {
      const traceId = originalStartTrace(name, tags);
      
      // Create a span for this trace
      let transaction = this.currentTransaction;
      if (!transaction) {
        transaction = this.startTransaction('app.activity', 'general');
        this.currentTransaction = transaction;
      }
      
      const span = transaction.startChild({
        op: 'trace',
        description: name,
      });
      
      if (tags) {
        Object.entries(tags).forEach(([key, value]) => {
          span.setTag(key, String(value));
        });
      }
      
      this.activeSpans[traceId] = span;
      return traceId;
    };
  }
  
  /**
   * Start a performance transaction
   * @param name Transaction name
   * @param operation Transaction operation type
   * @returns Sentry Transaction
   */
  static startTransaction(name: string, operation: string): Sentry.Transaction {
    const transaction = Sentry.startTransaction({
      name,
      op: operation,
    });
    
    Sentry.configureScope(scope => {
      scope.setSpan(transaction);
    });
    
    return transaction;
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
    // Get the current transaction or create a new one
    let transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
    if (!transaction) {
      transaction = this.startTransaction('app.network', 'network');
    }
    
    // Create a child span for this request
    const span = transaction.startChild({
      op: 'http.client',
      description: `${options.method || 'GET'} ${url}`,
    });
    
    // Add request data
    span.setData('url', url);
    span.setData('method', options.method || 'GET');
    if (options.headers) {
      // Sanitize headers to remove sensitive information
      const sanitizedHeaders = {...options.headers};
      if (sanitizedHeaders.authorization) sanitizedHeaders.authorization = '[REDACTED]';
      if (sanitizedHeaders.Authorization) sanitizedHeaders.Authorization = '[REDACTED]';
      span.setData('headers', sanitizedHeaders);
    }
    
    return {
      span,
      finishWithResponse: (response: Response) => {
        span.setStatus(response.ok ? 'ok' : 'unknown_error');
        span.setData('status_code', response.status);
        span.finish();
      },
      finishWithError: (error: Error) => {
        span.setStatus('internal_error');
        span.setData('error', error.message);
        span.finish();
      }
    };
  }
  
  /**
   * Track a UI action
   */
  static trackUIAction(actionName: string, metadata: Record<string, any> = {}): void {
    // Store the last UI action globally
    global._LAST_UI_ACTION = actionName;
    
    // Add a breadcrumb
    Sentry.addBreadcrumb({
      category: 'ui.action',
      message: actionName,
      data: metadata,
      level: 'info'
    });
    
    // Start a transaction for significant actions
    const significantActions = ['submitForm', 'login', 'signup', 'checkout', 'sendMessage'];
    if (significantActions.some(action => actionName.includes(action))) {
      const transaction = this.startTransaction(`ui.action.${actionName}`, 'ui.action');
      
      // Add metadata to transaction
      Object.entries(metadata).forEach(([key, value]) => {
        transaction.setTag(key, String(value));
      });
      
      // Set a timeout to finish the transaction
      setTimeout(() => {
        if (!transaction.sampled) {
          transaction.finish();
        }
      }, 5000); // Give it 5 seconds to complete
    }
  }
  
  /**
   * Track screen view with performance metrics
   */
  static trackScreenView(screenName: string, loadTimeMs?: number): void {
    // Store current screen globally
    global._CURRENT_SCREEN = screenName;
    
    // Add breadcrumb
    Sentry.addBreadcrumb({
      category: 'navigation',
      message: `Screen viewed: ${screenName}`,
      data: loadTimeMs ? { loadTimeMs } : undefined,
      level: 'info'
    });
  }
  
  /**
   * Track memory usage
   */
  static trackMemoryUsage(memoryInfo: { jsHeapSize?: number, nativeMemoryUsage?: number }): void {
    // Store memory usage globally
    global._MEMORY_USAGE = `JS:${memoryInfo.jsHeapSize || 'unknown'}, Native:${memoryInfo.nativeMemoryUsage || 'unknown'}`;
    
    // Add as performance data
    Sentry.addBreadcrumb({
      category: 'performance.memory',
      message: 'Memory usage snapshot',
      data: memoryInfo,
      level: 'info'
    });
  }
}

// Add global type definitions
declare global {
  var _CURRENT_SCREEN: string | undefined;
  var _LAST_UI_ACTION: string | undefined;
  var _MEMORY_USAGE: string | undefined;
}

// Export the initialized Sentry instance for convenience
export { Sentry };