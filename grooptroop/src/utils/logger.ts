/**
 * Performance-optimized logging utility that completely removes logging in production
 */

// Function types for different log levels
type LogFunction = (...args: any[]) => void;

// Create stub no-op functions for production
const noop: LogFunction = () => {};

// Logger implementation that differs between dev and production
const logger = {
  // Standard log levels
  log: __DEV__ ? (...args: any[]) => console.log(...args) : noop,
  warn: __DEV__ ? (...args: any[]) => console.warn(...args) : noop,
  error: (...args: any[]) => console.error(...args), // Keep error logs even in production
  info: __DEV__ ? (...args: any[]) => console.info(...args) : noop,
  debug: __DEV__ ? (...args: any[]) => console.debug(...args) : noop,
  
  // Tagged logging helpers for components/services
  chat: __DEV__ ? (...args: any[]) => console.log('[CHAT]', ...args) : noop,
  avatar: __DEV__ ? (...args: any[]) => console.log('[AVATAR]', ...args) : noop,
  groop: __DEV__ ? (...args: any[]) => console.log('[GROOP]', ...args) : noop,
  auth: __DEV__ ? (...args: any[]) => console.log('[AUTH]', ...args) : noop,
  perf: __DEV__ ? (...args: any[]) => console.log('[PERF]', ...args) : noop,
  
  // Custom format for chat reactions specifically
  chatReactions: __DEV__ 
    ? (messageId: string, reactionInfo: string) => console.log(`[CHAT_REACTIONS] Message ${messageId.slice(0, 6)}: `, reactionInfo)
    : noop,
};

export default logger;