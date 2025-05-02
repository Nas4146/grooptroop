// filepath: /Users/nick/GroopTroop/grooptroop/src/services/ChatService.ts
import { 
    collection, addDoc, query, orderBy, onSnapshot, 
    updateDoc, doc, serverTimestamp, arrayUnion, Timestamp
  } from 'firebase/firestore';
  import { db } from '../lib/firebase';
  import { ChatMessage } from '../models/chat';
  
  export class ChatService {
    static subscribeToMessages(groupId: string, callback: (messages: ChatMessage[]) => void) {
      const messagesRef = collection(db, `groups/${groupId}/messages`);
      const q = query(messagesRef, orderBy('createdAt', 'desc'));
      
      return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as Omit<ChatMessage, 'id'>
        }));
        callback(messages);
      });
    }
  
    static async sendMessage(groupId: string, message: Omit<ChatMessage, 'id' | 'createdAt'>) {
      try {
        await addDoc(collection(db, `groups/${groupId}/messages`), {
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
  
    static async addReaction(groupId: string, messageId: string, emoji: string, userId: string) {
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