import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
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
import * as Haptics from 'expo-haptics';
//import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import tw from '../../utils/tw';
import { ReplyingToMessage } from '../../models/chat'; 
import { useGroop } from '../../contexts/GroopProvider';
import { EncryptionService } from '../../services/EncryptionService';

interface MessageInputProps {
  onSend: (text: string, imageUrl?: string) => Promise<void> | void;
  replyingTo: ReplyingToMessage | null;
  onCancelReply: () => void;
  onInputFocus?: () => void; // New prop for handling input focus
}

// Export directly as a named function component rather than assigning to a const
function MessageInput({ 
  onSend, 
  replyingTo, 
  onCancelReply,
  onInputFocus // Destructure the new prop
}: MessageInputProps, ref: React.Ref<TextInput>) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [hasEncryptionKey, setHasEncryptionKey] = useState(false);
  const [encryptionLoading, setEncryptionLoading] = useState(true);
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { currentGroop } = useGroop();
  const inputRef = useRef<TextInput>(null);

  // Forward the ref to internal TextInput
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
    blur: () => {
      inputRef.current?.blur();
    }
  }));

  useEffect(() => {
    const checkEncryptionKey = async () => {
      if (currentGroop?.id) {
        setEncryptionLoading(true);
        try {
          const hasKey = await EncryptionService.hasGroopKey(currentGroop.id);
          setHasEncryptionKey(hasKey);
        } catch (error) {
          console.error('[CHAT] Error checking encryption key:', error);
        } finally {
          setEncryptionLoading(false);
        }
      }
    };
    
    checkEncryptionKey();
  }, [currentGroop]);
  
  // Animation values
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  const handleSend = async () => {
    if ((!text.trim() && !image) || uploading || encryptionLoading) return;
    
    // Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Animate the send button
    animateSendButton();
    
    setSending(true);
    
    try {
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
      await onSend(text, imageUrl);
      
      // Success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Clear input
      setText('');
      setImage(null);
    } catch (error) {
      console.error('[CHAT] Error sending message:', error);
      // Error feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSending(false);
    }
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
    <View style={tw`bg-white px-4 py-2 border-t border-gray-200`}>
      {/* Reply UI if replyingTo exists */}
      {replyingTo && (
        <View style={tw`flex-row items-center bg-gray-100 rounded-lg p-2 mb-2`}>
          <View style={tw`flex-1`}>
            <Text style={tw`text-xs text-gray-500`}>
              Replying to {replyingTo.senderName}
            </Text>
            <Text numberOfLines={1} style={tw`text-sm text-gray-800`}>
              {replyingTo.text}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelReply}>
            <Ionicons name="close" size={18} color="#64748B" />
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
  
      <View style={tw`flex-row items-end`}>
        {/* Add attachment button */}
        <TouchableOpacity style={tw`mr-2 mb-1.5`} onPress={pickImage}>
          <Ionicons name="add-circle-outline" size={24} color="#64748B" />
        </TouchableOpacity>
        
        <View style={tw`flex-1 flex-row items-center border border-gray-300 rounded-full pl-3 pr-1 py-1`}>
          {/* Encryption status indicator */}
          {encryptionLoading ? (
            <ActivityIndicator size="small" color="#7C3AED" style={tw`mr-2`} />
          ) : (
            <Ionicons 
              name={hasEncryptionKey ? "lock-closed" : "lock-open"} 
              size={18} 
              color={hasEncryptionKey ? "#78c0e1" : "#9CA3AF"} 
              style={tw`mr-2`} 
            />
          )}
          
          <TextInput
            ref={inputRef}
            style={tw`flex-1 max-h-32`}
            placeholder="Type a message..."
            multiline
            value={text}
            onChangeText={setText}
            placeholderTextColor="#9CA3AF"
            onFocus={() => {
              // Call the onInputFocus prop if it exists
              if (onInputFocus) {
                onInputFocus();
              }
            }}
          />
          
          {/* Send button with animation */}
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={tw`bg-primary h-8 w-8 rounded-full items-center justify-center ${!text.trim() ? 'opacity-50' : ''}`}
              onPress={handleSend}
              disabled={!text.trim() || sending || encryptionLoading}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

// Create the proper forwardRef version of the component
const ForwardedMessageInput = forwardRef(MessageInput);

// Add display name
ForwardedMessageInput.displayName = 'MessageInput';

// Export the forwarded component as default
export default ForwardedMessageInput;