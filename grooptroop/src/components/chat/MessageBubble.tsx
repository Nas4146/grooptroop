import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import FastImage from 'react-native-fast-image';
import { Ionicons } from '@expo/vector-icons';
import { ChatMessage } from '../../models/chat';
import tw from '../../utils/tw';
import Avatar from '../common/Avatar';
import * as Haptics from 'expo-haptics';
import logger from '../../utils/logger';

// Common emoji reactions
const COMMON_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

interface MessageBubbleProps {
  message: ChatMessage;
  isFromCurrentUser: boolean;
  onReactionPress: (messageId: string, emoji: string) => void;
  onReplyPress: (message: ChatMessage) => void;
}

function MessageBubble({ 
  message, 
  isFromCurrentUser,
  onReactionPress,
  onReplyPress
}: MessageBubbleProps) {
  // All useState hooks first
  const [showReactions, setShowReactions] = useState(false);
  const [feedbackKey, setFeedbackKey] = useState(0);
  const [recentReactionEmoji, setRecentReactionEmoji] = useState<string | null>(null);
  
  // All useRef hooks next
  const reactionAnimRef = useRef(new Animated.Value(0)).current;
  
  // All useMemo hooks - these should be consistent on every render
  const reactionCounts = useMemo(() => {
    const counts: {[key: string]: number} = {};
    
    if (message.reactions) {
      Object.entries(message.reactions).forEach(([emoji, users]) => {
        if (Array.isArray(users) && users.length > 0) {
          counts[emoji] = users.length;
        }
      });
    }
    
    return counts;
  }, [message.reactions]);

  const hasReactions = useMemo(() => {
    return Object.keys(reactionCounts).length > 0;
  }, [reactionCounts]);

  const reactionCountsContainerStyle = useMemo(() => {
    return tw`flex-row mt-1 ${isFromCurrentUser ? 'mr-2' : 'ml-10'}`;
  }, [isFromCurrentUser]);
  
  const reactionSelectorStyle = useMemo(() => {
    return [
      tw`flex-row bg-white rounded-full p-1 border border-gray-100 mt-2`,
      isFromCurrentUser ? tw`mr-2` : tw`ml-10`
    ];
  }, [isFromCurrentUser]);
  
  const staticAnimationStyle = useMemo(() => ({
    position: 'absolute' as const,
    right: isFromCurrentUser ? 0 : 'auto',
    left: isFromCurrentUser ? 'auto' : 40,
    top: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 20,
    padding: 8,
  }), [isFromCurrentUser]);

  const animatedStyle = useMemo(() => ({
    transform: [
      { 
        scale: reactionAnimRef.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.5, 1.2, 1]
        })
      },
      { 
        translateY: reactionAnimRef.interpolate({
          inputRange: [0, 1],
          outputRange: [10, -20]
        })
      }
    ],
    opacity: reactionAnimRef
  }), [reactionAnimRef]);

  const messageBubbleStyle = useMemo(() => {
    return [
      tw`rounded-2xl p-3 ${isFromCurrentUser ? 'bg-primary rounded-tr-none' : 'bg-gray-200 rounded-tl-none ml-10'}`,
      { maxWidth: '80%' }
    ];
  }, [isFromCurrentUser]);
  
  const reactionButtonStyles = useMemo(() => {
    const styles: Record<string, any> = {};
    COMMON_REACTIONS.forEach(emoji => {
      const isReacted = message.reactions && 
                        message.reactions[emoji] && 
                        Array.isArray(message.reactions[emoji]) && 
                        message.reactions[emoji].includes(message.senderId);
      styles[emoji] = tw`p-1.5 ${isReacted ? 'bg-gray-100 rounded-full' : ''}`;
    });
    return styles;
  }, [message.reactions, message.senderId]);
  
  // All useCallback hooks
  const hasUserReacted = useCallback((emoji: string) => {
    return message.reactions && 
           message.reactions[emoji] && 
           Array.isArray(message.reactions[emoji]) && 
           message.reactions[emoji].includes(message.senderId);
  }, [message.reactions, message.senderId]);
  
  const flashReaction = useCallback((emoji: string) => {
    setRecentReactionEmoji(emoji);
    setFeedbackKey(k => k + 1);
    reactionAnimRef.setValue(0);
    
    Animated.sequence([
      Animated.timing(reactionAnimRef, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(400),
      Animated.timing(reactionAnimRef, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  }, [reactionAnimRef]);
  
  const handleReactionPress = useCallback((emoji: string) => {
    setShowReactions(false);
    onReactionPress(message.id, emoji);
    flashReaction(emoji);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [message.id, onReactionPress, flashReaction]);
  
  const formatTime = useCallback((timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);
  
  const ReactionCountButton = useCallback(({emoji, count}: {emoji: string, count: number}) => (
    <TouchableOpacity
      key={emoji}
      style={tw`bg-white border border-gray-200 rounded-full px-2 py-0.5 mr-1 flex-row items-center`}
      onPress={() => onReactionPress(message.id, emoji)}
    >
      <Text style={tw`mr-1`}>{emoji}</Text>
      <Text style={tw`text-xs text-gray-600`}>{count}</Text>
    </TouchableOpacity>
  ), [message.id, onReactionPress]);

  const renderAvatar = useCallback(() => {
    const senderName = message.senderName || 'User';
    
    logger.avatar(`Rendering avatar for ${senderName} type: ${message.senderAvatar?.type || 'undefined'}`);
    
    return (
      <View 
        style={tw`absolute ${isFromCurrentUser ? 'right-0 mr-1' : 'left-0 ml-1'} bottom-0`}
      >
        <View style={[
          tw`rounded-full overflow-hidden`,
          { backgroundColor: 'white' }
        ]}>
          <View style={{width: 32, height: 32, borderRadius: 16, overflow: 'hidden'}}>
            <Avatar 
              displayName={senderName}
              size={32}
              avatar={message.senderAvatar}
            />
          </View>
        </View>
      </View>
    );
  }, [message.senderAvatar, message.senderName, isFromCurrentUser]);
  
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
  
  const renderReactionFeedback = useCallback(() => {
    if (!recentReactionEmoji) return null;
    
    return (
      <Animated.View 
        key={feedbackKey}
        style={[staticAnimationStyle, animatedStyle]}
      >
        <Text style={{ fontSize: 24 }}>{recentReactionEmoji}</Text>
      </Animated.View>
    );
  }, [recentReactionEmoji, feedbackKey, staticAnimationStyle, animatedStyle]);
  
  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowReactions(true);
  }, []);
  
  const handleCloseReactions = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowReactions(false);
  }, []);
  
  const handleReplyButtonPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowReactions(false);
    onReplyPress(message);
  }, [message, onReplyPress]);

  // Special handling for encrypted messages that couldn't be decrypted
  if (message.isEncrypted && 
      (!message.isDecrypted || 
       message.text === "[Encrypted]" || 
       message.text === "[Decrypting...]" ||
       message.text === "[Cannot decrypt - missing key]")) {
    return (
      <View style={tw`bg-amber-100 p-3 rounded-lg mb-3 ${isFromCurrentUser ? 'self-end' : 'self-start'} max-w-[80%]`}>
        <View style={tw`flex-row items-center`}>
          <Ionicons name="key-outline" size={16} color="#B45309" style={tw`mr-2`} />
          <Text style={tw`text-amber-800 font-medium`}>
            Waiting for encryption key...
          </Text>
        </View>
        <Text style={tw`text-xs text-amber-700 mt-1`}>
          This message will be decrypted when keys are exchanged.
        </Text>
      </View>
    );
  }
  
  return (
    <View style={tw`mb-3 ${isFromCurrentUser ? 'items-end' : 'items-start'}`}>
      {/* Sender name for messages from others */}
      {!isFromCurrentUser && (
        <Text style={tw`text-xs text-gray-500 ml-12 mb-0.5`}>{message.senderName}</Text>
      )}
      
      <View style={tw`flex-row items-end`}>
        {/* Avatar for other users' messages only */}
        {!isFromCurrentUser && renderAvatar()}
        
        {/* Message bubble with proper margin for avatar */}
        <TouchableOpacity
          style={messageBubbleStyle}
          onLongPress={handleLongPress}
          delayLongPress={200}
        >
          {/* Reply content if exists */}
          {message.replyTo && message.replyToText && (
            <View style={tw`bg-gray-100 p-2 rounded-lg mb-2 opacity-80`}>
              <Text style={tw`text-xs text-gray-500`}>
                Replying to <Text style={tw`font-medium`}>{message.replyToName || 'User'}</Text>
              </Text>
              <Text style={tw`text-sm text-gray-700`} numberOfLines={1}>
                {message.replyToText}
              </Text>
            </View>
          )}
          
          {/* Message text */}
          <View style={tw`flex-row items-center mb-1`}>
            {renderEncryptionIndicator()}
            <Text style={tw`${isFromCurrentUser ? 'text-white' : 'text-gray-800'} flex-1`}>
              {message.text}
            </Text>
          </View>
          
          {/* Image if exists */}
          {message.imageUrl && (
            <View style={tw`mt-1 mb-1 overflow-hidden rounded-lg`}>
              <FastImage
                source={{ uri: message.imageUrl }}
                style={tw`w-full h-48 rounded-lg`}
                resizeMode={FastImage.resizeMode.cover}
                priority={FastImage.priority.low}
                cacheControl={FastImage.cacheControl.immutable}
              />
            </View>
          )}
          
          {/* Timestamp */}
          <Text style={tw`text-xs ${isFromCurrentUser ? 'text-white opacity-70' : 'text-gray-500'} mt-1 text-right`}>
            {formatTime(message.createdAt)}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Reactions display */}
      {hasReactions && (
        <View style={reactionCountsContainerStyle}>
          {Object.entries(reactionCounts).map(([emoji, count]) => (
            <ReactionCountButton 
              key={emoji} 
              emoji={emoji} 
              count={count} 
            />
          ))}
        </View>
      )}
      
      {/* Reaction selector */}
      {showReactions && (
        <View style={reactionSelectorStyle}>
          {/* Emoji reactions */}
          <View style={tw`flex-row`}>
            {COMMON_REACTIONS.map(emoji => (
              <TouchableOpacity
                key={emoji}
                style={reactionButtonStyles[emoji]}
                onPress={() => handleReactionPress(emoji)}
              >
                <Text style={tw`text-lg`}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Vertical separator */}
          <View style={tw`w-px h-6 bg-gray-200 mx-1 my-auto`} />
          
          {/* Action buttons with better centering */}
          <View style={tw`flex-row items-center`}>
            {/* Reply button */}
            <TouchableOpacity
              style={tw`p-1.5 rounded-full bg-primary bg-opacity-10`}
              onPress={handleReplyButtonPress}
            >
              <Ionicons name="return-down-back" size={18} color="#7C3AED" />
            </TouchableOpacity>
            
            {/* Close button */}
            <TouchableOpacity
              style={tw`p-1.5 ml-1`}
              onPress={handleCloseReactions}
            >
              <Ionicons name="close" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Add the reaction feedback animation */}
      {renderReactionFeedback()}
    </View>
  );
}

// Export a memoized version with custom comparison function
export default React.memo(MessageBubble, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.text === nextProps.message.text &&
    JSON.stringify(prevProps.message.reactions) === JSON.stringify(nextProps.message.reactions) &&
    prevProps.isFromCurrentUser === nextProps.isFromCurrentUser
  );
});