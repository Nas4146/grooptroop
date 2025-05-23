import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChatMessage, ChatItem, MessageOperation, DateSeparator } from '../models/chat';
import { ChatService } from '../services/chatService';
import logger from '../utils/logger';
import { startOfDay } from '../utils/dateUtils';
import ChatPerformanceMonitor from '../utils/chatPerformanceMonitor';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthProvider';

const MESSAGES_PER_PAGE = 30;

const deduplicateMessages = (messages: ChatMessage[]): ChatMessage[] => {
  // FIXED: Add safety check for undefined/null messages
  if (!messages || !Array.isArray(messages)) {
    return [];
  }
  
  const seen = new Set<string>();
  const deduplicated: ChatMessage[] = [];
  
  // Process messages in reverse order (newest first) to keep the latest version
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg && !seen.has(msg.id)) {
      seen.add(msg.id);
      deduplicated.unshift(msg); // Add to beginning to maintain chronological order
    }
  }
  
  return deduplicated;
};

// Add this helper function at the top of the file, after imports:

const convertToDate = (dateInput: Date | any): Date => {
  if (dateInput instanceof Date) {
    return dateInput;
  }
  
  // Handle Firestore Timestamp
  if (dateInput && typeof dateInput.seconds === 'number') {
    return new Date(dateInput.seconds * 1000);
  }
  
  // Handle other formats
  if (typeof dateInput === 'string' || typeof dateInput === 'number') {
    return new Date(dateInput);
  }
  
  // Fallback to current date
  console.warn('Unknown date format, using current date:', dateInput);
  return new Date();
};

