import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, 
  Text, 
  TouchableOpacity,
  Platform,
  Keyboard,
  StyleSheet,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture, TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SafeAreaView } from 'react-native-safe-area-context';

// Components and hooks
import MessageList from '../components/chat/MessageList';
import MessageInput, { MessageInputRef } from '../components/chat/MessageInput';
import ImagePreview from '../components/chat/ImagePreview';
import useKeyboardController from '../hooks/useKeyboardController';
import { useGroop } from '../contexts/GroopProvider';
import { useAuth } from '../contexts/AuthProvider';
import { useNotification } from '../contexts/NotificationProvider';
import tw from '../utils/tw';
import logger from '../utils/logger';
import { performanceLogger } from '../utils/performanceLogger';

// Services
import { useChatMessages }from '../hooks/useChatMessages';
import { EncryptionService } from '../services/EncryptionService';
import ImageUploadService from '../services/imageUploadService';

// Performance monitoring
import ChatPerformanceMonitor from '../utils/chatPerformanceMonitor';
import ChatPerformanceOverlay from '../components/chat/ChatPerformanceOverlay';

// Constants for performance optimization
const SCREEN_HEIGHT = Dimensions.get('window').height;
const OPTIMAL_DRAW_DISTANCE = Math.min(SCREEN_HEIGHT * 1.5, 280);
const INPUT_HEIGHT = 60;

const EncryptionInfoModal = React.lazy(() => import('../components/chat/EncryptionInfoModal'));

export default function ChatScreen({ navigation, route }) {
  // Performance monitoring
  const renderStartTime = useRef(performance.now());
  const [showPerformanceOverlay, setShowPerformanceOverlay] = useState(__DEV__);

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
    inputContainerStyle,
    dismissKeyboard
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
    pendingOperations
  } = useChatMessages(currentGroop?.id);

  // Start performance monitoring when the chat screen loads
  useEffect(() => {
    if (currentGroop?.id) {
      // Track render start time
      renderStartTime.current = performance.now();
      
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
        // Safe check if hasGroupKey exists
        if (typeof EncryptionService.hasGroupKey === 'function') {
          const hasKey = await EncryptionService.hasGroupKey(currentGroop.id);
          setHasEncryptionKey(hasKey);
        } else {
          // Fallback if the function doesn't exist
          console.log('[CHAT] EncryptionService.hasGroupKey is not available, assuming encryption is not set up');
          setHasEncryptionKey(false);
        }
      } catch (error) {
        logger.error('Error checking encryption status:', error);
        // Set a default value on error
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
      
      // Use dot notation for nested field update
      const updateData = {};
      updateData[`lastRead.${profile.uid}`] = serverTimestamp();
      
      await updateDoc(groopRef, updateData);
      
      logger.chat('Updated lastRead timestamp for user');
    } catch (error) {
      logger.error('Error updating lastRead timestamp:', error);
    }
  }, [currentGroop?.id, profile?.uid]);

  // Handle scroll events
  const handleScroll = useCallback((event) => {
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
    if (addReaction) {
      // Track performance of reaction operation
      const reactionStartTime = performance.now();
      
      addReaction(messageId, emoji);
      
      const reactionTime = performance.now() - reactionStartTime;
      ChatPerformanceMonitor.trackRenderTime('ReactionAdd', reactionTime);
    }
  }, [addReaction]);

  // Handle reply press
  const handleReplyPress = useCallback((message: any) => {
    setReplyingTo(message);
    // Focus input field when reply is selected
    inputRef.current?.focus();
  }, []);

  // Set up gesture handler for keyboard dismissing
  const tap = Gesture.Tap().onStart(() => {
    Keyboard.dismiss();
  });

  // Animated styles
  const scrollButtonStyle = useAnimatedStyle(() => {
    return {
      opacity: showScrollButton.value,
      transform: [{ scale: showScrollButton.value }],
      position: 'absolute',
      right: 16,
      bottom: 80,
      zIndex: 10,
    };
  });
  
  const messageInputStyle = useAnimatedStyle(() => {
    if (Platform.OS === 'ios') {
      return {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: keyboard.value,
        marginBottom: -2, // Negative margin to close any gap
        backgroundColor: 'white',
        zIndex: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#E5E7EB',
      };
    } else {
      return {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        zIndex: 10,
        transform: [{ translateY: -keyboard.value }],
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#E5E7EB',
      };
    }
  });

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <GestureDetector gesture={tap}>
        <View style={tw`flex-1 relative`}>
          {/* MessageList needs a container with explicit flex-1 */}
          <View style={tw`flex-1 pb-16`}> {/* Added pb-16 for bottom padding */}
            <MessageList
              ref={messageListRef}
              messages={messages}
              loading={loading}
              refreshing={refreshing}
              hasMoreMessages={hasMoreMessages}
              loadingOlderMessages={loadingOlderMessages}
              onEndReached={loadOlderMessages}
              onScroll={handleScroll}
              onRefresh={handleRefresh}
              onReactionPress={handleReactionPress}
              onReplyPress={handleReplyPress}
              openImagePreview={handleOpenImagePreview}
            />
          </View>
          
          {/* Scroll to bottom button */}
          <Animated.View style={scrollButtonStyle}>
            <TouchableOpacity 
              style={tw`bg-violet-500 p-3 shadow-md rounded-full`}
              onPress={() => {
                const scrollStartTime = performance.now();
                messageListRef.current?.scrollToEnd({ animated: true });
                
                // Track scroll to end performance
                setTimeout(() => {
                  const scrollTime = performance.now() - scrollStartTime;
                  ChatPerformanceMonitor.trackRenderTime('ScrollToEnd', scrollTime);
                }, 300);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-down" size={24} color="white" />
            </TouchableOpacity>
          </Animated.View>
          
          {/* Message input now at the bottom with fixed positioning */}
          <Animated.View style={[
            { 
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'white', 
              borderTopWidth: 1,
              borderTopColor: '#E5E7EB',
              zIndex: 10
            }
          ]}>
            <MessageInput
              ref={inputRef}
              onSend={handleSendMessage}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              uploadingImage={imageUploading}
              hasEncryptionKey={hasEncryptionKey}
              onEncryptionInfoPress={() => setShowEncryptionInfo(true)}
            />
          </Animated.View>

          {/* Image preview modal */}
          <ImagePreview
            visible={!!selectedImage}
            imageUrl={selectedImage || ''}
            onClose={() => setSelectedImage(null)}
          />

          {/* Encryption info modal */}
          <React.Suspense fallback={<View />}>
            {showEncryptionInfo && (
              <EncryptionInfoModal
                visible={showEncryptionInfo}
                onClose={() => setShowEncryptionInfo(false)}
                groopId={currentGroop?.id}
              />
            )}
          </React.Suspense>
          
          {/* Performance overlay in dev mode */}
          {__DEV__ && showPerformanceOverlay && currentGroop?.id && (
            <ChatPerformanceOverlay 
              chatId={currentGroop.id}
              onClose={() => setShowPerformanceOverlay(false)}
              getMetrics={() => ChatPerformanceMonitor.getChatPerformanceMetrics()}
            />
          )}
          
          {/* Dev mode toggle for performance overlay */}
          {__DEV__ && !showPerformanceOverlay && (
            <TouchableOpacity
              style={tw`absolute bottom-20 right-2 bg-gray-800 opacity-70 p-1 rounded-full z-50`}
              onPress={() => setShowPerformanceOverlay(true)}
            >
              <Text style={tw`text-white text-xs p-1`}>📊</Text>
            </TouchableOpacity>
          )}
        </View>
      </GestureDetector>
    </SafeAreaView>
  );
}