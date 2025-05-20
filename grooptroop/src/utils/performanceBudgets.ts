export const CHAT_PERFORMANCE_BUDGETS = {
  // Network budgets (milliseconds)
  MESSAGE_SEND_RTT: 1500, // Max round-trip time for message send
  MESSAGE_RECEIVE_RTT: 500, // Max time to receive and process a message
  
  // Rendering budgets (milliseconds)
  MESSAGE_LIST_RENDER: 50, // Max time to render a message
  FULL_CHAT_RENDER: 100, // Max time for initial chat render
  
  // Memory budget (bytes)
  CHAT_MEMORY: 100 * 1024 * 1024, // 100MB maximum heap size for chat
  
  // Frame rate budget
  MIN_FRAME_RATE: 45, // Minimum acceptable frame rate during scrolling
};