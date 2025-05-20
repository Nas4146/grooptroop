import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput,
  KeyboardAvoidingView, 
  Platform,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
  Keyboard,
  KeyboardEvent
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthProvider';
import { useGroop } from '../contexts/GroopProvider';
import { ChatService } from '../services/chatService';
import { EncryptionService } from '../services/EncryptionService';
import { ChatMessage, ReplyingToMessage } from '../models/chat';
import { FlashList } from '@shopify/flash-list';
import MessageBubble from '../components/chat/MessageBubble';
import MessageInput from '../components/chat/MessageInput';
import tw from '../utils/tw';
import { KeyExchangeService } from '../services/KeyExchangeService';
import EncryptionInfoModal from '../components/chat/EncryptionInfoModal';
import { useNotification } from '../contexts/NotificationProvider';
import { useFocusEffect } from '@react-navigation/native';
import DateSeparator from '../components/chat/DateSeparator';
import { ChatItemType } from '../models/chat';
import GroopHeader from '../components/common/GroopHeader';
import { SentryService, usePerformance, SentrySpan } from '../utils/sentryService';
import ChatPerformanceMonitor from '../utils/chatPerformanceMonitor';

type ChatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>; // Or whatever the route name is in your stack

// Define a MessageInputHandle type to fix the ref issue
type MessageInputHandle = {
  focus: () => void;
  blur: () => void;
};

