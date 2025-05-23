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
        style={tw`flex-row bg-gray-100 px-3 py-2 rounded-t-lg`}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
      >
        <View style={tw`flex-1 border-l-2 border-primary pl-2`}>
          <Text style={tw`text-xs font-bold text-gray-700`} numberOfLines={1}>
            {replyingTo.senderName}
          </Text>
          <Text style={tw`text-xs text-gray-600`} numberOfLines={1}>
            {replyingTo.text}
          </Text>
        </View>
        <TouchableOpacity onPress={handleReplyCancel} style={tw`justify-center px-1`}>
          <Ionicons name="close-circle" size={18} color="#666" />
        </TouchableOpacity>
      </AnimatedReplyContainer>
    );
  };
  
  // Render image preview if image is selected
  const renderImagePreview = () => {
    if (!selectedImage) return null;
    
    return (
      <AnimatedReplyContainer 
        style={tw`bg-gray-100 p-2 ${replyingTo ? 'rounded-none' : 'rounded-t-lg'}`}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
      >
        <View style={tw`flex-row items-center`}>
          <Image 
            source={{ uri: selectedImage }} 
            style={tw`w-16 h-16 rounded-md`} 
            resizeMode="cover"
          />
          <Text style={tw`flex-1 text-xs text-gray-600 ml-2`} numberOfLines={1}>
            Image attached
          </Text>
          <TouchableOpacity onPress={() => setSelectedImage(null)} style={tw`justify-center px-1`}>
            <Ionicons name="close-circle" size={18} color="#666" />
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
        {/* Camera button - for future implementation */}
        <TouchableOpacity 
          style={styles.iconButton}
          onPress={() => logger.chat('Camera button pressed (not implemented)')}
          disabled={disabled || loading}
        >
          <Ionicons name="camera-outline" size={24} color={disabled ? '#D1D5DB' : '#6B7280'} />
        </TouchableOpacity>
        
        {/* Image picker button */}
        <TouchableOpacity 
          style={styles.iconButton}
          onPress={handlePickImage}
          disabled={disabled || isImageUploading || loading}
        >
          <Ionicons name="image-outline" size={24} color={disabled ? '#D1D5DB' : '#6B7280'} />
        </TouchableOpacity>
        
        {/* Text input */}
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              { height: Math.max(36, inputHeight) }, // Dynamic height
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
              // Limit max height to reasonable value
              setInputHeight(Math.min(100, e.nativeEvent.contentSize.height));
            }}
          />
        </View>
        
        {/* Send button - shows activity indicator when sending */}
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
            <Ionicons name="send" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
      
      {/* Keyboard dismiss bar - only on iOS */}
      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={styles.keyboardDismiss}
          onPress={() => Keyboard.dismiss()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    width: '100%',
    paddingBottom: 0,
    paddingTop: 0
  },
  disabledContainer: {
    opacity: 0.8
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16
  },
  inputBarWithTopContent: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    marginHorizontal: 8
  },
  input: {
    fontSize: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 0,
    paddingBottom: Platform.OS === 'ios' ? 8 : 0,
    maxHeight: 100, // Limit max height
    color: '#1F2937'
  },
  disabledInput: {
    color: '#6B7280'
  },
  iconButton: {
    padding: 8,
    borderRadius: 20
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sendButtonEnabled: {
    backgroundColor: '#7C3AED' // violet-600
  },
  sendButtonDisabled: {
    backgroundColor: '#C4B5FD' // violet-300
  },
  keyboardDismiss: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB'
  }
});

MessageInput.displayName = 'MessageInput';

export default MessageInput;