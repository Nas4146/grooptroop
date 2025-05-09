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

export class ChatService {
  // Subscribe to messages with pagination
  static subscribeToMessages(groopId: string, callback: (messages: ChatMessage[]) => void, maxMessages = 50) {
    console.log(`[CHAT] Subscribing to messages for groop: ${groopId}`);
    const messagesRef = collection(db, `groops/${groopId}/messages`);
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(maxMessages));
    
    return onSnapshot(q, (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          text: data.text || '',
          senderId: data.senderId,
          senderName: data.senderName,
          senderAvatar: data.senderAvatar || '',
          createdAt: data.createdAt,
          reactions: data.reactions || {},
          replyTo: data.replyTo,
          imageUrl: data.imageUrl,
          read: data.read || [],
          attachments: data.attachments || []
        });
      });
      console.log(`[CHAT] Received ${messages.length} messages from subscription`);
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
      
      if (!groopSnap.exists()) {
        console.error(`[CHAT] Error: Groop ${groopId} does not exist`);
        return false;
      }
      
      // Create a new message document in the messages subcollection
      const messagesRef = collection(db, `groops/${groopId}/messages`);
      
      // Prepare message data - filter out undefined values
      const messageData = {
        text: message.text,
        senderId: message.senderId,
        senderName: message.senderName,
        senderAvatar: message.senderAvatar,
        createdAt: serverTimestamp(),
        reactions: {},
        read: [message.senderId] // Mark as read by sender
      };
      
      // Only add these fields if they have values
      if (message.replyTo) {
        messageData['replyTo'] = message.replyTo;
      }
      
      if (message.imageUrl) {
        messageData['imageUrl'] = message.imageUrl;
      }
      
      // Create a new message document
      const newMessageRef = await addDoc(messagesRef, messageData);
      
      // Update groop's lastActivity field
      await updateDoc(groopRef, {
        lastActivity: serverTimestamp(),
        lastMessage: {
          id: newMessageRef.id,
          text: message.text.substring(0, 50) + (message.text.length > 50 ? '...' : ''),
          senderId: message.senderId,
          senderName: message.senderName,
          timestamp: serverTimestamp(),
          hasImage: !!message.imageUrl
        }
      });
      
      console.log('[CHAT] Message sent successfully');
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
  
  // Search messages
  static async searchMessages(groopId: string, searchText: string, maxResults = 20): Promise<ChatMessage[]> {
    try {
      console.log(`[CHAT] Searching messages in groop ${groopId} for: ${searchText}`);
      
      // Firestore doesn't support full-text search natively
      // This is a simple solution that searches only the beginning of messages
      const messagesRef = collection(db, `groops/${groopId}/messages`);
      const q = query(
        messagesRef,
        orderBy('text'),
        // Use >= and < for prefix search
        where('text', '>=', searchText),
        where('text', '<', searchText + '\uf8ff'),
        limit(maxResults)  // Use the imported 'limit' function with our renamed parameter
      );
      
      const snapshot = await getDocs(q);
      const messages: ChatMessage[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          text: data.text || '',
          senderId: data.senderId,
          senderName: data.senderName,
          senderAvatar: data.senderAvatar || '',
          createdAt: data.createdAt,
          reactions: data.reactions || {},
          replyTo: data.replyTo,
          imageUrl: data.imageUrl,
          read: data.read || [],
          attachments: data.attachments || []
        });
      });
      
      return messages;
    } catch (error) {
      console.error("[CHAT] Error searching messages:", error);
      return [];
    }
  }
}