import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SimplePerformance } from '../utils/simplePerformance';
import { useComponentPerformance } from '../utils/usePerformance';
import { Ionicons } from '@expo/vector-icons';

export default function DevPerformanceScreen({ navigation }) {
  useComponentPerformance('DevPerformanceScreen');
  const [logs, setLogs] = useState<string[]>([]);
  const [traces, setTraces] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [testingInProgress, setTestingInProgress] = useState(false);

  // Load performance data
  useEffect(() => {
    const history = SimplePerformance.getHistory();
    const completedTraces = SimplePerformance.getCompletedTraces()
      .sort((a, b) => b.startTime - a.startTime);
    
    setLogs(history);
    setTraces(completedTraces);
  }, [refreshKey]);

  // Refresh data
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Clear data
  const handleClear = () => {
    SimplePerformance.clearHistory();
    setRefreshKey(prev => prev + 1);
  };
  
  // Go back
  const handleBack = () => {
    navigation.goBack();
  };
  
  // Test performance - Simple operations
  const runSimplePerformanceTest = async () => {
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
  
  // Test network performance
  const runNetworkPerformanceTest = async () => {
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
        .slice(0, 100) // Take first 100 to keep it reasonable
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
  
  // Get category statistics
  const categoryStats = SimplePerformance.getCategoryStats();
  
  // Get trace statistics
  const traceStats = SimplePerformance.getTraceStats();

  // Budget violations
  const budgetViolations = SimplePerformance.getBudgetViolations?.() || [];
  const performanceBudgets = SimplePerformance.getBudgets?.() || {};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons 
              name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} 
              size={24} 
              color="#7C3AED" 
            />
          </TouchableOpacity>
          <Text style={styles.title}>Performance Monitor</Text>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, { marginRight: 8 }]} 
            onPress={handleRefresh}
          >
            <Text style={styles.buttonText}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#DC2626' }]} 
            onPress={handleClear}
          >
            <Text style={styles.buttonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container}>
        {/* Category stats section */}
        {categoryStats.length > 0 && (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Performance by Category</Text>
            <FlatList
              data={categoryStats}
              keyExtractor={(item) => item.category}
              renderItem={({ item }) => (
                <View style={styles.traceItem}>
                  <View style={styles.traceItemHeader}>
                    <Text style={styles.categoryName}>{item.category}</Text>
                    <Text style={styles.statsValue}>{item.count} operations</Text>
                  </View>
                  <View style={styles.traceItemBody}>
                    <Text style={styles.traceTiming}>
                      Total: {item.totalTime}ms | Avg: {item.averageTime}ms
                    </Text>
                  </View>
                </View>
              )}
              scrollEnabled={false}
              nestedScrollEnabled={true}
              style={{ height: Math.min(300, categoryStats.length * 70 + 50) }}
            />
          </View>
        )}

        {/* Budget violations section */}
        {budgetViolations.length > 0 && (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>
              Performance Budget Violations ({budgetViolations.length})
            </Text>
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
              style={{ height: Math.min(300, budgetViolations.length * 100 + 50) }}
            />
          </View>
        )}

        {/* Trace stats section */}
        {traceStats.length > 0 && (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Operation Statistics</Text>
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
              style={{ height: Math.min(300, traceStats.length * 70 + 50) }}
            />
          </View>
        )}

        {/* Performance testing section */}
        <View style={styles.testingSection}>
          <Text style={styles.sectionTitle}>Performance Testing</Text>
          <TouchableOpacity
            style={[
              styles.testButton,
              testingInProgress && styles.testButtonDisabled
            ]}
            onPress={runSimplePerformanceTest}
            disabled={testingInProgress}
          >
            <Text style={styles.testButtonText}>
              {testingInProgress ? 'Running Tests...' : 'Run Performance Tests'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.testButton,
              testingInProgress && styles.testButtonDisabled,
              { marginTop: 12, backgroundColor: '#3B82F6' }
            ]}
            onPress={runNetworkPerformanceTest}
            disabled={testingInProgress}
          >
            <Text style={styles.testButtonText}>
              {testingInProgress ? 'Running Tests...' : 'Test Network Performance'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Stats</Text>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Total Traces:</Text>
            <Text style={styles.statsValue}>{traces.length}</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsLabel}>Log Entries:</Text>
            <Text style={styles.statsValue}>{logs.length}</Text>
          </View>
          {traces.length > 0 && (
            <>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Average Duration:</Text>
                <Text style={styles.statsValue}>
                  {Math.round(traces.reduce((sum, t) => sum + t.duration, 0) / traces.length)}ms
                </Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Slowest Operation:</Text>
                <Text style={styles.statsValue}>
                  {traces.length > 0 ? traces.sort((a, b) => b.duration - a.duration)[0]?.name : 'N/A'}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Traces section */}
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Completed Traces</Text>
          <FlatList
            data={traces}
            keyExtractor={(item, index) => `trace-${index}`}
            renderItem={({ item }) => (
              <View style={styles.traceItem}>
                <Text style={styles.traceName}>{item.name}</Text>
                <Text style={styles.traceDuration}>{item.duration}ms</Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No traces recorded</Text>
            }
            scrollEnabled={false}
            nestedScrollEnabled={true}
            style={{ height: Math.min(300, traces.length * 45 + 50) }}
          />
        </View>

        {/* Logs section */}
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Performance Log</Text>
          <FlatList
            data={logs}
            keyExtractor={(item, index) => `log-${index}`}
            renderItem={({ item }) => (
              <Text style={styles.logItem}>{item}</Text>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No logs recorded</Text>
            }
            scrollEnabled={false}
            nestedScrollEnabled={true}
            style={{ height: Math.min(300, logs.length * 30 + 50) }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
  },
  button: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
  },
  testingSection: {
    margin: 8,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  statsSection: {
    margin: 8,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statsLabel: {
    fontSize: 14,
    color: '#4B5563',
  },
  statsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  contentSection: {
    margin: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  testButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
  },
  testButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  testButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  traceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  traceItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  traceItemBody: {
    marginTop: 2,
  },
  categoryName: {
    fontWeight: '500',
    flex: 1,
  },
  traceTiming: {
    fontSize: 12,
    color: '#4B5563',
  },
  traceName: {
    flex: 1,
  },
  traceDuration: {
    fontWeight: '500',
  },
  logItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    fontSize: 12,
  },
  emptyText: {
    padding: 16,
    textAlign: 'center',
    color: '#888',
  },
  violationItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  },
  violationValue: {
    fontWeight: '600',
    color: '#DC2626',
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
  budgetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  budgetCategory: {
    fontSize: 14,
    color: '#4B5563',
  },
  budgetValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});