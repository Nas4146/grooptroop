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
  frameCount: number;
  totalFrameTime: number;
  avgFrameTime: number;
  maxFrameTime: number;
  minFrameTime: number;
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
  isActive: boolean;
  chatId: string;
  messagesSent: number;
  messagesReceived: number;
  avgNetworkLatency: number;
  frameDrops: number; 
  jsHeapSize: number;
  slowRenders: number;
  sessionDuration: number;
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
  operation: string;
  name: string;
  budget: number;
  actual: number;
  timestamp: number;
}

// For Sentry span
export interface SentrySpan {
  id: string;
  setTag: (key: string, value: string) => void;
  setData: (key: string, value: any) => void;
  setStatus: (status: string) => void;
  setMeasurement?: (name: string, value: number, unit: string) => void;
  startChild: (operation: string, description?: string) => {
    setData: (key: string, value: any) => void;
    finish: () => void;
  };
  finish: () => void;
}

// For logging
export interface LogEntry {
  type: 'error' | 'custom';
  message: string;
  timestamp: number;
  category: string;
  level: 'error' | 'warning' | 'info';
  data?: Record<string, any>;
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

// Update the TraceEntry interface to include measurements:

export interface TraceEntry {
  id: string;
  name: string;
  category: string;
  parentId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: string;
  data?: Record<string, any>;
  measurements?: Record<string, { value: number, unit: string }>;
}