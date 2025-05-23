import React, { forwardRef, useCallback, useImperativeHandle, useRef, memo, useEffect, useState } from 'react';
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
import logger from '../../utils/logger';

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
  openImagePreview?: (imageUrl: string) => void;
  firstUnreadMessageId?: string | null;    // Add this
  shouldScrollToBottom?: boolean;          // Add this
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
    const [hasInitiallyScrolled, setHasInitiallyScrolled] = useState(false);
    
    console.log('🔍 MessageList rendering with FlashList - Messages:', props.messages?.length || 0);
    
    // Create FlashList ref
    const flashListRef = useRef<FlashList<ChatItem>>(null);
    
    // Update the imperative handle:
    useImperativeHandle(ref, () => ({
      scrollToEnd: (params?: { animated?: boolean }) => {
        console.log('🔍 MessageList scrollToEnd called');
        // For normal list, scrollToEnd means scroll to the actual end (newest messages)
        flashListRef.current?.scrollToEnd({ 
          animated: params?.animated ?? true 
        });
      },
    }));

    // Handle initial scroll position
    useEffect(() => {
      if (!props.loading && !hasInitiallyScrolled && props.messages.length > 0) {
        setHasInitiallyScrolled(true);
        
        // Small delay to ensure FlashList is fully rendered
        setTimeout(() => {
          if (props.firstUnreadMessageId) {
            // Find the index of the first unread message
            const unreadIndex = props.messages.findIndex(item => {
              return !('type' in item) && (item as ChatMessage).id === props.firstUnreadMessageId;
            });
            
            if (unreadIndex !== -1) {
              logger.chat(`Scrolling to first unread message at index ${unreadIndex}`);
              // For normal list, use the actual index
              flashListRef.current?.scrollToIndex({
                index: unreadIndex,
                animated: false,
                viewPosition: 0.1 // Show unread message near top
              });
              return;
            }
          }
          
          // No unread messages, scroll to bottom (newest messages)
          logger.chat('Scrolling to newest messages (bottom)');
          flashListRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }
    }, [props.loading, props.messages.length, props.firstUnreadMessageId, hasInitiallyScrolled]);

    // Reset scroll flag when messages change significantly
    useEffect(() => {
      setHasInitiallyScrolled(false);
    }, [props.firstUnreadMessageId]);

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

    // Update the FlashList configuration:

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
          // REMOVE: inverted={true}
          // Keep normal order: oldest at top, newest at bottom
          
          // Load older messages when scrolling to TOP (start of list)
          onStartReached={() => {
            if (props.hasMoreMessages && !props.loadingOlderMessages) {
              console.log('🔍 Loading older messages from scrolling to top');
              props.onEndReached(); // This loads older messages
            }
          }}
          onStartReachedThreshold={0.1}
          
          // Don't trigger onEndReached for bottom scroll
          onEndReached={undefined}
          onEndReachedThreshold={0}
          
          onScroll={props.onScroll}
          refreshing={props.refreshing}
          onRefresh={props.onRefresh}
          
          ListEmptyComponent={() => (
            <View style={tw`flex-1 justify-center items-center p-4`}>
              <Text style={tw`text-gray-500`}>No messages yet</Text>
            </View>
          )}
          
          // Move loading indicator to header (top of list = older messages)
          ListHeaderComponent={() => {
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