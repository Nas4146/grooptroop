import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Platform, 
  ScrollView, 
  TextInput,
  Animated,
  Dimensions,
  StyleProp,
  ViewStyle,
  Button,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SentryService, usePerformance, SentrySpan } from '../utils/sentryService';
import { Ionicons } from '@expo/vector-icons';
import { MemoryMonitor } from '../utils/memoryMonitor';
import { FrameRateMonitor } from '../utils/frameRateMonitor';
import { 
  LogEntry,
  TraceEntry,
  PerformanceBudgetViolation,
  ChatPerformanceMetrics
} from '../utils/monitoringTypes';
import { CHAT_PERFORMANCE_BUDGETS } from '../utils/chatPerformanceMonitor';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import * as Sentry from '@sentry/react-native';
import { SentryHelper } from '../utils/sentryHelper';

type DevPerformanceScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'DevPerformance'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Tab content component - Reusable for different tabs
const TabContent: React.FC<{ 
  children: React.ReactNode; 
  active: boolean; 
}> = ({ children, active }) => (
  <Animated.View style={[styles.tabContent, { display: active ? 'flex' : 'none' }]}>
    {children}
  </Animated.View>
);

// Collapsible section component
interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  initiallyExpanded?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ 
  title, 
  children, 
  initiallyExpanded = true 
}) => {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const rotateAnim = useState(new Animated.Value(initiallyExpanded ? 1 : 0))[0];

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [expanded, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View style={styles.collapsibleSection}>
      <TouchableOpacity 
        style={styles.sectionHeader} 
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.sectionHeaderText}>{title}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-forward" size={18} color="#6B7280" />
        </Animated.View>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.sectionContent}>
          {children}
        </View>
      )}
    </View>
  );
};

// Progress bar component for visualizing performance
const PerformanceBar = ({ value, max, label, barColor = '#7C3AED' }) => {
  const percentage = Math.min(100, (value / max) * 100);
  
  return (
    <View style={styles.performanceBar}>
      <View style={styles.performanceBarHeader}>
        <Text style={styles.performanceBarLabel}>{label}</Text>
        <Text style={styles.performanceBarValue}>{value}ms</Text>
      </View>
      <View style={styles.performanceBarContainer}>
        <View 
          style={[
            styles.performanceBarFill,
            { width: `${percentage}%`, backgroundColor: barColor }
          ]} 
        />
      </View>
    </View>
  );
};

// Define interface for Card props
interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>; // Make style optional
}

// Card component with proper typing
const Card: React.FC<CardProps> = ({ children, style }) => (
  <View style={[styles.card, style]}>
    {children}
  </View>
);

