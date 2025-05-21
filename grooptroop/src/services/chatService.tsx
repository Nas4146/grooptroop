import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  serverTimestamp,
  getDocs,
  startAfter,
  where,
  Timestamp,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChatMessage } from '../models/chat';
import { EncryptionService } from './EncryptionService';
import { KeyExchangeService } from './KeyExchangeService';
import { UserAvatar } from '../contexts/AuthProvider';

export class ChatService {
  // Subscribe to messages with pagination
  static subscribeToMessages(groopId: string, callback: (messages: ChatMessage[]) => void, maxMessages = 50) {
    console.log(`[CHAT] Subscribing to messages for groop: ${groopId}`);
    const messagesRef = collection(db, `groops/${groopId}/messages`);
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(maxMessages));
    
    return onSnapshot(q, async (snapshot) => {
      const messages: ChatMessage[] = [];
      
      // Process messages one by one for decryption
      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Determine if this message needs decryption
        let messageText = data.text || '';
        let isDecrypted = false; // Add this to track decryption status
        
        if (data.isEncrypted) {
          try {
            // Try to decrypt the message
            const decryptedText = await EncryptionService.decryptMessage(messageText, groopId);
            
            if (decryptedText) {
              // Successfully decrypted
              messageText = decryptedText;
              isDecrypted = true; // Set to true when decryption succeeds
            } else {
              // Failed to decrypt
              messageText = "[Cannot decrypt - missing key]";
              isDecrypted = false;
            }
          } catch (error) {
            console.error('[CHAT] Error decrypting message:', error);
            messageText = "[Decryption error]";
            isDecrypted = false;
          }
        }
        
        // Create the message object with decryption status
        messages.push({
          id: doc.id,
          text: messageText,
          senderId: data.senderId,
          senderName: data.senderName,
          senderAvatar: data.senderAvatar,
          createdAt: data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          // Freeze the reactions object for stable references
          reactions: Object.freeze({ ...(data.reactions || {}) }),
          replyTo: data.replyTo,
          replyToText: data.replyToText,
          replyToSenderName: data.replyToSenderName,
          imageUrl: data.imageUrl,
          read: data.read || [],
          isEncrypted: data.isEncrypted || false,
          isDecrypted: data.isEncrypted ? isDecrypted : null, // Only relevant for encrypted messages
          attachments: data.attachments || []
        });
      }
      
      console.log(`[CHAT] Received and processed ${messages.length} messages from subscription`);
      if (__DEV__ && messages.length > 0) {
        console.log('[CHAT] First message avatar data type:', 
          messages[0].senderAvatar ? typeof messages[0].senderAvatar : 'none');
      }
      
      // Sort messages by creation time (newest last)
      messages.sort((a, b) => {
        const timeA = a.createdAt instanceof Date ? a.createdAt : new Date(0);
        const timeB = b.createdAt instanceof Date ? b.createdAt : new Date(0);
        return timeA.getTime() - timeB.getTime();
      });
      
      callback(messages);
    }, error => {
      console.error("[CHAT] Error listening to messages:", error);
    });
  }

  // Get total count of unread messages across all groops
  static async getTotalUnreadMessagesCount(userId: string): Promise<number> {
    try {
      console.log(`[CHAT] Getting total unread count for user: ${userId}`);
      
      // First, get the user's groop memberships
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        console.log(`[CHAT] User ${userId} not found`);
        return 0;
      }
      
      const userData = userDoc.data();
      const userGroops = userData.groops || [];
      
      console.log(`[CHAT] User is a member of ${userGroops.length} groops`);
      
      // Count unread messages across all groops
      let totalUnread = 0;
      
      for (const groopId of userGroops) {
        try {
          const messagesRef = collection(db, `groops/${groopId}/messages`);
          // Query for messages NOT sent by this user AND NOT read by this user
          const messagesQuery = query(
            messagesRef,
            where('senderId', '!=', userId)
          );
          
          const snapshot = await getDocs(messagesQuery);
          
          // Need to filter client-side since Firestore doesn't support
          // "array-does-not-contain" queries directly
          const unreadCount = snapshot.docs.filter(doc => {
            const data = doc.data();
            const readArray = data.read || [];
            return !readArray.includes(userId);
          }).length;
          
          console.log(`[CHAT] Groop ${groopId} has ${unreadCount} unread messages`);
          totalUnread += unreadCount;
        } catch (error) {
          console.error(`[CHAT] Error counting unread for groop ${groopId}:`, error);
        }
      }
      
      console.log(`[CHAT] Total unread messages across all groops: ${totalUnread}`);
      return totalUnread;
    } catch (error) {
      console.error('[CHAT] Error calculating total unread count:', error);
      return 0;
    }
  }

  // Subscribe to changes in unread message counts
  static subscribeToUnreadMessages(userId: string, callback: (count: number) => void) {
    console.log(`[CHAT] Setting up unread messages subscription for ${userId}`);
    
    // Get the user doc to monitor their groop memberships
    const userRef = doc(db, 'users', userId);
    
    return onSnapshot(userRef, async (userSnap) => {
      if (!userSnap.exists()) {
        console.log(`[CHAT] User document not found for ${userId}`);
        callback(0);
        return;
      }
      
      try {
        // When user doc changes, recalculate total unread count
        const totalUnread = await this.getTotalUnreadMessagesCount(userId);
        callback(totalUnread);
      } catch (error) {
        console.error('[CHAT] Error in unread subscription handler:', error);
        callback(0);
      }
    }, (error) => {
      console.error('[CHAT] Error in unread messages subscription:', error);
    });
  }

  // Send message to a specific groop
  static async sendMessage(groopId: string, messageData: {
    text: string;
    senderId: string;
    senderName: string;
    senderAvatar?: UserAvatar; // Updated to use UserAvatar type instead of string
    replyTo?: string;
    replyToName?: string, 
    replyToText?: string,
    imageUrl?: string;
  }) {
    try {
      console.log(`[CHAT] Sending message to groop: ${groopId}, checking permissions`);
      
      // First check if user has permission to access the group
      const groopRef = doc(db, 'groops', groopId);
      const groopSnap = await getDoc(groopRef);
      
      if (!groopSnap.exists()) {
        console.error(`[CHAT] Groop ${groopId} does not exist`);
        throw new Error('Groop not found');
      }
      
      if (!groopSnap.data().members.includes(messageData.senderId)) {
        console.error(`[CHAT] User ${messageData.senderId} is not a member of groop ${groopId}`);
        throw new Error('Not a member of this groop');
      }
      
      console.log('[CHAT] Permission check passed, creating message document');
      
      let encryptedText = messageData.text;
      let isEncrypted = false;
      
      // If encryption is enabled, encrypt the message
      if (groopSnap.exists() && groopSnap.data().encryptionEnabled) {
        try {
          // Add more detailed logging here
          console.log('[CHAT] Encryption enabled, attempting to encrypt message');
          
          // Check if we have a group key
          const hasKey = await EncryptionService.hasGroopKey(groopId);
          console.log(`[CHAT] Group key exists: ${hasKey}`);
          
          const encrypted = await EncryptionService.encryptMessage(messageData.text, groopId);
          if (encrypted) {
            encryptedText = encrypted;
            isEncrypted = true;
            console.log('[CHAT] Message encrypted successfully');
          } else {
            console.warn('[CHAT] Failed to encrypt message, sending in plaintext');
            // If possible, try to regenerate the key
            console.log('[CHAT] Attempting to initialize encryption again');
            await KeyExchangeService.setupGroopEncryption(groopId, messageData.senderId);
          }
        } catch (error) {
          console.error('[CHAT] Encryption error:', error);
          console.warn('[CHAT] Failed to encrypt message, sending in plaintext');
        }
      }
      
      // Create a new message document in the messages subcollection
      const messagesRef = collection(db, `groops/${groopId}/messages`);
      
      // Prepare message data with encrypted text
      const messageDocData: any = {
        text: encryptedText,
        isEncrypted: isEncrypted, // Set proper encryption flag
        senderId: messageData.senderId,
        senderName: messageData.senderName,
        createdAt: serverTimestamp(),
        reactions: {},
        read: [messageData.senderId]
      };
      
      // Include avatar data if available
      if (messageData.senderAvatar) {
        console.log(`[CHAT] Including avatar of type: ${messageData.senderAvatar.type}`);
        messageDocData.senderAvatar = messageData.senderAvatar;
      }
      
      // Only add these fields if they have values
      if (messageData.replyTo) {
        messageDocData.replyTo = messageData.replyTo;
        
        // Fetch the original message to get its text and sender
        try {
          const replyToDoc = await getDoc(doc(messagesRef, messageData.replyTo));
          if (replyToDoc.exists()) {
            const replyToData = replyToDoc.data();
            
            // Add reply text and sender name to the message data
            if (replyToData.isEncrypted) {
              // Handle encrypted replies - try to decrypt
              try {
                // Make sure we're using the correct function name from your EncryptionService
                const decryptedText = await EncryptionService.decryptMessage(replyToData.text, groopId);
                messageDocData.replyToText = decryptedText || "[Encrypted message]";
                
                // Add debug logging to verify the reply text is being set
                console.log(`[CHAT] Decrypted reply text (${decryptedText ? 'success' : 'failed'}): Length ${decryptedText?.length || 0}`);
              } catch (err) {
                console.error("[CHAT] Error decrypting replied message:", err);
                messageDocData.replyToText = "[Encrypted message]";
              }
            } else {
              messageDocData.replyToText = replyToData.text;
              console.log(`[CHAT] Setting plain text reply: "${replyToData.text.substring(0, 30)}..."`);
            }
            
            messageDocData.replyToSenderName = replyToData.senderName;
            
            console.log("[CHAT] Added reply context:", {
              replyTo: messageData.replyTo,
              replyToSenderName: messageDocData.replyToSenderName,
              replyToTextLength: messageDocData.replyToText?.length || 0
            });
          }
        } catch (error) {
          console.error('[CHAT] Error fetching replied message:', error);
          // Still create the message even if we can't fetch reply info
        }
      }
      
      if (messageData.imageUrl) {
        // For now, we're not encrypting image URLs
        messageDocData.imageUrl = messageData.imageUrl;
      }
      
      // Create a new message document
      const newMessageRef = await addDoc(messagesRef, {
        // Make sure senderAvatar is included here
        senderAvatar: messageData.senderAvatar || null,
        ...messageDocData
      });
      
      // Update groop's lastActivity field - Use placeholder for preview if encrypted
      await updateDoc(groopRef, {
        lastActivity: serverTimestamp(),
        lastMessage: {
          id: newMessageRef.id,
          text: isEncrypted ? "🔒 Encrypted message" : messageData.text.substring(0, 50),
          senderId: messageData.senderId,
          senderName: messageData.senderName,
          timestamp: serverTimestamp(),
          hasImage: !!messageData.imageUrl,
          isEncrypted: isEncrypted
        }
      });
      
      try {
        // Get members of this groop
        const membersToNotify = groopSnap.data()?.members || [];
                
        if (membersToNotify.length > 0) {
          console.log(`[CHAT] Sending notifications to ${membersToNotify.length} members`);
          
          // Don't notify the sender
          const recipientsToNotify = membersToNotify.filter(
            (memberId: string) => memberId !== messageData.senderId
          );
          
          if (recipientsToNotify.length > 0) {
            await this.sendChatNotification(
              groopId, 
              groopSnap.data()?.name || 'Group Chat',
              messageData.senderName,
              isEncrypted ? "New encrypted message" : messageData.text,
              recipientsToNotify,
              newMessageRef.id
            );
          }
        }
      } catch (notifError) {
        console.error('[CHAT] Error sending notifications:', notifError);
        // Don't fail the message send if notification fails
      }

      console.log(`[CHAT] Message sent successfully (encrypted: ${isEncrypted})`);
      return newMessageRef.id;
    } catch (error) {
      console.error("[CHAT] Error sending message:", error);
      throw error;
    }
  }
  
  // Send chat notification
  static async sendChatNotification(
    groopId: string,
    groopName: string,
    senderName: string,
    messageText: string,
    recipientIds: string[],
    messageId: string
  ) {
    try {
      console.log(`[CHAT] Preparing notification for ${recipientIds.length} recipients`);
      
      // Get push tokens for all recipients
      const userRefs = recipientIds.map(uid => doc(db, 'users', uid));
      const userSnapshots = await Promise.all(userRefs.map(ref => getDoc(ref)));
      
      let pushTokens: string[] = [];
      
      userSnapshots.forEach(snap => {
        if (snap.exists()) {
          const userData = snap.data();
          if (userData.pushTokens && Array.isArray(userData.pushTokens)) {
            pushTokens = pushTokens.concat(userData.pushTokens);
          }
        }
      });
      
      if (pushTokens.length === 0) {
        console.log('[CHAT] No push tokens found for recipients');
        return;
      }
      
      // Limit message preview length
      const previewText = messageText.length > 100 
        ? messageText.substring(0, 97) + '...' 
        : messageText;
      
      console.log(`[CHAT] Sending notification to ${pushTokens.length} devices`);
      
      // Store notification in database for tracking
      const notificationRef = collection(db, 'notifications');
      await addDoc(notificationRef, {
        type: 'chat_message',
        groopId,
        messageId,
        recipientIds,
        senderName,
        message: previewText,
        createdAt: serverTimestamp(),
        tokens: pushTokens,
        delivered: false
      });
      
      console.log('[CHAT] Notification record created');
      
      // In a real-world scenario, you'd have a server component send the actual push notification
      // This is where you'd call your cloud function or backend API
      console.log('[CHAT] Server would now send push notifications to tokens:', pushTokens);
    } catch (error) {
      console.error('[CHAT] Error preparing notification:', error);
    }
  }

  // Add reaction to a message
  static async addReaction(
    groopId: string, 
    messageId: string, 
    emoji: string, 
    userId: string
  ) {
    try {
      console.log(`[CHAT] Adding reaction ${emoji} to message ${messageId} in groop ${groopId}`);
      
      const messageRef = doc(db, `groops/${groopId}/messages`, messageId);
      
      // Using arrayUnion to add userId to the array of users who reacted with this emoji
      await updateDoc(messageRef, {
        [`reactions.${emoji}`]: arrayUnion(userId)
      });
      
      console.log('[CHAT] Reaction added successfully');
      return true;
    } catch (error) {
      console.error("[CHAT] Error adding reaction:", error);
      throw error; // Re-throw so the caller can handle it
    }
  }
  
  // Remove reaction from a message
  static async removeReaction(
    groopId: string, 
    messageId: string, 
    emoji: string, 
    userId: string
  ) {
    try {
      console.log(`[CHAT] Removing reaction ${emoji} from message ${messageId}`);
      
      const messageRef = doc(db, `groops/${groopId}/messages`, messageId);
      
      // Using arrayRemove to remove userId from the array
      await updateDoc(messageRef, {
        [`reactions.${emoji}`]: arrayRemove(userId)
      });
      
      console.log('[CHAT] Reaction removed successfully');
      return true;
    } catch (error) {
      console.error("[CHAT] Error removing reaction:", error);
      return false;
    }
  }
  
  // Mark messages as read
  static async markAsRead(groopId: string, messageIds: string[], userId: string) {
    try {
      console.log(`[CHAT] Marking ${messageIds.length} messages as read`);
      
      const batch = writeBatch(db);
      
      messageIds.forEach(messageId => {
        const messageRef = doc(db, `groops/${groopId}/messages`, messageId);
        batch.update(messageRef, {
          read: arrayUnion(userId)
        });
      });
      
      await batch.commit();
      return true;
    } catch (error) {
      console.error("[CHAT] Error marking messages as read:", error);
      return false;
    }
  }
  
  // Get unread message count
  static async getUnreadMessageCount(groopId: string, userId: string): Promise<number> {
    try {
      console.log(`[CHAT] Getting unread count for groop: ${groopId}`);
      
      const messagesRef = collection(db, `groops/${groopId}/messages`);
      const q = query(
        messagesRef,
        where('read', 'array-contains', userId),
        where('senderId', '!=', userId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error("[CHAT] Error getting unread count:", error);
      return 0;
    }
  }
  
  // Set up encryption for a new group
  static async initializeGroupEncryption(groopId: string, userId: string): Promise<boolean> {
    try {
      console.log(`[CHAT] Initializing encryption for group: ${groopId}`);
      
      // Check if encryption is already enabled
      const groopRef = doc(db, 'groops', groopId);
      const groopSnap = await getDoc(groopRef);
      
      if (groopSnap.exists() && groopSnap.data().encryptionEnabled) {
        console.log('[CHAT] Encryption already enabled for this group');
        return true;
      }
      
      // Generate a new symmetric key for the group
      const key = await EncryptionService.generateGroopKey(groopId);
      if (!key) {
        console.error('[CHAT] Failed to generate group key');
        return false;
      }
      
      // Update group metadata to indicate encryption is enabled
      await updateDoc(groopRef, {
        encryptionEnabled: true,
        encryptionInitiatedBy: userId,
        encryptionInitiatedAt: serverTimestamp()
      });
      
      console.log('[CHAT] Encryption successfully initialized for group');
      return true;
    } catch (error) {
      console.error('[CHAT] Error initializing group encryption:', error);
      return false;
    }
  }

  // Search messages
  static async searchMessages(groopId: string, searchText: string, maxResults = 100): Promise<ChatMessage[]> {
    try {
      console.log(`[CHAT] Searching messages in groop ${groopId} for: ${searchText}`);
      
      // For encrypted messages, we need to get a larger set and filter client-side
      const messagesRef = collection(db, `groops/${groopId}/messages`);
      const q = query(
        messagesRef,
        orderBy('createdAt', 'desc'),
        limit(maxResults)
      );
      
      const snapshot = await getDocs(q);
      const messages: ChatMessage[] = [];
      
      // Process and decrypt messages
      for (const doc of snapshot.docs) {
        const data = doc.data();
        let messageText = data.text || '';
        let isDecrypted = false;
        
        // Decrypt if encrypted
        if (data.isEncrypted) {
          try {
            const decryptedText = await EncryptionService.decryptMessage(messageText, groopId);
            if (decryptedText) {
              messageText = decryptedText;
              isDecrypted = true;
            } else {
              messageText = "[Cannot decrypt - missing key]";
              isDecrypted = false;
            }
          } catch (error) {
            console.error('[CHAT] Error decrypting message during search:', error);
            messageText = "[Decryption error]";
            isDecrypted = false;
          }
        }
        
        // Check if the message contains the search text
        if (messageText.toLowerCase().includes(searchText.toLowerCase())) {
          messages.push({
            id: doc.id,
            text: messageText,
            senderId: data.senderId,
            senderName: data.senderName,
            senderAvatar: data.senderAvatar,
            createdAt: data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            reactions: data.reactions || {},
            replyTo: data.replyTo,
            replyToText: data.replyToText,
            replyToSenderName: data.replyToSenderName,
            imageUrl: data.imageUrl,
            read: data.read || [],
            isEncrypted: data.isEncrypted || false,
            isDecrypted: data.isEncrypted ? isDecrypted : null,
            attachments: data.attachments || []
          });
        }
      }

      console.log(`[CHAT] Search found ${messages.length} matching messages`);
      return messages;
    } catch (error) {
      console.error('[CHAT] Error searching messages:', error);
      return [];
    }
  }
}