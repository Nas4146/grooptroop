import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSequence, 
  withTiming
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

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
  const scale = useSharedValue(visible ? 1 : 0.5);
  const opacity = useSharedValue(visible ? 1 : 0);
  
  // Animation when showing/hiding
  React.useEffect(() => {
    if (visible) {
      console.log('[REACTION_OVERLAY] Showing overlay');
      opacity.value = withTiming(1, { duration: 150 });
      scale.value = withSequence(
        withTiming(1.1, { duration: 150 }),
        withTiming(1, { duration: 100 })
      );
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      console.log('[REACTION_OVERLAY] Hiding overlay');
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

  // Handle reaction selection
  const handleReactionSelect = useCallback((emoji: string) => {
    console.log(`[REACTION_OVERLAY] Emoji ${emoji} selected`);
    
    // Provide haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Call the parent handler
    onReactionSelect(emoji);
    
    // Close the overlay
    onClose();
  }, [onReactionSelect, onClose]);

  // Handle reply press
  const handleReplyPress = useCallback(() => {
    console.log('[REACTION_OVERLAY] Reply selected');
    
    // Provide haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Call the parent handler
    onReplyPress();
    
    // Close the overlay
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
      {/* Backdrop */}
      <TouchableOpacity 
        style={styles.backdrop}
        onPress={() => {
          console.log('[REACTION_OVERLAY] Backdrop pressed - closing');
          onClose();
        }}
        activeOpacity={1}
      >
        {/* Overlay content */}
        <View style={styles.overlayContainer}>
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
                onPress={handleReplyPress}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-undo-outline" size={22} color="#374151" />
                <Text style={styles.replyText}>Reply</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  overlay: {
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  alignLeft: {
    alignSelf: 'flex-start',
  },
  alignRight: {
    alignSelf: 'flex-end',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    minWidth: 280,
  },
  emojisContainer: {
    flexDirection: 'row',
    padding: 8,
    justifyContent: 'space-around',
  },
  emojiButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
  },
  emoji: {
    fontSize: 24,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
  },
  replyText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  }
});

export default ReactionOverlay;