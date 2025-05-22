import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatMetrics } from '../../utils/chatPerformanceMonitor';
import tw from '../../utils/tw';

interface ChatPerformanceOverlayProps {
  chatId: string;
  getMetrics: () => ChatMetrics;
  onClose: () => void;
}

const ChatPerformanceOverlay: React.FC<ChatPerformanceOverlayProps> = ({
  chatId,
  getMetrics,
  onClose
}) => {
  const [metrics, setMetrics] = useState<ChatMetrics | null>(null);
  const [expanded, setExpanded] = useState(false);
  
  useEffect(() => {
    // Update metrics every second
    const interval = setInterval(() => {
      try {
        setMetrics(getMetrics());
      } catch (e) {
        console.error('Error getting performance metrics:', e);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [getMetrics]);
  
  if (!metrics) {
    return null;
  }
  
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };
  
  return (
    <View style={styles.overlay}>
      <View style={styles.header}>
        <Text style={styles.title}>Chat Performance</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            onPress={() => setExpanded(!expanded)} 
            style={styles.expandButton}
          >
            <Ionicons 
              name={expanded ? "chevron-up-outline" : "chevron-down-outline"} 
              size={16} 
              color="#CBD5E1" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close-outline" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Basic metrics always visible */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Messages</Text>
          <Text style={styles.metricValue}>
            {metrics.messagesSent + metrics.messagesReceived}
          </Text>
        </View>
        
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Latency</Text>
          <Text style={[
            styles.metricValue,
            metrics.avgNetworkLatency > 1000 ? styles.badMetric :
            metrics.avgNetworkLatency > 500 ? styles.warningMetric :
            styles.goodMetric
          ]}>
            {metrics.avgNetworkLatency.toFixed(0)}ms
          </Text>
        </View>
        
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>FPS</Text>
          <Text style={[
            styles.metricValue,
            metrics.frameDrops > 10 ? styles.badMetric :
            metrics.frameDrops > 5 ? styles.warningMetric :
            styles.goodMetric
          ]}>
            {(60 - metrics.frameDrops).toFixed(0)}
          </Text>
        </View>
        
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Memory</Text>
          <Text style={styles.metricValue}>
            {formatBytes(metrics.jsHeapSize)}
          </Text>
        </View>
      </View>
      
      {/* Expanded details */}
      {expanded && (
        <ScrollView style={styles.expandedSection}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Session Info</Text>
            <Text style={styles.detailText}>
              ID: {metrics.chatId}
            </Text>
            <Text style={styles.detailText}>
              Duration: {formatDuration(metrics.sessionDuration)}
            </Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Message Stats</Text>
            <Text style={styles.detailText}>
              Sent: {metrics.messagesSent}, Received: {metrics.messagesReceived}
            </Text>
            <Text style={styles.detailText}>
              Failed: {metrics.messagesFailed}, Avg Size: {formatBytes(metrics.avgMessageSize)}
            </Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance</Text>
            <Text style={styles.detailText}>
              Slow Renders: {metrics.slowRenders}
            </Text>
            <Text style={styles.detailText}>
              Max Render: {metrics.maxRenderTime.toFixed(1)}ms
            </Text>
            <Text style={styles.detailText}>
              Avg Render: {metrics.avgRenderTime.toFixed(1)}ms
            </Text>
            <Text style={styles.detailText}>
              Max Latency: {metrics.maxNetworkLatency.toFixed(0)}ms
            </Text>
          </View>
          
          {/* Recent message activity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {metrics.messageHistory.slice(-5).reverse().map((msg, idx) => (
              <Text key={idx} style={styles.messageText}>
                {msg.type === 'sent' ? '↑' : '↓'} {msg.id.substring(0, 8)}... 
                ({formatBytes(msg.size)})
                {msg.latency ? ` - ${msg.latency}ms` : ''}
              </Text>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    right: 8,
    bottom: 90,
    width: 320,
    maxHeight: 400,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 8,
    padding: 8,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(203, 213, 225, 0.3)',
  },
  title: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  expandButton: {
    padding: 4,
    marginRight: 8,
  },
  closeButton: {
    padding: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 10,
  },
  metricValue: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  goodMetric: {
    color: '#4ADE80',
  },
  warningMetric: {
    color: '#FACC15',
  },
  badMetric: {
    color: '#F87171',
  },
  expandedSection: {
    maxHeight: 300,
  },
  section: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(203, 213, 225, 0.2)',
  },
  sectionTitle: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailText: {
    color: '#CBD5E1',
    fontSize: 11,
    marginBottom: 2,
  },
  messageText: {
    color: '#CBD5E1',
    fontSize: 10,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
});

export default ChatPerformanceOverlay;