import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  where, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp, 
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChatMessage } from '../models/chat';
import { EncryptionService } from './EncryptionService';
import { UserAvatar } from '../contexts/AuthProvider'; // Add this import
import logger from '../utils/logger';
import { getAuth } from 'firebase/auth';

interface MessageData {
  text: string;
  replyTo?: { id: string; text: string; senderName: string };
  imageUrl?: string;
  senderAvatar?: any;
}

interface UserProfile {
  uid: string;
  displayName: string;
  avatar?: UserAvatar; // Now this will be recognized
}

export class ChatService {
  /**
   * Subscribe to messages with optimized delta updates
   */
  static subscribeToMessages(
    groopId: string, 
    callback: (messages: ChatMessage[], changes?: {
      added: ChatMessage[];
      modified: ChatMessage[];
      removed: string[];
    }) => void, 
    maxMessages = 30,
    lastSeenAt?: Date | null,
    initialLoad = true
  ): () => void {
    const startTime = performance.now();
    
    try {
      const messagesRef = collection(db, `groops/${groopId}/messages`);
      let messagesQuery;
      
      // FIXED: Always use the same query structure for consistent behavior
      logger.chat(`Setting up message subscription - Initial: ${initialLoad}, LastSeen: ${lastSeenAt?.toISOString()}`);
      
      if (initialLoad) {
        // Initial load query - get most recent messages
        messagesQuery = query(
          messagesRef,
          orderBy('createdAt', 'desc'),
          limit(maxMessages)
        );
      } else {
        // Continuous updates - get ALL messages (not just new ones)
        // This ensures we have the full context
        messagesQuery = query(
          messagesRef,
          orderBy('createdAt', 'desc'),
          limit(maxMessages)
        );
      }
      
      // Variables to track performance
      let totalDocumentCount = 0;
      let totalChangeCount = 0;
      let docChangeOperations = 0;
      let isFirstLoad = true;
      
      // Set up the message map to track all messages
      const messagesMap = new Map<string, ChatMessage>();
      
      // Set up the subscription
      const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
        const batchStartTime = performance.now();
        
        // Get docChanges for more efficient updates
        const docChanges = snapshot.docChanges();
        
        // Record metrics
        totalDocumentCount += snapshot.docs.length;
        totalChangeCount += docChanges.length;
        docChangeOperations += 1;
        
        // FIXED: Only process actual changes, not all documents
        if (isFirstLoad) {
          logger.chat(`Initial load: Processing ${snapshot.docs.length} messages`);
          // Process all messages on first load
          for (const doc of snapshot.docs) {
            await this.processMessageDoc(doc, 'added', messagesMap, groopId);
          }
          isFirstLoad = false;
        } else {
          logger.chat(`Update: Processing ${docChanges.length} changes (not reloading all ${snapshot.docs.length} messages)`);
          // Only process actual changes
          for (const change of docChanges) {
            await this.processMessageDoc(change.doc, change.type, messagesMap, groopId);
          }
        }
        
        // Calculate processing time
        const processingTime = performance.now() - batchStartTime;
        
        // Create changes object for callback
        const changes = {
          added: [] as ChatMessage[],
          modified: [] as ChatMessage[],
          removed: [] as string[]
        };
        
        // Populate changes based on docChanges
        for (const change of docChanges) {
          const messageId = change.doc.id;
          
          if (change.type === 'removed') {
            changes.removed.push(messageId);
            messagesMap.delete(messageId);
          } else {
            const message = messagesMap.get(messageId);
            if (message) {
              if (change.type === 'added') {
                changes.added.push(message);
              } else if (change.type === 'modified') {
                changes.modified.push(message);
              }
            }
          }
        }
        
        // Log performance metrics
        if (isFirstLoad || docChanges.length > 0) {
          logger.chat(`${isFirstLoad ? 'Initial load' : 'Delta update'} metrics:`);
          logger.chat(`- Processed ${docChanges.length} changes out of ${snapshot.docs.length} total messages`);
          logger.chat(`- Processing time: ${processingTime.toFixed(0)}ms`);
        }
        
        // Create a sorted array of messages
        const messagesArray = Array.from(messagesMap.values());
        messagesArray.sort((a, b) => {
          const timeA = a.createdAt instanceof Date ? a.createdAt : new Date(0);
          const timeB = b.createdAt instanceof Date ? b.createdAt : new Date(0);
          return timeA.getTime() - timeB.getTime();
        });
        
        // Call the callback
        callback(messagesArray, changes);
      }, error => {
        logger.error(`Error in message subscription for groop ${groopId}:`, error);
      });
      
