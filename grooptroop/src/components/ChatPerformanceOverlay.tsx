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
  
  return null;
};

export default ChatPerformanceOverlay;