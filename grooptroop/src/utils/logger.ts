/**
 * Logger utility for consistent logging throughout the app
 */

const logger = {
  debug: (message: string, ...args: any[]) => {
    console.log(`[DEBUG] ${message}`, ...args);
  },
  
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${message}`, ...args);
  },
  
  warning: (message: string, ...args: any[]) => {
    console.log(`[WARNING] ${message}`, ...args);
  },
  
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
  
  chat: (message: string, ...args: any[]) => {
    console.log(`[CHAT] ${message}`, ...args);
  },
  
  notification: (message: string, ...args: any[]) => {
    console.log(`[NOTIFICATION] ${message}`, ...args);
  },
  
  auth: (message: string, ...args: any[]) => {
    console.log(`[AUTH] ${message}`, ...args);
  },
  
  groop: (message: string, ...args: any[]) => {
    console.log(`[GROOP] ${message}`, ...args);
  },
  
  performance: (message: string, ...args: any[]) => {
    console.log(`[PERFORMANCE] ${message}`, ...args);
  }
};

export default logger;