export default function ChatScreen({ route }: { route: ChatScreenRouteProp }) {
  const { profile } = useAuth();
  const { currentGroop } = useGroop();
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<ReplyingToMessage | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Fix the ref type to use our custom MessageInputHandle
  const inputRef = useRef<MessageInputHandle>(null);
  
  const [showEncryptionInfo, setShowEncryptionInfo] = useState(false);
  const [encryptionLoading, setEncryptionLoading] = useState(false);
  const { refreshUnreadCount } = useNotification();
  const flashListRef = useRef<FlashList<ChatItemType>>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Add these state variables at the top of your component
  const [initialScrollComplete, setInitialScrollComplete] = useState(false);
  const [hasScrolledToUnread, setHasScrolledToUnread] = useState(false);

  // 1. Add a ref to store the current scroll offset and a flag for recent reactions
  const scrollOffsetRef = useRef(0);
  const hasRecentReaction = useRef(false);

  // Handle scroll events
  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const layoutHeight = event.nativeEvent.layoutMeasurement.height;
  
    // Store current scroll offset for reaction handling
    scrollOffsetRef.current = offsetY;
    
    // Show button when user has scrolled up a bit
    setShowScrollButton(offsetY < contentHeight - layoutHeight - 100);
  };
    
  // Process messages to include date separators
  const processMessagesWithDateSeparators = useCallback(() => {
    if (!messages.length) return [];

    // Helper function for date conversion
    const getDateValue = (createdAt: any): Date => {
      if (!createdAt) return new Date();
      if (createdAt?.toDate) return createdAt.toDate();
      if (createdAt instanceof Date) return createdAt;
      return new Date(createdAt);
    };

    // First, sort messages by date if they aren't already
    const sortedMessages = [...messages].sort((a, b) => {
      const dateA = getDateValue(a.createdAt);
      const dateB = getDateValue(b.createdAt);
      
      return dateA.getTime() - dateB.getTime();  // Oldest first (for non-inverted list)
    });
      
    // Then, create a new array with date separators
    const result: ChatItemType[] = [];
    let lastDateStr: string | null = null;
          
    sortedMessages.forEach(message => {
      const messageDate = getDateValue(message.createdAt);
      
      // Get just the date portion for comparison (year, month, day)
      const dateStr = messageDate.toDateString();
      
      // If this is a new date, add a separator
      if (dateStr !== lastDateStr) {
        lastDateStr = dateStr;
        result.push({
          id: `date-${dateStr}`,
          type: 'dateSeparator',
          date: messageDate
        });
      }
      
      // Add the message
      result.push(message);
    });
    
    return result;
  }, [messages]);

  // Debug log
  useEffect(() => {
    console.log(`[CHAT_DEBUG] Current groop ID: ${currentGroop?.id}`);
  }, [currentGroop]);

  useEffect(() => {
    const initializeEncryption = async () => {
      setEncryptionLoading(true);
      try {
        if (profile && currentGroop) {
          console.log('[CHAT] Checking encryption status for group:', currentGroop.id);
          
          // Create groopRef here when you know currentGroop exists
          const groopRef = doc(db, 'groops', currentGroop.id);
          const groopSnap = await getDoc(groopRef);
          
          if (!groopSnap.data()?.encryptionEnabled) {
            console.log('[CHAT] Setting up encryption for group');
            // Set up encryption for this group
            await KeyExchangeService.setupGroopEncryption(currentGroop.id, profile.uid);
            console.log('[CHAT] Encryption setup complete');
          } else {
            console.log('[CHAT] Encryption already set up for this group');
            
            // Check if we have the key locally - THIS IS THE CRITICAL PART
            const hasKey = await EncryptionService.hasGroopKey(currentGroop.id);
            if (!hasKey) {
              console.log('[CHAT] Group key not found locally, generating new key');
              await EncryptionService.generateGroopKey(currentGroop.id);
            }
          }
        }
      } finally {
        setEncryptionLoading(false);
      }
    };
    
    initializeEncryption();
  }, [profile, currentGroop]);

  useEffect(() => {
    // Process key exchanges whenever the screen is focused
    const checkForKeyExchanges = async () => {
      if (profile && currentGroop) {
        await KeyExchangeService.processPendingKeyExchanges(profile.uid);
      }
    };
    
    // Run on mount
    checkForKeyExchanges();
    
    // Set up an interval to check periodically
    const interval = setInterval(checkForKeyExchanges, 60000); // Check every minute
    
    return () => {
      clearInterval(interval);
    };
  }, [profile, currentGroop]);

  useEffect(() => {
    if (currentGroop) {
      console.log('[CHAT_DEBUG] Current groop details:', {
        id: currentGroop.id,
        name: currentGroop.name,
        membersCount: currentGroop.members?.length || 0,
        isMember: currentGroop.members?.includes(profile?.uid || '') || false,
      });
    }
  }, [currentGroop, profile]);
  
  // Reset notifications when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('[CHAT] Chat screen focused, refreshing unread count');
      if (profile?.uid) {
        refreshUnreadCount();
      }
      return () => {};
    }, [refreshUnreadCount, profile])
  );

  // Load messages
  useEffect(() => {
    if (!profile || !currentGroop) return;
    
    console.log(`[CHAT] Subscribing to messages for groop: ${currentGroop.name} (${currentGroop.id})`);
    
    // Subscribe to messages
    const unsubscribe = ChatService.subscribeToMessages(currentGroop.id, (newMessages) => {
      setMessages(newMessages);
      setLoading(false);
      setRefreshing(false);
      
      // Count unread messages
      const unread = newMessages.filter(msg => 
        !msg.read.includes(profile.uid) && msg.senderId !== profile.uid
      );
      setUnreadCount(unread.length);
    });
    
    // Cleanup subscription
    return () => {
      console.log(`[CHAT] Unsubscribing from messages for groop: ${currentGroop?.id || 'unknown'}`);
      unsubscribe();
      setHasScrolledToUnread(false); // Reset for next time
    };
  }, [profile, currentGroop]);

  // Add a separate useEffect specifically for scrolling logic
  useEffect(() => {
    // Only run scroll logic when we have messages and haven't scrolled yet
    if (messages.length > 0 && !hasScrolledToUnread && !loading) {
      console.log('[CHAT] Attempting to scroll to first unread message');
      
      // Helper function for date conversion
      const getDateValue = (msg: ChatMessage): number => {
        const createdAt = msg.createdAt;
        if (!createdAt) return 0;
        // Handle Firestore Timestamp object
        if (createdAt?.toDate) return createdAt.toDate().getTime();
        // Handle Date object
        if (createdAt instanceof Date) return createdAt.getTime();
        // Handle number (timestamp in ms)
        if (typeof createdAt === 'number') return createdAt;
        // Handle string (ISO date)
        if (typeof createdAt === 'string') return new Date(createdAt).getTime();
        
        // Fallback - unlikely to happen, but prevents errors
        return Date.now();
      };
      
      // Sort messages by timestamp (oldest first)
      const sortedMessages = [...messages].sort((a, b) => getDateValue(a) - getDateValue(b));
      
      // Find the first unread message
      const firstUnreadMsg = sortedMessages.find(msg => 
        !msg.read.includes(profile?.uid || '') && msg.senderId !== profile?.uid
      );
      
      // Set a short timeout to ensure the list is rendered before scrolling
      setTimeout(() => {
        if (firstUnreadMsg) {
          // We have unread messages - find its index in the processed list
          const processedItems = processMessagesWithDateSeparators();
          const unreadIndex = processedItems.findIndex(item => 
            'id' in item && item.id === firstUnreadMsg.id
          );
          
          if (unreadIndex !== -1) {
            console.log(`[CHAT] Scrolling to first unread message at index ${unreadIndex}`);
            flashListRef.current?.scrollToIndex({ 
              index: unreadIndex, 
              animated: true
            });
          }
        } else {
          // No unread messages, scroll to bottom (latest message)
          console.log('[CHAT] No unread messages, scrolling to latest message');
          flashListRef.current?.scrollToEnd({ animated: false });
        }
        
        // Mark that we've completed the scrolling
        setHasScrolledToUnread(true);
        
        // Mark messages as read after scrolling
        if (messages.length > 0 && profile?.uid) {
          const unreadIds = messages
            .filter(msg => !msg.read.includes(profile.uid) && msg.senderId !== profile.uid)
            .map(msg => msg.id);
          
          if (unreadIds.length > 0) {
            console.log(`[CHAT] Marking ${unreadIds.length} messages as read`);
            ChatService.markAsRead(currentGroop?.id || '', unreadIds, profile.uid)
              .then(success => {
                if (success) {
                  console.log('[CHAT] Messages marked as read, refreshing unread count');
                  refreshUnreadCount(); // Update the global unread count
                }
              });
          }
        }
      }, 300);
    }
  }, [messages, hasScrolledToUnread, loading, profile?.uid]);

  // Send message
