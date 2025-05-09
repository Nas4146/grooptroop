import React, { useState, useRef } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  Text,
  Keyboard,
  Animated,
  Easing,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
//import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import tw from '../../utils/tw';
import { ReplyingToMessage } from '../../models/chat'; 

interface MessageInputProps {
  onSend: (text: string, imageUrl?: string) => void;
  replyingTo: ReplyingToMessage | null;
  onCancelReply: () => void;
}

export default function MessageInput({ onSend, replyingTo, onCancelReply }: MessageInputProps) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  
  // Animation values
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  const handleSend = async () => {
    if ((!text.trim() && !image) || uploading) return;
    
    let imageUrl;
    
    if (image) {
      try {
        setUploading(true);
        
        // Upload image to Firebase Storage
        const storage = getStorage();
        const filename = image.split('/').pop() || Date.now().toString();
        const storageRef = ref(storage, `chat-images/${filename}`);
        
        // Convert image URI to blob
        const response = await fetch(image);
        const blob = await response.blob();
        
        // Upload blob to storage
        const snapshot = await uploadBytes(storageRef, blob);
        
        // Get download URL
        imageUrl = await getDownloadURL(snapshot.ref);
        console.log('[CHAT] Image uploaded, url:', imageUrl);
        
      } catch (error) {
        console.error('[CHAT] Error uploading image:', error);
      } finally {
        setUploading(false);
      }
    }
    
    // Send message
    onSend(text, imageUrl);
    
    // Clear input
    setText('');
    setImage(null);
  };
  
  const pickImage = async () => {
    console.log('[CHAT] Image picker not available in this build');
    // Alert the user that this feature isn't available
    alert('Image uploading is not available in this build.');
  };
  
  // Animation for send button
  const animateSendButton = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.85,
        duration: 50,
        useNativeDriver: true
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        easing: Easing.elastic(1),
        useNativeDriver: true
      })
    ]).start();
  };
  
  return (
    <View style={tw`pb-2 px-2`}>
      {/* Reply UI */}
      {replyingTo && (
        <View style={tw`flex-row items-center bg-gray-100 mx-2 p-2 rounded-t-lg border-l-4 border-primary`}>
          <View style={tw`flex-1`}>
            <Text style={tw`text-xs text-gray-500`}>Replying to {replyingTo.senderName}</Text>
            <Text numberOfLines={1} style={tw`text-sm text-gray-700`}>{replyingTo.text}</Text>
          </View>
          <TouchableOpacity onPress={onCancelReply}>
            <Ionicons name="close-circle" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      )}
      
      {/* Image preview */}
      {image && (
        <View style={tw`bg-gray-100 mx-2 p-2 ${replyingTo ? '' : 'rounded-t-lg'}`}>
          <View style={tw`flex-row items-center justify-between mb-1`}>
            <Text style={tw`text-gray-500 text-xs`}>Selected image</Text>
            <TouchableOpacity onPress={() => setImage(null)}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View style={tw`h-24 bg-gray-200 rounded-md overflow-hidden`}>
            <Text style={tw`absolute top-1 left-1 text-xs bg-black bg-opacity-50 text-white px-1 rounded`}>
              Preview
            </Text>
          </View>
        </View>
      )}
      
      {/* Input bar */}
      <View style={tw`flex-row items-end bg-white border border-gray-200 rounded-${replyingTo || image ? 'b' : ''}2xl px-2 py-1.5 mx-2`}>
        <TouchableOpacity
          style={tw`p-2 mr-1`}
          onPress={pickImage}
        >
          <Ionicons name="image-outline" size={24} color="#6B7280" />
        </TouchableOpacity>
        
        <TextInput
          ref={inputRef}
          style={tw`flex-1 max-h-32 bg-gray-100 rounded-2xl px-3 py-2 text-base ${Platform.OS === 'ios' ? 'mb-0' : 'mb-0'}`}
          placeholder="Message"
          value={text}
          onChangeText={setText}
          multiline
          onFocus={() => {
            // Scroll to bottom when input is focused
            setTimeout(() => {
              inputRef.current?.focus();
            }, 100);
          }}
        />
        
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={tw`p-2 ml-1 ${text.trim() || image ? 'opacity-100' : 'opacity-50'}`}
            onPress={() => {
              if (text.trim() || image) {
                animateSendButton();
                Keyboard.dismiss();
                handleSend();
              }
            }}
            disabled={(!text.trim() && !image) || uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#78c0e1" />
            ) : (
              <Ionicons name="send" size={24} color="#78c0e1" />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}