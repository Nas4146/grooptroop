import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from '../utils/tw';

interface ChatPerformanceOverlayProps {
  chatId: string;
  getMetrics: () => any;
}

const ChatPerformanceOverlay: React.FC<ChatPerformanceOverlayProps> = ({ 
  chatId, 
  getMetrics 
}) => {
  const [visible, setVisible] = useState(__DEV__); // Only show by default in dev mode
  const [metrics, setMetrics] = useState<any>(null);
  
  useEffect(() => {
    if (!visible) return;
    
    // Update metrics every second while visible
    const interval = setInterval(() => {
      setMetrics(getMetrics());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [visible, getMetrics]);
  
  if (!visible) {
    return (
      <TouchableOpacity 
        style={tw`absolute bottom-20 right-2 bg-gray-800 opacity-70 p-1 rounded-full`}
        onPress={() => setVisible(true)}
      >
        <Text style={tw`text-white text-xs`}>📊</Text>
      </TouchableOpacity>
    );
  }
  
  if (!metrics) {
    return null;
  }
  
  return (
    <TouchableOpacity 
      style={tw`absolute bottom-20 right-2 bg-gray-800 opacity-80 p-2 rounded-lg`}
      onPress={() => setVisible(false)}
    >
      <Text style={tw`text-white font-bold`}>Chat Metrics</Text>
      <Text style={tw`text-white text-xs`}>Sent: {metrics.messagesSent}</Text>
      <Text style={tw`text-white text-xs`}>Received: {metrics.messagesReceived}</Text>
      <Text style={tw`text-white text-xs`}>Latency: {metrics.avgNetworkLatency.toFixed(1)}ms</Text>
      <Text style={tw`text-white text-xs`}>Heap: {(metrics.jsHeapSize / (1024 * 1024)).toFixed(1)} MB</Text>
      <Text style={tw`text-white text-xs`}>Frame drops: {metrics.frameDrops}</Text>
      <Text style={tw`text-white text-xs`}>Slow renders: {metrics.slowRenders}</Text>
      <Text style={tw`text-white text-xs`}>Duration: {metrics.sessionDuration.toFixed(0)}s</Text>
    </TouchableOpacity>
  );
};

export default ChatPerformanceOverlay;