export function useChatMessages(groopId: string | undefined) {
  // Get auth context at the top level (this is the correct place)
  const { profile } = useAuth();
  
  // Message state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  
  // New state variables
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<string | null>(null);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<Date | null>(null);
  
  // Reference to track the oldest message timestamp for pagination
  const oldestMessageTimestamp = useRef<Date | null>(null);
  
  // Track operations like sending messages for optimistic updates
  const [pendingOperations, setPendingOperations] = useState<MessageOperation[]>([]);
  
  // Unsubscribe functions for Firestore listeners
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  // Get the last read timestamp for the current user
  const getLastReadTimestamp = useCallback(async (groopId: string, userId: string): Promise<Date | null> => {
    try {
      const groopRef = doc(db, 'groops', groopId);
      const groopDoc = await getDoc(groopRef);
      
      if (groopDoc.exists()) {
        const groopData = groopDoc.data();
        const lastReadData = groopData.lastRead?.[userId];
        
        if (lastReadData) {
          // Convert Firestore timestamp to Date
          return lastReadData.toDate ? lastReadData.toDate() : new Date(lastReadData);
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error getting last read timestamp:', error);
      return null;
    }
  }, []);
  
  // Set up message subscription
  useEffect(() => {
    if (!groopId) return;
    
    logger.chat(`Setting up message subscriptions for groop: ${groopId}`);
    
    // Initial load of recent messages
    const setupSubscriptions = async () => {
      setLoading(true);
      setError(null);
      
      try {
        logger.chat('Starting initial message load phase');
        
        // Get current user's last read timestamp
        let lastRead: Date | null = null;
        
        if (profile?.uid) {
          lastRead = await getLastReadTimestamp(groopId, profile.uid);
          setLastReadTimestamp(lastRead);
          logger.chat(`Last read timestamp: ${lastRead?.toISOString() || 'none'}`);
        }
        
        // FIXED: Track if this is the first load vs subsequent updates
        let isFirstLoad = true;
        
        // Initial message subscription
        unsubscribeRef.current = ChatService.subscribeToMessages(
          groopId,
          (newMessages, changes) => {
            if (isFirstLoad) {
              logger.chat(`Initial load received ${newMessages.length} messages`);
              isFirstLoad = false;
              
              // Find first unread message if we have a lastRead timestamp
              if (lastRead && profile?.uid) {
                const firstUnread = newMessages.find(msg => {
                  const msgDate = msg.createdAt instanceof Date ? 
                    msg.createdAt : 
                    new Date((msg.createdAt as any).seconds * 1000);
                
                  return msgDate > lastRead && msg.senderId !== profile.uid;
                });
              
                if (firstUnread) {
                  setFirstUnreadMessageId(firstUnread.id);
                  logger.chat(`Found first unread message: ${firstUnread.id}`);
                } else {
                  setFirstUnreadMessageId(null);
                  logger.chat('No unread messages found');
                }
              }
            
              // Ensure messages are sorted chronologically (oldest first)
              const sortedMessages = [...newMessages].sort((a, b) => {
                const dateA = convertToDate(a.createdAt);
                const dateB = convertToDate(b.createdAt);                return dateA.getTime() - dateB.getTime();
              });
            
              setMessages(sortedMessages);
            
              // Update oldest message for pagination
              if (sortedMessages.length > 0) {
                const oldest = sortedMessages[0];
                const oldestDate = oldest.createdAt instanceof Date ? 
                  oldest.createdAt : 
                  new Date((oldest.createdAt as any).seconds * 1000);
              
                oldestMessageTimestamp.current = oldestDate;
                logger.chat(`Setting oldestMessageTimestamp to ${oldestDate.toISOString()}`);
              }
            
              setLoading(false);
            } else {
              // FIXED: Handle incremental updates without full reload
              logger.chat(`Delta update: ${changes?.added?.length || 0} added, ${changes?.modified?.length || 0} modified, ${changes?.removed?.length || 0} removed`);
              
              if (changes) {
                setMessages(prevMessages => {
                  // Create a stable map from current messages
                  const messageMap = new Map(prevMessages.map(msg => [msg.id, msg]));
                  
                  // FIXED: Only remove messages that are actually in the removed list from Firestore
                  // Don't remove messages just because we're processing optimistic updates
                  (changes.removed || []).forEach(id => {
                    if (id.startsWith('temp-')) {
                      // Always remove temp messages
                      messageMap.delete(id);
                      logger.chat(`Removed temp message: ${id}`);
                    } else {
                      // Log but don't remove real messages to prevent data inconsistency
                      logger.chat(`Ignoring removal of real message ${id} - likely due to query limits`);
                    }
                  });
                  
                  // Process added/modified messages
                  [...(changes.added || []), ...(changes.modified || [])].forEach(msg => {
                    // FIXED: Add safety check for message
                    if (!msg || !msg.id) return;
                    
                    messageMap.set(msg.id, msg);
                    logger.chat(`${changes.added?.includes(msg) ? 'Added' : 'Modified'} message: ${msg.id.substring(0, 6)}`);
                    
                    // FIXED: Remove any optimistic messages with the same text and sender
                    if (changes.added?.includes(msg)) {
                      // Find and remove temp messages from the same user with similar content
                      const tempMessagesToRemove: string[] = [];
                      
                      messageMap.forEach((existingMsg, existingId) => {
                        if (existingId.startsWith('temp-') && 
                            existingMsg.senderId === msg.senderId && 
                            existingMsg.text === msg.text) {
                          
                          // FIXED: Use helper function for consistent date conversion
                          const msgDate = convertToDate(msg.createdAt);
                          const existingMsgDate = convertToDate(existingMsg.createdAt);
                          
                          const timeDifference = Math.abs(msgDate.getTime() - existingMsgDate.getTime());
                          
                          if (timeDifference < 10000) { // Within 10 seconds - likely the optimistic version
                            tempMessagesToRemove.push(existingId);
                          }
                        }
                      });
                      
                      // Remove the temp messages
                      tempMessagesToRemove.forEach(tempId => {
                        messageMap.delete(tempId);
                        logger.chat(`Removed optimistic message: ${tempId}`);
                        
                        // Also remove from pending operations
                        setPendingOperations(prev => (prev || []).filter(op => op.id !== tempId));
                      });
                    }
                  });
                  
                  // Convert back to sorted array - ensure stable sort
                  const updatedMessages = Array.from(messageMap.values());
                  
                  // FIXED: Add debugging for message count changes
                  const messageCountBefore = prevMessages.length;
                  const messageCountAfter = updatedMessages.length;
                  
                  if (Math.abs(messageCountBefore - messageCountAfter) > 1) {
                    logger.chat(`WARNING: Unexpected message count change: ${messageCountBefore} → ${messageCountAfter}`);
                    logger.chat(`Added: ${changes.added?.length || 0}, Modified: ${changes.modified?.length || 0}, Removed: ${changes.removed.length}`);
                    
                    // Log which messages are missing
                    const prevIds = new Set(prevMessages.map(m => m.id));
                    const newIds = new Set(updatedMessages.map(m => m.id));
                    
                    const missingIds = Array.from(prevIds).filter(id => !newIds.has(id));
                    const addedIds = Array.from(newIds).filter(id => !prevIds.has(id));
                    
                    if (missingIds.length > 0) {
                      logger.chat(`Missing messages: ${missingIds.join(', ')}`);
                    }
                    if (addedIds.length > 0) {
                      logger.chat(`Added messages: ${addedIds.join(', ')}`);
                    }
                  }
                  
                  updatedMessages.sort((a, b) => {
                    const dateA = convertToDate(a.createdAt);
                    const dateB = convertToDate(b.createdAt);
                    return dateA.getTime() - dateB.getTime();
                  });
                  
                  logger.chat(`Updated message list: ${messageCountBefore} → ${messageCountAfter} messages`);
                  return updatedMessages;
                });
              }
            }
          },
          MESSAGES_PER_PAGE,
          lastRead,
          true // Initial load = true
        );
      } catch (err) {
        logger.error('Error setting up message subscription:', err);
        setError(err as Error);
        setLoading(false);
      }
    };
    
    setupSubscriptions();
    
    return () => {
      if (unsubscribeRef.current) {
        logger.chat('Cleaning up message subscription');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [groopId, profile?.uid, getLastReadTimestamp]);
  
  // Function to load older messages (pagination)
  const loadOlderMessages = useCallback(async () => {
    if (!groopId || !oldestMessageTimestamp.current || loadingOlderMessages || !hasMoreMessages) {
      return;
    }
    
    setLoadingOlderMessages(true);
    
    try {
      logger.chat(`Loading older messages before ${oldestMessageTimestamp.current.toISOString()}`);
      
      const olderMessages = await ChatService.fetchOlderMessages(
        groopId,
        oldestMessageTimestamp.current,
        MESSAGES_PER_PAGE
      );
      
      logger.chat(`Fetched ${olderMessages.length} older messages`);
      
      if (olderMessages.length === 0) {
        setHasMoreMessages(false);
      } else {
        // Update the oldest timestamp for next pagination
        const sortedMessages = [...olderMessages].sort((a, b) => {
          const dateA = convertToDate(a.createdAt);
          const dateB = convertToDate(b.createdAt);          
          return dateA.getTime() - dateB.getTime();
        });
        
        const oldest = sortedMessages[0];
        const oldestDate = oldest.createdAt instanceof Date ? 
          oldest.createdAt : 
          new Date((oldest.createdAt as any).seconds * 1000);
        
        oldestMessageTimestamp.current = oldestDate;
        
        // Merge with existing messages
        setMessages(prevMessages => {
          // Create a map of existing messages to prevent duplicates
          const messageMap = new Map(prevMessages.map(msg => [msg.id, msg]));
          
          // Add new messages, avoiding duplicates
          olderMessages.forEach(msg => {
            if (!messageMap.has(msg.id)) {
              messageMap.set(msg.id, msg);
            }
          });
          
          // Convert back to array and sort
          const mergedMessages = Array.from(messageMap.values());
          return mergedMessages.sort((a, b) => {
            const dateA = convertToDate(a.createdAt);
            const dateB = convertToDate(b.createdAt);            return dateA.getTime() - dateB.getTime();
          });
        });
      }
    } catch (err) {
      logger.error('Error loading older messages:', err);
      setError(err as Error);
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [groopId, loadingOlderMessages, hasMoreMessages]);
  
  // Process messages with date separators for display
  const processMessagesWithDateSeparators = useMemo((): ChatItem[] => {
    if (!messages.length) return [];

    // FIXED: Use useMemo for expensive operations to prevent unnecessary recalculations
    const deduplicatedMessages = deduplicateMessages(messages);
    
    const items: ChatItem[] = [];
    let currentDay: Date | null = null;

    deduplicatedMessages.forEach(message => {
      const messageDate = message.createdAt instanceof Date ? 
        message.createdAt : 
        new Date((message.createdAt as any).seconds * 1000);
      
      const messageDay = startOfDay(messageDate);
      
      if (!currentDay || messageDay.getTime() !== currentDay.getTime()) {
        currentDay = messageDay;
        items.push({
          id: `date-${messageDay.toISOString()}`,
          type: 'dateSeparator',
          date: messageDay
        } as DateSeparator);
      }
      
      items.push(message);
    });

    return items;
  }, [messages]);
  
  // Send a new message with optimistic updates
  const sendMessage = useCallback(async (
    text: string, 
    replyTo?: { id: string, text: string, senderName: string }, 
    imageUrl?: string
  ) => {
    if (!groopId || !profile) {
      console.warn('[CHAT] Cannot send message: missing groopId or profile');
      return false;
    }
    
    const messageId = `msg_${Date.now()}`;
    const messageSize = text.length + (imageUrl ? 1000 : 0);
    
    ChatPerformanceMonitor.trackMessageSendStart(messageId, messageSize);
    
    // Create a temporary ID for optimistic updates
    const tempId = `temp-${Date.now()}`;
    
    // Add to pending operations
    setPendingOperations(prev => [
      ...prev,
      { id: tempId, status: 'sending', timestamp: Date.now() }
    ]);
    
    try {
      // Add optimistic message immediately
      const optimisticMessage: ChatMessage = {
        id: tempId,
        text,
        senderId: profile.uid,
        senderName: profile.displayName || 'You',
        senderAvatar: profile.avatar,
        createdAt: new Date(),
        reactions: {},
        read: [],
        replyTo: replyTo?.id,
        replyToText: replyTo?.text,
        replyToSenderName: replyTo?.senderName,
        imageUrl,
        isEncrypted: false,
        isDecrypted: true
      };
      
      // Add optimistic message
      setMessages(prev => {
        // Remove any existing temp messages from this user first
        const withoutTemp = prev.filter(msg => !msg.id.startsWith('temp-'));
        return [...withoutTemp, optimisticMessage];
      });
      
      // Actually send the message
      await ChatService.sendMessage(groopId, { text, replyTo, imageUrl });
      
      // FIXED: Don't remove immediately - let the subscription handle it
      // The real message will come through the subscription and we'll handle cleanup there
    
      ChatPerformanceMonitor.trackMessageSendComplete(messageId, true);
      
      return true;
    } catch (err) {
      logger.error('Error sending message:', err);
      
      // Update operation status to failed
      setPendingOperations(prev => 
        prev.map(op => op.id === tempId ? { ...op, status: 'failed' } : op)
      );
      
      // Remove the optimistic message on failure
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      
      ChatPerformanceMonitor.trackMessageSendComplete(messageId, false);
      
      return false;
    }
  }, [groopId, profile]);
  
  // Add a reaction to a message
  const addReaction = useCallback(async (messageId: string, emoji: string, userId: string) => {
    if (!groopId || !profile) return;
    
    try {
      // Optimistic update
      setMessages(prevMessages => {
        return prevMessages.map(msg => {
          if (msg.id === messageId) {
            const updatedReactions = { ...msg.reactions };
            
            if (!updatedReactions[emoji]) {
              updatedReactions[emoji] = [userId];
            } else if (!updatedReactions[emoji].includes(userId)) {
              updatedReactions[emoji] = [...updatedReactions[emoji], userId];
            } else {
              // User is removing their reaction
              updatedReactions[emoji] = updatedReactions[emoji].filter(id => id !== userId);
              if (updatedReactions[emoji].length === 0) {
                delete updatedReactions[emoji];
              }
            }
            
            return { ...msg, reactions: updatedReactions };
          }
          return msg;
        });
      });
      
      // Actually update in Firestore
      await ChatService.addReaction(groopId, messageId, emoji, userId);
    } catch (err) {
      logger.error('Error adding reaction:', err);
      // We could implement a rollback here if needed
    }
  }, [groopId, profile]);
  
  // Refresh messages
  const refreshMessages = useCallback(() => {
    if (!groopId) return;
    
    // Clean up existing subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    // Reset state
    setMessages([]);
    setLoading(true);
    setError(null);
    setHasMoreMessages(true);
    setFirstUnreadMessageId(null);
    setLastReadTimestamp(null);
    oldestMessageTimestamp.current = null;
    
    // Set up new subscription (profile is already available from the hook call at top level)
    const setupRefreshSubscription = async () => {
      try {
        // Get last read timestamp for refresh
        let lastRead: Date | null = null;
        if (profile?.uid) {
          lastRead = await getLastReadTimestamp(groopId, profile.uid);
          setLastReadTimestamp(lastRead);
        }
        
        unsubscribeRef.current = ChatService.subscribeToMessages(
          groopId,
          (newMessages) => {
            // Fix for refresh: always set messages directly on refresh
            setMessages(newMessages);
            setLoading(false);
            
            // Find first unread message on refresh
            if (lastRead && profile?.uid) {
              const firstUnread = newMessages.find(msg => {
                const msgDate = msg.createdAt instanceof Date ? 
                  msg.createdAt : 
                  new Date((msg.createdAt as any).seconds * 1000);
                
                return msgDate > lastRead && msg.senderId !== profile.uid;
              });
              
              if (firstUnread) {
                setFirstUnreadMessageId(firstUnread.id);
              } else {
                setFirstUnreadMessageId(null);
              }
            }
            
            // Update oldest timestamp for pagination
            if (newMessages.length > 0) {
              const sortedMessages = [...newMessages].sort((a, b) => {
                const dateA = convertToDate(a.createdAt);
                const dateB = convertToDate(b.createdAt);                return dateA.getTime() - dateB.getTime();
              });
              
              const oldest = sortedMessages[0];
              const oldestDate = oldest.createdAt instanceof Date ? 
                oldest.createdAt : 
                new Date((oldest.createdAt as any).seconds * 1000);
            
              oldestMessageTimestamp.current = oldestDate;
            }
          },
          MESSAGES_PER_PAGE
        );
      } catch (err) {
        logger.error('Error refreshing messages:', err);
        setError(err as Error);
        setLoading(false);
      }
    };
    
    setupRefreshSubscription();
  }, [groopId, profile?.uid, getLastReadTimestamp]);
  
  return {
    messages: processMessagesWithDateSeparators,
    rawMessages: messages || [], // FIXED: Add safety check
    loading,
    error,
    hasMoreMessages,
    loadingOlderMessages,
    loadOlderMessages,
    sendMessage,
    addReaction,
    refreshMessages,
    pendingOperations: pendingOperations || [], // FIXED: Add safety check
    firstUnreadMessageId,
    lastReadTimestamp
  };
}