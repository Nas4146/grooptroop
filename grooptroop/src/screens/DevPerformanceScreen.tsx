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
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SimplePerformance } from '../utils/simplePerformance';
import { useComponentPerformance } from '../utils/usePerformance';
import { Ionicons } from '@expo/vector-icons';
import { MemoryMonitor } from '../utils/memoryMonitor';
import { FrameRateMonitor } from '../utils/frameRateMonitor';
import { PerformanceProfiler } from '../utils/performanceProfiles';
import { NetworkMonitor } from '../utils/networkMonitor';
import { CPUMonitor } from '../utils/cpuMonitor';
import { PerformanceExporter } from '../utils/performanceExporter';
import { UserPerceptionMetrics } from '../utils/userPerceptionMetrics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Tab content component - Reusable for different tabs
const TabContent = ({ children, active }) => (
  <Animated.View style={[styles.tabContent, { display: active ? 'flex' : 'none' }]}>
    {children}
  </Animated.View>
);

// Collapsible section component
const CollapsibleSection = ({ title, children, initiallyExpanded = true }) => {
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

// Card component for consistent UI
const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>
    {children}
  </View>
);

export default function DevPerformanceScreen({ navigation }) {
  useComponentPerformance('DevPerformanceScreen');
  
  // State management
  const [logs, setLogs] = useState([]);
  const [traces, setTraces] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [testingInProgress, setTestingInProgress] = useState(false);
  const [isProfileActive, setIsProfileActive] = useState(false);
  const [currentProfileName, setCurrentProfileName] = useState(null);
  const [diagnosticResults, setDiagnosticResults] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Get performance data
  const categoryStats = SimplePerformance.getCategoryStats();
  const traceStats = SimplePerformance.getTraceStats();
  const budgetViolations = SimplePerformance.getBudgetViolations?.() || [];
  
  // Load performance data
  useEffect(() => {
    const history = SimplePerformance.getHistory();
    const completedTraces = SimplePerformance.getCompletedTraces()
      .sort((a, b) => b.startTime - a.startTime);
    
    setLogs(history);
    setTraces(completedTraces);
  }, [refreshKey]);

  // Refresh data
  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Clear data
  const handleClear = useCallback(() => {
    SimplePerformance.clearHistory();
    setRefreshKey(prev => prev + 1);
  }, []);
  
  // Testing functions (reusing your existing implementations)
  const runSimplePerformanceTest = async () => {
    // Your existing implementation
    setTestingInProgress(true);
    
    // Clear existing results first
    SimplePerformance.clearHistory();
    
    // Test 1: Array operations
    const arrayTestId = SimplePerformance.startTrace('test_array_operations');
    const largeArray = Array(10000).fill(0).map((_, i) => i);
    const result = largeArray.filter(n => n % 2 === 0).map(n => n * 2).reduce((a, b) => a + b, 0);
    SimplePerformance.endTrace(arrayTestId);
    
    // Test 2: String operations
    const stringTestId = SimplePerformance.startTrace('test_string_operations');
    let longString = '';
    for (let i = 0; i < 10000; i++) {
      longString += 'a';
    }
    longString = longString.replace(/a/g, 'b');
    SimplePerformance.endTrace(stringTestId);
    
    // Test 3: Async operation
    const asyncTestId = SimplePerformance.startTrace('test_async_operation');
    await new Promise(resolve => setTimeout(resolve, 500));
    SimplePerformance.endTrace(asyncTestId);
    
    // Test 4: Multiple quick operations
    for (let i = 0; i < 5; i++) {
      const quickOpId = SimplePerformance.startTrace(`test_quick_op_${i}`);
      // Do something quick
      const dummy = Math.sqrt(i * 1000);
      SimplePerformance.endTrace(quickOpId);
      // Small delay between operations
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Refresh the data
    handleRefresh();
    setTestingInProgress(false);
  };
  
  const runNetworkPerformanceTest = async () => {
    // Your existing implementation
    setTestingInProgress(true);
    
    // Clear existing results first
    SimplePerformance.clearHistory();
    
    // Test 1: Basic network request
    const fetchBasicId = SimplePerformance.startTrace('network_basic_fetch', 
      { type: 'GET', endpoint: 'basic' }, 
      'network-request');
    
    try {
      // Use a public API for testing
      const response = await fetch('https://jsonplaceholder.typicode.com/todos/1');
      const data = await response.json();
      SimplePerformance.logEvent('network', `Fetch basic completed with status ${response.status}`);
    } catch (error) {
      SimplePerformance.logEvent('network', `Fetch basic error: ${error.message}`, undefined, true);
    }
    
    SimplePerformance.endTrace(fetchBasicId);
    
    // Test 2: Multiple parallel requests
    const parallelId = SimplePerformance.startTrace('network_parallel_requests', 
      { type: 'GET', count: '5' }, 
      'network-request');
    
    try {
      const promises = Array(5).fill(0).map((_, i) => 
        fetch(`https://jsonplaceholder.typicode.com/todos/${i+1}`)
          .then(res => res.json())
      );
      
      const results = await Promise.all(promises);
      SimplePerformance.logEvent('network', `Parallel fetches completed, got ${results.length} results`);
    } catch (error) {
      SimplePerformance.logEvent('network', `Parallel fetch error: ${error.message}`, undefined, true);
    }
    
    SimplePerformance.endTrace(parallelId);
    
    // Test 3: Large payload
    const largePayloadId = SimplePerformance.startTrace('network_large_payload', 
      { type: 'GET', endpoint: 'photos' }, 
      'network-request');
    
    try {
      // Fetch a larger dataset
      const response = await fetch('https://jsonplaceholder.typicode.com/photos');
      const photos = await response.json();
      SimplePerformance.logEvent('network', `Fetched large payload: ${photos.length} items`);
      
      // Test data processing performance
      const processId = SimplePerformance.startTrace('process_large_payload', 
        { count: String(photos.length) }, 
        'data-transform');
      
      // Simulate processing the data
      const processed = photos
        .slice(0, 100)
        .map(photo => ({
          id: photo.id,
          title: photo.title.toUpperCase(),
          thumbnail: photo.thumbnailUrl,
          dimensions: { width: 150, height: 150 }
        }));
      
      SimplePerformance.endTrace(processId);
    } catch (error) {
      SimplePerformance.logEvent('network', `Large payload fetch error: ${error.message}`, undefined, true);
    }
    
    SimplePerformance.endTrace(largePayloadId);
    
    // Refresh the data
    handleRefresh();
    setTestingInProgress(false);
  };
  
  const runMemoryTest = async () => {
    // Your existing implementation
    setTestingInProgress(true);
    
    // Clear existing results first
    SimplePerformance.clearHistory();
    MemoryMonitor.clearSnapshots();
    
    // Take initial snapshot
    await MemoryMonitor.takeSnapshot('memory_test_start');
    
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
    await MemoryMonitor.takeSnapshot('memory_test_after_allocation');
    
    // Clear the array to free memory
    memoryHog.length = 0;
    
    // Force garbage collection if possible
    if (global.gc) {
      global.gc();
    }
    
    // Take final snapshot
    await MemoryMonitor.takeSnapshot('memory_test_end');
    
    // Refresh the data
    handleRefresh();
    setTestingInProgress(false);
  };
  
  const runFrameRateTest = () => {
    // Your existing implementation
    setTestingInProgress(true);
    
    // Clear existing results first
    SimplePerformance.clearHistory();
    
    // Start monitoring frame rate
    FrameRateMonitor.startMonitoring('ui_test');
    
    // Create some UI load to simulate heavy rendering
    const start = Date.now();
    while (Date.now() - start < 500) {
      // Block the main thread for 500ms
      const dummy = Math.random() * 1000;
    }
    
    // Stop monitoring after 1 second
    setTimeout(() => {
      FrameRateMonitor.stopMonitoring();
      handleRefresh();
      setTestingInProgress(false);
    }, 1000);
  };
  
  // Calculate stats
  const totalTraces = traces.length;
  const avgTraceDuration = totalTraces > 0 
    ? Math.round(traces.reduce((sum, t) => sum + t.duration, 0) / totalTraces) 
    : 0;
  const slowestTrace = totalTraces > 0 
    ? traces.sort((a, b) => b.duration - a.duration)[0] 
    : null;
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with tabs */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons 
              name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} 
              size={20} 
              color="#7C3AED" 
            />
          </TouchableOpacity>
          <Text style={styles.title}>Performance Monitor</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={handleRefresh}
            >
              <Ionicons name="refresh" size={20} color="#7C3AED" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.iconButton, {marginLeft: 8}]} 
              onPress={handleClear}
            >
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Tab navigation */}
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'dashboard' && styles.activeTab]}
            onPress={() => setActiveTab('dashboard')}
          >
            <Ionicons 
              name="speedometer-outline" 
              size={18} 
              color={activeTab === 'dashboard' ? "#7C3AED" : "#6B7280"} 
            />
            <Text style={[styles.tabText, activeTab === 'dashboard' && styles.activeTabText]}>
              Dashboard
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'tests' && styles.activeTab]}
            onPress={() => setActiveTab('tests')}
          >
            <Ionicons 
              name="flask-outline" 
              size={18} 
              color={activeTab === 'tests' ? "#7C3AED" : "#6B7280"} 
            />
            <Text style={[styles.tabText, activeTab === 'tests' && styles.activeTabText]}>
              Tests
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'traces' && styles.activeTab]}
            onPress={() => setActiveTab('traces')}
          >
            <Ionicons 
              name="analytics-outline" 
              size={18} 
              color={activeTab === 'traces' ? "#7C3AED" : "#6B7280"} 
            />
            <Text style={[styles.tabText, activeTab === 'traces' && styles.activeTabText]}>
              Traces
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'logs' && styles.activeTab]}
            onPress={() => setActiveTab('logs')}
          >
            <Ionicons 
              name="list-outline" 
              size={18} 
              color={activeTab === 'logs' ? "#7C3AED" : "#6B7280"} 
            />
            <Text style={[styles.tabText, activeTab === 'logs' && styles.activeTabText]}>
              Logs
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'profiles' && styles.activeTab]}
            onPress={() => setActiveTab('profiles')}
          >
            <Ionicons 
              name="options-outline" 
              size={18} 
              color={activeTab === 'profiles' ? "#7C3AED" : "#6B7280"} 
            />
            <Text style={[styles.tabText, activeTab === 'profiles' && styles.activeTabText]}>
              Profiles
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Tab Content */}
      <ScrollView style={styles.content}>
        {/* Dashboard Tab */}
        <TabContent active={activeTab === 'dashboard'}>
          {/* Performance at a glance */}
          <Card style={styles.dashboardCard}>
            <View style={styles.dashboardHeader}>
              <Text style={styles.dashboardTitle}>Performance at a Glance</Text>
              <View style={styles.dashboardStats}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{totalTraces}</Text>
                  <Text style={styles.statLabel}>Operations</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{avgTraceDuration}ms</Text>
                  <Text style={styles.statLabel}>Average Time</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{budgetViolations.length}</Text>
                  <Text style={styles.statLabel}>Violations</Text>
                </View>
              </View>
            </View>
          </Card>
          
          {/* Budget violations */}
          {budgetViolations.length > 0 && (
            <CollapsibleSection title={`Performance Budget Violations (${budgetViolations.length})`}>
              <Card>
                <FlatList
                  data={budgetViolations}
                  keyExtractor={(item, index) => `violation-${index}`}
                  renderItem={({ item }) => (
                    <View style={styles.violationItem}>
                      <View style={styles.violationHeader}>
                        <Text style={styles.violationName}>{item.name}</Text>
                        <Text style={styles.violationValue}>
                          {item.actual}ms / {item.budget}ms
                        </Text>
                      </View>
                      <View style={styles.violationBar}>
                        <View 
                          style={[
                            styles.violationBarBudget, 
                            { width: `${Math.min(100, (item.budget / item.actual) * 100)}%` }
                          ]} 
                        />
                        <View 
                          style={[
                            styles.violationBarExcess, 
                            { width: `${Math.min(100, Math.max(0, (item.actual - item.budget) / item.actual) * 100)}%` }
                          ]} 
                        />
                      </View>
                      <View style={styles.violationFooter}>
                        <Text style={styles.violationCategory}>{item.category}</Text>
                        <Text style={styles.violationOverage}>
                          {Math.round((item.actual / item.budget - 1) * 100)}% over budget
                        </Text>
                      </View>
                    </View>
                  )}
                  scrollEnabled={false}
                  nestedScrollEnabled={true}
                  style={{ maxHeight: 300 }}
                />
              </Card>
            </CollapsibleSection>
          )}
          
          {/* Category stats */}
          {categoryStats.length > 0 && (
            <CollapsibleSection title="Performance by Category">
              <Card>
                {categoryStats.map(cat => (
                  <View key={cat.category} style={styles.categoryItem}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryName}>{cat.category}</Text>
                      <Text style={styles.categoryCount}>{cat.count} operations</Text>
                    </View>
                    <PerformanceBar 
                      value={cat.averageTime} 
                      max={100}
                      label={`Avg: ${cat.averageTime}ms`}
                      barColor={cat.averageTime > 100 ? '#DC2626' : '#10B981'}
                    />
                    <Text style={styles.categoryDetail}>
                      Total: {cat.totalTime}ms
                    </Text>
                  </View>
                ))}
              </Card>
            </CollapsibleSection>
          )}
          
          {/* Operation Stats */}
          {traceStats.length > 0 && (
            <CollapsibleSection title="Operation Statistics">
              <Card>
                {traceStats.slice(0, 5).map(stat => (
                  <View key={stat.name} style={styles.statItem}>
                    <View style={styles.statItemHeader}>
                      <Text style={styles.statItemName}>{stat.name}</Text>
                      <Text style={styles.statItemCount}>{stat.count}x</Text>
                    </View>
                    <View style={styles.statItemBars}>
                      <PerformanceBar 
                        value={stat.averageTime} 
                        max={Math.max(stat.maxTime, 100)}
                        label="Avg"
                        barColor="#3B82F6"
                      />
                      <PerformanceBar 
                        value={stat.minTime} 
                        max={Math.max(stat.maxTime, 100)}
                        label="Min"
                        barColor="#10B981"
                      />
                      <PerformanceBar 
                        value={stat.maxTime} 
                        max={Math.max(stat.maxTime, 100)}
                        label="Max"
                        barColor={stat.maxTime > 100 ? '#DC2626' : '#F59E0B'}
                      />
                    </View>
                  </View>
                ))}
                {traceStats.length > 5 && (
                  <TouchableOpacity 
                    style={styles.viewMoreButton}
                    onPress={() => setActiveTab('traces')}
                  >
                    <Text style={styles.viewMoreText}>
                      View {traceStats.length - 5} more operations
                    </Text>
                  </TouchableOpacity>
                )}
              </Card>
            </CollapsibleSection>
          )}
        </TabContent>
        
        {/* Tests Tab */}
        <TabContent active={activeTab === 'tests'}>
          {/* Performance testing section */}
          <Card>
            <CollapsibleSection title="Core Performance Tests">
              <View style={styles.testButtons}>
                <TouchableOpacity
                  style={[
                    styles.testButton,
                    testingInProgress && styles.testButtonDisabled
                  ]}
                  onPress={runSimplePerformanceTest}
                  disabled={testingInProgress}
                >
                  <Ionicons name="speedometer-outline" size={20} color="white" style={styles.buttonIcon} />
                  <Text style={styles.testButtonText}>
                    {testingInProgress ? 'Running...' : 'CPU & Memory Tests'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.testButton,
                    testingInProgress && styles.testButtonDisabled,
                    { backgroundColor: '#3B82F6' }
                  ]}
                  onPress={runNetworkPerformanceTest}
                  disabled={testingInProgress}
                >
                  <Ionicons name="cloud-outline" size={20} color="white" style={styles.buttonIcon} />
                  <Text style={styles.testButtonText}>
                    {testingInProgress ? 'Running...' : 'Network Tests'}
                  </Text>
                </TouchableOpacity>
              </View>
            </CollapsibleSection>
            
            <CollapsibleSection title="Advanced Tests">
              <View style={styles.testButtons}>
                <TouchableOpacity
                  style={[
                    styles.testButton,
                    testingInProgress && styles.testButtonDisabled,
                    { backgroundColor: '#8B5CF6' }
                  ]}
                  onPress={runMemoryTest}
                  disabled={testingInProgress}
                >
                  <Ionicons name="hardware-chip-outline" size={20} color="white" style={styles.buttonIcon} />
                  <Text style={styles.testButtonText}>
                    {testingInProgress ? 'Running...' : 'Memory Usage Test'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.testButton,
                    testingInProgress && styles.testButtonDisabled,
                    { backgroundColor: '#EC4899' }
                  ]}
                  onPress={runFrameRateTest}
                  disabled={testingInProgress}
                >
                  <Ionicons name="film-outline" size={20} color="white" style={styles.buttonIcon} />
                  <Text style={styles.testButtonText}>
                    {testingInProgress ? 'Running...' : 'Frame Rate Test'}
                  </Text>
                </TouchableOpacity>
              </View>
            </CollapsibleSection>
          </Card>
          
          {testingInProgress && (
            <Card style={styles.testingCard}>
              <View style={styles.testingProgress}>
                <Text style={styles.testingText}>Running tests...</Text>
                {/* Add animation indicator here */}
                <View style={styles.loadingDots}>
                  <Animated.View style={styles.loadingDot} />
                  <Animated.View style={[styles.loadingDot, {animationDelay: '0.2s'}]} />
                  <Animated.View style={[styles.loadingDot, {animationDelay: '0.4s'}]} />
                </View>
              </View>
            </Card>
          )}
        </TabContent>
        
        {/* Traces Tab */}
        <TabContent active={activeTab === 'traces'}>
          {/* All completed traces */}
          <Card>
            <CollapsibleSection title={`Completed Traces (${traces.length})`}>
              {traces.length > 0 ? (
                <FlatList
                  data={traces}
                  keyExtractor={(item, index) => `trace-${index}`}
                  renderItem={({ item }) => (
                    <View style={styles.traceItemDetailed}>
                      <View style={styles.traceItemDetailedHeader}>
                        <Text style={styles.traceItemName}>{item.name}</Text>
                        <View style={styles.traceItemBadge}>
                          <Text style={styles.traceItemDuration}>{item.duration}ms</Text>
                        </View>
                      </View>
                      {item.metadata && (
                        <View style={styles.traceItemMetadata}>
                          <Text style={styles.traceItemCategory}>
                            Category: {item.metadata.category || 'uncategorized'}
                          </Text>
                          {item.metadata.type && (
                            <Text style={styles.traceItemType}>Type: {item.metadata.type}</Text>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                  scrollEnabled={false}
                  nestedScrollEnabled={true}
                  style={{ maxHeight: 500 }}
                />
              ) : (
                <Text style={styles.emptyText}>No traces recorded</Text>
              )}
            </CollapsibleSection>
          </Card>
          
          {/* Operation Statistics */}
          {traceStats.length > 0 && (
            <Card style={{marginTop: 12}}>
              <CollapsibleSection title="Detailed Operation Statistics">
                <FlatList
                  data={traceStats}
                  keyExtractor={(item) => item.name}
                  renderItem={({ item }) => (
                    <View style={styles.traceItem}>
                      <View style={styles.traceItemHeader}>
                        <Text style={styles.traceName}>{item.name}</Text>
                        <Text style={styles.statsValue}>{item.count}x</Text>
                      </View>
                      <View style={styles.traceItemBody}>
                        <Text style={styles.traceTiming}>
                          Avg: {item.averageTime}ms | Min: {item.minTime}ms | Max: {item.maxTime}ms
                        </Text>
                      </View>
                    </View>
                  )}
                  scrollEnabled={false}
                  nestedScrollEnabled={true}
                  style={{ maxHeight: 400 }}
                />
              </CollapsibleSection>
            </Card>
          )}
        </TabContent>
        
        {/* Logs Tab */}
        <TabContent active={activeTab === 'logs'}>
          <Card>
            <CollapsibleSection title={`Performance Logs (${logs.length})`}>
              {logs.length > 0 ? (
                <FlatList
                  data={logs}
                  keyExtractor={(item, index) => `log-${index}`}
                  renderItem={({ item, index }) => (
                    <View style={[
                      styles.logItem, 
                      index % 2 === 0 ? styles.logItemEven : styles.logItemOdd,
                      item.includes('⚠️') && styles.logItemWarning
                    ]}>
                      <Text style={[
                        styles.logText,
                        item.includes('⚠️') && styles.logTextWarning
                      ]}>
                        {item}
                      </Text>
                    </View>
                  )}
                  scrollEnabled={false}
                  nestedScrollEnabled={true}
                  style={{ maxHeight: 500 }}
                />
              ) : (
                <Text style={styles.emptyText}>No logs recorded</Text>
              )}
            </CollapsibleSection>
          </Card>
        </TabContent>
        
        {/* Profiles Tab */}
        <TabContent active={activeTab === 'profiles'}>
          <Card>
            <Text style={styles.cardTitle}>Performance Profiling</Text>
            <Text style={styles.cardDescription}>
              Create a profile to monitor performance during specific user flows or scenarios.
            </Text>
            
            <View style={styles.profileControls}>
              <TextInput
                style={styles.profileInput}
                placeholder="Profile name"
                value={currentProfileName || ''}
                onChangeText={setCurrentProfileName}
                editable={!isProfileActive}
              />
              
              {!isProfileActive ? (
                <TouchableOpacity
                  style={[styles.profileButton, !currentProfileName && styles.disabledButton]}
                  onPress={() => {
                    if (currentProfileName) {
                      PerformanceProfiler.startProfile(currentProfileName);
                      setIsProfileActive(true);
                    }
                  }}
                  disabled={!currentProfileName}
                >
                  <Ionicons name="play" size={20} color="white" />
                  <Text style={styles.profileButtonText}>Start</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.profileButton, styles.stopButton]}
                  onPress={() => {
                    const results = PerformanceProfiler.stopProfile();
                    console.log(`[PERF] Profile results:`, results);
                    setIsProfileActive(false);
                  }}
                >
                  <Ionicons name="stop" size={20} color="white" />
                  <Text style={styles.profileButtonText}>Stop</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {isProfileActive && (
              <View style={styles.activeProfileBanner}>
                <Ionicons name="recording" size={16} color="#DC2626" />
                <Text style={styles.activeProfileText}>
                  Recording profile: {currentProfileName}
                </Text>
              </View>
            )}
            
            <View style={styles.divider} />
            
            <Text style={styles.cardTitle}>Advanced Tools</Text>
            <View style={styles.advancedTools}>
              <TouchableOpacity
                style={styles.advancedToolButton}
                onPress={async () => {
                  setTestingInProgress(true);
                  const results = await PerformanceProfiler.runDiagnostic(
                    'navigation',
                    async () => {
                      // Simulate navigation actions
                      await new Promise(resolve => setTimeout(resolve, 300));
                    }
                  );
                  setDiagnosticResults(results);
                  setTestingInProgress(false);
                }}
                disabled={testingInProgress}
              >
                <Ionicons 
                  name="navigate-outline" 
                  size={24} 
                  color="#059669"
                  style={styles.advancedToolIcon} 
                />
                <Text style={styles.advancedToolName}>Navigation Diagnostic</Text>
                <Text style={styles.advancedToolDescription}>
                  Test navigation performance between screens
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.advancedToolButton}
                onPress={() => PerformanceExporter.exportData()}
              >
                <Ionicons 
                  name="share-outline" 
                  size={24} 
                  color="#2563EB" 
                  style={styles.advancedToolIcon}
                />
                <Text style={styles.advancedToolName}>Export Performance Data</Text>
                <Text style={styles.advancedToolDescription}>
                  Share results for further analysis
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </TabContent>
      </ScrollView>
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
});