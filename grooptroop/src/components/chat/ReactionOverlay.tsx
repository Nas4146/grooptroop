import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSequence, 
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import tw from '../../utils/tw';

// Commonly used emoji reactions
const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

interface ReactionOverlayProps {
  visible: boolean;
  onReactionSelect: (emoji: string) => void;
  onClose: () => void;
  onReplyPress: () => void;
  isFromCurrentUser: boolean;
}

const ReactionOverlay = ({
  visible,
  onReactionSelect,
  onClose,
  onReplyPress,
  isFromCurrentUser
}: ReactionOverlayProps) => {
  // Animation values
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);
  
  // Animation when showing
  React.useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 150 });
      scale.value = withSequence(
        withTiming(1.1, { duration: 150 }),
        withTiming(1, { duration: 100 })
      );
      
      // Optional subtle haptic feedback
      if (visible) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else {
      opacity.value = withTiming(0, { duration: 100 });
      scale.value = withTiming(0.5, { duration: 100 });
    }
  }, [visible]);
  
  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }]
    };
  });
  
  // Handle reaction selection with animation
  const handleReactionSelect = useCallback((emoji: string) => {
    // Provide haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Call the parent handler
    onReactionSelect(emoji);
    
    // Close the overlay
    onClose();
  }, [onReactionSelect, onClose]);
  
  if (!visible) return null;
  
  return (
    <Animated.View 
      style={[
        styles.overlay,
        animatedStyle,
        isFromCurrentUser ? styles.alignRight : styles.alignLeft
      ]}
    >
      <View style={styles.container}>
        {/* Emoji reactions */}
        <View style={styles.emojisContainer}>
          {REACTIONS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.emojiButton}
              onPress={() => handleReactionSelect(emoji)}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Divider */}
        <View style={styles.divider} />
        
        {/* Reply option */}
        <TouchableOpacity
          style={styles.replyButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onReplyPress();
            onClose();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-undo-outline" size={22} color="#374151" />
          <Text style={styles.replyText}>Reply</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 45,
    backgroundColor: 'transparent',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  alignLeft: {
    left: 10,
  },
  alignRight: {
    right: 10,
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
  },
  emojisContainer: {
    flexDirection: 'row',
    padding: 8,
  },
  emojiButton: {
    padding: 10,
    borderRadius: 24,
  },
  emoji: {
    fontSize: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  replyText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  }
});

export default ReactionOverlay;