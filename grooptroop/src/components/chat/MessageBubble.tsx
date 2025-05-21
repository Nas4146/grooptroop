import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatMessage } from '../../models/chat';
import tw from '../../utils/tw';
import Avatar from '../common/Avatar';
import * as Haptics from 'expo-haptics';

// Common emoji reactions
const COMMON_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

type Reactions = {
  [emoji: string]: string[];
};

interface MessageBubbleProps {
  message: ChatMessage;
  isFromCurrentUser: boolean;
  onReactionPress: (messageId: string, emoji: string) => void;
  onReplyPress: (messageId: string) => void;
}

// First, define the MessageBubble function component as normal
function MessageBubble({ 
  message, 
  isFromCurrentUser,
  onReactionPress,
  onReplyPress
}: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);
  // Local state to track pending reactions
  const [pendingReactions, setPendingReactions] = useState<string[]>([]);
  
  // Memoize expensive operations
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

  // Check if there are any reactions
  const hasReactions = useMemo(() => {
    return Object.keys(reactionCounts).length > 0;
  }, [reactionCounts]);

  // Handle when user selects a reaction - this is the key fix
  const handleReactionSelect = useCallback((emoji: string) => {
    // Close reaction panel
    setShowReactions(false);
    
    // Add to pending reactions for immediate feedback
    setPendingReactions(prev => [...prev, emoji]);
    
    // Call the actual reaction handler
    onReactionPress(message.id, emoji);
    
    // Remove from pending after a short delay
    setTimeout(() => {
      setPendingReactions(prev => prev.filter(e => e !== emoji));
    }, 2000);
  }, [message.id, onReactionPress]);
  
  // Memoize the hasReactions calculation
  const hasReactionsMemo = useMemo(() => {
    return Object.keys(reactionCounts).length > 0;
  }, [reactionCounts]);

  // Optimize other expensive calculations
  const formatTime = useCallback((timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);
  
  // Modify this console.log (around line 79)
  if (__DEV__ && false) {
    console.log(`[MESSAGE] Avatar details:`, {
      exists: !!message.senderAvatar,
      type: message.senderAvatar?.type,
      valuePreview: message.senderAvatar?.value ? 
        (typeof message.senderAvatar.value === 'string' ? 
          message.senderAvatar.value.substring(0, 30) + '...' : 
          'non-string value') : 
        'no value',
      isFromCurrentUser
    });
  }

  // Check if current user has reacted with this emoji
  const hasUserReacted = useCallback((emoji: string) => {
    return message.reactions && 
           message.reactions[emoji] && 
           Array.isArray(message.reactions[emoji]) && 
           message.reactions[emoji].includes(message.senderId);
  }, [message.reactions, message.senderId]);
  
  // Render encryption indicator based on message status
  const renderEncryptionIndicator = () => {
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
  };
  
  // Special handling for encrypted messages that couldn't be decrypted
  if (message.isEncrypted && message.text === "[Cannot decrypt - missing key]") {
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
  
  // Modify this console.log (around line 147)
  if (__DEV__ && false) {
    console.log(`[MESSAGE] Rendering message from ${message.senderName}, avatar:`, 
      message.senderAvatar ? `${message.senderAvatar.type} avatar` : 'no avatar');
  }
    
  // For debugging reactions
  useEffect(() => {
    if (__DEV__) {
      console.log(`[CHAT_REACTIONS] Message ${message.id.slice(0, 6)}: `, 
        message.reactions ? 
          `Has ${Object.keys(message.reactions).length} reaction types` :
          'No reactions'
      );
    }
  }, [message.id, message.reactions]);
  
  // Add this function to handle reaction taps with local feedback
  const handleReactionPress = (emoji: string) => {
    // Add to pending reactions for immediate visual feedback
    setPendingReactions(prev => [...prev, emoji]);
    
    // Call the actual handler
    onReactionPress(message.id, emoji);
    
    // Remove from pending after a timeout (optimize UX)
    setTimeout(() => {
      setPendingReactions(prev => prev.filter(e => e !== emoji));
    }, 2000);
  };

  // Update the avatar rendering in MessageBubble
  const renderAvatar = useCallback(() => {
    // If there's no sender name, provide a fallback
    const senderName = message.senderName || 'User';
    
    // Log the render operation - only in dev mode
    if (__DEV__ && false) {
      console.log(`[MESSAGE] Rendering avatar for ${senderName} type: ${message.senderAvatar?.type || 'undefined'}`);
    }
    
    // Create a visible container with proper dimensions and position
    return (
      <View 
        style={tw`absolute ${isFromCurrentUser ? 'right-0 mr-1' : 'left-0 ml-1'} bottom-0`}
      >
        <View style={[
          tw`rounded-full overflow-hidden`,
          { 
            backgroundColor: 'white'
          }
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

  return (
    <View style={tw`mb-3 ${isFromCurrentUser ? 'items-end' : 'items-start'}`}>
      {/* Sender name for messages from others */}
      {!isFromCurrentUser && (
        <Text style={tw`text-xs text-gray-500 ml-12 mb-0.5`}>{message.senderName}</Text>
      )}
      
      <View style={tw`flex-row items-end`}>
        {/* Avatar for other users' messages only */}
        {!isFromCurrentUser && renderAvatar()}
        
        {/* Message bubble with proper margin for avatar - ADD LONG PRESS HERE */}
        <TouchableOpacity
          style={[
            tw`rounded-2xl p-3 ${isFromCurrentUser ? 'bg-primary rounded-tr-none' : 'bg-gray-200 rounded-tl-none ml-10'}`,
            { maxWidth: '80%' }
          ]}
          onLongPress={() => {
            // Add haptic feedback
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            // Show reaction selector
            setShowReactions(true);
          }}
          delayLongPress={200} // Make it respond more quickly
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
            <Image 
              source={{ uri: message.imageUrl }} 
              style={tw`w-full h-40 mt-2 rounded-lg`}
              resizeMode="cover"
            />
          )}
          
          {/* Timestamp */}
          <Text style={tw`text-xs ${isFromCurrentUser ? 'text-white opacity-70' : 'text-gray-500'} mt-1 text-right`}>
            {formatTime(message.createdAt)}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Reactions display */}
      {hasReactions && (
        <View style={tw`flex-row mt-1 ${isFromCurrentUser ? 'mr-2' : 'ml-10'}`}>
          {Object.entries(reactionCounts).map(([emoji, count]) => (
            <TouchableOpacity
              key={emoji}
              style={tw`bg-white border border-gray-200 rounded-full px-2 py-0.5 mr-1 flex-row items-center`}
              onPress={() => onReactionPress(message.id, emoji)}
            >
              <Text style={tw`mr-1`}>{emoji}</Text>
              <Text style={tw`text-xs text-gray-600`}>{count}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      {/* Reaction selector */}
      {showReactions && (
        <View style={[
          tw`flex-row bg-white rounded-full p-1 border border-gray-100 mt-2`,
          isFromCurrentUser ? tw`mr-2` : tw`ml-10`
        ]}>
          {/* Emoji reactions */}
          <View style={tw`flex-row`}>
            {COMMON_REACTIONS.map(emoji => (
              <TouchableOpacity
                key={emoji}
                style={tw`p-1.5 ${hasUserReacted(emoji) ? 'bg-gray-100 rounded-full' : ''}`}
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
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowReactions(false);
                // Pass the entire message object instead of just the ID
                onReplyPress(message);
              }}
            >
              <Ionicons name="return-down-back" size={18} color="#7C3AED" />
            </TouchableOpacity>
            
            {/* Close button */}
            <TouchableOpacity
              style={tw`p-1.5 ml-1`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowReactions(false);
              }}
            >
              <Ionicons name="close" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// Then export a memoized version with custom comparison function
export default memo(MessageBubble, (p, n) => {
  return (
    p.message.id === n.message.id &&
    p.message.text === n.message.text &&
    shallowEqualReactions(p.message.reactions, n.message.reactions) &&
    p.isFromCurrentUser === n.isFromCurrentUser
  );
});

// Add the helper function for shallow comparison of reactions
const shallowEqualReactions = (a?: Reactions, b?: Reactions) => {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;
  return keysA.every(k => a[k]?.length === b[k]?.length);
};