const sendMessage = useCallback(async (text: string, imageUrl?: string) => {
  if (!profile || !currentGroop) {
    console.log('[CHAT] Cannot send message: No profile or groop selected');
    return;
  }
  
  // Define messageId for tracking
  const messageId = `msg_${Date.now()}`;
  
  try {
    // Always use direct try/catch blocks for better error handling
    try {
      console.log('[CHAT] Starting performance tracking for message', messageId);
      ChatPerformanceMonitor.trackMessageSendStart(messageId, text.length);
    } catch (e) {
      console.log('[CHAT] Error starting performance tracking:', e);
    }
    
    console.log(`[CHAT] Sending message to groop: ${currentGroop.id}`);
    console.log('[CHAT] Current user profile:', JSON.stringify({
      displayName: profile.displayName,
      hasAvatar: !!profile.avatar,
      avatarType: profile.avatar?.type
    }));
    
    // Send the actual message
    await ChatService.sendMessage(currentGroop.id, {
      text,
      senderId: profile.uid,
      senderName: profile.displayName || 'Anonymous',
      senderAvatar: profile.avatar,
      replyTo: replyingTo?.id,
      imageUrl
    });
    
    // Clear reply state
    if (replyingTo) setReplyingTo(null);
    
    // Scroll to the bottom after sending
    setTimeout(() => {
      flashListRef.current?.scrollToEnd();
    }, 200);
    
    // Track successful send - in its own try/catch
    try {
      console.log('[CHAT] Completing performance tracking for message', messageId);
      ChatPerformanceMonitor.trackMessageSendComplete(messageId, true);
    } catch (e) {
      console.log('[CHAT] Error completing performance tracking:', e);
    }
    
  } catch (error) {
    console.error('[CHAT] Error sending message:', error);
    
    // Track failed send - in its own try/catch
    try {
      console.log('[CHAT] Tracking failed message send', messageId);
      ChatPerformanceMonitor.trackMessageSendComplete(messageId, false);
    } catch (e) {
      console.log('[CHAT] Error tracking message failure:', e);
    }
    
    // Log error
    SentryService.captureError(error as Error, {
      context: 'ChatScreen.sendMessage',
      groopId: currentGroop.id
    });
  }
}, [profile, currentGroop, replyingTo]);
  
  // Handle reactions
  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!profile || !currentGroop) return;
    
    // Get current scroll position before adding reaction
    const currentScrollOffset = scrollOffsetRef.current;
    
    // Save layout info to prevent jumping
    let layoutHeight = 0;
    let contentHeight = 0;
    
    try {
      // Get current layout measurements to maintain position
      const info = await new Promise<{x: number, y: number, width: number, height: number}>(resolve => {
        // Use type assertion to access the native methods available on the ref
        const flashListNode = flashListRef.current as unknown as {
          measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void
        };
        
        flashListNode?.measureInWindow((x, y, width, height) => {
          resolve({ x, y, width, height });
        });
      });
      
      if (info) {
        layoutHeight = info.height;
      }
    } catch (error) {
      console.log('[CHAT] Could not measure FlashList window', error);
    }
    
    // Set flag to prevent auto-scroll
    hasRecentReaction.current = true;
    
    // Add the reaction without waiting for it to complete
    ChatService.addReaction(currentGroop.id, messageId, emoji, profile.uid)
      .catch(err => console.error('[CHAT] Error adding reaction:', err));
    
    // Instead of using setTimeout, use requestAnimationFrame for smoother transitions
    requestAnimationFrame(() => {
      if (flashListRef.current && hasRecentReaction.current) {
        flashListRef.current.scrollToOffset({
          offset: currentScrollOffset,
          animated: false
        });
        
        // Reset flag after a short delay
        setTimeout(() => {
          hasRecentReaction.current = false;
        }, 500);
      }
    });
  }, [profile, currentGroop]);
  
  // Handle reply
  const handleReply = useCallback((message: ChatMessage) => {
    setReplyingTo({
      id: message.id,
      text: message.text,
      senderName: message.senderName
    });
  }, []);
  
  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // The refreshing state will be reset when new messages come in
  }, []);
  
  // Add this new useEffect to manage keyboard behavior
  useEffect(() => {
    // Function to handle keyboard showing
    const handleKeyboardShow = (event: KeyboardEvent) => {
      // Only scroll if we have messages
      if (messages.length > 0) {
        // Get keyboard height
        const keyboardHeight = event.endCoordinates.height;
        
        console.log(`[CHAT] Keyboard shown with height: ${keyboardHeight}`);
        
        // Slight delay to let the layout adjust
        setTimeout(() => {
          // Scroll to end (latest message) with extra padding to account for the keyboard
          flashListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    // Set up keyboard listeners
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      handleKeyboardShow
    );

    // Clean up
    return () => {
      keyboardDidShowListener.remove();
    };
  }, [messages.length]);

  // Sentry and performance monitoring
  const chatId = route.params?.chatId || currentGroop?.id || 'unknown_chat';
  const sentryTransaction = useRef<SentrySpan | null>(null);
  const perf = usePerformance('ChatScreen');
  
  // Start monitoring when component mounts
  useEffect(() => {
    console.log('[CHAT] Setting up performance monitoring for', chatId);
    
    try {
      // Start chat performance monitoring
      if (currentGroop?.id) {
        ChatPerformanceMonitor.startChatMonitoring(currentGroop.id);
      }
      
      sentryTransaction.current = SentryService.startTransaction(
        `Chat:${chatId}`, 
        'chat_session'
      );
      
      // Set relevant tags
      if (sentryTransaction.current) {
        sentryTransaction.current.setTag('chat_id', chatId);
        sentryTransaction.current.setTag('groop_name', currentGroop?.name || 'unknown');
        sentryTransaction.current.setTag('user_id', profile?.uid || 'unknown');
      }
      
      // Track initial load operation
      const initialLoadOp = perf.trackOperation('initialLoad');
      setTimeout(() => {
        initialLoadOp.end();
      }, 500);
      
      // Cleanup function runs when component unmounts
      return () => {
        // Stop ChatPerformanceMonitor
        ChatPerformanceMonitor.stopChatMonitoring();
        
        // Finish the transaction
        if (sentryTransaction.current) {
          sentryTransaction.current.finish();
        }
      };
    } catch (e) {
      console.error('[CHAT] Error initializing performance monitoring:', e);
    }
  }, [chatId, currentGroop?.id, currentGroop?.name, profile?.uid]);

  // Monitor message sends
  const monitoredSendMessage = useCallback(async (messageText: string) => {
    const messageId = `msg_${Date.now()}`;
    let messageSendSpan = null;
    
    try {
      // Track message sending performance
      if (typeof ChatPerformanceMonitor?.trackMessageSendStart === 'function') {
        ChatPerformanceMonitor.trackMessageSendStart(messageId, messageText.length);
      }
      
      // Create child span for message sending
      if (sentryTransaction.current) {
        messageSendSpan = sentryTransaction.current.startChild(
          `send_message`,
          `Send message ${messageId.slice(0, 6)}`
        );
        
        messageSendSpan.setData('messageLength', messageText.length);
        messageSendSpan.setData('messageId', messageId);
      }

      // Your existing message sending logic
      await sendMessage(messageText);
      
      // Mark as successfully sent
      if (typeof ChatPerformanceMonitor?.trackMessageSendComplete === 'function') {
        ChatPerformanceMonitor.trackMessageSendComplete(messageId, true);
      }
      
      // Finish the span
      if (messageSendSpan) {
        messageSendSpan.finish();
      }
    } catch (error) {
      // Track failed sends
      if (typeof ChatPerformanceMonitor?.trackMessageSendComplete === 'function') {
        ChatPerformanceMonitor.trackMessageSendComplete(messageId, false);
      }
      
      // Log error using SentryService instead of direct Sentry
      SentryService.captureError(error as Error, {
        messageId,
        chatId: route.params?.chatId || currentGroop?.id || 'unknown_chat',
        messageLength: messageText.length
      });
      
      // Finish the span with error status
      if (messageSendSpan) {
        messageSendSpan.setStatus('error');
        messageSendSpan.setData('error', (error as Error).message);
        messageSendSpan.finish();
      }
    }
  }, [route.params?.chatId, currentGroop?.id, sendMessage]);

  // Track message rendering performance
  const renderMessage = (message: ChatMessage) => {
    const startTime = performance.now();
    
    // Your message rendering logic here
    const renderedMessage = (
      <View key={message.id}>
        <Text>{message.text}</Text>
      </View>
    );
    
    // Track rendering performance
    const endTime = performance.now();
    if (typeof ChatPerformanceMonitor?.trackMessageRender === 'function') {
      ChatPerformanceMonitor.trackMessageRender(message.id, startTime, endTime);
    }
    
    return renderedMessage;
  };
  
  // Track user interactions
  const onTyping = () => {
    // Use custom perf hook
    perf.trackInteraction('user_typing');
  };
  
  const onScrollChat = () => {
    // Use custom perf hook
    const scrollOp = perf.trackOperation('chatScroll');
    
    // End the operation after scrolling completes
    setTimeout(() => {
      scrollOp.end();
    }, 100);
  };
  
  if (!currentGroop) {
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center bg-light`}>
        <Ionicons name="chatbubbles" size={64} color="#CBD5E1" />
        <Text style={tw`text-xl font-bold text-gray-800 mt-4 text-center`}>
          No active conversation
        </Text>
        <Text style={tw`text-gray-600 text-center mt-2 mx-10`}>
          Select or create a groop to start chatting
        </Text>
      </SafeAreaView>
    );
  }
  
  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center bg-light`}>
        <ActivityIndicator size="large" color="#78c0e1" />
        <Text style={tw`mt-4 font-semibold text-primary`}>Loading your chat...</Text>
      </SafeAreaView>
    );
  }
  
  // EmptyChat component for displaying when no messages exist
  const EmptyChat = () => (
    <View style={tw`py-20 items-center`}>
      <View style={tw`w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-3`}>
        <Ionicons name="chatbubble-outline" size={32} color="#7C3AED" />
      </View>
      <Text style={tw`text-neutral font-medium`}>No messages yet</Text>
      <Text style={tw`text-gray-500 text-sm mt-1 text-center max-w-[70%]`}>
        Be the first to say something to the group!
      </Text>
      <TouchableOpacity
        style={tw`mt-6 bg-primary px-5 py-2.5 rounded-lg`}
        onPress={() => inputRef.current?.focus()}
      >
        <Text style={tw`text-white font-medium`}>Start Chatting</Text>
      </TouchableOpacity>
    </View>
  );

  return (
  <SafeAreaView style={tw`flex-1 bg-light`}>
<GroopHeader 
  minimal={true} 
  showMembers={true}
  isChatScreen={true}
  isItineraryScreen={false}
  onShowEncryptionInfo={() => setShowEncryptionInfo(true)}
/>

    <KeyboardAvoidingView 
      style={tw`flex-1 mt-4`}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} // Changed from 90 to 0
    >
      <FlashList
        ref={flashListRef}
        data={processMessagesWithDateSeparators()}
        renderItem={({ item }) => {
          // Check if item is a date separator
          if ('type' in item && item.type === 'dateSeparator') {
            return <DateSeparator date={item.date} />;
          }
          
          // Regular message (using type assertion)
          return (
            <MessageBubble 
              message={item as ChatMessage}
              isFromCurrentUser={(item as ChatMessage).senderId === profile?.uid}
              onReactionPress={handleReaction}
              onReplyPress={() => handleReply(item as ChatMessage)}
            />
          );
        }}
        keyExtractor={(item) => item.id}
        estimatedItemSize={80}
        contentContainerStyle={tw`px-4 pt-4 pb-2`}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        ListEmptyComponent={<EmptyChat />}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      {showScrollButton && (
        <TouchableOpacity
              style={tw`absolute right-4 bottom-16 bg-primary rounded-full w-10 h-10 items-center justify-center shadow-md z-10`}
              onPress={() => flashListRef.current?.scrollToEnd({ animated: true })}
        >
          <Ionicons name="arrow-down" size={24} color="white" />
        </TouchableOpacity>
      )}
      
      <MessageInput 
        onSend={sendMessage} 
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onInputFocus={() => {
          // Scroll to end when input is focused
          setTimeout(() => {
            flashListRef.current?.scrollToEnd({ animated: true });
          }, 50);
        }}
      />
    </KeyboardAvoidingView>
    <EncryptionInfoModal 
      isVisible={showEncryptionInfo}
      onClose={() => setShowEncryptionInfo(false)}
    />
  </SafeAreaView>
);
}