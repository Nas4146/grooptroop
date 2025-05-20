import * as Sentry from '@sentry/react-native';
import { useRef, useEffect } from 'react';
import { PerformanceBudgetViolation, LogEntry, TraceEntry, ChatPerformanceMetrics } from './monitoringTypes';

/**
 * Comprehensive Sentry service that handles all error tracking and performance monitoring
 */
export class SentryService {
  private static _initialized = false;
  private static _eventHistory: LogEntry[] = [];
  private static _transactionHistory: TraceEntry[] = [];
  private static _budgetViolations: PerformanceBudgetViolation[] = [];
  private static _performanceBudgets: Record<string, number> = {
    'render': 16,
    'network-request': 500, 
    'component-operation': 50
  };
  private static _chatMetrics: ChatPerformanceMetrics | null = null;

  /**
   * Check if Sentry is properly initialized
   */
  static isInitialized(): boolean {
    try {
      return Sentry !== undefined;
    } catch (e) {
      return false;
    }
  }

  /**
   * Safely capture an error
   */
  static captureError(error: Error, context?: Record<string, any>): void {
    if (!this.isInitialized()) {
      console.error('[SENTRY] Not initialized, error not captured:', error);
      return;
    }

    try {
      Sentry.withScope(scope => {
        if (context) {
          Object.entries(context).forEach(([key, value]) => {
            scope.setExtra(key, value);
          });
        }
        Sentry.captureException(error);
      });

      // Log locally for debugging
      this._eventHistory.push({
        type: 'error',
        message: error.message,
        timestamp: Date.now(),
        category: context?.context || 'uncategorized',
        level: 'error'
      });
    } catch (e) {
      console.error('[SENTRY] Error capturing exception:', e);
    }
  }

  /**
   * Log an event for local debugging
   */
  static logEvent(category: string, message: string, data?: Record<string, any>, isError = false): void {
    try {
      // Add to local history
      this._eventHistory.push({
        type: 'custom',
        message,
        timestamp: Date.now(),
        category,
        level: isError ? 'error' : 'info',
        data
      });

      // Add breadcrumb to Sentry
      Sentry.addBreadcrumb({
        category,
        message,
        data,
        level: isError ? 'error' : 'info',
      });
    } catch (e) {
      console.error('[SENTRY] Error logging event:', e);
    }
  }

  /**
   * Create a simple transaction-like object for tracking even if real transactions aren't available
   */
  static startTransaction(name: string, operation: string): SentrySpan {
    try {
      // Create a transaction ID
      const id = `${name}-${Date.now()}`;
      const startTime = Date.now();
      
      // Add a breadcrumb for the start
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `Started: ${operation} - ${name}`,
        level: 'info',
      });
      
      // Create a trace entry for local tracking
      const traceEntry: TraceEntry = {
        id,
        name,
        category: operation,
        startTime,
        endTime: undefined,
        duration: undefined,
        status: 'in_progress',
        data: {},
        measurements: {} // Add this field to store measurements
      };
      
      this._transactionHistory.push(traceEntry);
      
