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
  KeyboardEvent,
  Dimensions // Make sure this is imported
} from 'react-native';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
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
import logger from '../utils/logger';


type ChatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

// Define a MessageInputHandle type to fix the ref issue
type MessageInputHandle = {
  focus: () => void;
  blur: () => void;
};

export default function ChatScreen({ route }: { route: ChatScreenRouteProp }) {
  // All state definitions and refs first...
  const { profile } = useAuth();
  const { currentGroop } = useGroop();
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<ReplyingToMessage | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeenTimestamp, setLastSeenTimestamp] = useState<Date | null>(null);
  const [oldestMessageTimestamp, setOldestMessageTimestamp] = useState<Date | null>(null);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  
  // Fix the ref type to use our custom MessageInputHandle
  const inputRef = useRef<MessageInputHandle>(null);
  const flashListRef = useRef<FlashList<ChatItemType>>(null);
  const sentryTransaction = useRef<SentrySpan | null>(null);
  const scrollOffsetRef = useRef(0);
  const hasRecentReaction = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const prevContentOffsetRef = useRef(0);
  const scrollDirectionRef = useRef<'up' | 'down'>('down');
  const initialLoadRef = useRef(true);
  const continuousSubscriptionRef = useRef<(() => void) | null>(null);
  // Move the lastSeenTimestampRef here, outside of the useEffect
  const lastSeenTimestampRef = useRef<Date | null>(null);
  
  const [showEncryptionInfo, setShowEncryptionInfo] = useState(false);
  const [encryptionLoading, setEncryptionLoading] = useState(false);
  const { refreshUnreadCount } = useNotification();
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [initialScrollComplete, setInitialScrollComplete] = useState(false);
  const [hasScrolledToUnread, setHasScrolledToUnread] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false); // Add this line

  // Calculate the optimal draw distance based on screen height
  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const OPTIMAL_DRAW_DISTANCE = Math.round(SCREEN_HEIGHT * 1.5);

  // Add these references to monitor scrolling behavior
  // Handle scroll events
  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const layoutHeight = event.nativeEvent.layoutMeasurement.height;

    // Detect scroll direction
    const direction = offsetY < prevContentOffsetRef.current ? 'up' : 'down';
    scrollDirectionRef.current = direction;
    prevContentOffsetRef.current = offsetY;
    
    // Store current scroll offset for reaction handling
    scrollOffsetRef.current = offsetY;
    
    // Show button when user has scrolled up a bit
    setShowScrollButton(offsetY < contentHeight - layoutHeight - 100);
  }, []);
    
  // Update the function to update lastSeenTimestamp
  const updateLastSeenTimestamp = useCallback((messages: ChatMessage[]) => {
    if (messages.length > 0) {
      // Find the latest message timestamp
      const latestMessage = [...messages].sort((a, b) => {
        const timeA = a.createdAt instanceof Date ? a.createdAt : new Date(0);
        const timeB = b.createdAt instanceof Date ? b.createdAt : new Date(0);
        return timeB.getTime() - timeA.getTime();  // Newest first
      })[0];
      
      if (latestMessage && latestMessage.createdAt) {
        let timestamp: Date;
        
        // Handle different timestamp formats
        if (latestMessage.createdAt instanceof Date) {
          timestamp = latestMessage.createdAt;
        } else if (typeof latestMessage.createdAt === 'object' && latestMessage.createdAt?.toDate) {
          // Handle Firestore Timestamp objects
          timestamp = latestMessage.createdAt.toDate();
        } else if (typeof latestMessage.createdAt === 'number') {
          // Handle numeric timestamps
          timestamp = new Date(latestMessage.createdAt);
        } else if (typeof latestMessage.createdAt === 'string') {
          // Handle string timestamps
          timestamp = new Date(latestMessage.createdAt);
        } else {
          // Fallback
          logger.warn('Unknown timestamp format in updateLastSeenTimestamp', latestMessage.createdAt);
          timestamp = new Date();
        }
        
        logger.chat(`Setting lastSeenTimestamp to ${timestamp.toISOString()}`);
        setLastSeenTimestamp(timestamp);
      }
    }
  }, []);
  
  // Update function to track oldest message timestamp for pagination using the same logic
  const updateOldestMessageTimestamp = useCallback((messages: ChatMessage[]) => {
    if (messages.length > 0) {
      // Find the oldest message timestamp
      const oldestMessage = [...messages].sort((a, b) => {
        const timeA = a.createdAt instanceof Date ? a.createdAt : new Date(0);
        const timeB = b.createdAt instanceof Date ? b.createdAt : new Date(0);
        return timeA.getTime() - timeB.getTime(); // Oldest first
      })[0];
      
      if (oldestMessage && oldestMessage.createdAt) {
        let timestamp: Date;
        
        // Handle different timestamp formats
        if (oldestMessage.createdAt instanceof Date) {
          timestamp = oldestMessage.createdAt;
        } else if (typeof oldestMessage.createdAt === 'object' && oldestMessage.createdAt?.toDate) {
          // Handle Firestore Timestamp objects
          timestamp = oldestMessage.createdAt.toDate();
        } else if (typeof oldestMessage.createdAt === 'number') {
          // Handle numeric timestamps
          timestamp = new Date(oldestMessage.createdAt);
        } else if (typeof oldestMessage.createdAt === 'string') {
          // Handle string timestamps
          timestamp = new Date(oldestMessage.createdAt);
        } else {
          // Fallback
          logger.warn('Unknown timestamp format in updateOldestMessageTimestamp', oldestMessage.createdAt);
          timestamp = new Date();
        }
        
        logger.chat(`Setting oldestMessageTimestamp to ${timestamp.toISOString()}`);
        setOldestMessageTimestamp(timestamp);
      }
    }
  }, []);
  
  // Add function to load older messages (for pagination)
  const loadOlderMessages = useCallback(async () => {
    // Check if we're already loading or if we're missing required data
    if (!currentGroop || !profile || !oldestMessageTimestamp || loadingOlderMessages || isLoadingMoreRef.current) {
      return;
    }
    
    // If we're not scrolling up, don't load more messages
    if (scrollDirectionRef.current !== 'up') {
      return;
    }
    
    // Set loading flags to prevent duplicate requests
    isLoadingMoreRef.current = true;
    setLoadingOlderMessages(true);
    
    try {
      logger.chat(`Loading messages older than ${oldestMessageTimestamp.toISOString()}`);
      
      // Call a ChatService method to fetch older messages
      const olderMessages = await ChatService.fetchOlderMessages(
        currentGroop.id,
        oldestMessageTimestamp,
        20 // Batch size
      );
      
      if (olderMessages.length === 0) {
        logger.chat('No older messages found');
        return;
      }
      
      logger.chat(`Loaded ${olderMessages.length} older messages`);
      
      // Track performance metrics for loading older messages
      if (sentryTransaction.current) {
        sentryTransaction.current.setData('pagination', {
          oldMessagesLoaded: olderMessages.length,
          fromTimestamp: oldestMessageTimestamp.toISOString()
        });
      }
      
      // Add older messages to the state
      setMessages(currentMessages => {
        // Merge with current messages, avoiding duplicates
        const messageMap = new Map(currentMessages.map(msg => [msg.id, msg]));
        
        // Add older messages to the map
        olderMessages.forEach(msg => {
          if (!messageMap.has(msg.id)) {
            messageMap.set(msg.id, msg);
          }
        });
        
        // Convert back to array and sort
        const mergedMessages = Array.from(messageMap.values());
        mergedMessages.sort((a, b) => {
          const timeA = a.createdAt instanceof Date ? a.createdAt : new Date(0);
          const timeB = b.createdAt instanceof Date ? b.createdAt : new Date(0);
          return timeA.getTime() - timeB.getTime();
        });
        
        // Update oldest timestamp if we found older messages
        if (olderMessages.length > 0) {
          updateOldestMessageTimestamp(olderMessages);
        }
        
        return mergedMessages;
      });
    } catch (error) {
      logger.error('Error loading older messages:', error);
    } finally {
      setLoadingOlderMessages(false);
      // Reset the loading ref with a small delay to prevent rapid consecutive calls
      setTimeout(() => {
        isLoadingMoreRef.current = false;
      }, 500);
    }
  }, [currentGroop, oldestMessageTimestamp, loadingOlderMessages, profile, updateOldestMessageTimestamp]);

  // Effect to track oldest timestamp whenever messages change
  useEffect(() => {
    if (messages.length > 0 && !loadingOlderMessages) {
      updateOldestMessageTimestamp(messages);
    }
  }, [messages, loadingOlderMessages, updateOldestMessageTimestamp]);

  // Update the refresh handler to reset timestamp
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Reset timestamp filter to get all messages
    setLastSeenTimestamp(null);
  }, []);

  // Process messages to include date separators
  const processMessagesWithDateSeparators = useCallback(() => {
    if (!messages.length) return [];

    // Helper function for date conversion with comprehensive error handling
    const getDateValue = (createdAt: any): Date => {
      if (!createdAt) {
        logger.warn('Chat message missing timestamp, using current time');
        return new Date();
      }
      
      try {
        // Case 1: Firestore Timestamp object with toDate() method
        if (createdAt?.toDate && typeof createdAt.toDate === 'function') {
          return createdAt.toDate();
        }
        
        // Case 2: JavaScript Date object
        if (createdAt instanceof Date) {
          // Verify it's a valid date
          if (!isNaN(createdAt.getTime())) {
            return createdAt;
          } else {
            logger.warn('Invalid Date object in message timestamp');
            return new Date();
          }
        }
        
        // Case 3: Timestamp as a number (milliseconds)
        if (typeof createdAt === 'number') {
          const date = new Date(createdAt);
          if (!isNaN(date.getTime())) {
            return date;
          } else {
            logger.warn(`Invalid timestamp number: ${createdAt}`);
            return new Date();
          }
        }
        
        // Case 4: Firestore Timestamp as raw object with seconds and nanoseconds
        if (typeof createdAt === 'object' && 'seconds' in createdAt) {
          const seconds = createdAt.seconds;
          const nanoseconds = createdAt.nanoseconds || 0;
          if (typeof seconds === 'number') {
            // Convert seconds + nanoseconds to milliseconds
            const milliseconds = (seconds * 1000) + (nanoseconds / 1000000);
            return new Date(milliseconds);
          }
        }
        
        // Case 5: ISO string or other string format
        if (typeof createdAt === 'string') {
          const date = new Date(createdAt);
          if (!isNaN(date.getTime())) {
            return date;
          } else {
            logger.warn(`Cannot parse date string: ${createdAt}`);
            return new Date();
          }
        }
        
        // Default fallback
        logger.warn(`Unrecognized timestamp format: ${typeof createdAt}`, createdAt);
        return new Date();
      } catch (error) {
        logger.error('Error converting message timestamp:', error, 
          typeof createdAt === 'object' ? JSON.stringify(createdAt) : createdAt
        );
        return new Date(); // Fallback to current time
      }
    };

    // Pre-sort messages by date with robust error handling
    const sortedMessages = [...messages].sort((a, b) => {
      try {
        const dateA = getDateValue(a.createdAt);
        const dateB = getDateValue(b.createdAt);
        
        return dateA.getTime() - dateB.getTime();  // Oldest first (for non-inverted list)
      } catch (err) {
        logger.error('Error sorting messages by date:', err);
        return 0; // Keep original order if comparison fails
      }
    });
    
    // Performance tracking - measure the time to process date separators
    const separatorStart = performance.now();
    
    // Create a new array with date separators
    const result: ChatItemType[] = [];
    let lastDateStr: string | null = null;
    
    let invalidDates = 0;
    let separatorsAdded = 0;
    
    sortedMessages.forEach(message => {
      try {
        // Get message date with our robust helper
        const messageDate = getDateValue(message.createdAt);
        
        // Get just the date portion for comparison (year, month, day)
        const dateStr = messageDate.toDateString();
        
        // If this is a new date, add a separator
        if (dateStr !== lastDateStr) {
          lastDateStr = dateStr;
          result.push({
            id: `date-${dateStr}-${Date.now()}`, // Add timestamp to ensure uniqueness
            type: 'dateSeparator',
            date: messageDate
          });
          separatorsAdded++;
        }
        
        // Add the message
        result.push(message);
      } catch (err) {
        // If we encounter an error processing a specific message, still include it
        // but log the error for debugging
        logger.error(`Error processing date for message ${message.id}:`, err);
        invalidDates++;
        
        // Still add the message without a date separator
        result.push(message);
      }
    });
    
    const separatorEnd = performance.now();
    const processingTime = separatorEnd - separatorStart;
    
    // Only log performance metrics occasionally to avoid spam
    if (result.length > 50 || processingTime > 10) {
      logger.chat(
        `Processed ${sortedMessages.length} messages with ${separatorsAdded} date separators in ${processingTime.toFixed(1)}ms` + 
        (invalidDates > 0 ? ` (${invalidDates} invalid dates)` : '')
      );
      
      // Track significant processing time in Sentry for diagnostics
      if (processingTime > 50 && sentryTransaction.current) {
        sentryTransaction.current.setData('dateSeparatorProcessing', {
          messageCount: sortedMessages.length,
          separatorsAdded,
          processingTimeMs: Math.round(processingTime),
          invalidDates
        });
      }
    }
    
    return result;
  }, [messages]);

  // Debug log
  useEffect(() => {
    logger.chat(`Current groop ID: ${currentGroop?.id}`);
  }, [currentGroop]);

  useEffect(() => {
    const initializeEncryption = async () => {
      setEncryptionLoading(true);
      try {
        if (profile && currentGroop) {
          logger.chat('Checking encryption status for group:', currentGroop.id);
          
          // Create groopRef here when you know currentGroop exists
          const groopRef = doc(db, 'groops', currentGroop.id);
          const groopSnap = await getDoc(groopRef);
          
          if (!groopSnap.data()?.encryptionEnabled) {
            logger.chat('Setting up encryption for group');
            // Set up encryption for this group
            await KeyExchangeService.setupGroopEncryption(currentGroop.id, profile.uid);
            logger.chat('Encryption setup complete');
          } else {
            logger.chat('Encryption already set up for this group');
            
            // Check if we have the key locally - THIS IS THE CRITICAL PART
            const hasKey = await EncryptionService.hasGroopKey(currentGroop.id);
            if (!hasKey) {
              logger.chat('Group key not found locally, generating new key');
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
      logger.chat('Current groop details:', {
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
      logger.chat('Chat screen focused, refreshing unread count');
      if (profile?.uid) {
        refreshUnreadCount();
      }
      return () => {};
    }, [refreshUnreadCount, profile])
  );

  // Load messages - hybrid approach
  useEffect(() => {
    if (!profile || !currentGroop) return;
    
    logger.chat(`Setting up message subscriptions for groop: ${currentGroop.name} (${currentGroop.id})`);
    
    // Update the ref value here instead of creating a new ref
    lastSeenTimestampRef.current = lastSeenTimestamp;
    
    // Clean up previous subscription if it exists
    if (continuousSubscriptionRef.current) {
      logger.chat('Cleaning up previous continuous subscription');
      continuousSubscriptionRef.current();
      continuousSubscriptionRef.current = null;
    }
    
    // Setup initial load subscription
    if (!initialLoadComplete || loading || refreshing) {
      logger.chat('Starting initial message load phase');
      initialLoadRef.current = true;
      
      const unsubscribe = ChatService.subscribeToMessages(
        currentGroop.id, 
        (newMessages, changes) => {
          logger.chat(`Initial load received ${newMessages.length} messages`);
          
          // Set the messages immediately
          setMessages(newMessages);
          setLoading(false);
          setRefreshing(false);
          
          // Update the timestamps
          if (newMessages.length > 0) {
            // Update the timestamps without directly changing state that affects this effect
            updateOldestMessageTimestamp(newMessages);
            
            // Extract the latest timestamp but don't set state yet
            const latestMessage = [...newMessages].sort((a, b) => {
              const timeA = a.createdAt instanceof Date ? a.createdAt : new Date(0);
              const timeB = b.createdAt instanceof Date ? b.createdAt : new Date(0);
              return timeB.getTime() - timeA.getTime();  // Newest first
            })[0];
            
            if (latestMessage && latestMessage.createdAt) {
              let timestamp: Date;
              
              // Handle different timestamp formats
              if (latestMessage.createdAt instanceof Date) {
                timestamp = latestMessage.createdAt;
              } else if (typeof latestMessage.createdAt === 'object' && latestMessage.createdAt?.toDate) {
                timestamp = latestMessage.createdAt.toDate();
              } else if (typeof latestMessage.createdAt === 'number') {
                timestamp = new Date(latestMessage.createdAt);
              } else if (typeof latestMessage.createdAt === 'string') {
                timestamp = new Date(latestMessage.createdAt);
              } else {
                timestamp = new Date();
              }
              
              logger.chat(`Initial load completed, setting up continuous subscription with timestamp: ${timestamp.toISOString()}`);
              
              // Store in ref rather than state to avoid re-renders
              lastSeenTimestampRef.current = timestamp;
              
              // Now set up continuous subscription with the latest timestamp
              setupContinuousSubscription(timestamp);
            }
          }
          
          // Count unread messages
          const unread = newMessages.filter(msg => 
            !msg.read.includes(profile.uid) && msg.senderId !== profile.uid
          );
          setUnreadCount(unread.length);
          
          // Mark initial load as complete, but do this last to avoid retriggering effect
          setInitialLoadComplete(true);
        },
        50, // maxMessages for initial load
        null, // No timestamp filter for initial load
        true // This is initial load
      );
      
      // Return the cleanup function
      return () => {
        logger.chat('Cleaning up initial message subscription');
        unsubscribe();
      };
    }
    
    // Define the continuous subscription setup function
    function setupContinuousSubscription(timestamp: Date) {
      // Only set up continuous subscription if we don't already have one
      if (continuousSubscriptionRef.current) {
        logger.chat('Continuous subscription already exists, skipping setup');
        return;
      }
      
      logger.chat(`Setting up continuous subscription with timestamp: ${timestamp.toISOString()}`);
      
      const unsubscribe = ChatService.subscribeToMessages(
        currentGroop.id,
        (newMessages, changes) => {
          if (!changes) {
            logger.chat('Continuous updates received full message set');
            return; // Unexpected case - should always have changes for continuous mode
          }
          
          // Apply incremental updates
          setMessages(currentMessages => {
            // Start with a copy of current messages in a map for easy access
            const messageMap = new Map(currentMessages.map(msg => [msg.id, msg]));
            let hasChanges = false;
            
            // Apply removals first
            if (changes.removed.length > 0) {
              changes.removed.forEach(id => {
                messageMap.delete(id);
                hasChanges = true;
              });
            }
            
            // Apply modifications
            if (changes.modified.length > 0) {
              changes.modified.forEach(msg => {
                messageMap.set(msg.id, msg);
                hasChanges = true;
              });
            }
            
            // Apply additions
            if (changes.added.length > 0) {
              changes.added.forEach(msg => {
                messageMap.set(msg.id, msg);
                hasChanges = true;
              });
              
              // Find the latest message timestamp and update the ref (not state)
              const allMessages = [...messageMap.values()];
              const latestMessage = [...allMessages].sort((a, b) => {
                const timeA = a.createdAt instanceof Date ? a.createdAt : new Date(0);
                const timeB = b.createdAt instanceof Date ? b.createdAt : new Date(0);
                return timeB.getTime() - timeA.getTime();  // Newest first
              })[0];
              
              if (latestMessage && latestMessage.createdAt) {
                let newTimestamp: Date;
                
                // Handle different timestamp formats
                if (latestMessage.createdAt instanceof Date) {
                  newTimestamp = latestMessage.createdAt;
                } else if (typeof latestMessage.createdAt === 'object' && latestMessage.createdAt?.toDate) {
                  newTimestamp = latestMessage.createdAt.toDate();
                } else if (typeof latestMessage.createdAt === 'number') {
                  newTimestamp = new Date(latestMessage.createdAt);
                } else if (typeof latestMessage.createdAt === 'string') {
                  newTimestamp = new Date(latestMessage.createdAt);
                } else {
                  newTimestamp = new Date();
                }
                
                logger.chat(`Updating lastSeenTimestamp ref to ${newTimestamp.toISOString()}`);
                lastSeenTimestampRef.current = newTimestamp;
                
                // Now update the state, but this won't trigger a re-render of this effect
                // because we're using the ref in the dependency array
                setLastSeenTimestamp(newTimestamp);
              }
            }
            
            // Only rebuild the array if there were actual changes
            if (!hasChanges) {
              return currentMessages;
            }
            
            // Convert back to array and sort
            const updatedMessages = Array.from(messageMap.values());
            updatedMessages.sort((a, b) => {
              const timeA = a.createdAt instanceof Date ? a.createdAt : new Date(0);
              const timeB = b.createdAt instanceof Date ? b.createdAt : new Date(0);
              return timeA.getTime() - timeB.getTime();
            });
            
            logger.chat(`Applied incremental updates: ${changes.added.length} added, ${changes.modified.length} modified, ${changes.removed.length} removed`);
            
            return updatedMessages;
          });
          
          // Count unread messages
          const unread = newMessages.filter(msg => 
            !msg.read.includes(profile.uid) && msg.senderId !== profile.uid
          );
          setUnreadCount(unread.length);
        },
        50, // maxMessages
        timestamp, // Use timestamp filter for continuous updates
        false // Not initial load
      );
      
      // Store the continuous subscription for cleanup
      continuousSubscriptionRef.current = unsubscribe;
    }
    
    // If we've completed initial load and have a timestamp but no continuous subscription,
    // set it up here
    if (initialLoadComplete && lastSeenTimestampRef.current && !continuousSubscriptionRef.current) {
      setupContinuousSubscription(lastSeenTimestampRef.current);
    }
    
    // Cleanup subscription
    return () => {
      if (continuousSubscriptionRef.current) {
        logger.chat(`Cleaning up continuous subscription for groop: ${currentGroop?.id || 'unknown'}`);
        continuousSubscriptionRef.current();
        continuousSubscriptionRef.current = null;
      }
    };
  }, [profile, currentGroop, loading, refreshing, initialLoadComplete, lastSeenTimestamp]); // Add lastSeenTimestamp to dependencies

  // Improve the LoadingIndicatorItem component with better UX
  const LoadingIndicatorItem = () => (
    <View style={tw`py-4 items-center justify-center`}>
      <View style={tw`bg-gray-50 rounded-full p-3`}>
        <ActivityIndicator size="small" color="#7C3AED" />
      </View>
      <Text style={tw`text-xs text-gray-500 mt-2`}>Loading older messages...</Text>
    </View>
  );

  // Add this component to let users know when they've reached the beginning of history
  const NoMoreMessagesHeader = () => (
    <View style={tw`py-4 items-center justify-center border-t border-gray-100`}>
      <Text style={tw`text-xs text-gray-400`}>You've reached the beginning of this chat</Text>
    </View>
  );

  // Add state to track if there are more messages to load
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  // Update the ChatService.fetchOlderMessages callback to set hasMoreMessages
  useEffect(() => {
    // Listen for updates from the fetch operation
    const handleOlderMessagesUpdate = (count: number) => {
      if (count === 0 && hasMoreMessages) {
        setHasMoreMessages(false);
        logger.chat('No more older messages available');
      } else if (count > 0 && !hasMoreMessages) {
        setHasMoreMessages(true);
      }
    };
    
    // Set up a listener in ChatPerformanceMonitor
    ChatPerformanceMonitor.on('olderMessagesLoaded', handleOlderMessagesUpdate);
    
    return () => {
      ChatPerformanceMonitor.off('olderMessagesLoaded', handleOlderMessagesUpdate);
    };
  }, [hasMoreMessages]);

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <GroopHeader 
        title={currentGroop?.name} 
        onBackPress={() => navigation.goBack()} 
        showEncryptionInfo={() => setShowEncryptionInfo(true)}  // This is correct - it's a function that shows the modal
        profile={profile}
        unreadCount={unreadCount}
        onRefresh={handleRefresh}
        loading={loading}
        encryptionEnabled={currentGroop?.encryptionEnabled}  // This is correct - it's the boolean flag
      />
      
      <View style={tw`flex-1`}>
        {/* Message list */}
        <FlashList
          ref={flashListRef}
          data={processMessagesWithDateSeparators()}
          renderItem={({ item }) => {
            if (item.type === 'dateSeparator') {
              return <DateSeparator date={item.date} />;
            }
            
            return (
              <MessageBubble 
                message={item} 
                isFromCurrentUser={item.senderId === profile?.uid}
                onReactionPress={(messageId, emoji) => {
                  if (currentGroop && profile) {
                    ChatService.addReaction(currentGroop.id, messageId, emoji, profile.uid);
                  } else {
                    logger.error('Cannot add reaction: currentGroop or profile is null');
                  }
                }}
                onReplyPress={(message) => {
                  setReplyingTo({
                    id: message.id,
                    text: message.text,
                    senderName: message.senderName
                  });
                  inputRef.current?.focus();
                }}
              />
            );
          }}
          keyExtractor={item => item.id}
          estimatedItemSize={120}
          contentContainerStyle={tw`px-4 pt-4 pb-2`}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            loading ? (
              <View style={tw`flex-1 justify-center items-center p-8`}>
                <ActivityIndicator size="large" color="#7C3AED" />
                <Text style={tw`text-gray-500 mt-4`}>Loading messages...</Text>
              </View>
            ) : (
              <View style={tw`flex-1 justify-center items-center p-8`}>
                <Ionicons name="chatbubble-outline" size={64} color="#E5E7EB" />
                <Text style={tw`text-gray-500 mt-4 text-center`}>
                  No messages yet. Be the first to send a message!
                </Text>
              </View>
            )
          }
          // Show loading indicator at the top when loading older messages,
          // or show "no more messages" header if we've reached the beginning
          ListHeaderComponent={
            loadingOlderMessages ? 
              <LoadingIndicatorItem /> : 
              !hasMoreMessages && messages.length > 0 ? 
                <NoMoreMessagesHeader /> : 
                null
          }
          onScroll={handleScroll}
          scrollEventThrottle={16}
          // This handler now checks scroll direction and avoids duplicate loading
          onEndReached={() => {
            if (scrollDirectionRef.current === 'up' && hasMoreMessages) {
              loadOlderMessages();
            }
          }}
          onEndReachedThreshold={0.2} // Increase threshold for earlier triggering
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: null, // Disable automatic scrolling while loading
          }}
          drawDistance={OPTIMAL_DRAW_DISTANCE}
          removeClippedSubviews={Platform.OS === 'android'} // This works better on Android, can cause issues on iOS
          disableAutoLayout={Platform.OS === 'ios' ? false : true}
          keyboardDismissMode="on-drag"
        />
        
        {/* Message input */}
        <MessageInput 
          ref={inputRef}
          onSend={(text) => {
            // Handle send message
            if (text.trim().length > 0 && currentGroop && profile) {
              // Proper call format with null checks
              ChatService.sendMessage(currentGroop.id, {
                text: text,
                senderId: profile.uid,
                senderName: profile.displayName || 'User',
                senderAvatar: profile.avatar
              });
              setReplyingTo(null); // Clear replying state after sending
            }
          }}
          onReply={(message: ChatMessage) => {
            // Handle reply with proper typing
            setReplyingTo({
              id: message.id,
              text: message.text,
              senderName: message.senderName
            });
            // Focus the input and prepend the reply text
            inputRef.current?.focus();
          }}
          replyingTo={replyingTo}
          profile={profile}
          loading={encryptionLoading}
        />
        
        {/* Scroll to top button */}
        {showScrollButton && (
          <TouchableOpacity 
            style={tw`absolute bottom-24 right-4 bg-blue-500 rounded-full p-3`}
            onPress={() => {
              // Scroll to top
              flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }}
          >
            <Ionicons name="arrow-up" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Encryption info modal */}
      {showEncryptionInfo && (
        <EncryptionInfoModal 
          visible={showEncryptionInfo} 
          onClose={() => setShowEncryptionInfo(false)} 
          groopId={currentGroop?.id}
        />
      )}
    </SafeAreaView>
  );
}