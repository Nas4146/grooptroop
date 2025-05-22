import React, { useCallback, useMemo, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform
} from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withSequence, 
  withTiming, 
  useSharedValue,
  runOnJS 
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import FastImage from 'react-native-fast-image';
import * as Haptics from 'expo-haptics';
import { ChatMessage } from '../../models/chat';
import Avatar from '../common/Avatar';
import tw from '../../utils/tw';
import { formatMessageTime } from '../../utils/dateUtils';
import ImagePreview from './ImagePreview';
import ReactionOverlay from './ReactionOverlay';
import ReactionDisplay from './ReactionDisplay';

// Use constants for animation values to avoid recreating on every render
const REACTION_ANIMATION_DURATION = 300;
const REACTION_SCALE_SMALL = 0.8;
const REACTION_SCALE_LARGE = 1.2;
const REACTION_SCALE_NORMAL = 1.0;

interface MessageBubbleProps {
  message: ChatMessage;
  isFromCurrentUser: boolean;
  onReactionPress?: (messageId: string, emoji: string) => void;
  onReplyPress?: (message: ChatMessage) => void;
  openImagePreview?: (imageUrl: string) => void;
  currentUserId: string;
}

// Emoji options for reactions
const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

const MessageBubble = React.memo(({ 
  message, 
  isFromCurrentUser, 
  onReactionPress,
  onReplyPress,
  openImagePreview,
  currentUserId
}: MessageBubbleProps) => {
  
  // Local state
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [imageLoading, setImageLoading] = useState(message.imageUrl ? true : false);
  const [isImagePreviewVisible, setIsImagePreviewVisible] = useState(false);
  const [showReactionOverlay, setShowReactionOverlay] = useState(false);
  
  // Animation values
  const reactionScale = useSharedValue(1);
  const bubbleScale = useSharedValue(1);
  
  // Calculate message time once
  const messageTime = useMemo(() => {
    const msgDate = message.createdAt instanceof Date 
      ? message.createdAt 
      : new Date((message.createdAt as any).seconds * 1000);
    return formatMessageTime(msgDate);
  }, [message.createdAt]);
  
  // Long press handler with haptic feedback
  const handleLongPress = useCallback(() => {
    // Provide haptic feedback on long press
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Animate the bubble to provide visual feedback
    bubbleScale.value = withSequence(
      withTiming(0.98, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    
    // Show reaction overlay
    setShowReactionOverlay(true);
  }, [bubbleScale]);
  
  // Handle reaction press with animation
  const handleReactionPress = useCallback((emoji: string) => {
    if (onReactionPress) {
      onReactionPress(message.id, emoji);
    }
    setShowReactionOverlay(false);
  }, [message.id, onReactionPress]);
  
  // Handle reply press
  const handleReplyPress = useCallback(() => {
    setShowReactionPicker(false);
    if (onReplyPress) {
      onReplyPress(message);
    }
  }, [message, onReplyPress]);
  
  // Message container animated style
  const animatedBubbleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: bubbleScale.value }]
    };
  });
  
  // Reaction container animated style
  const animatedReactionStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: reactionScale.value }]
    };
  });
  
  // Memoize styles to prevent recreating on each render
  const bubbleContainerStyle = useMemo(() => [
    tw`max-w-[85%] mb-1`,
    isFromCurrentUser ? tw`self-end` : tw`self-start`
  ], [isFromCurrentUser]);
  
  const bubbleStyle = useMemo(() => [
    tw`rounded-2xl px-3.5 py-2.5 mt-1`,
    isFromCurrentUser 
      ? tw`bg-violet-600 rounded-tr-none` 
      : tw`bg-gray-100 rounded-tl-none`
  ], [isFromCurrentUser]);
  
  const messageTextStyle = useMemo(() => [
    tw`text-base leading-tight`,
    isFromCurrentUser ? tw`text-white` : tw`text-gray-800`
  ], [isFromCurrentUser]);
  
  const timeTextStyle = useMemo(() => [
    tw`text-xs mt-1`,
    isFromCurrentUser ? tw`text-violet-200` : tw`text-gray-500`
  ], [isFromCurrentUser]);
  
  // Render encryption indicator
  const renderEncryptionIndicator = useCallback(() => {
    if (message.isEncrypted) {
      if (message.isDecrypted) {
        return (
          <Ionicons 
            name="lock-closed" 
            size={14} 
            color={isFromCurrentUser ? "#ffffff" : "#9ca3af"} 
            style={tw`mr-1`} 
          />
        );
      } else {
        return (
          <Ionicons 
            name="alert-circle" 
            size={14} 
            color="#F59E0B" 
            style={tw`mr-1`} 
          />
        );
      }
    } else {
      return (
        <Ionicons 
          name="lock-open" 
            size={14} 
            color={isFromCurrentUser ? "#e6e6e6" : "#9ca3af"} 
            style={tw`mr-1 opacity-50`} 
        />
      );
    }
  }, [message.isEncrypted, message.isDecrypted, isFromCurrentUser]);
  
  // Memoize reply context to avoid re-rendering
  const replyContext = useMemo(() => {
    if (!message.replyTo) return null;
    
    return (
      <View 
        style={[
          tw`border-l-2 pl-2 mb-1 max-w-[250px]`,
          isFromCurrentUser ? tw`border-violet-400` : tw`border-gray-400`
        ]}
      >
        <Text 
          style={[
            tw`text-xs font-bold`,
            isFromCurrentUser ? tw`text-violet-100` : tw`text-gray-700`
          ]}
          numberOfLines={1}
        >
          {message.replyToSenderName}
        </Text>
        <Text
          style={[
            tw`text-xs`,
            isFromCurrentUser ? tw`text-violet-100` : tw`text-gray-600`
          ]}
          numberOfLines={1}
        >
          {message.replyToText}
        </Text>
      </View>
    );
  }, [message.replyTo, message.replyToSenderName, message.replyToText, isFromCurrentUser]);
  
  // Memoize message image to avoid re-rendering
  const messageImage = useMemo(() => {
    if (!message.imageUrl) return null;
    
    return (
      <View style={tw`rounded-lg overflow-hidden mb-2 max-w-[250px]`}>
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={() => {
            // Either use the parent handler or handle it internally
            if (openImagePreview) {
              openImagePreview(message.imageUrl!);
            } else {
              setIsImagePreviewVisible(true);
            }
          }}
        >
          <FastImage
            source={{ uri: message.imageUrl }}
            style={{ width: 250, height: 150, borderRadius: 8 }}
            resizeMode={FastImage.resizeMode.cover}
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
          />
          {imageLoading && (
            <View style={[StyleSheet.absoluteFill, tw`justify-center items-center bg-gray-200 bg-opacity-20`]}>
              <ActivityIndicator size="small" color="#7C3AED" />
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  }, [message.imageUrl, imageLoading, openImagePreview]);
  
  return (
    <View style={bubbleContainerStyle}>
      <View style={tw`flex-row items-end`}>
        {/* Sender avatar for messages from others */}
        {!isFromCurrentUser && (
          <View style={tw`mr-1 mb-1`}>
            <Avatar
              avatar={message.senderAvatar}
              displayName={message.senderName}
              size={28}
            />
          </View>
        )}
        
        {/* Message bubble */}
        <Animated.View style={[animatedBubbleStyle, { position: 'relative' }]}>
          <Pressable
            onLongPress={handleLongPress}
            delayLongPress={200}
            style={({pressed}) => [
              pressed && tw`opacity-80`,
              { position: 'relative' }
            ]}
          >
            <View style={bubbleStyle}>
              {/* Reply context if replying to a message */}
              {replyContext}
              
              {/* Message image if present */}
              {messageImage}
              
              <View style={tw`flex-row items-center flex-wrap`}>
                {/* Encryption status indicator */}
                {renderEncryptionIndicator()}
                
                {/* Message text */}
                <Text style={messageTextStyle}>{message.text}</Text>
              </View>
              
              {/* Message time */}
              <View style={tw`flex-row justify-end items-center mt-0.5`}>
                <Text style={timeTextStyle}>
                  {messageTime}
                </Text>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </View>
      
      {/* Reaction display */}
      <ReactionDisplay 
        reactions={message.reactions || {}}
        currentUserId={currentUserId}
        onReactionPress={(emoji) => onReactionPress?.(message.id, emoji)}
        isFromCurrentUser={isFromCurrentUser}
      />
      
      {/* Reaction overlay */}
      <ReactionOverlay
        visible={showReactionOverlay}
        onReactionSelect={handleReactionPress}
        onClose={() => setShowReactionOverlay(false)}
        onReplyPress={() => {
          if (onReplyPress) {
            onReplyPress(message);
          }
          setShowReactionOverlay(false);
        }}
        isFromCurrentUser={isFromCurrentUser}
      />
      
      {/* Image preview modal */}
      {isImagePreviewVisible && message.imageUrl && (
        <ImagePreview
          visible={isImagePreviewVisible}
          imageUrl={message.imageUrl}
          onClose={() => setIsImagePreviewVisible(false)}
        />
      )}
    </View>
  );
});

// Don't re-render the bubble if nothing important has changed
const areMessageBubblesEqual = (prevProps: MessageBubbleProps, nextProps: MessageBubbleProps) => {
  // Always re-render if message ID changes
  if (prevProps.message.id !== nextProps.message.id) return false;
  
  // Re-render if reactions change
  if (JSON.stringify(prevProps.message.reactions) !== JSON.stringify(nextProps.message.reactions)) {
    return false;
  }
  
  // Re-render if text or image URL changes
  if (prevProps.message.text !== nextProps.message.text) return false;
  if (prevProps.message.imageUrl !== nextProps.message.imageUrl) return false;
  
  // Re-render if sender alignment changes
  if (prevProps.isFromCurrentUser !== nextProps.isFromCurrentUser) return false;
  
  // Otherwise, don't re-render
  return true;
};

MessageBubble.displayName = 'MessageBubble';

export default React.memo(MessageBubble, areMessageBubblesEqual);