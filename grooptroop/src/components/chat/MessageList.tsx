import React, { forwardRef, useCallback, useImperativeHandle, useRef, memo, useEffect, useState } from 'react';
import { 
  View, 
  ActivityIndicator, 
  Text, 
  TouchableOpacity,
  Platform,
  Dimensions 
} from 'react-native';
import { FlashList, FlashListProps } from '@shopify/flash-list';
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
  
  // Check if messages array length changed
  if (prevProps.messages.length !== nextProps.messages.length) {
    console.log(`MessageList: Length changed ${prevProps.messages.length} → ${nextProps.messages.length}`);
    return false;
  }
  
  // If lengths are the same, do a deeper check to see if content actually changed
  if (prevProps.messages.length > 0 && nextProps.messages.length > 0) {
    // Check last message ID to detect if new messages were added
    const prevLastMsg = prevProps.messages[prevProps.messages.length - 1];
    const nextLastMsg = nextProps.messages[nextProps.messages.length - 1];
    
    // Handle both ChatMessage and DateSeparator types
    const prevLastId = 'type' in prevLastMsg ? prevLastMsg.id : (prevLastMsg as ChatMessage).id;
    const nextLastId = 'type' in nextLastMsg ? nextLastMsg.id : (nextLastMsg as ChatMessage).id;
    
    if (prevLastId !== nextLastId) {
      console.log(`MessageList: Last message changed ${prevLastId} → ${nextLastId}`);
      return false;
    }
    
    // FIXED: Check if any temp messages are present in either array
    const prevHasTemp = prevProps.messages.some(msg => 
      !('type' in msg) && (msg as ChatMessage).id.startsWith('temp-')
    );
    const nextHasTemp = nextProps.messages.some(msg => 
      !('type' in msg) && (msg as ChatMessage).id.startsWith('temp-')
    );
    
    // If temp message state changed, we need to re-render
    if (prevHasTemp !== nextHasTemp) {
      console.log(`MessageList: Temp message state changed: ${prevHasTemp} → ${nextHasTemp}`);
      return false;
    }
    
    // Check for reaction changes in the last few messages
    const checkCount = Math.min(3, prevProps.messages.length);
    for (let i = 0; i < checkCount; i++) {
      const prevIndex = prevProps.messages.length - 1 - i;
      const nextIndex = nextProps.messages.length - 1 - i;
      
      const prevMsg = prevProps.messages[prevIndex];
      const nextMsg = nextProps.messages[nextIndex];
      
      // Only check reactions for actual ChatMessages, not DateSeparators
      if (!('type' in prevMsg) && !('type' in nextMsg)) {
        const prevChatMsg = prevMsg as ChatMessage;
        const nextChatMsg = nextMsg as ChatMessage;
        
        if (JSON.stringify(prevChatMsg.reactions) !== JSON.stringify(nextChatMsg.reactions)) {
          console.log(`MessageList: Reactions changed for message ${prevChatMsg.id}`);
          return false;
        }
      }
    }
    
    return true; // No significant changes detected
  }
  
  return true;
};

const MessageList = React.forwardRef<FlashList<ChatItem>, MessageListProps>(
  (props, ref) => {
    const { profile } = useAuth();
    const [hasInitiallyScrolled, setHasInitiallyScrolled] = useState(false);
    const [isNearTop, setIsNearTop] = useState(false);
    
    console.log('🔍 MessageList rendering with FlashList - Messages:', props.messages?.length || 0);
    
    // Create FlashList ref
    const flashListRef = useRef<FlashList<ChatItem>>(null);
    
    // Update the imperative handle:
    useImperativeHandle(ref, () => ({
      scrollToEnd: (params?: { animated?: boolean }) => {
        console.log('🔍 MessageList scrollToEnd called');
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

    // Custom scroll handler to detect when near top
    const handleScroll = useCallback((event: any) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      
      // Calculate distance from top
      const distanceFromTop = contentOffset.y;
      const threshold = 100; // Trigger when within 100px of top
      
      // Check if we're near the top and have more messages to load
      const nearTop = distanceFromTop < threshold;
      
      if (nearTop && !isNearTop && props.hasMoreMessages && !props.loadingOlderMessages) {
        console.log('🔍 Near top - triggering older message load');
        setIsNearTop(true);
        props.onEndReached(); // This calls loadOlderMessages
      } else if (!nearTop && isNearTop) {
        setIsNearTop(false);
      }
      
      // Call parent scroll handler
      props.onScroll(event);
    }, [isNearTop, props.hasMoreMessages, props.loadingOlderMessages, props.onEndReached, props.onScroll]);

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
          // Keep normal order: oldest at top (index 0), newest at bottom (last index)
          
          // Use custom scroll detection instead of onEndReached
          onScroll={handleScroll}
          scrollEventThrottle={16}
          
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