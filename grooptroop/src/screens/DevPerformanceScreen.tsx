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
});