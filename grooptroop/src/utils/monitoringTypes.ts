export interface PerformanceTrace {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags?: Record<string, any>;
  metadata?: Record<string, any>;
  category?: string;
  status?: string;
  data?: Record<string, any>;
}

export interface PerformanceMetrics {
  fps?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  jsHeapSize?: number;
  nativeMemory?: number;
  renderTime?: number;
  networkTime?: number;
  frameDrops?: number;
  slowRenders?: number;
}

// For memory monitoring
export interface MemorySnapshot {
  timestamp: number;
  nativeMemory?: number;
  jsHeapSize?: number;
  marker: string;
}

// For CPU monitoring
export interface CPUSample {
  timestamp: number;
  usage: number;
  marker: string;
}

// For network monitoring
export interface NetworkRequest {
  url: string;
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status?: number;
  responseSize?: number;
  error?: string;
  metadata?: Record<string, any>;
}

// For frame rate monitoring
export interface FrameRateMetrics {
  fps: number;
  duration: number;
  framesCount: number;
  avgFrameTime: number;
  maxFrameTime: number;
  droppedFrames: number;
  droppedFramePercentage: number;
}

// For chat performance monitoring
export interface MessagePerformanceData {
  messageId: string;
  sendStartTime?: number;
  sendEndTime?: number;
  receiveStartTime?: number;
  receiveEndTime?: number;
  renderStartTime?: number;
  renderEndTime?: number;
  messageSize?: number;
  success?: boolean;
}

export interface ChatPerformanceMetrics {
  chatId: string;
  isActive: boolean;
  messagesSent: number;
  messagesReceived: number;
  avgNetworkLatency: number;
  p95NetworkLatency?: number;
  jsHeapSize: number;
  frameDrops: number;
  slowRenders: number;
  sessionDuration: number;
  renderTimes?: number[];
}

// For component performance tracking
export interface TrackedComponent {
  name: string;
  renderCount: number;
  lastRenderTime: number;
  totalRenderTime: number;
  mountTime?: number;
  tags?: Record<string, any>;
}

// For budget violations
export interface PerformanceBudgetViolation {
  category: string;
  operation: string;
  budget: number;
  actual: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

// For Sentry span
export interface SentrySpan {
  finish: () => void;
  setData: (key: string, value: any) => void;
  setTag: (key: string, value: string) => void;
  setStatus: (status: string) => SentrySpan;
  startChild: (operation: string, description: string) => SentrySpan;
  setMeasurement: (name: string, value: number, unit: string) => void;
}

// For logging
export interface LogEntry {
  message: string;
  timestamp: number;
  category: string;
  level: 'info' | 'warning' | 'error';
  metadata?: Record<string, any>;
}

// Performance budgets
export interface PerformanceBudgets {
  JS_THREAD_RENDER: number;
  UI_THREAD_RENDER: number;
  MESSAGE_SEND_RTT: number;
  CHAT_MEMORY: number;
  MESSAGE_LIST_RENDER: number;
  IMAGE_LOAD: number;
  TYPING_LATENCY: number;
}