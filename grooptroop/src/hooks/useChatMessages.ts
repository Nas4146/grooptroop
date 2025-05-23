import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage, ChatItem, MessageOperation } from '../models/chat';
import { ChatService } from '../services/chatService';
import logger from '../utils/logger';
import { startOfDay } from '../utils/dateUtils';
import ChatPerformanceMonitor from '../utils/chatPerformanceMonitor';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthProvider';

const MESSAGES_PER_PAGE = 30;

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
        
        // Get current user's last read timestamp (profile is already available from hook call above)
        let lastRead: Date | null = null;
        
        if (profile?.uid) {
          lastRead = await getLastReadTimestamp(groopId, profile.uid);
          setLastReadTimestamp(lastRead);
          logger.chat(`Last read timestamp: ${lastRead?.toISOString() || 'none'}`);
        }
        
        // Initial message subscription
        unsubscribeRef.current = ChatService.subscribeToMessages(
          groopId,
          (newMessages, changes) => {
            logger.chat(`Initial load received ${newMessages.length} messages`);
            
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
              const dateA = a.createdAt instanceof Date ? a.createdAt : new Date((a.createdAt as any).seconds * 1000);
              const dateB = b.createdAt instanceof Date ? b.createdAt : new Date((b.createdAt as any).seconds * 1000);
              return dateA.getTime() - dateB.getTime(); // Ascending order: oldest first
            });
            
            setMessages(sortedMessages);
            
            // Update oldest message for pagination
            if (sortedMessages.length > 0) {
              const oldest = sortedMessages[0]; // First message is oldest
              const oldestDate = oldest.createdAt instanceof Date ? 
                oldest.createdAt : 
                new Date((oldest.createdAt as any).seconds * 1000);
              
              oldestMessageTimestamp.current = oldestDate;
              logger.chat(`Setting oldestMessageTimestamp to ${oldestDate.toISOString()}`);
            }
            
            setLoading(false);
          },
          MESSAGES_PER_PAGE
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
  }, [groopId, profile?.uid, getLastReadTimestamp]); // Add profile?.uid to dependencies
  
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
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date((a.createdAt as any).seconds * 1000);
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date((b.createdAt as any).seconds * 1000);
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
            const dateA = a.createdAt instanceof Date ? a.createdAt : new Date((a.createdAt as any).seconds * 1000);
            const dateB = b.createdAt instanceof Date ? b.createdAt : new Date((b.createdAt as any).seconds * 1000);
            return dateA.getTime() - dateB.getTime();
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
  
  // Make sure date separators are processed in the right order:

  // Process messages with date separators for display
  const processMessagesWithDateSeparators = useCallback((): ChatItem[] => {
    if (!messages.length) return [];

    const items: ChatItem[] = [];
    let currentDay: Date | null = null;

    // Messages are already sorted chronologically (oldest first)
    // Process them in order to add date separators
    messages.forEach(message => {
      const messageDate = message.createdAt instanceof Date ? 
        message.createdAt : 
        new Date((message.createdAt as any).seconds * 1000);
      
      const messageDay = startOfDay(messageDate);
      
      // If we're on a new day, add a date separator
      if (!currentDay || messageDay.getTime() !== currentDay.getTime()) {
        currentDay = messageDay;
        items.push({
          id: `date-${messageDay.toISOString()}`,
          type: 'dateSeparator',
          date: messageDay
        } as DateSeparatorItem);
      }
      
      // Add the message
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
    if (!groopId) return;
    
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
        senderId: 'current-user', // Will be replaced by actual user ID in service
        senderName: 'You',
        createdAt: new Date(),
        reactions: {}, // No need to freeze for optimistic messages
        read: [], // Use mutable array without Object.freeze
        replyTo: replyTo?.id,
        replyToText: replyTo?.text,
        replyToSenderName: replyTo?.senderName,
        imageUrl, // Add image URL
        isEncrypted: false,
        isDecrypted: true
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      
      // Actually send the message
      await ChatService.sendMessage(groopId, { text, replyTo, imageUrl });
      
      // Update operation status
      setPendingOperations(prev => 
        prev.map(op => op.id === tempId ? { ...op, status: 'sent' } : op)
      );
      
      // Remove the optimistic message after a delay
      // The real message will come through the subscription
      setTimeout(() => {
        setMessages(prev => prev.filter(msg => msg.id !== tempId));
        setPendingOperations(prev => prev.filter(op => op.id !== tempId));
      }, 300);
      
      ChatPerformanceMonitor.trackMessageSendComplete(messageId, true);
      
      return true;
    } catch (err) {
      logger.error('Error sending message:', err);
      
      // Update operation status to failed
      setPendingOperations(prev => 
        prev.map(op => op.id === tempId ? { ...op, status: 'failed' } : op)
      );
      
      // Remove the optimistic message
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      
      ChatPerformanceMonitor.trackMessageSendComplete(messageId, false);
      
      return false;
    }
  }, [groopId]);
  
  // Add a reaction to a message
  const addReaction = useCallback(async (messageId: string, emoji: string, userId: string) => {
    if (!groopId) return;
    
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
  }, [groopId]);
  
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
            
            setMessages(newMessages);
            setLoading(false);
            
            // Update oldest timestamp for pagination
            if (newMessages.length > 0) {
              const sortedMessages = [...newMessages].sort((a, b) => {
                const dateA = a.createdAt instanceof Date ? a.createdAt : new Date((a.createdAt as any).seconds * 1000);
                const dateB = b.createdAt instanceof Date ? b.createdAt : new Date((b.createdAt as any).seconds * 1000);
                return dateA.getTime() - dateB.getTime();
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
    messages: processMessagesWithDateSeparators(),
    rawMessages: messages,
    loading,
    error,
    hasMoreMessages,
    loadingOlderMessages,
    loadOlderMessages,
    sendMessage,
    addReaction,
    refreshMessages,
    pendingOperations,
    firstUnreadMessageId,        // Add this
    lastReadTimestamp           // Add this
  };
}