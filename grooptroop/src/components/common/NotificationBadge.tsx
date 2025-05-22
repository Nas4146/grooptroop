import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import tw from '../../utils/tw';

interface NotificationBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  count,
  size = 'small',
  color = '#EF4444' // red-500
}) => {
  // Skip rendering if count is 0
  if (count <= 0) return null;
  
  // Determine size dimensions
  const dimensions = {
    small: { width: 16, height: 16, fontSize: 10 },
    medium: { width: 20, height: 20, fontSize: 12 },
    large: { width: 24, height: 24, fontSize: 14 }
  }[size];
  
  // Format count (show "99+" for large numbers)
  const formattedCount = count > 99 ? '99+' : count.toString();
  
  return (
    <View
      style={[
        tw`absolute -top-1 -right-1 justify-center items-center rounded-full`,
        { backgroundColor: color },
        {
          minWidth: dimensions.width,
          height: dimensions.height,
          paddingHorizontal: formattedCount.length > 1 ? 4 : 0,
        }
      ]}
    >
      <Text 
        style={[
          tw`text-white font-bold`,
          { fontSize: dimensions.fontSize }
        ]}
      >
        {formattedCount}
      </Text>
    </View>
  );
};

export default NotificationBadge;