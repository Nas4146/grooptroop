import { Timestamp } from 'firebase/firestore';

export interface ChatGroup {
  id: string;
  name: string;
  description?: string;
  createdAt: Timestamp;
  createdBy: string;
  members: string[];
  photoUrl?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  createdAt: Timestamp;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  reactions?: Record<string, string[]>;
  replyTo?: string;
  attachments?: {
    type: 'image' | 'video' | 'file';
    url: string;
    thumbnailUrl?: string;
  }[];
}