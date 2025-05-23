import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, 
  Text, 
  TouchableOpacity,
  Platform,
  Keyboard,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

// Components and hooks
import MessageList from '../components/chat/MessageList';
import MessageInput, { MessageInputRef } from '../components/chat/MessageInput';
import ImagePreview from '../components/chat/ImagePreview';
import EncryptionInfoModal from '../components/chat/EncryptionInfoModal'; // Add this import
import useKeyboardController from '../hooks/useKeyboardController';
import { useGroop } from '../contexts/GroopProvider';
import { useAuth } from '../contexts/AuthProvider';
import { useNotification } from '../contexts/NotificationProvider';
import { useChatMessages } from '../hooks/useChatMessages';
import tw from '../utils/tw';
import logger from '../utils/logger';
import { performanceLogger } from '../utils/performanceLogger';
import GroopHeader from '../components/common/GroopHeader';

// Services
import { EncryptionService } from '../services/EncryptionService';
import ImageUploadService from '../services/imageUploadService';

// Performance monitoring
import ChatPerformanceMonitor from '../utils/chatPerformanceMonitor';

// Define the screen props type using NativeStackScreenProps
type ChatScreenProps = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export default function ChatScreen({ navigation, route }: ChatScreenProps) {
  // Chat state
  const { currentGroop } = useGroop();
  const { profile } = useAuth();
  const { refreshUnreadCount } = useNotification();
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [showEncryptionInfo, setShowEncryptionInfo] = useState(false);
  const [encryptionLoading, setEncryptionLoading] = useState(false);
  const [hasEncryptionKey, setHasEncryptionKey] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Refs
  const messageListRef = useRef<any>(null);
  const inputRef = useRef<MessageInputRef>(null);
  const isAtBottom = useRef<boolean>(true);
  const scrollDirectionRef = useRef<'up' | 'down'>('down');
  const prevScrollY = useRef<number>(0);
  const renderStartTime = useRef<number>(performance.now()); // ADD THIS
  
  // Animation values
  const showScrollButton = useSharedValue(0);
  const keyboard = useSharedValue(0);
  
  // Get insets
  const insets = useSafeAreaInsets();
  
  // Keyboard controller
  const {
    keyboardVisible,
    keyboardHeight,
    keyboardSpacerStyle,
    inputContainerStyle
  } = useKeyboardController({
    bottomInset: insets.bottom,
  });
  
  // Get chat messages
  const { 
    messages, 
    loading, 
    error, 
    hasMoreMessages, 
    loadingOlderMessages, 
    loadOlderMessages, 
    sendMessage, 
    addReaction, 
    refreshMessages,
    pendingOperations,
    firstUnreadMessageId,      // Add this
    lastReadTimestamp         // Add this
  } = useChatMessages(currentGroop?.id);

  // Start performance monitoring when the chat screen loads
  useEffect(() => {
    if (currentGroop?.id) {
      // Start performance monitoring
      ChatPerformanceMonitor.startChatMonitoring(currentGroop.id);
      
      // Record component render time after mounting
      const renderEndTime = performance.now();
      const totalRenderTime = renderEndTime - renderStartTime.current;
      ChatPerformanceMonitor.trackRenderTime('ChatScreen', totalRenderTime);
      
      // Use our safe performance logger
      performanceLogger.log(`ChatScreen initial render: ${totalRenderTime.toFixed(1)}ms`);
      
      return () => {
        // Stop monitoring when leaving chat
        ChatPerformanceMonitor.stopChatMonitoring();
      };
    }
  }, [currentGroop?.id]);

  // Handle refreshing messages
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // Track performance for refresh operation
    const refreshStartTime = performance.now();
    
    try {
      await refreshMessages();
    } finally {
      setRefreshing(false);
      
      // Measure refresh time
      const refreshTime = performance.now() - refreshStartTime;
      ChatPerformanceMonitor.trackRenderTime('MessageRefresh', refreshTime);
    }
  }, [refreshMessages]);

  // Check encryption status on load
  useEffect(() => {
    if (!currentGroop?.id) return;
    
    const checkEncryption = async () => {
      setEncryptionLoading(true);
      try {
        // Use the async method
        const hasKey = await EncryptionService.hasGroupKey(currentGroop.id);
        setHasEncryptionKey(hasKey);
      } catch (error) {
        logger.error('Error checking encryption status:', error);
        setHasEncryptionKey(false);
      } finally {
        setEncryptionLoading(false);
      }
    };
    
    checkEncryption();
  }, [currentGroop]);

  // Reset unread count when the screen is focused
  useFocusEffect(
    useCallback(() => {
      if (currentGroop && profile) {
        // Mark messages as seen when screen is focused
        markMessagesAsSeen();
        refreshUnreadCount();
        
        // Log view event for analytics
        ChatPerformanceMonitor.trackRenderTime('ChatScreenFocus', 0);
      }
      
      return () => {
        // When leaving the screen, ensure unread count is updated
        refreshUnreadCount();
      };
    }, [currentGroop, profile, refreshUnreadCount])
  );

  // Mark messages as seen
  const markMessagesAsSeen = useCallback(async () => {
    if (!currentGroop?.id || !profile?.uid) return;
    
    try {
      // Update the lastRead timestamp for this user in the groop
      const groopRef = doc(db, 'groops', currentGroop.id);
      
      // Define the type of updateData with an index signature
      const updateData: { [key: string]: any } = {};
      updateData[`lastRead.${profile.uid}`] = serverTimestamp();
      
      await updateDoc(groopRef, updateData);
      
      logger.chat('Updated lastRead timestamp for user');
    } catch (error) {
      logger.error('Error updating lastRead timestamp:', error);
    }
  }, [currentGroop?.id, profile?.uid]);

  // Handle scroll events
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const y = contentOffset.y;
    
    // Calculate if we're at the bottom
    const isBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
    isAtBottom.current = isBottom;
    
    // Determine scroll direction
    const direction = y > prevScrollY.current ? 'down' : 'up';
    prevScrollY.current = y;
    
    if (direction !== scrollDirectionRef.current) {
      scrollDirectionRef.current = direction;
    }
    
    // Show/hide scroll button
    if (!isBottom && y > 200) {
      showScrollButton.value = 1;
    } else {
      showScrollButton.value = 0;
    }
    
    // Track scroll performance for lengthy message lists
    if (messages.length > 50) {
      ChatPerformanceMonitor.trackRenderTime('ScrollPerformance', 0);
    }
  }, [showScrollButton, messages.length]);

  // Handle sending messages
  const handleSendMessage = useCallback(async (text: string, imageUri?: string) => {
    if ((!text.trim() && !imageUri) || !currentGroop || !profile) {
      return;
    }

    let uploadedImageUrl: string | undefined;
    let messageId = `msg_${Date.now()}`;
    let messageSize = text.length + (imageUri ? 1000 : 0); // Estimate size

    try {
      // Track send start
      ChatPerformanceMonitor.trackMessageSendStart(messageId, messageSize);
      
      // If there's an image, upload it first
      if (imageUri) {
        setImageUploading(true);
        
        // Generate a storage path
        const imagePath = ImageUploadService.generateImagePath(
          currentGroop.id,
          profile.uid
        );
        
        // Upload the image
        const uploadStartTime = performance.now();
        uploadedImageUrl = await ImageUploadService.uploadImage(imageUri, imagePath);
        const uploadTime = performance.now() - uploadStartTime;
        
        ChatPerformanceMonitor.trackRenderTime('ImageUpload', uploadTime);
        logger.chat(`Image uploaded: ${uploadedImageUrl} (${uploadTime.toFixed(0)}ms)`);
      }

      // Get reply context if replying
      const replyData = replyingTo ? {
        id: replyingTo.id,
        text: replyingTo.text,
        senderName: replyingTo.senderName
      } : undefined;

      // Send the message with the image URL if available
      await sendMessage(text, replyData, uploadedImageUrl);
      
      // Mark as successful
      ChatPerformanceMonitor.trackMessageSendComplete(messageId, true);
      
      // Mark messages as seen when sending a message
      markMessagesAsSeen();
      
      // Clear reply context
      setReplyingTo(null);
      
      // Scroll to bottom after a short delay
      setTimeout(() => {
        if (isAtBottom.current) {
          messageListRef.current?.scrollToEnd({ animated: true });
        }
      }, 300);
    } catch (error) {
      // Track failure
      ChatPerformanceMonitor.trackMessageSendComplete(messageId, false);
      logger.error('Error sending message with image:', error);
    } finally {
      setImageUploading(false);
    }
  }, [currentGroop, profile, sendMessage, replyingTo, markMessagesAsSeen]);

  // Handle image preview
  const handleOpenImagePreview = useCallback((imageUrl: string) => {
    setSelectedImage(imageUrl);
  }, []);

  // Handle reaction press
  const handleReactionPress = useCallback((messageId: string, emoji: string) => {
    console.log(`[CHAT_SCREEN] Reaction pressed: ${emoji} on message ${messageId}`);
    
    if (addReaction && profile?.uid) {
      console.log(`[CHAT_SCREEN] Calling addReaction with userId: ${profile.uid}`);
      console.log(`[CHAT_SCREEN] This will either add ${emoji} or remove it if user already reacted with ${emoji}`);
      
      // Track performance of reaction operation
      const reactionStartTime = performance.now();
      
      // Add/remove the reaction
      addReaction(messageId, emoji, profile.uid);
      
      const reactionTime = performance.now() - reactionStartTime;
      ChatPerformanceMonitor.trackRenderTime('ReactionToggle', reactionTime);
      
      console.log(`[CHAT_SCREEN] Reaction toggle completed in ${reactionTime.toFixed(1)}ms`);
    } else {
      console.warn(`[CHAT_SCREEN] Cannot toggle reaction - missing dependencies:`, {
        hasAddReaction: !!addReaction,
        hasProfile: !!profile,
        hasUserId: !!profile?.uid
      });
    }
  }, [addReaction, profile?.uid]);

  // Handle reply press
  const handleReplyPress = useCallback((message: any) => {
    setReplyingTo(message);
    // Focus input field when reply is selected
    inputRef.current?.focus();
  }, []);

  // Add debug logging to see when loadOlderMessages is called:
  const handleLoadOlderMessages = useCallback(() => {
    console.log('🔍 ChatScreen handleLoadOlderMessages called');
    loadOlderMessages();
  }, [loadOlderMessages]);

  // Fix the scroll button position
  const scrollButtonStyle = useAnimatedStyle(() => {
    return {
      opacity: showScrollButton.value,
      transform: [{ scale: showScrollButton.value }],
      position: 'absolute',
      right: 16,
      bottom: 16, // Changed from 100 to 16 - this removes the white space!
      zIndex: 10,
    };
  });
  
  // Log MessageList props for debugging
  useEffect(() => {
    console.log('MessageList props:', { 
      messageCount: messages.length,
      loading,
      refreshing,
      hasMoreMessages 
    });
  }, [messages, loading, refreshing, hasMoreMessages]);

  // Add this debugging in ChatScreen before rendering MessageList
  useEffect(() => {
    console.log('Messages data validation:');
    messages.forEach((msg, index) => {
      if ('type' in msg) {
        console.log(`Message ${index}: DateSeparator - ${msg.date}`);
      } else {
        console.log(`Message ${index}: Regular message - ${msg.id} - Text: "${msg.text?.substring(0, 50)}"`);
        if (!msg.text || typeof msg.text !== 'string') {
          console.warn(`Message ${index} has invalid text:`, msg.text);
        }
      }
    });
  }, [messages]);

  // Add this useEffect near your other debugging useEffects
  useEffect(() => {
    console.log('About to render MessageList with', messages.length, 'messages');
  }, [messages.length]);

  // In your ChatScreen component, ensure stable references:
  const chatProps = useMemo(() => ({
    hasMoreMessages,
    loading,
    messageCount: messages.length,
    refreshing: false // or whatever your refreshing state is
  }), [hasMoreMessages, loading, messages.length]);

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={['top']}>
      <KeyboardAvoidingView 
        style={tw`flex-1`}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
          <View style={tw`flex-1`}>
            {/* GroopHeader */}
            <GroopHeader 
              isChatScreen={true}
              encryptionEnabled={hasEncryptionKey}
              onShowEncryptionInfo={() => setShowEncryptionInfo(true)}
            />
            
            {/* Main content area */}
            <View style={tw`flex-1`}>
              <MessageList
                ref={messageListRef}
                messages={messages}
                loading={loading}
                refreshing={refreshing}
                hasMoreMessages={hasMoreMessages}
                loadingOlderMessages={loadingOlderMessages}
                onEndReached={handleLoadOlderMessages}
                onScroll={handleScroll}
                onRefresh={handleRefresh}
                onReactionPress={handleReactionPress}
                onReplyPress={handleReplyPress}
                openImagePreview={handleOpenImagePreview}
                firstUnreadMessageId={firstUnreadMessageId}
                shouldScrollToBottom={!firstUnreadMessageId}
                currentUserId={profile?.uid || ''} // FIXED: Add this missing prop
              />
            </View>
            
            {/* Scroll to bottom button
            <Animated.View style={scrollButtonStyle}>
              <TouchableOpacity 
                style={tw`bg-violet-500 p-3 shadow-md rounded-full`}
                onPress={() => {
                  messageListRef.current?.scrollToEnd({ animated: true });
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-down" size={24} color="white" />
              </TouchableOpacity>
            </Animated.View>*/}
            
            {/* Message input */}
            <MessageInput
              ref={inputRef}
              onSend={handleSendMessage}
              replyingTo={replyingTo}
              onReplyCancel={() => setReplyingTo(null)}
              loading={imageUploading}
              profile={profile}
              hasEncryptionKey={hasEncryptionKey}
              onEncryptionInfoPress={() => setShowEncryptionInfo(true)}
            />

            {/* Modals */}
            <ImagePreview
              visible={!!selectedImage}
              imageUrl={selectedImage || ''}
              onClose={() => setSelectedImage(null)}
            />

            {showEncryptionInfo && (
              <React.Suspense fallback={<View />}>
                <EncryptionInfoModal
                  visible={showEncryptionInfo}
                  onClose={() => setShowEncryptionInfo(false)}
                  groopId={currentGroop?.id}
                />
              </React.Suspense>
            )}
          </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}