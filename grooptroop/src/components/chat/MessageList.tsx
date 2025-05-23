import React, { forwardRef, useCallback, useImperativeHandle, useRef, memo, useEffect } from 'react';
import { 
  View, 
  ActivityIndicator, 
  Text, 
  TouchableOpacity,
  Platform,
  Dimensions 
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthProvider';
import { ChatItem, ChatMessage } from '../../models/chat';
import MessageBubble from './MessageBubble';
import DateSeparator from './DateSeparator';
import tw from '../../utils/tw';
import { useChatPerformance } from '../../hooks/useChatPerformance';

// Optimize draw distance
const SCREEN_HEIGHT = Dimensions.get('window').height;
const OPTIMAL_DRAW_DISTANCE = Math.min(SCREEN_HEIGHT * 1.5, 280);

interface MessageListProps {
  messages: ChatItem[];
  loading: boolean;
  refreshing: boolean;
  hasMoreMessages: boolean;
  loadingOlderMessages: boolean;
  onEndReached: () => void;
  onScroll: (event: any) => void;
  onRefresh: () => void;
  onReactionPress: (messageId: string, emoji: string) => void;
  onReplyPress: (message: ChatMessage) => void;
  openImagePreview?: (imageUrl: string) => void; // Add this line
}

export interface MessageListRef {
  scrollToEnd: (params?: { animated?: boolean }) => void;
}

// Items that shouldn't trigger re-renders when they're the same
const areEqual = (prevProps: MessageListProps, nextProps: MessageListProps) => {
  // Always re-render if loading state changes
  if (prevProps.loading !== nextProps.loading) return false;
  if (prevProps.refreshing !== nextProps.refreshing) return false;
  if (prevProps.loadingOlderMessages !== nextProps.loadingOlderMessages) return false;
  
  // Check if messages array has changed
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  
  // If lengths are the same, check if the last message has changed
  // This optimization assumes that most changes are adding new messages
  // or modifying the most recent ones
  if (prevProps.messages.length > 0 && nextProps.messages.length > 0) {
    const prevLastMsg = prevProps.messages[prevProps.messages.length - 1];
    const nextLastMsg = nextProps.messages[nextProps.messages.length - 1];
    
    if ('type' in prevLastMsg && 'type' in nextLastMsg) {
      // Both are date separators
      return prevLastMsg.id === nextLastMsg.id;
    } else if (!('type' in prevLastMsg) && !('type' in nextLastMsg)) {
      // Both are messages
      const prevMsg = prevLastMsg as ChatMessage;
      const nextMsg = nextLastMsg as ChatMessage;
      
      // Check ID and reactions (common things that change)
      if (prevMsg.id !== nextMsg.id) return false;
      if (JSON.stringify(prevMsg.reactions) !== JSON.stringify(nextMsg.reactions)) return false;
      
      return true;
    }
    
    return false;
  }
  
  return JSON.stringify(prevProps.messages) === JSON.stringify(nextProps.messages);
};

const MessageList = React.forwardRef<FlashListRef<ChatItem>, MessageListProps>(
  (props, ref) => {
    const { profile } = useAuth();
    console.log('🔍 MessageList rendering with FlashList - Messages:', props.messages?.length || 0);
    
    // Safety checks
    if (!props.messages) {
      console.warn('⚠️ MessageList received undefined messages');
      return (
        <View style={tw`flex-1 justify-center items-center`}>
          <Text>No messages data available</Text>
        </View>
      );
    }

    // Create FlashList ref
    const flashListRef = useRef<FlashList<ChatItem>>(null);
    
    useImperativeHandle(ref, () => ({
      scrollToEnd: (params?: { animated?: boolean }) => {
        console.log('🔍 MessageList scrollToEnd called');
        flashListRef.current?.scrollToEnd(params);
      },
    }));

    // MINIMAL renderItem to test FlashList without complex children
    const renderItem = useCallback(({ item, index }: { item: ChatItem; index: number }) => {
      // Safety check
      if (!item) {
        return (
          <View style={tw`p-2 bg-red-100`}>
            <Text style={tw`text-red-600`}>Invalid item at index {index}</Text>
          </View>
        );
      }

      // Render DateSeparator
      if ('type' in item && item.type === 'dateSeparator') {
        return <DateSeparator date={item.date} />;
      }

      // Render MessageBubble
      const message = item as ChatMessage;
      const isFromCurrentUser = message.senderId === profile?.uid;
      
      if (!message.id || !message.senderId) {
        return (
          <View style={tw`p-2 bg-red-100`}>
            <Text style={tw`text-red-600`}>Invalid message data</Text>
          </View>
        );
      }

      return (
        <MessageBubble 
          message={message}
          isFromCurrentUser={isFromCurrentUser}
          onReactionPress={props.onReactionPress}
          onReplyPress={props.onReplyPress}
          openImagePreview={props.openImagePreview}
          currentUserId={profile?.uid || ''}
        />
      );
    }, [profile?.uid, props.onReactionPress, props.onReplyPress, props.openImagePreview]);

    console.log('🔍 About to render FlashList with', props.messages.length, 'items');

    return (
      <View style={tw`flex-1`}>
        <FlashList
          ref={flashListRef}
          data={props.messages}
          renderItem={renderItem}
          estimatedItemSize={50}
          contentContainerStyle={tw`p-2`}
          keyExtractor={(item, index) => {
            if ('type' in item && item.type === 'dateSeparator') {
              return `date-${item.id || index}`;
            }
            return (item as ChatMessage).id || `msg-${index}`;
          }}
          onEndReached={props.onEndReached}
          onEndReachedThreshold={0.1}
          onScroll={props.onScroll}
          refreshing={props.refreshing}
          onRefresh={props.onRefresh}
          ListEmptyComponent={() => (
            <View style={tw`flex-1 justify-center items-center p-4`}>
              <Text style={tw`text-gray-500`}>No messages yet</Text>
            </View>
          )}
          ListFooterComponent={() => {
            if (props.loadingOlderMessages) {
              return (
                <View style={tw`p-4 items-center`}>
                  <ActivityIndicator size="small" color="#7C3AED" />
                  <Text style={tw`text-xs text-gray-500 mt-2`}>Loading older messages...</Text>
                </View>
              );
            }
            return null;
          }}
        />
      </View>
    );
  }
);

export default memo(MessageList, areEqual);