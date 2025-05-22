import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, TextInput, TouchableOpacity, Platform, Keyboard, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from '../../utils/tw';
import { ChatMessage, ReplyingToMessage } from '../../models/chat';
import * as Haptics from 'expo-haptics';
import { UserProfile } from '../../contexts/AuthProvider'; // Adjust the path as needed

interface MessageInputProps {
  onSend: (text: string, imageUrl?: string) => void;
  replyingTo?: ReplyingToMessage | null;
  onCancelReply?: () => void;
  onInputFocus?: () => void;
  onReply?: (message: ChatMessage) => void;
  profile?: UserProfile | null;
  loading?: boolean;
}

type MessageInputHandle = {
  focus: () => void;
  blur: () => void;
};

const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(({
  onSend,
  replyingTo,
  onCancelReply,
  onInputFocus
}, ref) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showAttachOptions, setShowAttachOptions] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
    blur: () => {
      inputRef.current?.blur();
    }
  }));

  const handleSend = () => {
    if (text.trim()) {
      // Add haptic feedback for send
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Animate button press
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 0.9,
          duration: 50,
          useNativeDriver: true
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true
        })
      ]).start();
      
      onSend(text.trim());
      setText(''); // Clear the input after sending
      
      // Optional: manually clear the native text input value as a fallback
      if (inputRef.current) {
        inputRef.current.clear();
      }
    } else {
      // Toggle recording or show options when empty
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowAttachOptions(!showAttachOptions);
    }
  };
  
  const handleAttach = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Toggle attachment options
    setShowAttachOptions(!showAttachOptions);
  };

  return (
    <View style={styles.container}>
      {/* Reply interface - floating style */}
      {replyingTo && (
        <View style={[
          tw`flex-row items-center rounded-xl mx-1 mb-1`, 
          styles.replyContainer
        ]}>
          <View style={tw`flex-1 py-2 px-3`}>
            <Text style={tw`text-gray-500 text-xs`}>
              Replying to <Text style={tw`font-medium text-violet-700`}>{replyingTo.senderName}</Text>
            </Text>
            <Text style={tw`text-gray-700`} numberOfLines={1}>
              {replyingTo.text}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} style={tw`mr-2`}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      )}
      
      {/* Attachment options - expanded when button is pressed */}
      {showAttachOptions && (
        <View style={[
          tw`flex-row justify-around mx-1 mb-1 rounded-xl`, 
          styles.attachOptionsContainer
        ]}>
          <TouchableOpacity style={tw`items-center py-2`} onPress={() => console.log('[CHAT] Photo library')}>
            <View style={[tw`w-11 h-11 rounded-full items-center justify-center mb-1`, styles.attachIcon]}>
              <Ionicons name="images-outline" size={22} color="#7C3AED" />
            </View>
            <Text style={tw`text-xs text-violet-900`}>Gallery</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={tw`items-center py-2`} onPress={() => console.log('[CHAT] Camera')}>
            <View style={[tw`w-11 h-11 rounded-full items-center justify-center mb-1`, styles.attachIcon]}>
              <Ionicons name="camera-outline" size={22} color="#7C3AED" />
            </View>
            <Text style={tw`text-xs text-violet-900`}>Camera</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={tw`items-center py-2`} onPress={() => console.log('[CHAT] GIF')}>
            <View style={[tw`w-11 h-11 rounded-full items-center justify-center mb-1`, styles.attachIcon]}>
              <Text style={tw`text-violet-700 font-bold`}>GIF</Text>
            </View>
            <Text style={tw`text-xs text-violet-900`}>GIF</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={tw`items-center py-2`} onPress={() => console.log('[CHAT] Location')}>
            <View style={[tw`w-11 h-11 rounded-full items-center justify-center mb-1`, styles.attachIcon]}>
              <Ionicons name="location-outline" size={22} color="#7C3AED" />
            </View>
            <Text style={tw`text-xs text-violet-900`}>Location</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Streamlined input bar */}
      <View style={styles.inputBar}>
        {/* Attachment button */}
        <TouchableOpacity 
          style={styles.attachBtn}
          onPress={handleAttach}
        >
          <Ionicons name="add-circle" size={22} color="#7C3AED" />
        </TouchableOpacity>
        
        {/* Direct text input with minimal containers */}
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#9CA3AF"
          value={text}
          onChangeText={setText}
          multiline
          returnKeyType={Platform.OS === 'ios' ? 'done' : 'default'} // Add native dismiss button on iOS
          keyboardAppearance="light" // Make keyboard match the light theme
          enablesReturnKeyAutomatically={true} // Only enable return key when text is entered
          blurOnSubmit={false} // Keep keyboard open after pressing return/done
          onSubmitEditing={() => {
            if (text.trim()) {
              handleSend();
            } else {
              Keyboard.dismiss(); // Dismiss keyboard if empty on submit
            }
          }}
          onFocus={onInputFocus}
        />
        
        {/* Send or mic button with animation */}
        <Animated.View style={{
          transform: [{ scale: buttonScale }]
        }}>
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={handleSend}
          >
            <Ionicons 
              name={text.trim() ? "paper-plane" : "mic"} 
              size={18} 
              color="white" 
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: Platform.OS === 'ios' ? 2 : 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
    backdropFilter: 'blur(10px)',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(233,213,255,0.5)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginVertical: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 10,
    maxHeight: 100,
    minHeight: 36,
    backgroundColor: 'rgba(243,244,246,0.4)',
    borderRadius: 20,
    marginHorizontal: 4,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachBtn: {
    width: 38, 
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(243,232,255,0.6)',
  },
  replyContainer: {
    backgroundColor: 'rgba(237,233,254,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(233,213,255,0.5)',
    marginBottom: 6,
  },
  attachOptionsContainer: {
    backgroundColor: 'rgba(243,232,255,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(233,213,255,0.5)',
    marginBottom: 6,
  },
  attachIcon: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(233,213,255,0.7)',
  }
});

export default MessageInput;