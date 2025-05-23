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
  const [inputHeight, setInputHeight] = useState(30); // Reduced from 36
  
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
    setInputHeight(30); // Reduced from 36
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
            size={18}                       // Reduced from 22
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
            size={18}                       // Reduced from 22
            color={disabled ? '#D1D5DB' : '#6B7280'} 
          />
        </TouchableOpacity>
        
        {/* Text input wrapper */}
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              { height: Math.max(36, inputHeight + 6) }, // Reduced from max(44, +8)
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
              // Reduced max height and adjusted calculation
              const newHeight = Math.min(70, Math.max(18, e.nativeEvent.contentSize.height));
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
            <Ionicons name="send" size={16} color="#FFFFFF" />  // Reduced from 18
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
    paddingHorizontal: 12,          // Reduced from 16
    paddingVertical: 8,             // Reduced from 12
    marginHorizontal: 10,           // Reduced from 12
    marginVertical: 6,              // Reduced from 8
    backgroundColor: '#F3F4F6',
    borderRadius: 20,               // Reduced from 25
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inputBarWithTopContent: {
    marginTop: 0,
    borderTopLeftRadius: 6,         // Reduced from 8
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 20,     // Reduced from 25
    borderBottomRightRadius: 20,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 14,               // Reduced from 18
    paddingHorizontal: 10,          // Reduced from 14
    marginHorizontal: 6,            // Reduced from 8
    minHeight: 36,                  // Reduced from 44
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  input: {
    fontSize: 14,                   // Reduced from 16
    paddingTop: Platform.OS === 'ios' ? 8 : 6,      // Reduced from 10/8
    paddingBottom: Platform.OS === 'ios' ? 8 : 6,   // Reduced from 10/8
    paddingHorizontal: 0,
    maxHeight: 70,                  // Reduced from 80
    color: '#1F2937',
    textAlignVertical: 'center',
    lineHeight: 18,                 // Reduced from 20
  },
  disabledInput: {
    color: '#6B7280'
  },
  iconButton: {
    padding: 6,                     // Reduced from 8
    borderRadius: 16,               // Reduced from 20
    backgroundColor: 'transparent',
    marginHorizontal: 1,            // Reduced from 2
  },
  sendButton: {
    width: 34,                      // Reduced from 40
    height: 34,                     // Reduced from 40
    borderRadius: 17,               // Reduced from 20
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,                  // Reduced from 8
  },
  sendButtonEnabled: {
    backgroundColor: '#7C3AED'
  },
  sendButtonDisabled: {
    backgroundColor: '#C4B5FD'
  },
});

MessageInput.displayName = 'MessageInput';

export default MessageInput;