// Sentry Test Section Component
const SentryTestSection = () => {
  const [testing, setTesting] = useState(false);
  
  // Function to run basic Sentry test
  const runBasicTest = useCallback(async () => {
    setTesting(true);
    try {
      console.log('[SENTRY] Running basic Sentry test');
      
      // Add a breadcrumb using the correct method
      SentryService.addBreadcrumb({
        category: 'test',
        message: 'Testing Sentry from DevPerformanceScreen',
        level: 'info'
      });
      
      // Log an info event
      SentryService.logEvent(
        'test',
        'Manual test event from DevPerformanceScreen',
        { source: 'DevPerformanceScreen', timestamp: Date.now() }
      );
      
      // Call flush to send events immediately
      console.log('[SENTRY] Calling flush to send events immediately');
      await SentryService.flush();
      console.log('[SENTRY] Flush completed');
      
      Alert.alert(
        'Test Complete', 
        'Sentry test events were sent. Check your Sentry dashboard to verify.'
      );
    } catch (e) {
      console.error('[SENTRY] Test error:', e);
      Alert.alert('Test Failed', `Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTesting(false);
      console.log('[SENTRY] Test complete, events should appear in dashboard');
    }
  }, []);
  
  // Function to trigger a test error
  const triggerTestError = useCallback(async () => {
    setTesting(true);
    try {
      console.log('[SENTRY] Triggering test error');
      
      // Create and capture an error
      const testError = new Error('This is a test error from DevPerformanceScreen');
      testError.name = 'TestError';
      
      SentryService.captureException(testError);
      
      // Call flush to send events immediately
      console.log('[SENTRY] Calling flush to send error');
      await SentryService.flush();
      
      Alert.alert(
        'Error Triggered', 
        'A test error was sent to Sentry. Check your dashboard to verify.'
      );
    } catch (e) {
      console.error('[SENTRY] Error triggering test:', e);
      Alert.alert('Test Failed', `Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTesting(false);
    }
  }, []);
  
  return (
    <Card>
      <Text style={styles.sectionHeaderText}>Sentry Testing</Text>
      
      <View style={styles.sentryButtonsContainer}>
        <TouchableOpacity 
          style={styles.sentryButton}
          onPress={runBasicTest}
          disabled={testing}
        >
          {testing ? (
            <View style={styles.buttonContent}>
              <Ionicons name="sync" size={18} color="white" style={{marginRight: 8, opacity: 0.8}} />
              <Text style={styles.sentryButtonText}>Testing...</Text>
            </View>
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons name="analytics-outline" size={18} color="white" style={{marginRight: 8}} />
              <Text style={styles.sentryButtonText}>Log Test Event</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.sentryButton, styles.errorButton]}
          onPress={triggerTestError}
          disabled={testing}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="bug-outline" size={18} color="white" style={{marginRight: 8}} />
            <Text style={styles.sentryButtonText}>Trigger Error</Text>
          </View>
        </TouchableOpacity>
      </View>
    </Card>
  );
};

// Performance Summary Section
const PerformanceSummarySection = () => {
  const [memoryUsage, setMemoryUsage] = useState<number>(0);
  const [cpuUsage, setCpuUsage] = useState<number | null>(null);
  const [frameRate, setFrameRate] = useState<number | null>(null);
  
  useEffect(() => {
    // Update memory usage every second
    const memoryInterval = setInterval(async () => {
      try {
        // Check if the function exists before calling it
        if (typeof MemoryMonitor.getMemoryUsage === 'function') {
          const memory = await MemoryMonitor.getMemoryUsage();
          setMemoryUsage(memory);
        } else if (MemoryMonitor.getCurrentMemoryUsage) {
          // Try alternative method if available
          const memory = await MemoryMonitor.getCurrentMemoryUsage();
          setMemoryUsage(memory);
        } else {
          // Fallback to Performance API if available
          if (typeof performance !== 'undefined' && performance.memory) {
            setMemoryUsage(performance.memory.usedJSHeapSize);
          } else {
            // Just set a placeholder value
            setMemoryUsage(50 * 1024 * 1024); // 50MB as placeholder
          }
        }
      } catch (e) {
        console.error('[DEV_PERF] Error getting memory usage:', e);
        // Set default value on error
        setMemoryUsage(50 * 1024 * 1024); // 50MB as placeholder
      }
    }, 1000);
    
    // Start frame rate monitoring with safety check
    try {
      if (typeof FrameRateMonitor.startMonitoring === 'function') {
        FrameRateMonitor.startMonitoring((fps) => {
          setFrameRate(fps);
        });
      } else {
        // Use a placeholder value
        setFrameRate(60);
      }
    } catch (e) {
      console.error('[DEV_PERF] Error starting frame rate monitoring:', e);
      setFrameRate(60);
    }
    
    return () => {
      clearInterval(memoryInterval);
      try {
        if (typeof FrameRateMonitor.stopMonitoring === 'function') {
          FrameRateMonitor.stopMonitoring();
        }
      } catch (e) {
        console.error('[DEV_PERF] Error stopping frame rate monitoring:', e);
      }
    };
  }, []);
  
  return (
    <Card>
      <Text style={styles.sectionHeaderText}>Performance Overview</Text>
      
      <View style={styles.performanceSummary}>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Memory Usage:</Text>
          <Text style={styles.metricValue}>
            {(memoryUsage / (1024 * 1024)).toFixed(2)} MB
          </Text>
        </View>
        
        {cpuUsage !== null && (
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>CPU Usage:</Text>
            <Text style={styles.metricValue}>{cpuUsage.toFixed(1)}%</Text>
          </View>
        )}
        
        {frameRate !== null && (
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Frame Rate:</Text>
            <Text style={[
              styles.metricValue,
              frameRate < 45 ? styles.warningText : frameRate < 30 ? styles.errorText : {}
            ]}>
              {frameRate.toFixed(1)} FPS
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
};

// Add new ChatPerformanceSection component
const ChatPerformanceSection = () => {
  const [metrics, setMetrics] = useState<ChatPerformanceMetrics | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualTestId, setManualTestId] = useState<string>('');
  const [showHistory, setShowHistory] = useState<boolean>(false);
  
  // Add automatic session timeout
  useEffect(() => {
    if (metrics?.isActive) {
      // Check if session has been running too long (> 1 hour)
      if (metrics.sessionDuration > 60 * 60) {
        console.log('[DEV_PERF] Session running too long, auto-stopping');
        stopChatSession();
      }
    }
  }, [metrics]);
  
  useEffect(() => {
    console.log('[DEV_PERF] Setting up chat metrics polling');
    
    // Only start polling if there's an active session or metrics exist
    let interval: NodeJS.Timeout | null = null;
    
    const startPolling = () => {
      // Clear any existing interval first
      if (interval) clearInterval(interval);
      
      // Set up the new polling interval
      interval = setInterval(() => {
        try {
          // Get chat metrics through SentryService
          const chatMetrics = SentryService.getChatPerformanceMetrics?.();
          
          if (!chatMetrics) {
            setError('Chat metrics unavailable');
            return;
          }
          
          // Update metrics state
          setMetrics(chatMetrics as ChatPerformanceMetrics);
          
          if (chatMetrics.isActive) {
            setActiveChatId(chatMetrics.chatId);
            setError(null);
          } else if (interval && !chatMetrics.isActive) {
            // If session is no longer active, stop polling continuously
            console.log('[DEV_PERF] Chat session is no longer active, reducing polling frequency');
            clearInterval(interval);
            interval = setInterval(checkForMetrics, 5000); // Check less frequently
          }
        } catch (e) {
          console.error('[DEV_PERF] Error getting metrics:', e);
          setError(`Error getting metrics: ${e instanceof Error ? e.message : String(e)}`);
        }
      }, 1000);
    };
    
    // Helper function to check for metrics without continuous polling
    const checkForMetrics = () => {
      try {
        const chatMetrics = SentryService.getChatPerformanceMetrics?.();
        
        if (chatMetrics) {
          setMetrics(chatMetrics as ChatPerformanceMetrics);
          
          if (chatMetrics.isActive) {
            // If session becomes active, start frequent polling
            console.log('[DEV_PERF] Active chat session detected, increasing polling frequency');
            startPolling();
          }
        }
      } catch (e) {
        console.error('[DEV_PERF] Error checking metrics:', e);
      }
    };
    
    // Initial check to determine if we need frequent polling
    checkForMetrics();
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);
  
  // Function to start a test chat session
  const startChatSession = useCallback(() => {
    try {
      const sessionId = manualTestId || `test_${Date.now()}`;
      console.log('[DEV_PERF] Starting test chat session:', sessionId);
      
      // Import from chatPerformanceMonitor directly to avoid circular dependencies
      const ChatPerformanceMonitor = require('../utils/chatPerformanceMonitor').default;
      ChatPerformanceMonitor.startChatMonitoring(sessionId);
      
      setManualTestId('');
      
      // Manually start the metrics polling right away to get immediate feedback
      setTimeout(() => {
        try {
          const chatMetrics = SentryService.getChatPerformanceMetrics?.();
          if (chatMetrics) {
            setMetrics(chatMetrics as ChatPerformanceMetrics);
            setActiveChatId(chatMetrics.chatId);
          }
        } catch (e) {
          console.error('[DEV_PERF] Error getting initial metrics after session start:', e);
        }
      }, 100);
    } catch (e) {
      console.error('[DEV_PERF] Error starting chat session:', e);
      setError(`Failed to start session: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [manualTestId]);
  
  // Function to stop current chat session
  const stopChatSession = useCallback(() => {
    try {
      console.log('[DEV_PERF] Stopping chat session');
      
      // Import directly to avoid circular dependencies
      const ChatPerformanceMonitor = require('../utils/chatPerformanceMonitor').default;
      ChatPerformanceMonitor.stopChatMonitoring();
    } catch (e) {
      console.error('[DEV_PERF] Error stopping chat session:', e);
    }
  }, []); // This is fine since it doesn't use any variables from the component scope
  
  // Function to simulate sending a test message
  const simulateMessage = useCallback(() => {
    if (!activeChatId) return;
    
    try {
      console.log('[DEV_PERF] Simulating test message');
      
      const ChatPerformanceMonitor = require('../utils/chatPerformanceMonitor').default;
      const messageId = `test_msg_${Date.now()}`;
      const messageSize = Math.floor(Math.random() * 200) + 10; // Random message size
      
      // Track message send start
      ChatPerformanceMonitor.trackMessageSendStart(messageId, messageSize);
      
      // Simulate network delay
      setTimeout(() => {
        // Complete the message send
        ChatPerformanceMonitor.trackMessageSendComplete(messageId, true);
        
        // Simulate message receive after a short delay
        setTimeout(() => {
          ChatPerformanceMonitor.trackMessageReceived(`reply_${messageId}`, messageSize);
        }, 200);
      }, 300);
    } catch (e) {
      console.error('[DEV_PERF] Error simulating message:', e);
    }
  }, [activeChatId]);

  // Function to render the chat controls when a session is active
  const renderChatControls = () => {
    return (
      <View style={styles.chatControls}>
        <View style={styles.chatControlRow}>
          <Text style={styles.chatSessionInfo}>
            Active Session: {activeChatId ? 
              (activeChatId.length > 12 ? `${activeChatId.slice(0, 12)}...` : activeChatId) 
              : 'None'}
          </Text>
          <Text style={styles.chatSessionDuration}>
            {metrics?.sessionDuration ? formatDuration(metrics.sessionDuration) : '0s'}
          </Text>
        </View>
        
        <View style={styles.chatButtonsRow}>
          <TouchableOpacity
            style={[styles.chatControlButton, styles.stopButton]}
            onPress={stopChatSession}
            disabled={!metrics?.isActive}
          >
            <Ionicons name="stop" size={18} color="white" style={{marginRight: 4}} />
            <Text style={styles.chatControlButtonText}>Stop Session</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.chatControlButton}
            onPress={simulateMessage}
            disabled={!metrics?.isActive}
          >
            <Ionicons name="paper-plane-outline" size={18} color="white" style={{marginRight: 4}} />
            <Text style={styles.chatControlButtonText}>Test Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  // No active session - show start controls
  if (!metrics?.isActive) {
    const hasHistory = metrics?.sessionHistory && metrics.sessionHistory.length > 0;
    
    return (
      <Card>
        <Text style={styles.sectionHeaderText}>Chat Performance</Text>
        
        <View style={styles.chatSessionControls}>
          <TextInput
            style={styles.chatSessionInput}
            placeholder="Test session ID (optional)"
            value={manualTestId}
            onChangeText={setManualTestId}
          />
          <TouchableOpacity
            style={styles.chatSessionButton}
            onPress={startChatSession}
          >
            <Ionicons name="play" size={18} color="white" style={{marginRight: 8}} />
            <Text style={styles.chatSessionButtonText}>Start Test Session</Text>
          </TouchableOpacity>
        </View>
        
        {/* Show history toggle only if there's history available */}
        {hasHistory && (
          <TouchableOpacity
            style={styles.historyToggle}
            onPress={() => setShowHistory(!showHistory)}
          >
            <Ionicons 
              name={showHistory ? "chevron-up" : "chevron-down"} 
              size={18} 
              color="#6B7280" 
              style={{marginRight: 8}} 
            />
            <Text style={styles.historyToggleText}>
              {showHistory ? "Hide Session History" : "Show Session History"}
            </Text>
          </TouchableOpacity>
        )}
        
        {/* Session history panel */}
        {showHistory && hasHistory && (
          <View style={styles.historyPanel}>
            <Text style={styles.historyHeaderText}>
              Recent Sessions ({metrics.sessionHistory.length})
            </Text>
            
            <ScrollView style={styles.historyList}>
              {metrics.sessionHistory.map((session, index) => (
                <View key={`${session.id}_${index}`} style={styles.historyItem}>
                  <View style={styles.historyItemHeader}>
                    <Text style={styles.historyItemId}>
                      {session.id.length > 12 ? `${session.id.slice(0, 12)}...` : session.id}
                    </Text>
                    <Text style={styles.historyItemTime}>
                      {new Date(session.startTime).toLocaleTimeString()}
                    </Text>
                  </View>
                  
                  <View style={styles.historyItemMetrics}>
                    <View style={styles.historyMetric}>
                      <Text style={styles.historyMetricValue}>{session.messagesSent}</Text>
                      <Text style={styles.historyMetricLabel}>Messages</Text>
                    </View>
                    
                    <View style={styles.historyMetric}>
                      <Text style={styles.historyMetricValue}>{session.avgSendTime}ms</Text>
                      <Text style={styles.historyMetricLabel}>Avg Send</Text>
                    </View>
                    
                    <View style={styles.historyMetric}>
                      <Text style={styles.historyMetricValue}>{formatDuration(session.duration)}</Text>
                      <Text style={styles.historyMetricLabel}>Duration</Text>
                    </View>
                    
                    <View style={styles.historyMetric}>
                      <Text style={styles.historyMetricValue}>{session.successRate}%</Text>
                      <Text style={styles.historyMetricLabel}>Success</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {!hasHistory && !error && (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="analytics-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>No chat sessions yet</Text>
            <Text style={styles.emptyStateHint}>
              Start a test session or navigate to a chat screen
            </Text>
          </View>
        )}
      </Card>
    );
  }
  
  // Active session - show metrics and controls
  // Calculate performance scores
  const networkScore = calculatePerformanceScore(
    metrics?.avgNetworkLatency || 0, 
    CHAT_PERFORMANCE_BUDGETS.MESSAGE_SEND_RTT
  );
  
  const renderScore = calculatePerformanceScore(
    metrics?.slowRenders || 0,
    5, // 5 slow renders is considered poor
    true // Invert (less is better)
  );
  
  const frameScore = calculatePerformanceScore(
    metrics?.frameDrops || 0,
    10, // 10 frame drops is considered poor
    true // Invert (less is better)
  );
  
  const memoryScore = calculatePerformanceScore(
    (metrics?.jsHeapSize || 0) / (1024 * 1024),
    CHAT_PERFORMANCE_BUDGETS.CHAT_MEMORY / (1024 * 1024),
    true // Invert (less is better)
  );
  
  const overallScore = Math.round((networkScore + renderScore + frameScore + memoryScore) / 4);
  
  // Get performance status color
  const getStatusColor = (score: number): string => {
    if (score >= 80) return '#4CAF50'; // Green
    if (score >= 50) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };
  
  // Calculate slow render percentage if not provided
  const slowRenderPercentage = metrics?.slowRenderPercentage || 
    (metrics?.slowRenders && metrics.messagesSent > 0 
      ? (metrics.slowRenders / metrics.messagesSent) * 100 
      : 0);
  
  return (
    <Card>
      <Text style={styles.sectionHeaderText}>Chat Performance</Text>
      
      {/* First show the chat controls when active */}
      {renderChatControls()}
      
      {/* Performance score summary */}
      <View style={styles.performanceSummary}>
        <View style={styles.performanceScore}>
          <Text style={styles.performanceScoreLabel}>Network Latency</Text>
          <Text style={styles.performanceScoreValue}>
            {metrics?.avgNetworkLatency ? metrics.avgNetworkLatency.toFixed(1) : '0'}ms
          </Text>
          <View style={styles.performanceBarContainer}>
            <View 
              style={[
                styles.performanceBarFill,
                { 
                  width: `${metrics?.avgNetworkLatency ? (metrics.avgNetworkLatency / CHAT_PERFORMANCE_BUDGETS.MESSAGE_SEND_RTT) * 100 : 0}%`, 
                  backgroundColor: getStatusColor(networkScore) 
                }
              ]} 
            />
          </View>
        </View>
        
        <View style={styles.performanceScore}>
          <Text style={styles.performanceScoreLabel}>Slow Renders</Text>
          <Text style={styles.performanceScoreValue}>
            {metrics?.slowRenders || 0} ({slowRenderPercentage.toFixed(1)}%)
          </Text>
          <View style={styles.performanceBarContainer}>
            <View 
              style={[
                styles.performanceBarFill,
                { 
                  width: `${slowRenderPercentage}%`, 
                  backgroundColor: getStatusColor(renderScore) 
                }
              ]} 
            />
          </View>
        </View>
        
        <View style={styles.performanceScore}>
          <Text style={styles.performanceScoreLabel}>Frame Drops</Text>
          <Text style={styles.performanceScoreValue}>
            {metrics?.frameDrops}
          </Text>
          <View style={styles.performanceBarContainer}>
            <View 
              style={[
                styles.performanceBarFill,
                { width: `${Math.min(100, metrics?.frameDrops || 0) * 10}%`, backgroundColor: getStatusColor(frameScore) }
              ]} 
            />
          </View>
        </View>
        
        <View style={styles.performanceScore}>
          <Text style={styles.performanceScoreLabel}>Memory Usage</Text>
          <Text style={styles.performanceScoreValue}>
            {metrics?.jsHeapSize ? (metrics.jsHeapSize / (1024 * 1024)).toFixed(1) : '0'} MB
          </Text>
          <View style={styles.performanceBarContainer}>
            <View 
              style={[
                styles.performanceBarFill,
                { 
                  width: `${Math.min(100, (metrics?.jsHeapSize ? (metrics.jsHeapSize / (1024 * 1024)) / (CHAT_PERFORMANCE_BUDGETS.CHAT_MEMORY / (1024 * 1024)) : 0) * 100)}%`, 
                  backgroundColor: getStatusColor(memoryScore) 
                }
              ]} 
            />
          </View>
        </View>
      </View>
      
      {/* Detailed metrics view */}
      <CollapsibleSection title="View Detailed Metrics">
        <View style={styles.detailedMetrics}>
          <Text style={styles.detailedMetricsHeader}>Session Metrics</Text>
          
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Session ID:</Text>
            <Text style={styles.metricValue}>{metrics?.chatId}</Text>
          </View>
          
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Start Time:</Text>
            <Text style={styles.metricValue}>
              {metrics?.startTime ? new Date(metrics.startTime).toLocaleString() : 'N/A'}
            </Text>
          </View>
          
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Duration:</Text>
            <Text style={styles.metricValue}>
              {metrics?.sessionDuration ? formatDuration(metrics.sessionDuration) : 'N/A'}
            </Text>
          </View>
          
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Messages Sent:</Text>
            <Text style={styles.metricValue}>{metrics?.messagesSent}</Text>
          </View>
          
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Messages Received:</Text>
            <Text style={styles.metricValue}>{metrics?.messagesReceived}</Text>
          </View>
          
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Avg. Send Time:</Text>
            <Text style={styles.metricValue}>
              {metrics?.stats?.averageSendTime ? `${metrics.stats.averageSendTime} ms` : 'N/A'}
            </Text>
          </View>
          
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Min Send Time:</Text>
            <Text style={styles.metricValue}>
              {metrics?.stats?.minSendTime ? `${metrics.stats.minSendTime} ms` : 'N/A'}
            </Text>
          </View>
          
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Max Send Time:</Text>
            <Text style={styles.metricValue}>
              {metrics?.stats?.maxSendTime ? `${metrics.stats.maxSendTime} ms` : 'N/A'}
            </Text>
          </View>
          
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Success Rate:</Text>
            <Text style={styles.metricValue}>
              {metrics?.stats?.successRate !== undefined ? `${metrics.stats.successRate}%` : 'N/A'}
            </Text>
          </View>
        </View>
      </CollapsibleSection>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </Card>
  );
};

// Helper function to calculate performance scores on a scale of 0-100
const calculatePerformanceScore = (
  value: number, 
  budget: number, 
  invert: boolean = false
): number => {
  if (value === 0 && invert) return 100; // Perfect score for zero when inverted
  if (value === 0 && !invert) return 0;  // Zero score for zero when not inverted
  
  // Calculate percentage of budget
  const percentage = (value / budget) * 100;
  
  // If inverted (lower is better, like frame drops)
  if (invert) {
    // 0% of budget = 100 score, 100% of budget = 50 score, 200%+ of budget = 0 score
    return Math.max(0, Math.min(100, 100 - percentage / 2));
  } 
  // If not inverted (higher is better)
  else {
    // Higher than budget = 100 score, 0% of budget = 0 score
    return Math.min(100, percentage);
  }
};

// Helper function to format duration in seconds to readable time
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  tabContent: {
    width: '100%',
    padding: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  collapsibleSection: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  sectionContent: {
    padding: 16,
    paddingTop: 0,
  },
  performanceSummary: {
    width: '100%',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  performanceScore: {
    marginBottom: 16,
  },
  performanceScoreLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  performanceScoreValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  performanceBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  performanceBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  detailedMetrics: {
    marginTop: 16,
  },
  detailedMetricsHeader: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  errorContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F87171',
  },
  errorText: {
    fontSize: 14,
    color: '#B91C1C',
  },
  chatSessionControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  chatSessionInput: {
    flex: 1,
    height: 40,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 8,
    marginRight: 8,
    fontSize: 14,
    color: '#111827',
  },
  chatSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
  },
  chatSessionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  historyToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  historyPanel: {
    marginTop: 8,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  historyHeaderText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },
  historyList: {
    maxHeight: 200,
  },
  historyItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyItemId: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  historyItemTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  historyItemMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyMetric: {
    alignItems: 'center',
  },
  historyMetricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  historyMetricLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 16,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#111827',
  },
  tabContentContainer: {
    flex: 1,
  },
  logsContainer: {
    flex: 1,
  },
  logsHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  logEntry: {
    padding: 12,
    borderRadius: 4,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logsControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logsFilterInput: {
    height: 36,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#111827',
    width: 150,
    marginRight: 8,
  },
  clearLogsButton: {
    backgroundColor: '#EF4444',
    height: 36,
    width: 36,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tracesContainer: {
    flex: 1,
  },
  tracesHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  traceEntry: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  traceName: {
    fontSize: 14,
  },
  traceDuration: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  // New styles
  sentryButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sentryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    flex: 1,
    marginHorizontal: 4,
  },
  errorButton: {
    backgroundColor: '#EF4444',
  },
  sentryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    color: '#F59E0B',
  },
  errorText: {
    color: '#EF4444',
  },
  chatControls: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  chatControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chatSessionInfo: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  chatSessionDuration: {
    fontSize: 14,
    color: '#6B7280',
  },
  chatButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chatControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  stopButton: {
    backgroundColor: '#EF4444',
  },
  chatControlButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'white',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 12,
  },
  emptyStateHint: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  performanceBar: {
    marginBottom: 12,
  },
  performanceBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  performanceBarLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  performanceBarValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  logEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logTimestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  logCategory: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
  },
  logData: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#4B5563',
    backgroundColor: '#F9FAFB',
    padding: 8,
    marginTop: 4,
    borderRadius: 4,
  },
  errorLogEntry: {
    borderLeftWidth: 3,
    borderLeftColor: '#F44336',
  },
  warningLogEntry: {
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  testRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  testInfo: {
    flex: 1,
  },
  testTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  testStatus: {
    fontSize: 12,
    color: '#6B7280',
  },
  testStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testStatusRunning: {
    fontSize: 12,
    color: '#6B7280',
  },
  testStatusSuccess: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  testStatusFailed: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '500',
  },
  testButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  testButtonDisabled: {
    backgroundColor: '#A78BFA',
    opacity: 0.7,
  },
  testButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  testResult: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    marginBottom: 12,
    borderRadius: 4,
    marginTop: -8,
  },
  testResultText: {
    fontSize: 12,
    color: '#4B5563',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  testsContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  runAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    height: 44,
    borderRadius: 4,
    marginBottom: 16,
  },
  runAllButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  exportButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
});

// Add this component before the TestsSection component

const LogsSection = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('');
  
  // Fetch logs on component mount and periodically
  useEffect(() => {
    const fetchLogs = () => {
      try {
        // Safer access to the getEventHistory method
        if (SentryService && typeof SentryService.getEventHistory === 'function') {
          const eventHistory = SentryService.getEventHistory() || [];
          setLogs(eventHistory.sort((a, b) => b.timestamp - a.timestamp));
        } else {
          console.warn('[DEV_PERF] SentryService.getEventHistory is not available');
          // Set empty logs if the method is not available
          setLogs([]);
        }
      } catch (e) {
        console.error('[DEV_PERF] Error fetching logs:', e);
        // Set empty logs array on error
        setLogs([]);
      }
    };
    
    // Initial fetch
    fetchLogs();
    
    // Set up interval to refresh logs
    const interval = setInterval(fetchLogs, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Filter logs based on search term - with safety checks
  const filteredLogs = useMemo(() => {
    if (!logs || !Array.isArray(logs)) return [];
    if (!filter) return logs;
    
    const lowerFilter = filter.toLowerCase();
    return logs.filter(log => 
      (log.message && log.message.toLowerCase().includes(lowerFilter)) || 
      (log.category && log.category.toLowerCase().includes(lowerFilter))
    );
  }, [logs, filter]);
  
  // Clear all logs
  const clearLogs = useCallback(() => {
    try {
      if (SentryService && typeof SentryService.clearHistory === 'function') {
        SentryService.clearHistory();
      }
      setLogs([]);
    } catch (e) {
      console.error('[DEV_PERF] Error clearing logs:', e);
    }
  }, []);
  
  // Safe access to logs length
  const logsCount = logs && Array.isArray(logs) ? logs.length : 0;
  
  return (
    <View style={styles.logsContainer}>
      <View style={styles.logsHeader}>
        <Text style={styles.logsHeaderText}>Logs ({logsCount})</Text>
        
        <View style={styles.logsControls}>
          <TextInput 
            style={styles.logsFilterInput}
            placeholder="Filter logs..."
            value={filter}
            onChangeText={setFilter}
          />
          
          <TouchableOpacity 
            style={styles.clearLogsButton}
            onPress={clearLogs}
          >
            <Ionicons name="trash-outline" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Log entries list with better error handling */}
      {(!logs || !logsCount) ? (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyStateText}>No logs available</Text>
          <Text style={styles.emptyStateHint}>
            Use the "Log Test Event" button to generate logs
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          renderItem={({ item }) => (
            <View style={[
              styles.logEntry,
              item.isError && styles.errorLogEntry,
              item.category === 'warning' && styles.warningLogEntry
            ]}>
              <View style={styles.logEntryHeader}>
                <Text style={styles.logTimestamp}>
                  {new Date(item.timestamp).toLocaleTimeString()}
                </Text>
                <Text style={styles.logCategory}>{item.category || 'info'}</Text>
              </View>
              <Text>{item.message || 'No message'}</Text>
              {item.data && (
                <Text style={styles.logData}>
                  {typeof item.data === 'object' ? JSON.stringify(item.data, null, 2) : String(item.data)}
                </Text>
              )}
            </View>
          )}
          keyExtractor={(item, index) => `${item.timestamp || Date.now()}-${index}-${item.message?.substring(0, 10) || 'unknown'}`}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}
    </View>
  );
};

// Now add the TestsSection component
const TestsSection = React.forwardRef((props, ref) => {
  const [testStatus, setTestStatus] = useState<Record<string, { status: 'idle' | 'running' | 'success' | 'failed', result?: any }>>({
    memory: { status: 'idle' },
    cpu: { status: 'idle' },
    frames: { status: 'idle' },
    navigation: { status: 'idle' },
    rendering: { status: 'idle' },
  });
  
  // Add this function to run all tests
  const runAllTests = useCallback(async () => {
    try {
      // Start all tests in sequence
      await runMemoryTest();
      await runCpuTest();
      await runFrameRateTest();
    } catch (e) {
      console.error('[DEV_PERF] Error running all tests:', e);
      Alert.alert('Test Error', `Failed to run all tests: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);
  
  // Run memory leak test
  const runMemoryTest = useCallback(async () => {
    try {
      setTestStatus(prev => ({ ...prev, memory: { status: 'running' } }));
      
      // Check if the function exists before calling it
      if (typeof MemoryMonitor.takeSnapshot !== 'function') {
        throw new Error('MemoryMonitor.takeSnapshot is not available');
      }
      
      // Take initial memory snapshot
      const startSnapshot = await MemoryMonitor.takeSnapshot('memory_test_start');
      
      // Create and destroy a number of objects to test GC
      const largeObjects = [];
      for (let i = 0; i < 100; i++) {
        largeObjects.push(new Array(10000).fill(Math.random().toString()));
      }
      
      // Force GC if available (only works in dev with Hermes)
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // Otherwise just wait a bit longer for GC to potentially run
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      // Take final memory snapshot
      const endSnapshot = await MemoryMonitor.takeSnapshot('memory_test_end');
      
      // Calculate memory difference safely
      const memDiff = MemoryMonitor.compareSnapshots ?
        MemoryMonitor.compareSnapshots('memory_test_start', 'memory_test_end') :
        { jsHeapSizeDiff: endSnapshot.jsHeapSize - startSnapshot.jsHeapSize };
      
      // Determine if test passed
      const testPassed = memDiff && memDiff.jsHeapSizeDiff < 1024 * 1024 * 5; // Less than 5MB diff is considered good
      
      setTestStatus(prev => ({ 
        ...prev, 
        memory: { 
          status: testPassed ? 'success' : 'failed',
          result: {
            startMem: startSnapshot ? Math.round(startSnapshot.jsHeapSize / 1024 / 1024) : 'N/A',
            endMem: endSnapshot ? Math.round(endSnapshot.jsHeapSize / 1024 / 1024) : 'N/A',
            diff: memDiff ? Math.round(memDiff.jsHeapSizeDiff / 1024 / 1024) : 'N/A'
          }
        } 
      }));
    } catch (e) {
      console.error('[DEV_PERF] Memory test error:', e);
      setTestStatus(prev => ({ 
        ...prev, 
        memory: { 
          status: 'failed',
          result: { error: e instanceof Error ? e.message : String(e) }
        } 
      }));
    }
  }, []);
  
  // Run CPU stress test
  const runCpuTest = useCallback(async () => {
    try {
      setTestStatus(prev => ({ ...prev, cpu: { status: 'running' } }));
      
      const start = Date.now();
      
      // Perform some CPU-intensive work
      let result = 0;
      for (let i = 0; i < 10000000; i++) {
        result += Math.sqrt(i * Math.sin(i) * Math.cos(i));
      }
      
      const duration = Date.now() - start;
      
      // Test passes if the computation took less than 2 seconds
      const testPassed = duration < 2000;
      
      setTestStatus(prev => ({ 
        ...prev, 
        cpu: { 
          status: testPassed ? 'success' : 'failed',
          result: {
            duration: `${duration}ms`,
            benchmark: result.toFixed(2)
          }
        } 
      }));
    } catch (e) {
      console.error('[DEV_PERF] CPU test error:', e);
      setTestStatus(prev => ({ 
        ...prev, 
        cpu: { 
          status: 'failed',
          result: { error: e instanceof Error ? e.message : String(e) }
        } 
      }));
    }
  }, []);
  
  // Run frame rate test
  const runFrameRateTest = useCallback(async () => {
    try {
      setTestStatus(prev => ({ ...prev, frames: { status: 'running' } }));
      
      // Start monitoring frame rate - use the standard startMonitoring method
      let framesData: number[] = [];
      
      // Create a callback for collecting frame rates
      const frameRateCallback = (fps: number) => {
        framesData.push(fps);
      };
      
      // Use the standard startMonitoring method
      FrameRateMonitor.startMonitoring('frame_rate_test');
      
      // Set up our own monitoring to collect fps data
      const interval = setInterval(() => {
        // Get current metrics
        const metrics = FrameRateMonitor.getMetrics();
        if (metrics && typeof metrics.fps === 'number') {
          framesData.push(metrics.fps);
        }
      }, 100); // Check 10 times per second
      
      // Run test for 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Clean up
      clearInterval(interval);
      FrameRateMonitor.stopMonitoring();
      
      // Calculate average FPS
      const avgFps = framesData.length > 0 
        ? framesData.reduce((sum, fps) => sum + fps, 0) / framesData.length 
        : 0;
      
      // Test passes if average FPS is above 45
      const testPassed = avgFps > 45;
      
      setTestStatus(prev => ({ 
        ...prev, 
        frames: { 
          status: testPassed ? 'success' : 'failed',
          result: {
            avgFps: avgFps.toFixed(1),
            minFps: framesData.length > 0 ? Math.min(...framesData).toFixed(1) : '0.0',
            maxFps: framesData.length > 0 ? Math.max(...framesData).toFixed(1) : '0.0',
            samples: framesData.length
          }
        } 
      }));
    } catch (e) {
      console.error('[DEV_PERF] Frame rate test error:', e);
      setTestStatus(prev => ({ 
        ...prev, 
        frames: { 
          status: 'failed',
          result: { error: e instanceof Error ? e.message : String(e) }
        } 
      }));
    }
  }, []);
  
  // Expose methods to parent component
  React.useImperativeHandle(ref, () => ({
    runMemoryTest,
    runCpuTest,
    runFrameRateTest,
    runAllTests // Add this to expose it to the parent
  }));
  
  // Notify parent when test status changes
  useEffect(() => {
    if (props.onTestStatusChange) {
      props.onTestStatusChange(testStatus);
    }
  }, [testStatus, props.onTestStatusChange]);
  
  // Render a test result row
  const renderTestRow = (name: string, title: string, onPress: () => void) => {
    const test = testStatus[name];
    
    return (
      <View style={styles.testRow}>
        <View style={styles.testInfo}>
          <Text style={styles.testTitle}>{title}</Text>
          
          {test.status === 'idle' && (
            <Text style={styles.testStatus}>Not run</Text>
          )}
          
          {test.status === 'running' && (
            <View style={styles.testStatusRow}>
              <Ionicons name="sync" size={14} color="#6B7280" style={{marginRight: 4}} />
              <Text style={styles.testStatusRunning}>Running...</Text>
            </View>
          )}
          
          {test.status === 'success' && (
            <View style={styles.testStatusRow}>
              <Ionicons name="checkmark-circle" size={14} color="#4CAF50" style={{marginRight: 4}} />
              <Text style={styles.testStatusSuccess}>Passed</Text>
            </View>
          )}
          
          {test.status === 'failed' && (
            <View style={styles.testStatusRow}>
              <Ionicons name="close-circle" size={14} color="#F44336" style={{marginRight: 4}} />
              <Text style={styles.testStatusFailed}>Failed</Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity
          style={[
            styles.testButton,
            test.status === 'running' && styles.testButtonDisabled
          ]}
          onPress={onPress}
          disabled={test.status === 'running'}
        >
          <Text style={styles.testButtonText}>Run</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <ScrollView>
      <Card>
        <Text style={styles.sectionHeaderText}>Performance Tests</Text>
        
        <View style={styles.testsContainer}>
          <TouchableOpacity
            style={styles.runAllButton}
            onPress={runAllTests} // Now this will correctly call the function
            disabled={Object.values(testStatus).some(t => t.status === 'running')}
          >
            <Ionicons name="play" size={18} color="white" style={{marginRight: 8}} />
            <Text style={styles.runAllButtonText}>Run All Tests</Text>
          </TouchableOpacity>
          
          {renderTestRow('memory', 'Memory Leak Test', runMemoryTest)}
          {testStatus.memory.result && (
            <View style={styles.testResult}>
              <Text style={styles.testResultText}>
                {testStatus.memory.result.error ? 
                  `Error: ${testStatus.memory.result.error}` : 
                  `Start: ${testStatus.memory.result.startMem}MB → End: ${testStatus.memory.result.endMem}MB (Diff: ${testStatus.memory.result.diff}MB)`
                }
              </Text>
            </View>
          )}
          
          {renderTestRow('cpu', 'CPU Performance Test', runCpuTest)}
          {testStatus.cpu.result && (
            <View style={styles.testResult}>
              <Text style={styles.testResultText}>
                {testStatus.cpu.result.error ? 
                  `Error: ${testStatus.cpu.result.error}` : 
                  `Duration: ${testStatus.cpu.result.duration}`
                }
              </Text>
            </View>
          )}
          
          {renderTestRow('frames', 'Frame Rate Test', runFrameRateTest)}
          {testStatus.frames.result && (
            <View style={styles.testResult}>
              <Text style={styles.testResultText}>
                {testStatus.frames.result.error ? 
                  `Error: ${testStatus.frames.result.error}` : 
                  `Avg FPS: ${testStatus.frames.result.avgFps} (Min: ${testStatus.frames.result.minFps}, Max: ${testStatus.frames.result.maxFps})`
                }
              </Text>
            </View>
          )}
        </View>
      </Card>
    </ScrollView>
  );
});

export default function DevPerformanceScreen({ navigation }: { navigation: DevPerformanceScreenNavigationProp }) {
  const [activeTab, setActiveTab] = useState<'summary' | 'logs' | 'traces' | 'tests'>('summary');
  const [exporting, setExporting] = useState(false);
  const [testStatus, setTestStatus] = useState<Record<string, { status: 'idle' | 'running' | 'success' | 'failed', result?: any }>>({
    memory: { status: 'idle' },
    cpu: { status: 'idle' },
    frames: { status: 'idle' },
    navigation: { status: 'idle' },
    rendering: { status: 'idle' },
  });
  
  // Pass testStatus down to TestsSection component
  const testsSectionRef = React.useRef<{
    runMemoryTest: () => Promise<void>;
    runCpuTest: () => Promise<void>;
    runFrameRateTest: () => Promise<void>;
    runAllTests: () => Promise<void>; // Add this line
  }>(null);
  
  // Export all performance data function
  const exportPerformanceData = useCallback(async () => {
    try {
      setExporting(true);
      
      // Run tests if they haven't been run yet
      if (testsSectionRef.current) {
        // Only run tests that haven't been run yet
        const pendingTests = [];
        if (testStatus.memory.status === 'idle') {
          pendingTests.push(testsSectionRef.current.runMemoryTest());
        }
        if (testStatus.cpu.status === 'idle') {
          pendingTests.push(testsSectionRef.current.runCpuTest());
        }
        if (testStatus.frames.status === 'idle') {
          pendingTests.push(testsSectionRef.current.runFrameRateTest());
        }
        
        if (pendingTests.length > 0) {
          // Show alert that we're running tests
          Alert.alert(
            'Running Performance Tests',
            'Running performance tests before export...'
          );
          
          // Run all pending tests in parallel
          await Promise.all(pendingTests);
        }
      }
      
      // Collect all relevant performance data
      const data = {
        instructions: `
This performance report was generated by the GroopTroop app's DevPerformanceScreen on ${new Date().toLocaleString()}.
It contains performance metrics, test results, logs, and traces that can be analyzed to identify performance issues.

To analyze this data:
1. Review the testResults section to see if any performance tests failed
2. Check the memory metrics for potential memory leaks
3. Look at chatPerformance data for network latency and render time issues
4. Examine traces to identify bottlenecks in specific operations
5. Analyze logs for errors or warnings that might impact performance

Please provide recommendations for:
- Specific code areas that might need optimization
- Memory management improvements
- UI rendering optimizations
- Network and data handling enhancements
- Any critical issues that should be addressed immediately
        `,
        timestamp: new Date().toISOString(),
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version,
          isEmulator: __DEV__,
        },
        memory: {
          jsHeapSize: typeof MemoryMonitor.getMemoryUsage === 'function' 
            ? await MemoryMonitor.getMemoryUsage() 
            : undefined,
          snapshots: typeof MemoryMonitor.getSnapshots === 'function'
            ? MemoryMonitor.getSnapshots()
            : []
        },
        traces: typeof SentryService.getCompletedTransactions === 'function'
          ? SentryService.getCompletedTransactions() || []
          : [],
        logs: typeof SentryService.getEventHistory === 'function'
          ? SentryService.getEventHistory() || []
          : [],
        chatPerformance: typeof SentryService.getChatPerformanceMetrics === 'function'
          ? SentryService.getChatPerformanceMetrics()
          : undefined,
        testResults: testStatus
      };
      
      // Create json string
      const jsonData = JSON.stringify(data, null, 2);
      
      if (Platform.OS === 'ios') {
        // For iOS, create a temporary file using expo-file-system
        try {
          // First check if we have the FileSystem API
          const FileSystem = require('expo-file-system');
          
          if (!FileSystem) {
            throw new Error('FileSystem module not available');
          }
          
          // Create a unique filename
          const filename = `grooptroop_${Date.now()}.json`;
          const filePath = `${FileSystem.cacheDirectory}${filename}`;
          
          // Write the JSON to a file
          await FileSystem.writeAsStringAsync(filePath, jsonData);
          
          // Share the file
          await Share.share({
            url: filePath,
            title: 'GroopTroop Performance Data',
            message: 'GroopTroop Performance Data'
          });
          
          // Cleanup - remove the file after sharing
          setTimeout(async () => {
            try {
              await FileSystem.deleteAsync(filePath, { idempotent: true });
            } catch (e) {
              console.log('[DEV_PERF] Error cleaning up temp file:', e);
            }
          }, 10000);
        } catch (fileError) {
          console.error('[DEV_PERF] Error using FileSystem, falling back to text sharing:', fileError);
          
          // Fall back to just sharing text
          await Share.share({
            title: 'GroopTroop Performance Data',
            message: jsonData
          });
        }
      } else {
        // On Android, share the text directly
        await Share.share({
          title: 'GroopTroop Performance Data',
          message: jsonData
        });
      }
      
      Alert.alert(
        'Export Complete',
        'Performance data has been exported successfully'
      );
    } catch (e) {
      console.error('[DEV_PERF] Error exporting performance data:', e);
      Alert.alert(
        'Export Failed',
        `Failed to export performance data: ${e instanceof Error ? e.message : String(e)}`
      );
    } finally {
      setExporting(false);
    }
  }, [testStatus]);
  
  // For performance monitoring - with error handling
  try {
    usePerformance('DevPerformanceScreen');
  } catch (e) {
    console.error('[DEV_PERF] Error in usePerformance hook:', e);
  }
  
  // Handler for test status changes
  const handleTestStatusChange = useCallback((status) => {
    setTestStatus(status);
  }, []);
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      {/* Header with back button and export button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Performance Monitor</Text>
        
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={exportPerformanceData}
          disabled={exporting}
        >
          {exporting ? (
            <Ionicons name="sync" size={24} color="#7C3AED" style={{opacity: 0.7}} />
          ) : (
            <Ionicons name="share-outline" size={24} color="#7C3AED" />
          )}
        </TouchableOpacity>
      </View>
      
      {/* Rest of your component remains the same */}
      <View style={{ flex: 1, padding: 16 }}>
        {/* Tab buttons */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'summary' && styles.activeTab]}
            onPress={() => setActiveTab('summary')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'summary' && styles.activeTabText]}>Summary</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'logs' && styles.activeTab]}
            onPress={() => setActiveTab('logs')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'logs' && styles.activeTabText]}>Logs</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'traces' && styles.activeTab]}
            onPress={() => setActiveTab('traces')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'traces' && styles.activeTabText]}>Traces</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'tests' && styles.activeTab]}
            onPress={() => setActiveTab('tests')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'tests' && styles.activeTabText]}>Tests</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.tabContentContainer}>
          {activeTab === 'summary' && (
            <ScrollView>
              <SentryTestSection />
              <PerformanceSummarySection />
              <ChatPerformanceSection />
            </ScrollView>
          )}
          
          {activeTab === 'logs' && <LogsSection />}
          
          {activeTab === 'traces' && (
            <View style={styles.tracesContainer}>
              <Text style={styles.tracesHeaderText}>Traces</Text>
              
              {/* Trace entries list with safety checks */}
              <FlatList
                data={typeof SentryService.getCompletedTransactions === 'function' 
                  ? SentryService.getCompletedTransactions() || [] 
                  : []}
                renderItem={({ item }: { item: TraceEntry }) => (
                  <View style={styles.traceEntry}>
                    <Text style={styles.traceName}>{item.name || 'Unknown'}</Text>
                    <Text style={styles.traceDuration}>
                      {item.duration || 0}ms
                    </Text>
                  </View>
                )}
                keyExtractor={(item: TraceEntry, index) => `${item.timestamp || Date.now()}-${item.name || 'trace'}-${index}`}
                contentContainerStyle={{ paddingBottom: 80 }}
                ListEmptyComponent={() => (
                  <View style={styles.emptyStateContainer}>
                    <Ionicons name="analytics-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.emptyStateText}>No traces available</Text>
                    <Text style={styles.emptyStateHint}>
                      Traces will appear here as your app generates performance data
                    </Text>
                  </View>
                )}
              />
            </View>
          )}
          
          {activeTab === 'tests' && (
            <TestsSection 
              ref={testsSectionRef}
              onTestStatusChange={handleTestStatusChange}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}