      // Return a span-like object
      return {
        id,
        setTag: (key: string, value: string) => {
          const trace = this._transactionHistory.find(t => t.id === id);
          if (trace) {
            trace.data = trace.data || {};
            trace.data[`tag.${key}`] = value;
          }
        },
        setData: (key: string, value: any) => {
          const trace = this._transactionHistory.find(t => t.id === id);
          if (trace) {
            trace.data = trace.data || {};
            trace.data[key] = value;
          }
        },
        setStatus: (status: string) => {
          const trace = this._transactionHistory.find(t => t.id === id);
          if (trace) {
            trace.status = status;
          }
        },
        // Add the missing setMeasurement method
        setMeasurement: (name: string, value: number, unit: string) => {
          try {
            const trace = this._transactionHistory.find(t => t.id === id);
            if (trace) {
              trace.measurements = trace.measurements || {};
              trace.measurements[name] = { value, unit };
              
              // Also add to data for backward compatibility
              trace.data = trace.data || {};
              trace.data[`measurement.${name}`] = `${value} ${unit}`;
            }
            
            // Use type assertion to access getCurrentHub
            if (Sentry) {
              try {
                // Use type assertion to tell TypeScript that getCurrentHub exists
                const sentryAny = Sentry as any;
                if (typeof sentryAny.getCurrentHub === 'function') {
                  const hub = sentryAny.getCurrentHub();
                  const scope = hub.getScope();
                  const transaction = scope.getTransaction();
                  
                  if (transaction && typeof transaction.setMeasurement === 'function') {
                    transaction.setMeasurement(name, value, unit);
                  }
                }
              } catch (e) {
                // Silently handle errors with the actual Sentry SDK
                console.debug('[SENTRY] Could not set measurement on actual transaction:', e);
              }
            }
          } catch (e) {
            console.warn('[SENTRY] Error in setMeasurement:', e);
          }
        },
        startChild: (operation: string, description?: string) => {
          const childId = `${id}-child-${Date.now()}`;
          const childStartTime = Date.now();
          
          // Add child trace
          const childTrace: TraceEntry = {
            id: childId,
            name: description || operation,
            category: 'child_operation',
            parentId: id,
            startTime: childStartTime,
            endTime: undefined,
            duration: undefined,
            status: 'in_progress',
            data: {}
          };
          
          this._transactionHistory.push(childTrace);
          
          return {
            setData: (key: string, value: any) => {
              const trace = this._transactionHistory.find(t => t.id === childId);
              if (trace) {
                trace.data = trace.data || {};
                trace.data[key] = value;
              }
            },
            finish: () => {
              const trace = this._transactionHistory.find(t => t.id === childId);
              if (trace) {
                trace.endTime = Date.now();
                trace.duration = trace.endTime - trace.startTime;
                trace.status = 'completed';
              }
            }
          };
        },
        finish: () => {
          const trace = this._transactionHistory.find(t => t.id === id);
          if (trace) {
            trace.endTime = Date.now();
            trace.duration = trace.endTime - trace.startTime;
            trace.status = 'completed';
            
            // Add a breadcrumb for the finish
            Sentry.addBreadcrumb({
              category: 'performance',
              message: `Finished: ${operation} - ${name} (${trace.duration}ms)`,
              data: { duration: trace.duration, ...trace.data },
              level: 'info',
            });
            
            // Check for budget violations
            const budget = this._performanceBudgets[operation];
            if (budget && trace.duration > budget) {
              // Record violation
              this._budgetViolations.push({
                operation,
                name,
                budget,
                actual: trace.duration,
                timestamp: Date.now()
              });
              
              // Log slow operation
              if (trace.duration > budget * 2) {
                Sentry.captureMessage(
                  `Performance warning: ${name} took ${trace.duration}ms (budget: ${budget}ms)`,
                  'warning'
                );
              }
            }
          }
        }
      };
    } catch (e) {
      console.error('[SENTRY] Failed to start transaction:', e, {
        componentStack: new Error().stack
      });
      
      // Return a dummy object that won't crash on method calls
      return {
        id: 'error',
        setTag: () => {},
        setData: () => {},
        setStatus: () => {},
        setMeasurement: () => {}, // Add missing dummy method
        startChild: () => ({ setData: () => {}, finish: () => {} }),
        finish: () => {}
      };
    }
  }
  
  static async trackMemoryUsage(): Promise<Record<string, any>> {
    // Simple memory tracking
    const extendedPerformance = global.performance as ExtendedPerformance;
    const memory = {
      timestamp: Date.now(),
      jsHeapSize: extendedPerformance?.memory?.usedJSHeapSize || 0,
      totalJSHeapSize: extendedPerformance?.memory?.totalJSHeapSize || 0,
    };
    
    this.logEvent('memory', `Memory usage: ${Math.round(memory.jsHeapSize / 1024 / 1024)}MB`);
    return memory;
  }
  
  /**
   * Get budget violations
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
  static getCompletedTransactions(): TraceEntry[] {
    return this._transactionHistory.filter(trace => trace.endTime !== undefined);
  }

  /**
   * Clear event and transaction history
   */
  static clearHistory(): void {
    this._eventHistory = [];
    this._transactionHistory = [];
    this._budgetViolations = [];
    console.log('[SENTRY] Clearing Sentry event history');
  }

  /**
   * Store chat performance metrics
   */
  static storeChatPerformanceMetrics(metrics: ChatPerformanceMetrics): void {
    this._chatMetrics = metrics;
  }

  /**
   * Get chat performance metrics including session history
   */
  static getChatPerformanceMetrics() {
    // Import on demand to avoid circular dependencies
    try {
      const ChatPerformanceMonitor = require('./chatPerformanceMonitor').default;
      console.log('[SENTRY] Getting chat performance metrics');
      
      // Ensure ChatPerformanceMonitor is properly initialized
      if (ChatPerformanceMonitor && typeof ChatPerformanceMonitor.getChatPerformanceMetrics === 'function') {
        return ChatPerformanceMonitor.getChatPerformanceMetrics();
      } else {
        console.log('[SENTRY] ChatPerformanceMonitor not available or method missing');
        return null;
      }
    } catch (e) {
      console.error('[SENTRY] Error getting chat metrics:', e);
      return null;
    }
  }

  /**
   * Add a breadcrumb to track user/app actions
   */
  static addBreadcrumb(breadcrumb: {
    category: string;
    message: string;
    level: string;
    data?: Record<string, any>;
  }): void {
    try {
      // Add to local event history
      this._eventHistory.push({
        type: 'breadcrumb',
        message: breadcrumb.message,
        timestamp: Date.now(),
        category: breadcrumb.category,
        level: breadcrumb.level || 'info',
        data: breadcrumb.data
      });

      // Pass to real Sentry if available
      if (this.isInitialized()) {
        try {
          Sentry.addBreadcrumb({
            category: breadcrumb.category,
            message: breadcrumb.message,
            level: breadcrumb.level as any,
            data: breadcrumb.data
          });
        } catch (e) {
          console.error('[SENTRY] Error adding breadcrumb to Sentry:', e);
        }
      }
    } catch (e) {
      console.error('[SENTRY] Error adding breadcrumb:', e);
    }
  }

  /**
   * Capture an exception and send to Sentry
   */
  static captureException(error: Error, context?: Record<string, any>): void {
    try {
      // Add to local event history
      this._eventHistory.push({
        type: 'error',
        message: error.message,
        timestamp: Date.now(),
        category: 'exception',
        level: 'error',
        data: {
          stack: error.stack,
          ...context
        }
      });

      // Pass to real Sentry if available
      if (this.isInitialized()) {
        try {
          Sentry.withScope(scope => {
            if (context) {
              Object.entries(context).forEach(([key, value]) => {
                scope.setExtra(key, value);
              });
            }
            Sentry.captureException(error);
          });
        } catch (e) {
          console.error('[SENTRY] Error capturing exception in Sentry:', e);
        }
      }
    } catch (e) {
      console.error('[SENTRY] Error capturing exception:', e);
    }
  }

  /**
   * Flush events to Sentry
   */
  static async flush(timeout?: number): Promise<boolean> {
    try {
      if (this.isInitialized()) {
        try {
          await Sentry.flush(timeout || 5000);
          return true;
        } catch (e) {
          console.error('[SENTRY] Error flushing events to Sentry:', e);
          return false;
        }
      }
      
      return false;
    } catch (e) {
      console.error('[SENTRY] Error in flush method:', e);
      return false;
    }
  }
}

