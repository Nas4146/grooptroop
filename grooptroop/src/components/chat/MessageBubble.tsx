import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatMessage } from '../../models/chat';
import tw from '../../utils/tw';

// Common emoji reactions
const COMMON_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

interface MessageBubbleProps {
  message: ChatMessage;
  isFromCurrentUser: boolean;
  onReactionPress: (messageId: string, emoji: string) => void;
  onReplyPress: (messageId: string) => void;
}

export default function MessageBubble({ 
  message, 
  isFromCurrentUser,
  onReactionPress,
  onReplyPress
}: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);
  
  // Format timestamp
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Get reaction counts
  const getReactionCounts = () => {
    const counts: {[key: string]: number} = {};
    
    if (message.reactions) {
      Object.entries(message.reactions).forEach(([emoji, users]) => {
        if (Array.isArray(users) && users.length > 0) {
          counts[emoji] = users.length;
        }
      });
    }
    
    return counts;
  };
  
  // Check if current user has reacted with this emoji
  const hasUserReacted = (emoji: string) => {
    return message.reactions && 
           message.reactions[emoji] && 
           Array.isArray(message.reactions[emoji]) && 
           message.reactions[emoji].includes(message.senderId);
  };
  
  // Render encryption indicator based on message status
  const renderEncryptionIndicator = () => {
    if (message.isEncrypted) {
      if (message.isDecrypted) {
        return (
          <Ionicons 
            name="lock-closed" 
            size={14} 
            color={isFromCurrentUser ? "#ffffff" : "#78c0e1"} 
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
  
  const reactionCounts = getReactionCounts();
  const hasReactions = Object.keys(reactionCounts).length > 0;

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
  
  return (
    <View style={tw`mb-3 ${isFromCurrentUser ? 'items-end' : 'items-start'}`}>
      {/* Sender name */}
      {!isFromCurrentUser && (
        <Text style={tw`text-xs text-gray-500 ml-12 mb-1`}>{message.senderName}</Text>
      )}
      
      <View style={tw`flex-row items-end`}>
        {/* Avatar for other users */}
        {!isFromCurrentUser && (
          <View style={tw`w-8 h-8 rounded-full bg-gray-300 mr-2 overflow-hidden`}>
            {message.senderAvatar && message.senderAvatar.startsWith('http') ? (
              <Image source={{ uri: message.senderAvatar }} style={tw`w-full h-full`} />
            ) : (
              <View style={[
                tw`w-full h-full items-center justify-center`, 
                { backgroundColor: message.senderAvatar || '#78c0e1' }
              ]}>
                <Text style={tw`text-white font-bold`}>
                  {message.senderName?.charAt(0) || '?'}
                </Text>
              </View>
            )}
          </View>
        )}
        
        {/* Message bubble */}
        <TouchableOpacity
          style={[
            tw`max-w-[80%] rounded-2xl p-3`,
            isFromCurrentUser ? 
              tw`bg-primary rounded-tr-none` : 
              tw`bg-gray-200 rounded-tl-none`
          ]}
          onLongPress={() => setShowReactions(true)}
          delayLongPress={200}
          activeOpacity={0.9}
        >
          {/* Reply reference */}
          {message.replyTo && (
            <View style={tw`bg-black bg-opacity-5 rounded-lg p-2 mb-2 border-l-2 ${isFromCurrentUser ? 'border-white' : 'border-primary'}`}>
              <Text 
                style={tw`text-xs ${isFromCurrentUser ? 'text-gray-100' : 'text-gray-600'}`}
                numberOfLines={1}
              >
                Replying to message
              </Text>
            </View>
          )}
          
          {/* Message text */}
          <Text style={tw`${isFromCurrentUser ? 'text-white' : 'text-gray-800'}`}>
            {message.text}
          </Text>
          
          {/* Image if present */}
          {message.imageUrl && (
            <Image 
              source={{ uri: message.imageUrl }} 
              style={tw`w-full h-40 rounded-lg mt-2`}
              resizeMode="cover"
            />
          )}
          
          {/* Time and encryption indicator */}
          <View style={tw`flex-row items-center justify-end mt-1`}>
            {renderEncryptionIndicator()}
            <Text 
              style={tw`text-xs ${isFromCurrentUser ? 'text-gray-200' : 'text-gray-500'}`}
            >
              {formatTime(message.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      
      {/* Reactions display */}
      {hasReactions && (
        <View style={tw`flex-row mt-1 ${isFromCurrentUser ? 'mr-2' : 'ml-10'}`}>
          {Object.entries(reactionCounts).map(([emoji, count]) => (
            <TouchableOpacity
              key={emoji}
              style={tw`bg-white border border-gray-200 rounded-full px-2 py-0.5 mr-1 flex-row items-center shadow-sm`}
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
          tw`flex-row bg-white rounded-full p-1 shadow-md border border-gray-100 mt-2`,
          isFromCurrentUser ? tw`mr-2` : tw`ml-10`
        ]}>
          {COMMON_REACTIONS.map(emoji => (
            <TouchableOpacity
              key={emoji}
              style={tw`p-1.5 ${hasUserReacted(emoji) ? 'bg-gray-100 rounded-full' : ''}`}
              onPress={() => {
                onReactionPress(message.id, emoji);
                setShowReactions(false);
              }}
            >
              <Text style={tw`text-lg`}>{emoji}</Text>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={tw`p-1.5`}
            onPress={() => {
              setShowReactions(false);
              onReplyPress(message.id);
            }}
          >
            <Ionicons name="return-down-back" size={18} color="#374151" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={tw`p-1.5`}
            onPress={() => setShowReactions(false)}
          >
            <Ionicons name="close" size={18} color="#374151" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}