      return unsubscribe;
    } catch (error) {
      logger.error(`Failed to subscribe to messages for groop ${groopId}:`, error);
      return () => {};
    }
  }
  
  /**
   * Fetch older messages for pagination
   */
  static async fetchOlderMessages(
    groopId: string, 
    beforeTimestamp: Date, 
    maxMessages = 30
  ): Promise<ChatMessage[]> {
    logger.chat(`Fetching older messages for groop ${groopId} before ${beforeTimestamp.toISOString()}`);
    
    try {
      // Convert JavaScript Date to Firestore Timestamp
      const firestoreTimestamp = Timestamp.fromDate(beforeTimestamp);
      
      // Create query
      const messagesRef = collection(db, `groops/${groopId}/messages`);
      const olderMessagesQuery = query(
        messagesRef,
        orderBy('createdAt', 'desc'),
        where('createdAt', '<', firestoreTimestamp),
        limit(maxMessages)
      );
      
      // Execute query
      const snapshot = await getDocs(olderMessagesQuery);
      logger.chat(`Found ${snapshot.docs.length} older messages`);
      
      // Process results
      const messages: ChatMessage[] = [];
      
      // Process each message
      for (const doc of snapshot.docs) {
        try {
          const data = doc.data();
          const messageId = doc.id;
          
          // Convert createdAt to Date
          let createdAt: Date;
          if (data.createdAt) {
            if (data.createdAt.toDate) {
              createdAt = data.createdAt.toDate();
            } else if (typeof data.createdAt === 'number') {
              createdAt = new Date(data.createdAt);
            } else {
              createdAt = new Date();
            }
          } else {
            createdAt = new Date();
          }
          
          // Handle encrypted messages
          let messageText = data.text || '';
          let messageIsDecrypted = !data.isEncrypted;
          
          if (data.isEncrypted) {
            try {
              const decryptStartTime = performance.now();
              const decryptedText = await EncryptionService.decryptMessage(messageText, groopId);
              messageText = decryptedText || "[Encrypted message]";
              messageIsDecrypted = !!decryptedText;
              const decryptionTime = performance.now() - decryptStartTime;
              logger.chat(`Decrypted older message ${messageId.substring(0, 6)} in ${decryptionTime.toFixed(1)}ms - Success: ${messageIsDecrypted}`);
            } catch (error) {
              logger.error(`Error decrypting older message ${messageId}:`, error);
              messageText = "[Encrypted message]";
              messageIsDecrypted = false;
            }
          }
          
          // Create message object
          const message: ChatMessage = {
            id: messageId,
            text: messageText,
            senderId: data.senderId,
            senderName: data.senderName || 'User',
            senderAvatar: data.senderAvatar,
            createdAt,
            reactions: Object.freeze({ ...data.reactions }) || Object.freeze({}),
            read: [...(data.read || [])], // Remove Object.freeze here
            replyTo: data.replyTo,
            replyToSenderName: data.replyToSenderName,
            replyToText: data.replyToText,
            imageUrl: data.imageUrl,
            isEncrypted: data.isEncrypted || false,
            isDecrypted: messageIsDecrypted
          };
          
          messages.push(message);
        } catch (error) {
          logger.error('Error processing older message:', error);
        }
      }
      
      return messages.sort((a, b) => {
        const timeA = a.createdAt instanceof Date ? a.createdAt : new Date(0);
        const timeB = b.createdAt instanceof Date ? b.createdAt : new Date(0);
        return timeA.getTime() - timeB.getTime();
      });
    } catch (error) {
      logger.error(`Failed to fetch older messages for groop ${groopId}:`, error);
      throw error;
    }
  }
  
  /**
   * Send a new message
   */
  static async sendMessage(groopId: string, messageData: MessageData): Promise<string> {
    logger.chat(`Sending message to groop: ${groopId}, checking permissions`);
    
    try {
      // Get the current user
      const userProfile = await this.getCurrentUserProfile();
      
      if (!userProfile) {
        throw new Error('User not authenticated');
      }
      
      logger.chat('Permission check passed, creating message document');
      
      // Prepare message content
      const messageContent: any = {
        text: messageData.text,
        senderId: userProfile.uid,
        senderName: userProfile.displayName || 'User',
        createdAt: serverTimestamp(),
        read: [userProfile.uid], // Mark as read by sender
        reactions: {}
      };
      
      // Add sender avatar if available
      if (userProfile.avatar) {
        messageContent.senderAvatar = userProfile.avatar;
        logger.chat(`Including avatar of type: ${userProfile.avatar.type}`);
      }
      
      // Add reply information if replying to a message
      if (messageData.replyTo) {
        messageContent.replyTo = messageData.replyTo.id;
        messageContent.replyToText = messageData.replyTo.text;
        messageContent.replyToSenderName = messageData.replyTo.senderName;
      }
      
      // Add image if provided
      if (messageData.imageUrl) {
        messageContent.imageUrl = messageData.imageUrl;
      }
      
      // Check if encryption is enabled for this groop
      const groopDoc = await this.getGroopEncryptionStatus(groopId);
      const encryptionEnabled = groopDoc?.encryptionEnabled || false;
      
      // Encrypt the message if needed
      if (encryptionEnabled) {
        logger.chat('Encryption enabled, attempting to encrypt message');
        
        // Use await since hasGroupKey is now async
        const hasKey = await EncryptionService.hasGroupKey(groopId);
        if (!hasKey) {
          logger.error('No encryption key found for groop');
          throw new Error('No encryption key available for this group');
        }
        
        try {
          // Encrypt the message text
          messageContent.text = await EncryptionService.encryptMessage(messageContent.text, groopId);
          messageContent.isEncrypted = true;
          logger.chat('Message encrypted successfully');
        } catch (error) {
          logger.error('Failed to encrypt message:', error);
          // Fall back to unencrypted if encryption fails
          messageContent.isEncrypted = false;
        }
      }
      
      // Add the message to Firestore
      const messagesRef = collection(db, `groops/${groopId}/messages`);
      const docRef = await addDoc(messagesRef, messageContent);
      
      // Update the groop's lastActivity and lastMessage fields
      await this.updateGroopLastActivity(groopId, messageContent);
      
      // Send notifications to other groop members
      await this.sendNotifications(groopId, messageContent);
      
      logger.chat(`Message sent successfully (encrypted: ${messageContent.isEncrypted || false})`);
      
      return docRef.id;
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }
  
  /**
   * Add a reaction to a message (one reaction per user, toggle same emoji)
   */
  static async addReaction(groopId: string, messageId: string, emoji: string, userId: string): Promise<void> {
    try {
      logger.chat(`Adding reaction ${emoji} to message ${messageId}`);
      
      const messageRef = doc(db, `groops/${groopId}/messages/${messageId}`);
      const messageDoc = await (await getDocs(query(collection(db, `groops/${groopId}/messages`), where('__name__', '==', messageId)))).docs[0];
      
      if (!messageDoc.exists()) {
        throw new Error('Message not found');
      }
      
      const data = messageDoc.data();
      const reactions = { ...data.reactions } || {};
      
      // Check if user already has this exact emoji reaction
      const hasThisEmoji = reactions[emoji]?.includes(userId);
      
      if (hasThisEmoji) {
        // User clicked same emoji - REMOVE it entirely
        reactions[emoji] = reactions[emoji].filter(id => id !== userId);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
        logger.chat(`Removed user's reaction: ${emoji}`);
      } else {
        // Remove user from ALL other existing reactions first (one reaction per user)
        Object.keys(reactions).forEach(existingEmoji => {
          if (existingEmoji !== emoji && reactions[existingEmoji] && reactions[existingEmoji].includes(userId)) {
            reactions[existingEmoji] = reactions[existingEmoji].filter(id => id !== userId);
            if (reactions[existingEmoji].length === 0) {
              delete reactions[existingEmoji];
            }
            logger.chat(`Removed user from existing reaction: ${existingEmoji}`);
          }
        });
        
        // Add the new reaction
        if (!reactions[emoji]) {
          reactions[emoji] = [userId];
          logger.chat(`Added new reaction: ${emoji}`);
        } else {
          reactions[emoji] = [...reactions[emoji], userId];
          logger.chat(`Added user to existing reaction: ${emoji}`);
        }
      }
      
      // Update the message
      await updateDoc(messageRef, { reactions });
      
      logger.chat(`Reaction update completed for message ${messageId}`);
    } catch (error) {
      logger.error('Error adding reaction:', error);
      throw error;
    }
  }
  
  /**
   * Subscribe to unread messages count for the current user
   */
  static subscribeToUnreadMessages(userId: string, callback: (count: number) => void): () => void {
    logger.chat(`Setting up unread messages listener for user ${userId}`);
    
    try {
      // Query all groops where user is a member
      const groopsQuery = query(
        collection(db, 'groops'),
        where('members', 'array-contains', userId)
      );
      
      // Set up listener for changes to groops
      const unsubscribe = onSnapshot(groopsQuery, (snapshot) => {
        let totalUnread = 0;
        
        // Process each groop
        snapshot.docs.forEach((groopDoc) => {
          const groopData = groopDoc.data();
          
          // Check if there's a lastMessage
          if (groopData.lastMessage && groopData.lastMessage.timestamp) {
            // Check if the user has read this groop's last message
            const lastReadTimestamp = groopData.lastRead?.[userId];
            
            // Compare timestamps
            if (!lastReadTimestamp || 
                (groopData.lastMessage.timestamp.seconds > lastReadTimestamp.seconds || 
                 (groopData.lastMessage.timestamp.seconds === lastReadTimestamp.seconds && 
                  groopData.lastMessage.timestamp.nanoseconds > lastReadTimestamp.nanoseconds))) {
              // Increment unread count if this user didn't send the message
              if (groopData.lastMessage.senderId !== userId) {
                totalUnread++;
              }
            }
          }
        });
        
        logger.chat(`Detected ${totalUnread} unread conversations for user ${userId}`);
        callback(totalUnread);
      }, (error) => {
        logger.error(`Error in unread messages subscription:`, error);
        callback(0); // Default to 0 on error
      });
      
      return unsubscribe;
    } catch (error) {
      logger.error('Error setting up unread messages subscription:', error);
      return () => {}; // Return empty function on error
    }
  }

  /**
   * Get total unread messages count for the current user
   */
  static async getTotalUnreadMessagesCount(userId: string): Promise<number> {
    logger.chat(`Getting total unread messages count for user ${userId}`);
    
    try {
      // Query all groops where user is a member
      const groopsQuery = query(
        collection(db, 'groops'),
        where('members', 'array-contains', userId)
      );
      
      const groopsSnapshot = await getDocs(groopsQuery);
      let totalUnread = 0;
      
      // Process each groop
      groopsSnapshot.docs.forEach((groopDoc) => {
        const groopData = groopDoc.data();
        
        // Check if there's a lastMessage
        if (groopData.lastMessage && groopData.lastMessage.timestamp) {
          // Check if the user has read this groop's last message
          const lastReadTimestamp = groopData.lastRead?.[userId];
          
          // Compare timestamps
          if (!lastReadTimestamp || 
              (groopData.lastMessage.timestamp.seconds > lastReadTimestamp.seconds || 
               (groopData.lastMessage.timestamp.seconds === lastReadTimestamp.seconds && 
                groopData.lastMessage.timestamp.nanoseconds > lastReadTimestamp.nanoseconds))) {
            // Increment unread count if this user didn't send the message
            if (groopData.lastMessage.senderId !== userId) {
              totalUnread++;
            }
          }
        }
      });
      
      logger.chat(`Found ${totalUnread} unread conversations for user ${userId}`);
      return totalUnread;
    } catch (error) {
      logger.error('Error getting total unread messages count:', error);
      return 0;
    }
  }

  // Helper methods for the service
  private static async getCurrentUserProfile(): Promise<UserProfile> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('No authenticated user');
      }
      
      // Get user profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }
      
      const userData = userDoc.data();
      
      return {
        uid: currentUser.uid,
        displayName: userData.displayName || currentUser.displayName || 'User',
        avatar: userData.avatar
      };
    } catch (error) {
      logger.error('Error getting current user profile:', error);
      throw error;
    }
  }
  
  private static async getGroopEncryptionStatus(groopId: string) {
    // Placeholder: Check encryption status from Firestore
    return { encryptionEnabled: true };
  }
  
  private static async updateGroopLastActivity(groopId: string, messageContent: any) {
    try {
      const groopRef = doc(db, `groops/${groopId}`);
      
      // Create a lastMessage object
      const lastMessage = {
        id: groopId,
        text: messageContent.isEncrypted ? "🔒 Encrypted message" : messageContent.text,
        senderId: messageContent.senderId,
        senderName: messageContent.senderName,
        timestamp: serverTimestamp(),
        isEncrypted: messageContent.isEncrypted || false,
        hasImage: !!messageContent.imageUrl
      };
      
      // Update the groop document
      await updateDoc(groopRef, {
        lastActivity: serverTimestamp(),
        lastMessage
      });
      
      logger.chat(`Updated groop last activity for ${groopId}`);
    } catch (error) {
      logger.error('Error updating groop last activity:', error);
    }
  }
  
  private static async sendNotifications(groopId: string, messageContent: any) {
    try {
      // Get groop members
      const groopRef = doc(db, `groops/${groopId}`);
      const groopDoc = await (await getDocs(query(collection(db, 'groops'), where('__name__', '==', groopId)))).docs[0];
      
      if (!groopDoc.exists()) {
        throw new Error('Groop not found');
      }
      
      const members = groopDoc.data().members || [];
      
      // Filter out the sender
      const recipientIds = members.filter(id => id !== messageContent.senderId);
      
      logger.chat(`Sending notifications to ${members.length} members`);
      
      if (recipientIds.length > 0) {
        // Prepare notification data
        const notificationData = {
          type: 'new_message',
          groopId,
          senderId: messageContent.senderId,
          senderName: messageContent.senderName,
          messageText: messageContent.isEncrypted ? "🔒 Encrypted message" : messageContent.text,
          timestamp: serverTimestamp(),
          recipients: recipientIds
        };
        
        // Add to notifications collection
        const notificationsRef = collection(db, 'notifications');
        await addDoc(notificationsRef, notificationData);
        
        logger.chat(`Notification record created`);
        logger.chat(`Server would now send push notifications to tokens: ${JSON.stringify(recipientIds.map(() => "DEVELOPMENT-MOCK-TOKEN"))}`);
      }
    } catch (error) {
      logger.error('Error sending notifications:', error);
    }
  }
  
  // Add this helper method to process individual message documents
  private static async processMessageDoc(
    doc: QueryDocumentSnapshot<DocumentData>, 
    changeType: 'added' | 'modified' | 'removed',
    messagesMap: Map<string, ChatMessage>,
    groopId: string
  ): Promise<void> {
    try {
      const data = doc.data();
      const messageId = doc.id;
      
      if (changeType === 'removed') {
        messagesMap.delete(messageId);
        return;
      }
      
      // Convert createdAt to Date
      let createdAt: Date;
      if (data.createdAt) {
        if (data.createdAt.toDate) {
          createdAt = data.createdAt.toDate();
        } else if (typeof data.createdAt === 'number') {
          createdAt = new Date(data.createdAt);
        } else {
          createdAt = new Date();
        }
      } else {
        createdAt = new Date();
      }
      
      // Handle encrypted messages
      let messageText = data.text || '';
      let messageIsDecrypted = !data.isEncrypted;
      
      if (data.isEncrypted) {
        try {
          const decryptStartTime = performance.now();
          const decryptedText = await EncryptionService.decryptMessage(messageText, groopId);
          messageText = decryptedText || "[Encrypted message]";
          messageIsDecrypted = !!decryptedText;
          const decryptionTime = performance.now() - decryptStartTime;
          
          if (changeType === 'added') {
            logger.chat(`Decrypted new message ${messageId.substring(0, 6)} in ${decryptionTime.toFixed(1)}ms`);
          }
        } catch (error) {
          logger.error(`Error decrypting message ${messageId}:`, error);
          messageText = "[Encrypted message]";
          messageIsDecrypted = false;
        }
      }
      
      // Create message object
      const message: ChatMessage = {
        id: messageId,
        text: messageText,
        senderId: data.senderId,
        senderName: data.senderName || 'User',
        senderAvatar: data.senderAvatar,
        createdAt,
        reactions: Object.freeze({ ...data.reactions }) || Object.freeze({}),
        read: [...(data.read || [])],
        replyTo: data.replyTo,
        replyToSenderName: data.replyToSenderName,
        replyToText: data.replyToText,
        imageUrl: data.imageUrl,
        isEncrypted: data.isEncrypted || false,
        isDecrypted: messageIsDecrypted
      };
      
      // Store in map
      messagesMap.set(messageId, message);
    } catch (error) {
      logger.error('Error processing message document:', error);
    }
  }
}