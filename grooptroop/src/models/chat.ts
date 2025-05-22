import { Timestamp } from 'firebase/firestore';
import { UserAvatar } from '../contexts/AuthProvider';

// Core message type
export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar?: UserAvatar;
  createdAt: Date | Timestamp;
  reactions: Record<string, string[]>;
  read: string[];
  replyTo?: string;
  replyToText?: string;
  replyToSenderName?: string;
  imageUrl?: string;
  isEncrypted?: boolean;
  isDecrypted?: boolean;
}

// Date separator for message grouping
export interface DateSeparator {
  id: string;
  type: 'dateSeparator';
  date: Date;
}

// Union type for items in the message list
export type ChatItem = ChatMessage | DateSeparator;

// Reply context interface
export interface ReplyContext {
  id: string;
  text: string;
  senderName: string;
}

// Types for message operations
export type MessageSendStatus = 'sending' | 'sent' | 'failed';

export interface MessageOperation {
  id: string;
  status: MessageSendStatus;
  timestamp: number;
  retryCount?: number;
}