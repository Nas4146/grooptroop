import { 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    onSnapshot, 
    updateDoc, 
    doc, 
    serverTimestamp,
    arrayUnion,
    Timestamp 
  } from 'firebase/firestore';
  import { db } from '../lib/firebase';
  import { ChatMessage } from '../models/chat';
  
  export class ChatService {
    static subscribeToMessages(groupId: string, callback: (messages: ChatMessage[]) => void) {
      const messagesRef = collection(db, `groups/${groupId}/messages`);
      const q = query(messagesRef, orderBy('createdAt', 'desc'));
      
      return onSnapshot(q, (snapshot) => {
        const messages: ChatMessage[] = [];
        snapshot.forEach(doc => {
          messages.push({
            id: doc.id,
            ...doc.data() as Omit<ChatMessage, 'id'>
          } as ChatMessage);
        });
        callback(messages);
      }, error => {
        console.error("Error listening to messages:", error);
      });
    }
  
    static async sendMessage(groupId: string, message: {
      text: string;
      senderId: string;
      senderName: string;
      senderAvatar: string;
      replyTo?: string;
    }) {
      try {
        const messagesRef = collection(db, `groups/${groupId}/messages`);
        
        await addDoc(messagesRef, {
          ...message,
          createdAt: serverTimestamp(),
          reactions: {}
        });
        
        return true;
      } catch (error) {
        console.error("Error sending message:", error);
        return false;
      }
    }
  
    static async addReaction(
      groupId: string, 
      messageId: string, 
      emoji: string, 
      userId: string
    ) {
      try {
        const messageRef = doc(db, `groups/${groupId}/messages/${messageId}`);
        
        await updateDoc(messageRef, {
          [`reactions.${emoji}`]: arrayUnion(userId)
        });
        
        return true;
      } catch (error) {
        console.error("Error adding reaction:", error);
        return false;
      }
    }
  }