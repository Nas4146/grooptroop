export interface PerformanceTrace {
  name: string;
  startTime: number;
  duration?: number;
  endTime?: number;
  tags?: Record<string, any>;
}

export interface PerformanceMetrics {
  fps?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  renderTime?: number;
  networkTime?: number;
}

export interface TrackedComponent {
  name: string;
  renderCount: number;
  lastRenderTime: number;
  totalRenderTime: number;
  tags?: Record<string, any>;
}