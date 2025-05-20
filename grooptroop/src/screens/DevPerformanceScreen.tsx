import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SentryService, usePerformance } from '../utils/sentryService';
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

// Define the navigation prop type for this screen
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

// Add new ChatPerformanceSection component
const ChatPerformanceSection = () => {
  const [metrics, setMetrics] = useState<ChatPerformanceMetrics | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Poll for chat metrics every second
    const interval = setInterval(() => {
      try {
        // Get chat metrics through SentryService
        const chatMetrics = SentryService.getChatPerformanceMetrics?.();
        
        if (!chatMetrics) {
          setError('Chat metrics unavailable');
          return;
        }
        
        if (chatMetrics.isActive) {
          // Only update state if the values are actually different
          // This prevents unnecessary re-renders
          if (!metrics || 
              metrics.messagesSent !== chatMetrics.messagesSent ||
              metrics.messagesReceived !== chatMetrics.messagesReceived ||
              metrics.avgNetworkLatency !== chatMetrics.avgNetworkLatency ||
              metrics.frameDrops !== chatMetrics.frameDrops ||
              metrics.jsHeapSize !== chatMetrics.jsHeapSize ||
              metrics.sessionDuration !== chatMetrics.sessionDuration ||
              metrics.slowRenders !== chatMetrics.slowRenders) {
            setMetrics(chatMetrics as ChatPerformanceMetrics);
            setActiveChatId(chatMetrics.chatId);
            setError(null);
          }
        } else if (metrics && !chatMetrics.isActive) {
          // Chat session ended
          setMetrics(null);
        }
      } catch (e) {
        setError(`Error getting metrics: ${e instanceof Error ? e.message : String(e)}`);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);  // Notice the empty dependency array - it's crucial
  
  if (!metrics) {
    return (
      <Card>
        <Text style={styles.sectionHeaderText}>Chat Performance</Text>
        <View style={styles.emptyChatMetrics}>
          <Text style={styles.infoText}>No active chat session</Text>
          <Text style={styles.hintText}>
            Open a chat screen to see real-time metrics
          </Text>
        </View>
      </Card>
    );
  }
  
  // Calculate performance scores
  const networkScore = calculatePerformanceScore(
    metrics.avgNetworkLatency, 
    CHAT_PERFORMANCE_BUDGETS.MESSAGE_SEND_RTT
  );
  
  const renderScore = calculatePerformanceScore(
    metrics.slowRenders,
    5, // 5 slow renders is considered poor
    true // Invert (less is better)
  );
  
  const frameScore = calculatePerformanceScore(
    metrics.frameDrops,
    10, // 10 frame drops is considered poor
    true // Invert (less is better)
  );
  
  const memoryScore = calculatePerformanceScore(
    metrics.jsHeapSize / (1024 * 1024),
    CHAT_PERFORMANCE_BUDGETS.CHAT_MEMORY / (1024 * 1024),
    true // Invert (less is better)
  );
  
  const overallScore = Math.round((networkScore + renderScore + frameScore + memoryScore) / 4);
  
  // Get performance status color
  const getStatusColor = (score: number): string => {
    if (score >= 80) return '#10B981'; // Green
    if (score >= 60) return '#F59E0B'; // Yellow/Orange
    return '#EF4444'; // Red
  };
  
  return (
    <Card>
      <View style={styles.chatHeaderRow}>
        <Text style={styles.sectionHeaderText}>Chat Performance</Text>
        <View style={[styles.chatBadge, { backgroundColor: getStatusColor(overallScore) }]}>
          <Text style={styles.chatScore}>{overallScore}</Text>
        </View>
      </View>
      
      <Text style={styles.chatId}>
        Session: {activeChatId ? activeChatId.slice(0, 8) : 'Unknown'}
      </Text>
      
      <View style={styles.chatMetricsGrid}>
        <View style={styles.chatMetricItem}>
          <Text style={styles.metricLabel}>Messages Sent</Text>
          <Text style={styles.metricValue}>{metrics.messagesSent}</Text>
        </View>
        <View style={styles.chatMetricItem}>
          <Text style={styles.metricLabel}>Messages Received</Text>
          <Text style={styles.metricValue}>{metrics.messagesReceived}</Text>
        </View>
        <View style={styles.chatMetricItem}>
          <Text style={styles.metricLabel}>Avg Network Latency</Text>
          <Text style={[
            styles.metricValue, 
            {color: getStatusColor(networkScore)}
          ]}>
            {metrics.avgNetworkLatency.toFixed(1)}ms
          </Text>
        </View>
        <View style={styles.chatMetricItem}>
          <Text style={styles.metricLabel}>Memory Usage</Text>
          <Text style={[
            styles.metricValue,
            {color: getStatusColor(memoryScore)}
          ]}>
            {(metrics.jsHeapSize / (1024 * 1024)).toFixed(1)}MB
          </Text>
        </View>
        <View style={styles.chatMetricItem}>
          <Text style={styles.metricLabel}>Frame Drops</Text>
          <Text style={[
            styles.metricValue,
            {color: getStatusColor(frameScore)}
          ]}>
            {metrics.frameDrops}
          </Text>
        </View>
        <View style={styles.chatMetricItem}>
          <Text style={styles.metricLabel}>Slow Renders</Text>
          <Text style={[
            styles.metricValue,
            {color: getStatusColor(renderScore)}
          ]}>
            {metrics.slowRenders}
          </Text>
        </View>
      </View>
      
      <View style={styles.chatSessionTime}>
        <Ionicons name="time-outline" size={14} color="#6B7280" />
        <Text style={styles.sessionDuration}>
          Session duration: {formatDuration(metrics.sessionDuration)}
        </Text>
      </View>
    </Card>
  );
};

// Helper function to calculate performance scores (0-100)
const calculatePerformanceScore = (value, threshold, invert = false) => {
  let score;
  if (invert) {
    // For metrics where lower is better (memory, frame drops, etc)
    score = 100 - (value / threshold * 100);
  } else {
    // For metrics where higher is better
    score = 100 - (value / threshold * 100);
  }
  return Math.max(0, Math.min(100, Math.round(score)));
};

// Helper function to format duration
const formatDuration = (seconds) => {
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

export default function DevPerformanceScreen({ navigation }: { navigation: DevPerformanceScreenNavigationProp }) {
  const perf = usePerformance('DevPerformanceScreen');
  
  // State management with proper types
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [traces, setTraces] = useState<TraceEntry[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [testingInProgress, setTestingInProgress] = useState(false);
  const [isProfileActive, setIsProfileActive] = useState(false);
  const [currentProfileName, setCurrentProfileName] = useState<string | null>(null);
  const [diagnosticResults, setDiagnosticResults] = useState<Record<string, any> | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Get performance data
  const getPerformanceStats = useCallback(() => {
    // Get the performance data from SentryService
    const budgetViolations: PerformanceBudgetViolation[] = SentryService.getBudgetViolations?.() || [];
    
    // Process category and trace stats
    const categoryStats: Record<string, number> = {};
    const traceStats: Record<string, number[]> = {};
    
    traces.forEach(trace => {
      // Group by category
      const category = trace.category || 'unknown';
      categoryStats[category] = (categoryStats[category] || 0) + 1;
      
      // Group durations by name
      if (trace.name && trace.duration) {
        if (!traceStats[trace.name]) {
          traceStats[trace.name] = [];
        }
        traceStats[trace.name].push(trace.duration);
      }
    });
    
    return { categoryStats, traceStats, budgetViolations };
  }, [traces]);
  
  const { categoryStats, traceStats, budgetViolations } = getPerformanceStats();
  
  // Load performance data
  useEffect(() => {
    const loadSentryData = async () => {
      try {
        // For logs, get breadcrumbs from Sentry
        const sentryLogs = SentryService.getEventHistory?.() || [];
        setLogs(sentryLogs);
        
        // For traces, get transactions from Sentry
        const sentryTraces = SentryService.getCompletedTransactions?.() || [];
        setTraces(sentryTraces);
      } catch (error) {
        console.error('Error loading Sentry data:', error);
      }
    };
    
    loadSentryData();
    
    // Track mount ONLY ONCE!
    if (refreshKey === 0) { // Only track the first time
      perf.trackMount();
    }
    
    return () => {
      // Cleanup if needed
    };
  }, [refreshKey]); // Remove perf from dependency array

  // Refresh data
  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Clear data - replace with SentryService methods
  const handleClear = useCallback(() => {
    // Clear Sentry event history if you've implemented that
    SentryService.clearHistory?.();
    setRefreshKey(prev => prev + 1);
  }, []);
  
  // Testing functions (reusing your existing implementations)
  const runSimplePerformanceTest = async () => {
    setTestingInProgress(true);
    
    // Clear existing results first
    SentryService.clearHistory?.();
    
    // Test 1: Array operations
    const arrayTestTransaction = SentryService.startTransaction('test_array_operations', 'benchmark');
    const largeArray = Array(10000).fill(0).map((_, i) => i);
    const result = largeArray.filter(n => n % 2 === 0).map(n => n * 2).reduce((a, b) => a + b, 0);
    arrayTestTransaction.finish();
    
    // Test 2: String operations
    const stringTestTransaction = SentryService.startTransaction('test_string_operations', 'benchmark');
    let longString = '';
    for (let i = 0; i < 10000; i++) {
      longString += 'a';
    }
    longString = longString.replace(/a/g, 'b');
    stringTestTransaction.finish();
    
    // Test 3: Async operation
    const asyncTestTransaction = SentryService.startTransaction('test_async_operation', 'benchmark');
    await new Promise(resolve => setTimeout(resolve, 500));
    asyncTestTransaction.finish();
    
    // Test 4: Multiple quick operations
    for (let i = 0; i < 5; i++) {
      const quickOpTransaction = SentryService.startTransaction(`test_quick_op_${i}`, 'benchmark');
      // Do something quick
      const dummy = Math.sqrt(i * 1000);
      quickOpTransaction.finish();
      // Small delay between operations
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Refresh the data
    handleRefresh();
    setTestingInProgress(false);
  };
  
  const runNetworkPerformanceTest = async () => {
    setTestingInProgress(true);
    
    // Clear existing results first
    SentryService.clearHistory?.();
    
    // Test 1: Basic network request
    const fetchBasicTransaction = SentryService.startTransaction('network_basic_fetch', 'network.request');
    fetchBasicTransaction.setTag('endpoint', 'basic');
    fetchBasicTransaction.setTag('method', 'GET');
    
    try {
      // Use a public API for testing
      const response = await fetch('https://jsonplaceholder.typicode.com/todos/1');
      const data = await response.json();
      SentryService.logEvent('network', `Fetch basic completed with status ${response.status}`);
      fetchBasicTransaction.setData('status', response.status);
      fetchBasicTransaction.setStatus('ok');
    } catch (error) {
      // Add type guard to safely access error properties
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      SentryService.logEvent('network', `Fetch basic error: ${errorMessage}`, undefined, true);
      fetchBasicTransaction.setStatus('internal_error');
      fetchBasicTransaction.setData('error', errorMessage);
    }
    
    fetchBasicTransaction.finish();
    
    // Test 2: Multiple parallel requests
    const parallelTransaction = SentryService.startTransaction('network_parallel_requests', 'network.request');
    parallelTransaction.setTag('count', '5');
    parallelTransaction.setTag('method', 'GET');
    
    try {
      const promises = Array(5).fill(0).map((_, i) => 
        fetch(`https://jsonplaceholder.typicode.com/todos/${i+1}`)
          .then(res => res.json())
      );
      
      const results = await Promise.all(promises);
      SentryService.logEvent('network', `Parallel fetches completed, got ${results.length} results`);
      parallelTransaction.setData('count', results.length);
      parallelTransaction.setStatus('ok');
    } catch (error) {
      // Type guard to check if error is an Error object
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      SentryService.logEvent('network', `Parallel fetch error: ${errorMessage}`, undefined, true);
      parallelTransaction.setStatus('internal_error');
      parallelTransaction.setData('error', errorMessage);
    }
    
    parallelTransaction.finish();
    
    // Test 3: Large payload
    const largePayloadTransaction = SentryService.startTransaction('network_large_payload', 'network.request');
    largePayloadTransaction.setTag('endpoint', 'photos');
    largePayloadTransaction.setTag('method', 'GET');
    
    try {
      // Fetch a larger dataset
      const response = await fetch('https://jsonplaceholder.typicode.com/photos');
      const photos = await response.json();
      SentryService.logEvent('network', `Fetched large payload: ${photos.length} items`);
      largePayloadTransaction.setData('count', photos.length);
      
      // Test data processing performance
      const processTransaction = largePayloadTransaction.startChild('process_large_payload', 'data.transform');
      processTransaction.setData('count', photos.length);
      
      // Simulate processing the data
      const processed = photos
        .slice(0, 100)
        .map(photo => ({
          id: photo.id,
          title: photo.title.toUpperCase(),
          thumbnail: photo.thumbnailUrl,
          dimensions: { width: 150, height: 150 }
        }));
      
      processTransaction.finish();
      largePayloadTransaction.setStatus('ok');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      SentryService.logEvent('network', `Large payload fetch error: ${errorMessage}`, undefined, true);
      largePayloadTransaction.setStatus('internal_error');
      largePayloadTransaction.setData('error', errorMessage);
    }
    
    largePayloadTransaction.finish();
    
    // Refresh the data
    handleRefresh();
    setTestingInProgress(false);
  };
  
  const runMemoryTest = async () => {
    setTestingInProgress(true);
    
    // Clear existing results first
    SentryService.clearHistory?.();
    
    // Take initial snapshot
    const initialMemoryTransaction = SentryService.startTransaction('memory_test_start', 'memory');
    const initialMemory = await SentryService.trackMemoryUsage();
    initialMemoryTransaction.finish();
    
    // Allocate some memory to see the difference
    const memoryHog = [];
    for (let i = 0; i < 1000; i++) {
      memoryHog.push({
        id: i,
        data: new Array(1000).fill('Memory test data').join(''),
        timestamp: Date.now()
      });
    }
    
    // Take another snapshot after allocation
    const peakMemoryTransaction = SentryService.startTransaction('memory_test_peak', 'memory');
    const peakMemory = await SentryService.trackMemoryUsage();
    peakMemoryTransaction.finish();
    
    // Clear the array to free memory
    memoryHog.length = 0;
    
    // Force garbage collection if possible
    if (global.gc) {
      global.gc();
    }
    
    // Take final snapshot
    const finalMemoryTransaction = SentryService.startTransaction('memory_test_end', 'memory');
    const finalMemory = await SentryService.trackMemoryUsage();
    finalMemoryTransaction.finish();
    
    // Refresh the data
    handleRefresh();
    setTestingInProgress(false);
  };
  
  const runFrameRateTest = () => {
    setTestingInProgress(true);
    
    // Clear existing results first
    SentryService.clearHistory?.();
    
    // Create frame rate transaction
    const frameRateTransaction = SentryService.startTransaction('ui_frame_rate_test', 'ui.performance');
    
    // Create some UI load to simulate heavy rendering
    const start = Date.now();
    while (Date.now() - start < 500) {
      // Block the main thread for 500ms
      const dummy = Math.random() * 1000;
    }
    
    // Add metadata to transaction
    frameRateTransaction.setData('blocked_duration_ms', Date.now() - start);
    
    // Stop monitoring after 1 second
    setTimeout(() => {
      frameRateTransaction.finish();
      handleRefresh();
      setTestingInProgress(false);
    }, 1000);
  };
  
  // Calculate stats
  const totalTraces = traces.length;
  const avgTraceDuration = totalTraces > 0 
    ? Math.round(traces.reduce((sum, t) => sum + (t.duration || 0), 0) / totalTraces) 
    : 0;
  const slowestTrace = totalTraces > 0 
    ? [...traces].sort((a, b) => (b.duration || 0) - (a.duration || 0))[0] 
    : null;
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Performance Monitor</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={handleRefresh}>
              <Ionicons name="refresh" size={20} color="#4B5563" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, {marginLeft: 8}]} onPress={handleClear}>
              <Ionicons name="trash-outline" size={20} color="#4B5563" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'dashboard' && styles.activeTab]} 
            onPress={() => setActiveTab('dashboard')}
          >
            <Ionicons name="speedometer-outline" size={18} color={activeTab === 'dashboard' ? '#7C3AED' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'dashboard' && styles.activeTabText]}>Dashboard</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'traces' && styles.activeTab]} 
            onPress={() => setActiveTab('traces')}
          >
            <Ionicons name="git-branch-outline" size={18} color={activeTab === 'traces' ? '#7C3AED' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'traces' && styles.activeTabText]}>Traces</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'logs' && styles.activeTab]} 
            onPress={() => setActiveTab('logs')}
          >
            <Ionicons name="list-outline" size={18} color={activeTab === 'logs' ? '#7C3AED' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'logs' && styles.activeTabText]}>Logs</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'testing' && styles.activeTab]} 
            onPress={() => setActiveTab('testing')}
          >
            <Ionicons name="flask-outline" size={18} color={activeTab === 'testing' ? '#7C3AED' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'testing' && styles.activeTabText]}>Testing</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Dashboard tab */}
      <TabContent active={activeTab === 'dashboard'}>
        <ScrollView style={styles.content}>
          {/* Summary card */}
          <Card style={styles.dashboardCard}>
            <View style={styles.dashboardHeader}>
              <Text style={styles.dashboardTitle}>Performance Summary</Text>
            </View>
            <View style={styles.dashboardStats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{totalTraces}</Text>
                <Text style={styles.statLabel}>Total Traces</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{avgTraceDuration}ms</Text>
                <Text style={styles.statLabel}>Avg Duration</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{slowestTrace?.duration || 0}ms</Text>
                <Text style={styles.statLabel}>Slowest Trace</Text>
              </View>
            </View>
            
            {/* Add a separate section for the Sentry test button */}
            <View style={styles.sentryTestContainer}>
              <Text style={styles.cardDescription}>
                Send a test error to your Sentry dashboard:
              </Text>
              <TouchableOpacity
                style={styles.sentryTestButton}
                onPress={async () => {
                  console.log('[SENTRY] Sending test error to Sentry');
                  try {
                    // Create a more distinctive error
                    const testError = new Error(`Test Error from GroopTroop at ${new Date().toISOString()}`);
                    
                    // Explicitly flush events after capturing
                    Sentry.withScope(scope => {
                      scope.setLevel(Sentry.Severity.Error);
                      scope.setTag('manual_test', 'true');
                      scope.setExtra('device_time', new Date().toString());
                      
                      console.log('[SENTRY] Capturing exception with scope');
                      Sentry.captureException(testError);
                    });
                    
                    // Force events to be sent immediately
                    console.log('[SENTRY] Calling flush to send events immediately');
                    await Sentry.flush(2000); // Wait up to 2 seconds for events to send
                    
                    console.log('[SENTRY] Flush completed');
                    Alert.alert('Sent to Sentry', 'Test error was sent. Check dashboard in a few minutes.');
                  } catch (e) {
                    console.error('[SENTRY] Error sending test:', e);
                    Alert.alert('Error', `Failed to send: ${e instanceof Error ? e.message : String(e)}`);
                  }
                }}
              >
                <Ionicons name="warning-outline" size={16} color="white" style={{marginRight: 8}} />
                <Text style={styles.sentryTestButtonText}>Send Test Error (Debug)</Text>
              </TouchableOpacity>

              {/* Add another test button */}
              <TouchableOpacity
                style={[styles.sentryTestButton, {backgroundColor: '#3B82F6'}]}
                onPress={() => {
                  console.log('[SENTRY] Testing native crash reporting');
                  
                  // This will crash your JS thread, but should be caught by Sentry
                  setTimeout(() => {
                    const crashTest = null;
                    // @ts-ignore
                    crashTest.nonExistentMethod(); // This will cause a runtime exception
                  }, 500);
                }}
              >
                <Ionicons name="alert-circle-outline" size={16} color="white" style={{marginRight: 8}} />
                <Text style={styles.sentryTestButtonText}>Test JS Crash</Text>
              </TouchableOpacity>

              {/* New test button for direct message capture */}
              <TouchableOpacity
                style={[styles.sentryTestButton, {backgroundColor: '#34D399', marginTop: 8}]}
                onPress={() => {
                  console.log('[SENTRY] Testing direct message capture');
                  
                  // Direct message capture - often more reliable than exception capture
                  Sentry.captureMessage('Test message from GroopTroop app at ' + new Date().toISOString(), {
                    level: 'error', // Making it an error so it definitely appears in issues
                    tags: {
                      direct_test: 'true',
                      timestamp: Date.now()
                    }
                  });
                  
                  // Also try a different error approach
                  Sentry.captureEvent({
                    message: 'Manual event from GroopTroop',
                    level: 'error',
                    tags: { manual_event: 'true' }
                  });
                  
                  Alert.alert('Direct Message Sent', 'Sent a direct message to Sentry');
                }}
              >
                <Ionicons name="mail-outline" size={16} color="white" style={{marginRight: 8}} />
                <Text style={styles.sentryTestButtonText}>Test Direct Message</Text>
              </TouchableOpacity>

              {/* New test button for network connectivity */}
              <TouchableOpacity
                style={[styles.sentryTestButton, {backgroundColor: '#6366F1', marginTop: 8}]}
                onPress={async () => {
                  try {
                    console.log('[SENTRY] Testing network connectivity');
                    const response = await fetch('https://sentry.io/api/');
                    const status = response.status;
                    Alert.alert('Network Test', `Sentry.io connectivity: ${status === 200 ? 'Good' : 'Status ' + status}`);
                  } catch (e) {
                    Alert.alert('Network Error', `Cannot reach Sentry servers: ${e instanceof Error ? e.message : String(e)}`);
                  }
                }}
              >
                <Ionicons name="globe-outline" size={16} color="white" style={{marginRight: 8}} />
                <Text style={styles.sentryTestButtonText}>Test Network</Text>
              </TouchableOpacity>
            </View>
          </Card>
          
          {/* Chat Performance Section */}
          <ChatPerformanceSection />
          
          {/* Violations */}
          {budgetViolations.length > 0 && (
            <Card>
              <Text style={styles.cardTitle}>Performance Issues</Text>
              <Text style={styles.cardDescription}>
                Operations exceeding performance budgets
              </Text>
              {budgetViolations.map((v, i) => (
                <View key={i} style={styles.violationItem}>
                  <View style={styles.violationHeader}>
                    <Text style={styles.violationName}>{v.operation}</Text>
                    <Text style={styles.violationValue}>{v.actual.toFixed(1)}ms</Text>
                  </View>
                  <View style={styles.violationBar}>
                    <View 
                      style={[
                        styles.violationBarBudget, 
                        { width: `${(v.budget / v.actual) * 100}%` }
                      ]} 
                    />
                    <View 
                      style={[
                        styles.violationBarExcess, 
                        { width: `${100 - (v.budget / v.actual) * 100}%` }
                      ]} 
                    />
                  </View>
                  <View style={styles.violationFooter}>
                    <Text style={styles.violationCategory}>{v.category}</Text>
                    <Text style={styles.violationOverage}>
                      {Math.round((v.actual / v.budget - 1) * 100)}% over budget
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          )}
          
          {/* More dashboard content */}
        </ScrollView>
      </TabContent>
      
      {/* Traces tab */}
      <TabContent active={activeTab === 'traces'}>
        <View style={styles.content}>
          {traces.length === 0 ? (
            <Text style={styles.emptyText}>No trace data available yet</Text>
          ) : (
            <FlatList
              data={traces}
              keyExtractor={(item, index) => `trace-${index}`}
              renderItem={({ item }) => (
                <View style={styles.traceItem}>
                  <View style={styles.traceItemHeader}>
                    <Text style={styles.traceName}>{item.name}</Text>
                    <Text style={[styles.traceItemDuration, { 
                      color: (item.duration || 0) > 100 ? '#DC2626' : '#111827' 
                    }]}>
                      {item.duration}ms
                    </Text>
                  </View>
                  <View style={styles.traceItemBody}>
                    <Text style={styles.traceTiming}>
                      {new Date(item.startTime).toLocaleTimeString()}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </TabContent>
      
      {/* Logs tab */}
      <TabContent active={activeTab === 'logs'}>
        <View style={styles.content}>
          {logs.length === 0 ? (
            <Text style={styles.emptyText}>No logs available yet</Text>
          ) : (
            <FlatList
              data={logs}
              keyExtractor={(item, index) => `log-${index}`}
              renderItem={({ item, index }) => (
                <View style={[
                  styles.logItem,
                  index % 2 === 0 ? styles.logItemEven : styles.logItemOdd,
                  item.level === 'warning' && styles.logItemWarning
                ]}>
                  <Text style={[
                    styles.logText,
                    item.level === 'warning' && styles.logTextWarning
                  ]}>
                    [{new Date(item.timestamp).toLocaleTimeString()}] {item.category}: {item.message}
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      </TabContent>
      
      {/* Testing tab */}
      <TabContent active={activeTab === 'testing'}>
        <ScrollView style={styles.content}>
          <Card>
            <Text style={styles.cardTitle}>Performance Tests</Text>
            <Text style={styles.cardDescription}>
              Run tests to measure app performance
            </Text>
            
            <View style={styles.testButtons}>
              <TouchableOpacity
                style={[styles.testButton, testingInProgress && styles.testButtonDisabled]}
                onPress={runSimplePerformanceTest}
                disabled={testingInProgress}
              >
                <Ionicons name="code-outline" size={18} color="white" style={styles.buttonIcon} />
                <Text style={styles.testButtonText}>Basic JS</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.testButton, testingInProgress && styles.testButtonDisabled]}
                onPress={runNetworkPerformanceTest}
                disabled={testingInProgress}
              >
                <Ionicons name="cloud-outline" size={18} color="white" style={styles.buttonIcon} />
                <Text style={styles.testButtonText}>Network</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.testButton, testingInProgress && styles.testButtonDisabled]}
                onPress={runMemoryTest}
                disabled={testingInProgress}
              >
                <Ionicons name="hardware-chip-outline" size={18} color="white" style={styles.buttonIcon} />
                <Text style={styles.testButtonText}>Memory</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.testButton, testingInProgress && styles.testButtonDisabled]}
                onPress={runFrameRateTest}
                disabled={testingInProgress}
              >
                <Ionicons name="pulse-outline" size={18} color="white" style={styles.buttonIcon} />
                <Text style={styles.testButtonText}>UI Thread</Text>
              </TouchableOpacity>
            </View>
            
            {testingInProgress && (
              <View style={styles.testingProgress}>
                <Text style={styles.testingText}>Running tests...</Text>
                <View style={styles.loadingDots}>
                  <View style={styles.loadingDot} />
                  <View style={[styles.loadingDot, { animationDelay: '0.5s' }]} />
                  <View style={[styles.loadingDot, { animationDelay: '1s' }]} />
                </View>
              </View>
            )}
          </Card>
          
          {/* Advanced Tools */}
          <Card>
            <Text style={styles.cardTitle}>Advanced Tools</Text>
            <View style={styles.advancedTools}>
              <TouchableOpacity 
                style={styles.advancedToolButton}
                onPress={() => {
                  // Force garbage collection if possible
                  if (global.gc) {
                    global.gc();
                    SentryService.logEvent('memory', 'Manually triggered garbage collection');
                    handleRefresh();
                  } else {
                    SentryService.logEvent('memory', 'Garbage collection unavailable (needs --expose-gc)', undefined, true);
                  }
                }}
              >
                <View style={styles.advancedToolIcon}>
                  <Ionicons name="trash-bin-outline" size={20} color="#4B5563" />
                </View>
                <View style={styles.advancedToolContent}>
                  <Text style={styles.advancedToolName}>Force Garbage Collection</Text>
                  <Text style={styles.advancedToolDescription}>
                    Attempt to free unused memory
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.advancedToolButton}
                onPress={async () => {
                  try {
                    await MemoryMonitor.takeSnapshot('manual_snapshot');
                    SentryService.logEvent('memory', 'Manual memory snapshot taken');
                    handleRefresh();
                  } catch (e) {
                    console.error('Error taking memory snapshot:', e);
                  }
                }}
              >
                <View style={styles.advancedToolIcon}>
                  <Ionicons name="camera-outline" size={20} color="#4B5563" />
                </View>
                <View style={styles.advancedToolContent}>
                  <Text style={styles.advancedToolName}>Memory Snapshot</Text>
                  <Text style={styles.advancedToolDescription}>
                    Take a snapshot of current memory usage
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </Card>
        </ScrollView>
      </TabContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 0,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginLeft: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    backgroundColor: '#ffffff',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#7C3AED',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  activeTabText: {
    color: '#7C3AED',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  tabContent: {
    flex: 1,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  dashboardCard: {
    padding: 0,
    overflow: 'hidden',
  },
  dashboardHeader: {
    padding: 16,
  },
  dashboardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  dashboardStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 8,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#7C3AED',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 16,
  },
  collapsibleSection: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  sectionContent: {
    paddingTop: 8,
  },
  performanceBar: {
    marginVertical: 6,
  },
  performanceBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  performanceBarLabel: {
    fontSize: 12,
    color: '#4B5563',
  },
  performanceBarValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
  },
  performanceBarContainer: {
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  performanceBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  categoryCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  categoryDetail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  statItemCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7C3AED',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statItemBars: {
    gap: 8,
  },
  viewMoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 8,
  },
  viewMoreText: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '500',
  },
  testButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  testButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flex: 1,
    minWidth: 150,
  },
  buttonIcon: {
    marginRight: 8,
  },
  testButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  testButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  testingCard: {
    marginTop: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  testingProgress: {
    alignItems: 'center',
    padding: 16,
  },
  testingText: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 12,
  },
  loadingDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 20,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
    marginHorizontal: 3,
    opacity: 0.6,
    animationName: 'dotPulse',
    animationDuration: '1.5s',
    animationIterationCount: 'infinite',
  },
  traceItemDetailed: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  traceItemDetailedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  traceItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  traceItemBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  traceItemDuration: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  traceItemMetadata: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  traceItemCategory: {
    fontSize: 12,
    color: '#6B7280',
  },
  traceItemType: {
    fontSize: 12,
    color: '#6B7280',
  },
  traceItem: {
    flexDirection: 'column',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  traceItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  traceName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  traceItemBody: {
    marginTop: 2,
  },
  traceTiming: {
    fontSize: 12,
    color: '#4B5563',
  },
  emptyText: {
    padding: 16,
    textAlign: 'center',
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  logItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logItemEven: {
    backgroundColor: '#FFFFFF',
  },
  logItemOdd: {
    backgroundColor: '#F9FAFB',
  },
  logItemWarning: {
    backgroundColor: '#FEF2F2',
  },
  logText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#4B5563',
  },
  logTextWarning: {
    color: '#DC2626',
  },
  violationItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  violationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  violationName: {
    fontWeight: '500',
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  violationValue: {
    fontWeight: '600',
    color: '#DC2626',
    fontSize: 13,
  },
  violationBar: {
    height: 6,
    flexDirection: 'row',
    marginBottom: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  violationBarBudget: {
    backgroundColor: '#10B981',
    height: '100%',
  },
  violationBarExcess: {
    backgroundColor: '#DC2626',
    height: '100%',
  },
  violationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  violationCategory: {
    fontSize: 12,
    color: '#4B5563',
  },
  violationOverage: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  profileControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  profileInput: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    fontSize: 14,
  },
  profileButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stopButton: {
    backgroundColor: '#DC2626',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  profileButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  activeProfileBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  activeProfileText: {
    color: '#DC2626',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  advancedTools: {
    gap: 12,
  },
  advancedToolButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  advancedToolIcon: {
    marginRight: 12,
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  advancedToolContent: {
    flex: 1,
  },
  advancedToolName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  advancedToolDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  // Add new styles for chat section
  chatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chatBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatScore: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  chatId: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  chatMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  chatMetricItem: {
    width: '50%',
    paddingVertical: 8,
    paddingRight: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  chatSessionTime: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
  },
  sessionDuration: {
    marginLeft: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  emptyChatMetrics: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  infoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  hintText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  sentryTestContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  sentryTestButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 8,
  },
  sentryTestButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});