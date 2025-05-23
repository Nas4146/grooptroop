import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSequence, 
  withTiming,
  withSpring
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

// More common/popular emojis that people actually use
const REACTIONS = ['😂', '❤️', '👍', '😮', '😢', '🔥'];

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
  const scale = useSharedValue(visible ? 1 : 0.3);
  const opacity = useSharedValue(visible ? 1 : 0);
  
  // Animation when showing/hiding
  React.useEffect(() => {
    if (visible) {
      console.log('[REACTION_OVERLAY] Showing overlay');
      
      // Smooth entrance animation
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { 
        damping: 15, 
        stiffness: 200,
        mass: 0.8
      });
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      console.log('[REACTION_OVERLAY] Hiding overlay');
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.3, { duration: 150 });
    }
  }, [visible]);

  // Animated styles
  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }]
    };
  });

  // Handle reaction selection
  const handleReactionSelect = useCallback((emoji: string) => {
    console.log(`[REACTION_OVERLAY] ${emoji} selected`);
    
    // Strong haptic feedback for reaction
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Small delay for visual feedback, then execute
    setTimeout(() => {
      onReactionSelect(emoji);
      onClose();
    }, 100);
  }, [onReactionSelect, onClose]);

  // Handle reply press
  const handleReplyPress = useCallback(() => {
    console.log('[REACTION_OVERLAY] Reply selected');
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onReplyPress();
    onClose();
  }, [onReplyPress, onClose]);
  
  if (!visible) return null;
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Backdrop with proper touch handling */}
      <TouchableOpacity 
        style={styles.backdrop}
        onPress={() => {
          console.log('[REACTION_OVERLAY] Backdrop pressed - closing');
          onClose();
        }}
        activeOpacity={1}
      >
        {/* Main overlay container - FIXED: Shifted right and reduced padding */}
        <View style={[
          styles.overlayContainer,
          isFromCurrentUser ? styles.overlayRight : styles.overlayLeft
        ]}>
          <TouchableOpacity activeOpacity={1}>
            <Animated.View style={[styles.overlay, containerStyle]}>
              {/* Compact glass container */}
              <View style={styles.glassContainer}>
                <View style={styles.innerContainer}>
                  
                  {/* Emoji reactions grid - REMOVED header */}
                  <View style={styles.emojisContainer}>
                    {REACTIONS.map((emoji, index) => (
                      <TouchableOpacity
                        key={emoji}
                        style={styles.emojiButton}
                        onPress={() => handleReactionSelect(emoji)}
                        activeOpacity={0.6}
                      >
                        <View style={[styles.emojiGlow, { backgroundColor: getEmojiBackgroundColor(index) }]}>
                          <Text style={styles.emoji}>{emoji}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  {/* Compact divider */}
                  <View style={styles.divider} />
                  
                  {/* Reply button - REMOVED icon */}
                  <TouchableOpacity
                    style={styles.replyButton}
                    onPress={handleReplyPress}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.replyText}>Reply</Text>
                  </TouchableOpacity>
                  
                </View>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// Helper function for emoji background colors
const getEmojiBackgroundColor = (index: number): string => {
  const colors = [
    'rgba(252, 211, 77, 0.1)',  // Yellow for 😂
    'rgba(239, 68, 68, 0.1)',   // Red for ❤️
    'rgba(34, 197, 94, 0.1)',   // Green for 👍
    'rgba(59, 130, 246, 0.1)',  // Blue for 😮
    'rgba(107, 114, 128, 0.1)', // Gray for 😢
    'rgba(251, 146, 60, 0.1)'   // Orange for 🔥
  ];
  return colors[index % colors.length];
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContainer: {
    position: 'absolute',
    bottom: 80, // Position above the message input
  },
  overlayLeft: {
    left: 60, // Shifted right from the left edge
  },
  overlayRight: {
    right: 20, // Keep some margin from right edge
  },
  overlay: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  glassContainer: {
    borderRadius: 20, // Slightly smaller radius
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    minWidth: 260, // Reduced width
    maxWidth: 280,
    // Glass effect shadow
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  innerContainer: {
    padding: 12, // Reduced padding
  },
  emojisContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4, // Reduced vertical padding
    marginBottom: 0, // Removed bottom margin
  },
  emojiButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38, // Slightly smaller
    height: 38,
  },
  emojiGlow: {
    width: 34, // Slightly smaller
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emoji: {
    fontSize: 18, // Slightly smaller emoji
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(156, 163, 175, 0.2)',
    marginVertical: 8, // Reduced margin
    marginHorizontal: 8,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10, // Reduced padding
    paddingHorizontal: 16,
    borderRadius: 14, // Smaller radius
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  replyText: {
    fontSize: 15,
    color: '#6366F1',
    fontWeight: '600',
    letterSpacing: 0.3,
  }
});

export default ReactionOverlay;