// Type definitions for the SentrySpan
export interface SentrySpan {
  id: string;
  setTag: (key: string, value: string) => void;
  setData: (key: string, value: any) => void;
  setStatus: (status: string) => void;
  setMeasurement: (name: string, value: number, unit: string) => void; // Remove optional ?
  startChild: (operation: string, description?: string) => {
    setData: (key: string, value: any) => void;
    finish: () => void;
  };
  finish: () => void;
}

// Custom hook for performance tracking
export const usePerformance = (componentName: string) => {
  const mountTime = useRef(Date.now());
  const transaction = useRef<SentrySpan | null>(null);
  
  useEffect(() => {
    // Create transaction on mount
    transaction.current = SentryService.startTransaction(
      `component_${componentName}`,
      'component_lifecycle'
    );
    
    return () => {
      // Finish transaction on unmount
      if (transaction.current) {
        transaction.current.setData('mount_duration', Date.now() - mountTime.current);
        transaction.current.finish();
      }
    };
  }, [componentName]);
  
  return {
    trackMount: () => {
      SentryService.logEvent('performance', `${componentName} mounted`);
    },
    
    trackInteraction: (action: string, data?: Record<string, any>) => {
      SentryService.logEvent('interaction', `${componentName}: ${action}`, data);
    },
    
    trackOperation: (name: string) => {
      const startTime = Date.now();
      const operationId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      SentryService.logEvent('operation', `${componentName}: Started ${name}`, { operationId });
      
      return {
        end: () => {
          const duration = Date.now() - startTime;
          SentryService.logEvent('operation', `${componentName}: Finished ${name}`, { 
            operationId, 
            duration 
          });
        }
      };
    }
  };
};

// Extend the Performance interface to include memory properties
interface ExtendedPerformance extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}