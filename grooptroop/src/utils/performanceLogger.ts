/**
 * Utility for safely logging performance metrics
 * Acts as a wrapper around logger to prevent errors
 */

import logger from './logger';

export const performanceLogger = {
  log: (message: string, ...args: any[]) => {
    try {
      if (typeof logger.performance === 'function') {
        logger.performance(message, ...args);
      } else {
        console.log(`[PERFORMANCE] ${message}`, ...args);
      }
    } catch (e) {
      console.log(`[PERFORMANCE] ${message}`, ...args);
    }
  },
  
  trackOperation: (operation: string, durationMs: number) => {
    try {
      if (typeof logger.performance === 'function') {
        logger.performance(`${operation} took ${durationMs.toFixed(1)}ms`);
      } else {
        console.log(`[PERFORMANCE] ${operation} took ${durationMs.toFixed(1)}ms`);
      }
    } catch (e) {
      console.log(`[PERFORMANCE] ${operation} took ${durationMs.toFixed(1)}ms`);
    }
  }
};