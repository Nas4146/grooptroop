import React, { useState } from 'react';
import { View, Text, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 
import { ChatMessage } from '../../models/chat';
import tw from '../../utils/tw';
import Animated, { 
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  runOnJS
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

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
  const swipeOffset = useSharedValue(0);
  const emojiScale = useSharedValue(1);

  // Function to handle reaction animation
  const animateReaction = (emoji: string) => {
    emojiScale.value = withSequence(
      withSpring(1.5, { damping: 2 }),
      withSpring(1, { damping: 2 })
    );
    
    // Actually add the reaction
    onReactionPress(message.id, emoji);
  };

  // Configure swipe gesture for reply
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      // Only allow swiping right for reply (or left for your own messages)
      const direction = isFromCurrentUser ? -1 : 1;
      if ((e.translationX * direction) > 0) {
        swipeOffset.value = e.translationX;
      }
    })
    .onEnd(() => {
      if (Math.abs(swipeOffset.value) > 50) {
        // Trigger reply action if swiped far enough
        runOnJS(onReplyPress)(message.id);
      }
      swipeOffset.value = withSpring(0);
    });

  // Animated style for swipe
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: swipeOffset.value }]
    };
  });
  
  // Animated style for emoji reaction
  const emojiAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: emojiScale.value }]
    };
  });
  
  // Calculate total reactions
  const reactionCount = message.reactions ? 
    Object.values(message.reactions).reduce((total, users) => total + users.length, 0) : 0;
  
  // Format timestamp
  const formattedTime = message.createdAt ? 
    new Date(message.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
    '';
  
  return (
    <View style={tw`mb-3 ${isFromCurrentUser ? 'items-end' : 'items-start'} w-full`}>
      {/* Reply indicator if applicable */}
      {message.replyTo && (
        <View style={tw`${isFromCurrentUser ? 'self-end mr-3' : 'self-start ml-10'} -mb-2 mt-1 px-3 py-1 bg-gray-200/80 rounded-t-xl z-10`}>
          <Text style={tw`text-xs text-gray-500`}>Replying to...</Text>
        </View>
      )}
      
      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[animatedStyle, tw`max-w-[80%] flex-row items-end`]}>
          {/* Avatar for others' messages */}
          {!isFromCurrentUser && (
            <View style={tw`h-8 w-8 rounded-full overflow-hidden mr-1.5`}>
              <View 
                style={[
                  tw`w-full h-full items-center justify-center`,
                  { backgroundColor: message.senderAvatar || '#7C3AED' }
                ]}
              >
                <Text style={tw`text-white font-bold`}>
                  {message.senderName?.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
          )}
          
          {/* Message bubble - Use your app's primary and light colors */}
          <Pressable 
            style={tw`${
              isFromCurrentUser 
                ? 'bg-primary rounded-t-3xl rounded-l-3xl' 
                : 'bg-gray-200 rounded-t-3xl rounded-r-3xl'
            } px-4 py-2.5 mb-1`}
            onLongPress={() => setShowReactions(true)}
          >
            {/* Sender name for others' messages */}
            {!isFromCurrentUser && (
              <Text style={tw`text-xs font-semibold text-primary mb-1`}>
                {message.senderName}
              </Text>
            )}
            
            {/* Message content */}
            <Text style={tw`${isFromCurrentUser ? 'text-white' : 'text-neutral'} text-base`}>
              {message.text}
            </Text>
            
            {/* Message time */}
            <Text style={tw`text-xs ${isFromCurrentUser ? 'text-white/70' : 'text-gray-500'} self-end mt-1`}>
              {formattedTime}
            </Text>
          </Pressable>
        </Animated.View>
      </GestureDetector>
      
      {/* Reactions summary - styled similar to itinerary cards */}
      {reactionCount > 0 && (
        <Animated.View 
          style={[
            emojiAnimatedStyle,
            tw`${isFromCurrentUser ? 'mr-3' : 'ml-10'} -mt-1 bg-white rounded-full px-2 py-1 shadow-sm border border-gray-100 flex-row`
          ]}
        >
          {Object.entries(message.reactions || {}).map(([emoji, users]) => (
            users.length > 0 && (
              <Text key={emoji} style={tw`mr-1`}>
                {`${emoji} ${users.length}`}
              </Text>
            )
          ))}
        </Animated.View>
      )}
      
      {/* Reactions picker - styled with your app's primary and secondary colors */}
      {showReactions && (
        <View style={tw`${isFromCurrentUser ? 'self-end mr-2' : 'self-start ml-10'} mt-2 bg-white rounded-full flex-row px-2 py-2 shadow-md border border-gray-100`}>
          {['😂', '❤️', '👍', '😮', '😢'].map(emoji => (
            <TouchableOpacity
              key={emoji}
              style={tw`mx-1.5`}
              onPress={() => {
                animateReaction(emoji);
                setShowReactions(false);
              }}
            >
              <Text style={tw`text-lg`}>{emoji}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setShowReactions(false)} style={tw`ml-2`}>
            <Ionicons name="close-circle" size={18} color="#6b7280" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}