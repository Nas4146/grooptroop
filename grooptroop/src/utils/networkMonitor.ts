import { SimplePerformance } from './simplePerformance';

/**
 * Enhanced network monitoring utility
 */
export class NetworkMonitor {
  private static requests: Map<string, {
    url: string,
    method: string,
    startTime: number,
    size?: number,
    status?: number
  }> = new Map();
  
  private static stats = {
    totalRequests: 0,
    failedRequests: 0,
    totalBytes: 0,
    slowRequests: 0 // requests exceeding the performance budget
  };
  
  /**
   * Intercept and monitor fetch requests
   */
  static initializeFetchMonitoring(): void {
    const originalFetch = global.fetch;
    
    global.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : input.url;
      const method = init?.method || 'GET';
      const requestId = `${method}_${url}_${Date.now()}`;
      
      // Start tracking
      NetworkMonitor.requests.set(requestId, {
        url,
        method,
        startTime: Date.now()
      });
      
      const traceId = SimplePerformance.startTrace(`fetch_${url.split('/').pop()}`, 
        { url, method }, 'network-request');
      
      try {
        // Execute actual fetch
        const response = await originalFetch(input, init);
        
        // Get response size if available
        const contentLength = response.headers.get('content-length');
        const size = contentLength ? parseInt(contentLength, 10) : undefined;
        
        // Update stats
        NetworkMonitor.stats.totalRequests++;
        if (size) {
          NetworkMonitor.stats.totalBytes += size;
        }
        
        // Clone response to read status
        const clonedResponse = response.clone();
        if (!clonedResponse.ok) {
          NetworkMonitor.stats.failedRequests++;
        }
        
        // Update request data
        NetworkMonitor.requests.set(requestId, {
          ...NetworkMonitor.requests.get(requestId)!,
          size,
          status: clonedResponse.status
        });
        
        // Track response data
        SimplePerformance.endTrace(traceId);
        
        // Return the original response
        return response;
      } catch (error) {
        // Handle errors
        NetworkMonitor.stats.totalRequests++;
        NetworkMonitor.stats.failedRequests++;
        SimplePerformance.endTrace(traceId);
        throw error;
      }
    };
    
    SimplePerformance.logEvent('network', 'Fetch monitoring initialized');
  }
  
  /**
   * Get network statistics
   */
  static getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0 
        ? ((this.stats.totalRequests - this.stats.failedRequests) / this.stats.totalRequests) * 100 
        : 100,
      requests: Array.from(this.requests.values())
    };
  }
}