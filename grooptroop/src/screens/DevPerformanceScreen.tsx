import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SimplePerformance } from '../utils/simplePerformance';
import { useComponentPerformance } from '../utils/usePerformance';
import { Ionicons } from '@expo/vector-icons'; // Make sure you have this package installed

export default function DevPerformanceScreen({ navigation }) {
  useComponentPerformance('DevPerformanceScreen');
  const [logs, setLogs] = useState<string[]>([]);
  const [traces, setTraces] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

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

      <View style={styles.section}>
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
        />
      </View>

      <View style={styles.section}>
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
        />
      </View>
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
  section: {
    flex: 1,
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