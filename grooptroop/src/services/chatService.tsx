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
          senderAvatar: data.senderAvatar || '',
          createdAt: data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          reactions: data.reactions || {},
          replyTo: data.replyTo,
          imageUrl: data.imageUrl,
          read: data.read || [],
          isEncrypted: data.isEncrypted || false,
          isDecrypted: data.isEncrypted ? isDecrypted : null, // Only relevant for encrypted messages
          attachments: data.attachments || []
        });
      }
      
      console.log(`[CHAT] Received and processed ${messages.length} messages from subscription`);
      callback(messages);
    }, error => {
      console.error("[CHAT] Error listening to messages:", error);
    });
  }

  // Send message to a specific groop
  static async sendMessage(groopId: string, message: {
    text: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    replyTo?: string;
    imageUrl?: string;
  }) {
    try {
      console.log(`[CHAT] Sending message to groop: ${groopId}`);
      
      // First verify that the groop exists
      const groopRef = doc(db, 'groops', groopId);
      const groopSnap = await getDoc(groopRef);
  
      let encryptedText = message.text;
      let isEncrypted = false;
      
      // If encryption is enabled, encrypt the message
      if (groopSnap.exists() && groopSnap.data().encryptionEnabled) {
        try {
          // Add more detailed logging here
          console.log('[CHAT] Encryption enabled, attempting to encrypt message');
          
          // Check if we have a group key
          const hasKey = await EncryptionService.hasGroopKey(groopId);
          console.log(`[CHAT] Group key exists: ${hasKey}`);
          
          const encrypted = await EncryptionService.encryptMessage(message.text, groopId);
          if (encrypted) {
            encryptedText = encrypted;
            isEncrypted = true;
            console.log('[CHAT] Message encrypted successfully');
          } else {
            console.warn('[CHAT] Failed to encrypt message, sending in plaintext');
            // If possible, try to regenerate the key
            console.log('[CHAT] Attempting to initialize encryption again');
            await KeyExchangeService.setupGroopEncryption(groopId, message.senderId);
          }
        } catch (error) {
          console.error('[CHAT] Encryption error:', error);
          console.warn('[CHAT] Failed to encrypt message, sending in plaintext');
        }
      }
      
      // Create a new message document in the messages subcollection
      const messagesRef = collection(db, `groops/${groopId}/messages`);
      
      // Prepare message data with encrypted text
      const messageData = {
        text: encryptedText,
        isEncrypted: isEncrypted, // Set proper encryption flag
        senderId: message.senderId,
        senderName: message.senderName,
        senderAvatar: message.senderAvatar,
        createdAt: serverTimestamp(),
        reactions: {},
        read: [message.senderId]
      };
      
      // Only add these fields if they have values
      if (message.replyTo) {
        messageData['replyTo'] = message.replyTo;
      }
      
      if (message.imageUrl) {
        // For now, we're not encrypting image URLs
        messageData['imageUrl'] = message.imageUrl;
      }
      
      // Create a new message document
      const newMessageRef = await addDoc(messagesRef, messageData);
      
      // Update groop's lastActivity field - Use placeholder for preview if encrypted
      await updateDoc(groopRef, {
        lastActivity: serverTimestamp(),
        lastMessage: {
          id: newMessageRef.id,
          text: isEncrypted ? "🔒 Encrypted message" : message.text.substring(0, 50),
          senderId: message.senderId,
          senderName: message.senderName,
          timestamp: serverTimestamp(),
          hasImage: !!message.imageUrl,
          isEncrypted: isEncrypted
        }
      });
      
      console.log(`[CHAT] Message sent successfully (encrypted: ${isEncrypted})`);
      return true;
    } catch (error) {
      console.error("[CHAT] Error sending message:", error);
      throw error;
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
      console.log(`[CHAT] Adding reaction ${emoji} to message ${messageId}`);
      
      const messageRef = doc(db, `groops/${groopId}/messages`, messageId);
      
      // Using arrayUnion to add userId to the array of users who reacted with this emoji
      await updateDoc(messageRef, {
        [`reactions.${emoji}`]: arrayUnion(userId)
      });
      
      console.log('[CHAT] Reaction added successfully');
      return true;
    } catch (error) {
      console.error("[CHAT] Error adding reaction:", error);
      return false;
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
        
        // Decrypt if encrypted
        if (data.isEncrypted) {
          try {
            const decryptedText = await EncryptionService.decryptMessage(messageText, groopId);
            if (decryptedText) {
              messageText = decryptedText;
            } else {
              messageText = "[Cannot decrypt]";
            }
          } catch (error) {
            console.error('[CHAT] Error decrypting message during search:', error);
            messageText = "[Decryption error]";
          }
        }
        
        // Add to results only if it contains the search text
        if (messageText.toLowerCase().includes(searchText.toLowerCase())) {
          messages.push({
            id: doc.id,
            text: messageText,
            senderId: data.senderId,
            senderName: data.senderName,
            senderAvatar: data.senderAvatar || '',
            createdAt: data.createdAt,
            reactions: data.reactions || {},
            replyTo: data.replyTo,
            imageUrl: data.imageUrl,
            read: data.read || [],
            isEncrypted: data.isEncrypted || false,
            attachments: data.attachments || []
          });
        }
      }
      
      return messages;
    } catch (error) {
      console.error("[CHAT] Error searching messages:", error);
      return [];
    }
  }
}