import React, { useState, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Platform,
  StyleSheet,
  Keyboard,
  ActivityIndicator,
  Image,
  Text
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { ReplyContext } from '../../models/chat';
import tw from '../../utils/tw';
import logger from '../../utils/logger';

export interface MessageInputProps {
  onSend: (text: string, imageUri?: string) => void;
  onReplyCancel?: () => void;
  onInputFocus?: () => void;
  replyingTo?: ReplyContext | null;
  loading?: boolean;
  profile?: any;
  keyboardHeight?: number;
  disabled?: boolean;
  hasEncryptionKey?: boolean;
  onEncryptionInfoPress?: () => void;
}

export interface MessageInputRef {
  focus: () => void;
  clear: () => void;
}

// Define animations outside component to avoid recreation
const AnimatedReplyContainer = Animated.createAnimatedComponent(View);

const MessageInput = forwardRef<MessageInputRef, MessageInputProps>(({
  onSend,
  onReplyCancel,
  onInputFocus,
  replyingTo,
  loading = false,
  profile,
  disabled = false
}, ref) => {
  // State
  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [inputHeight, setInputHeight] = useState(36); // Initial input height
  
  // Refs
  const inputRef = useRef<TextInput>(null);
  
  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
    clear: () => {
      setText('');
      setSelectedImage(null);
    }
  }));
  
  // Reset height when text is cleared
  const resetHeight = useCallback(() => {
    setInputHeight(36);
  }, []);
  
  // Handle send button press
  const handleSend = useCallback(() => {
    if ((text.trim().length > 0 || selectedImage) && !isSending && !disabled) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      setIsSending(true);
      logger.chat('Sending message');
      
      try {
        // Call the onSend handler with text and image if available
        onSend(text.trim(), selectedImage || undefined);
        
        // Clear the input
        setText('');
        setSelectedImage(null);
        resetHeight();
      } catch (error) {
        logger.error('Error sending message:', error);
      } finally {
        setIsSending(false);
      }
    }
  }, [text, selectedImage, isSending, disabled, onSend, resetHeight]);
  
  // Handle image picker
  const handlePickImage = useCallback(async () => {
    if (disabled) return;
    
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        logger.warning('Media library permission not granted');
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        logger.chat(`Image selected: ${imageUri}`);
        
        // In a real app, you would upload the image to storage here
        // For now, we'll just set it as the selected image
        setSelectedImage(imageUri);
      }
    } catch (error) {
      logger.error('Error picking image:', error);
    }
  }, [disabled]);
  
  // Handle reply cancel
  const handleReplyCancel = useCallback(() => {
    if (onReplyCancel) {
      onReplyCancel();
    }
  }, [onReplyCancel]);
  
  // Handle input focus
  const handleInputFocus = useCallback(() => {
    if (onInputFocus) {
      onInputFocus();
    }
  }, [onInputFocus]);
  
  // Render reply preview if replying to message
  const renderReplyPreview = () => {
    if (!replyingTo) return null;
    
    return (
      <AnimatedReplyContainer 
        style={tw`flex-row bg-gray-50 px-4 py-3 mx-3 mt-2 rounded-t-xl border-l-4 border-violet-500`}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
      >
        <View style={tw`flex-1`}>
          <Text style={tw`text-xs font-semibold text-violet-600 mb-1`} numberOfLines={1}>
            Replying to {replyingTo.senderName}
          </Text>
          <Text style={tw`text-sm text-gray-600`} numberOfLines={2}>
            {replyingTo.text}
          </Text>
        </View>
        <TouchableOpacity onPress={handleReplyCancel} style={tw`justify-center px-2`}>
          <Ionicons name="close-circle" size={20} color="#6B7280" />
        </TouchableOpacity>
      </AnimatedReplyContainer>
    );
  };
  
  // Render image preview if image is selected
  const renderImagePreview = () => {
    if (!selectedImage) return null;
    
    return (
      <AnimatedReplyContainer 
        style={tw`bg-gray-50 p-3 mx-3 ${replyingTo ? 'rounded-none' : 'mt-2 rounded-t-xl'}`}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
      >
        <View style={tw`flex-row items-center`}>
          <Image 
            source={{ uri: selectedImage }} 
            style={tw`w-16 h-16 rounded-lg`}
            resizeMode="cover"
          />
          <View style={tw`flex-1 ml-3`}>
            <Text style={tw`text-sm font-medium text-gray-800 mb-1`}>
              Image ready to send
            </Text>
            <Text style={tw`text-xs text-gray-500`}>
              Tap send to share this image
            </Text>
          </View>
          <TouchableOpacity onPress={() => setSelectedImage(null)} style={tw`justify-center px-2`}>
            <Ionicons name="close-circle" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </AnimatedReplyContainer>
    );
  };
  
  // Determine if the send button should be enabled
  const isSendEnabled = text.trim().length > 0 || selectedImage !== null;
  
  // Determine if any content is above the input (reply or image)
  const hasTopContent = !!replyingTo || !!selectedImage;
  
  return (
    <View style={[
      styles.container,
      disabled && styles.disabledContainer
    ]}>
      {/* Reply preview */}
      {renderReplyPreview()}
      
      {/* Image preview */}
      {renderImagePreview()}
      
      {/* Input bar */}
      <View style={[
        styles.inputBar,
        hasTopContent ? styles.inputBarWithTopContent : null
      ]}>
        {/* Camera button */}
        <TouchableOpacity 
          style={styles.iconButton}
          onPress={() => logger.chat('Camera button pressed (not implemented)')}
          disabled={disabled || loading}
        >
          <Ionicons 
            name="camera-outline" 
            size={22} 
            color={disabled ? '#D1D5DB' : '#6B7280'} 
          />
        </TouchableOpacity>
        
        {/* Image picker button */}
        <TouchableOpacity 
          style={styles.iconButton}
          onPress={handlePickImage}
          disabled={disabled || isImageUploading || loading}
        >
          <Ionicons 
            name="image-outline" 
            size={22} 
            color={disabled ? '#D1D5DB' : '#6B7280'} 
          />
        </TouchableOpacity>
        
        {/* Text input wrapper */}
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              { height: Math.max(44, inputHeight + 8) }, // Add padding to height calculation
              disabled && styles.disabledInput
            ]}
            value={text}
            onChangeText={setText}
            placeholder={disabled ? "Chat unavailable" : "Type a message..."}
            placeholderTextColor={disabled ? '#A1A1AA' : '#9CA3AF'}
            multiline
            onFocus={handleInputFocus}
            editable={!disabled}
            onContentSizeChange={(e) => {
              // Limit max height and account for line height
              const newHeight = Math.min(80, Math.max(20, e.nativeEvent.contentSize.height));
              setInputHeight(newHeight);
            }}
          />
        </View>
        
        {/* Send button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            isSendEnabled ? styles.sendButtonEnabled : styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          disabled={!isSendEnabled || isSending || loading || disabled}
        >
          {isSending || loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
      
      {/* Keyboard dismiss bar - only on iOS
      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={styles.keyboardDismiss}
          onPress={() => Keyboard.dismiss()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      )}*/}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    width: '100%',
    paddingBottom: 0,
    paddingTop: 0,
    marginBottom: 0,
  },
  disabledContainer: {
    opacity: 0.8
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 12, // Add horizontal margin
    marginVertical: 8,    // Add vertical margin
    backgroundColor: '#F3F4F6', // Light gray background for the entire bar
    borderRadius: 25,     // Circular/rounded corners for the entire bar
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inputBarWithTopContent: {
    marginTop: 0, // Remove top margin when there's content above
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 18,               // Slightly less rounded than the container
    paddingHorizontal: 14,
    marginHorizontal: 8,
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',        // Slightly darker border for more definition
    shadowColor: '#000',           // Add subtle shadow to the white input
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  input: {
    fontSize: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    paddingHorizontal: 0,           // Remove horizontal padding
    maxHeight: 80,                  // Reduce max height
    color: '#1F2937',
    textAlignVertical: 'center',
    lineHeight: 20,                 // Add line height for better text positioning
  },
  disabledInput: {
    color: '#6B7280'
  },
  iconButton: {
    padding: 8,                     // Reduce padding
    borderRadius: 20,
    backgroundColor: 'transparent', // Make transparent
    marginHorizontal: 2,
  },
  sendButton: {
    width: 40,                      // Slightly smaller
    height: 40,
    borderRadius: 20,               // Perfect circle
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonEnabled: {
    backgroundColor: '#7C3AED'      // violet-600
  },
  sendButtonDisabled: {
    backgroundColor: '#C4B5FD'      // violet-300
  },
});

MessageInput.displayName = 'MessageInput';

export default MessageInput;