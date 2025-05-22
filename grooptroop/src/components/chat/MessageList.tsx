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

const MessageList = forwardRef<MessageListRef, MessageListProps>(({
  messages,
  loading,
  refreshing,
  hasMoreMessages,
  loadingOlderMessages,
  onEndReached,
  onScroll,
  onRefresh,
  onReactionPress,
  onReplyPress,
  openImagePreview
}, ref) => {
  // Refs
  const flashListRef = useRef<FlashList<ChatItem>>(null);
  
  // Auth context
  const { profile } = useAuth();
  const { trackRenderStart } = useChatPerformance(); // <-- Moved here
  
  // Set up the ref forwarding
  useImperativeHandle(ref, () => ({
    scrollToEnd: ({ animated } = { animated: true }) => {
      flashListRef.current?.scrollToEnd({ animated });
    }
  }));
  
  // Track render performance
  useEffect(() => {
    const finishTracking = trackRenderStart('MessageList');
    return finishTracking;
  }, [messages]); // Track re-renders when messages change
  
  // Render item based on type
  const renderItem = useCallback(({ item }: { item: ChatItem }) => {
    // Date separator
    if ('type' in item && item.type === 'dateSeparator') {
      return <DateSeparator date={item.date} />;
    }
    
    // Regular message
    const message = item as ChatMessage;
    const isFromCurrentUser = message.senderId === profile?.uid;
    
    return (
      <MessageBubble 
        message={message}
        isFromCurrentUser={isFromCurrentUser}
        onReactionPress={onReactionPress}
        onReplyPress={onReplyPress}
        openImagePreview={openImagePreview} // Make sure this is passed
        currentUserId={profile?.uid || ''}
      />
    );
  }, [profile?.uid, onReactionPress, onReplyPress, openImagePreview]); // Add to deps array
  
  // Key extractor for optimized list rendering
  const keyExtractor = useCallback((item: ChatItem) => item.id, []);
  
  // Header component for when loading older messages or no more messages
  const ListHeaderComponent = useCallback(() => {
    if (loadingOlderMessages) {
      return (
        <View style={tw`py-4 justify-center items-center`}>
          <ActivityIndicator color="#7C3AED" />
        </View>
      );
    }
    
    if (!hasMoreMessages && messages.length > 0) {
      return (
        <View style={tw`py-4 justify-center items-center`}>
          <Text style={tw`text-gray-400 text-sm`}>
            Start of conversation
          </Text>
        </View>
      );
    }
    
    return null;
  }, [loadingOlderMessages, hasMoreMessages, messages.length]);
  
  // Empty component when no messages
  const ListEmptyComponent = useCallback(() => {
    if (loading) return null;
    
    return (
      <View style={tw`flex-1 justify-center items-center p-6 opacity-60`}>
        <Text style={tw`text-gray-500 text-center mb-4 text-lg font-medium`}>
          No messages yet
        </Text>
        <Text style={tw`text-gray-400 text-center mb-6`}>
          Start the conversation by sending a message below
        </Text>
      </View>
    );
  }, [loading]);
  
  return (
    <View style={[tw`flex-1`, { minHeight: 50 }]}> {/* Add minHeight */}
      <FlashList
        ref={flashListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={120}
        contentContainerStyle={tw`px-4 pt-4 pb-16`}
        onRefresh={onRefresh}
        refreshing={refreshing}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.2}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: null,
        }}
        drawDistance={OPTIMAL_DRAW_DISTANCE}
        removeClippedSubviews={Platform.OS === 'android'}
        disableAutoLayout={Platform.OS === 'ios' ? false : true}
        keyboardDismissMode="interactive"
      />
    </View>
  );
});

MessageList.displayName = 'MessageList';

// Replace export default with:
export default memo(MessageList, areEqual);