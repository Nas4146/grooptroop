import React, { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../../utils/tw';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSequence, 
  withSpring 
} from 'react-native-reanimated';

interface MessageInputProps {
  onSend: (text: string) => void;
  replyingTo?: string | null;
  onCancelReply?: () => void;
}

export default function MessageInput({ onSend, replyingTo, onCancelReply }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const inputRef = useRef<TextInput>(null);
  const buttonScale = useSharedValue(1);
  
  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      setMessage('');
      Keyboard.dismiss();
      
      // Animate the send button when pressed
      buttonScale.value = withSequence(
        withSpring(0.9, { damping: 10, stiffness: 200 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );
    }
  };

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }]
    };
  });

  return (
    <View style={tw`border-t border-gray-200 px-4 pt-2 pb-4 bg-white`}>
      {/* Reply indicator */}
      {replyingTo && (
        <View style={tw`flex-row justify-between items-center bg-gray-100 rounded-lg px-3 py-2 mb-2`}>
          <Text style={tw`text-gray-600 text-sm`}>
            Replying to a message
          </Text>
          <TouchableOpacity onPress={onCancelReply}>
            <Ionicons name="close-circle" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      )}
      
      <View style={tw`flex-row items-center`}>
        {/* Add attachment button - Using your primary color */}
        <TouchableOpacity style={tw`mr-2`}>
          <Ionicons name="add-circle" size={28} color="#7C3AED" />
        </TouchableOpacity>
        
        {/* Text input */}
        <TextInput
          ref={inputRef}
          style={tw`flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-base text-neutral`}
          placeholder="Message..."
          placeholderTextColor="#9CA3AF"
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
        />
        
        {/* Send button - Using your primary color */}
        <Animated.View style={[animatedButtonStyle, tw`ml-2`]}>
          <TouchableOpacity 
            style={tw`bg-primary rounded-full w-11 h-11 items-center justify-center`}
            onPress={handleSend}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}