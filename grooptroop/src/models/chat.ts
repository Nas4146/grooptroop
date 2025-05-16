import { Timestamp } from 'firebase/firestore';
import { UserAvatar } from '../contexts/AuthProvider';

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
  senderId: string;
  senderName: string;
  senderAvatar?: UserAvatar;  
  createdAt: Timestamp;
  reactions: { [key: string]: string[] };
  replyTo?: string;
  replyToText?: string; // Added field for the text of the replied message
  replyToSenderName?: string; // Added field for the name of the replied message sender
  imageUrl?: string;
  read: string[];
  isEncrypted?: boolean;
  isDecrypted?: boolean | null;
  attachments?: {
    type: 'image' | 'video' | 'file';
    url: string;
    thumbnailUrl?: string;
  }[];
}

export type ChatItemType = ChatMessage | {
  id: string;
  type: 'dateSeparator';
  date: Date;
};

export interface ReplyingToMessage {
  id: string;
  text: string;
  senderName: string;
}