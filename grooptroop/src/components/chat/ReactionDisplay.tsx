import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import tw from '../../utils/tw';

interface ReactionDisplayProps {
  reactions: Record<string, string[]>;
  currentUserId: string;
  onReactionPress?: (emoji: string) => void;
  isFromCurrentUser: boolean;
  maxDisplayCount?: number;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const ReactionDisplay = ({ 
  reactions, 
  currentUserId,
  onReactionPress,
  isFromCurrentUser,
  maxDisplayCount = 3
}: ReactionDisplayProps) => {
  // Convert reactions object to array for easier processing
  const reactionItems = useMemo(() => {
    return Object.entries(reactions)
      .map(([emoji, users]) => ({
        emoji,
        count: users.length,
        hasReacted: users.includes(currentUserId)
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => {
        // Sort by user reaction first, then by count
        if (a.hasReacted && !b.hasReacted) return -1;
        if (!a.hasReacted && b.hasReacted) return 1;
        return b.count - a.count;
      });
  }, [reactions, currentUserId]);
  
  // Skip rendering if no reactions
  if (reactionItems.length === 0) return null;
  
  return (
    <View style={[
      styles.container,
      isFromCurrentUser ? styles.alignRight : styles.alignLeft
    ]}>
      {reactionItems.slice(0, maxDisplayCount).map(({ emoji, count, hasReacted }) => (
        <ReactionBubble 
          key={emoji} 
          emoji={emoji} 
          count={count} 
          hasReacted={hasReacted}
          onPress={() => onReactionPress?.(emoji)}
        />
      ))}
      
      {reactionItems.length > maxDisplayCount && (
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => console.log('Show all reactions')}
        >
          <Text style={styles.moreText}>+{reactionItems.length - maxDisplayCount}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Individual reaction bubble component
const ReactionBubble = ({ 
  emoji, 
  count, 
  hasReacted,
  onPress 
}: { 
  emoji: string, 
  count: number, 
  hasReacted: boolean,
  onPress: () => void 
}) => {
  const scale = useSharedValue(1);
  
  // Create animated style for scale
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }]
    };
  });
  
  // Handle press with animation
  const handlePress = () => {
    scale.value = withSpring(0.8, { damping: 20, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    });
    
    onPress();
  };
  
  return (
    <AnimatedTouchableOpacity
      style={[
        styles.bubble,
        hasReacted ? styles.hasReacted : styles.hasNotReacted,
        animatedStyle
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.count}>{count}</Text>
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginHorizontal: 2,
  },
  alignLeft: {
    justifyContent: 'flex-start',
  },
  alignRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  hasReacted: {
    backgroundColor: '#EDE9FE', // Light violet background
    borderWidth: 1,
    borderColor: '#DDD6FE', // Violet border
  },
  hasNotReacted: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emoji: {
    fontSize: 14,
    marginRight: 4,
  },
  count: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  moreText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  }
});

export default ReactionDisplay;