import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput,
  KeyboardAvoidingView, 
  Platform,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthProvider';
import { useGroop } from '../contexts/GroopProvider';
import { ChatService } from '../services/chatService';
import { EncryptionService } from '../services/EncryptionService';
import { ChatMessage, ReplyingToMessage } from '../models/chat';
import { FlashList } from '@shopify/flash-list';
import MessageBubble from '../components/chat/MessageBubble';
import MessageInput from '../components/chat/MessageInput';
import tw from '../utils/tw';
import { KeyExchangeService } from '../services/KeyExchangeService';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import EncryptionInfoModal from '../components/chat/EncryptionInfoModal';
import { useNotification } from '../contexts/NotificationProvider';
import { useFocusEffect } from '@react-navigation/native';
import DateSeparator from '../components/chat/DateSeparator';
import { ChatItemType } from '../models/chat';

type ChatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ChatScreen() {
  const { profile } = useAuth();
  const { currentGroop } = useGroop();
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<ReplyingToMessage | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const [showEncryptionInfo, setShowEncryptionInfo] = useState(false);
  const [encryptionLoading, setEncryptionLoading] = useState(false);
  const { refreshUnreadCount } = useNotification();

    // Process messages to include date separators
  const processMessagesWithDateSeparators = useCallback(() => {
  if (!messages.length) return [];

  // First, sort messages by date if they aren't already
  const sortedMessages = [...messages].sort((a, b) => {
    // Safe way to convert to Date, handling all possible types
    const getDateValue = (createdAt: any): Date => {
      if (!createdAt) return new Date();
      if (createdAt?.toDate) return createdAt.toDate();
      if (createdAt instanceof Date) return createdAt;
      return new Date(createdAt);
    };

    const dateA = getDateValue(a.createdAt);
    const dateB = getDateValue(b.createdAt);
    
    return dateA.getTime() - dateB.getTime();  // Oldest first (for non-inverted list)
  });
    
  // Then, create a new array with date separators
  const result: ChatItemType[] = [];
  let lastDateStr: string | null = null;
        
  sortedMessages.forEach(message => {
    // Reuse the same helper function for consistent date handling
    const getDateValue = (createdAt: any): Date => {
      if (!createdAt) return new Date();
      if (createdAt?.toDate) return createdAt.toDate();
      if (createdAt instanceof Date) return createdAt;
      return new Date(createdAt);
    };
    
    const messageDate = getDateValue(message.createdAt);
    
    // Get just the date portion for comparison (year, month, day)
    const dateStr = messageDate.toDateString();
    
    // If this is a new date, add a separator
    if (dateStr !== lastDateStr) {
      lastDateStr = dateStr;
      result.push({
        id: `date-${dateStr}`,
        type: 'dateSeparator',
        date: messageDate
      });
    }
    
    // Add the message
    result.push(message);
  });
  
  return result;
}, [messages]);

  // Debug log
  useEffect(() => {
    console.log(`[CHAT_DEBUG] Current groop ID: ${currentGroop?.id}`);
  }, [currentGroop]);

  useEffect(() => {
    const initializeEncryption = async () => {
      setEncryptionLoading(true);
      try {
      if (profile && currentGroop) {
        console.log('[CHAT] Checking encryption status for group:', currentGroop.id);
        
        // Create groopRef here when you know currentGroop exists
        const groopRef = doc(db, 'groops', currentGroop.id);
        const groopSnap = await getDoc(groopRef);
        
        if (!groopSnap.data()?.encryptionEnabled) {
          console.log('[CHAT] Setting up encryption for group');
          // Set up encryption for this group
          await KeyExchangeService.setupGroopEncryption(currentGroop.id, profile.uid);
          console.log('[CHAT] Encryption setup complete');
        } else {
          console.log('[CHAT] Encryption already set up for this group');
          
          // Check if we have the key locally - THIS IS THE CRITICAL PART
          const hasKey = await EncryptionService.hasGroopKey(currentGroop.id);
          if (!hasKey) {
            console.log('[CHAT] Group key not found locally, generating new key');
            await EncryptionService.generateGroopKey(currentGroop.id);
          }
        }
      }
    } finally {
      setEncryptionLoading(false);
    }
  };
    
    initializeEncryption();
  }, [profile, currentGroop]);

  useEffect(() => {
    // Process key exchanges whenever the screen is focused
    const checkForKeyExchanges = async () => {
      if (profile && currentGroop) {
        await KeyExchangeService.processPendingKeyExchanges(profile.uid);
      }
    };
    
    // Run on mount
    checkForKeyExchanges();
    
    // Set up an interval to check periodically
    const interval = setInterval(checkForKeyExchanges, 60000); // Check every minute
    
    return () => {
      clearInterval(interval);
    };
  }, [profile, currentGroop]);

  useEffect(() => {
    if (currentGroop) {
      console.log('[CHAT_DEBUG] Current groop details:', {
        id: currentGroop.id,
        name: currentGroop.name,
        membersCount: currentGroop.members.length,
        isMember: currentGroop.members.includes(profile?.uid || ''),
      });
    }
  }, [currentGroop, profile]);
  
  // Reset notifications when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('[CHAT] Chat screen focused, refreshing unread count');
      if (profile?.uid) {
        refreshUnreadCount();
      }
      return () => {};
    }, [refreshUnreadCount, profile])
  );
  // Load messages
  useEffect(() => {
    if (!profile || !currentGroop) return;
    
    console.log(`[CHAT] Subscribing to messages for groop: ${currentGroop.name} (${currentGroop.id})`);
    
    // Subscribe to messages
    const unsubscribe = ChatService.subscribeToMessages(currentGroop.id, (newMessages) => {
      setMessages(newMessages);
      setLoading(false);
      setRefreshing(false);
      
      // Count unread messages
      const unread = newMessages.filter(msg => 
        !msg.read.includes(profile.uid) && msg.senderId !== profile.uid
      ).length;
      setUnreadCount(unread);
      
      // Mark messages as read
      if (unread > 0) {
        const unreadIds = newMessages
          .filter(msg => !msg.read.includes(profile.uid) && msg.senderId !== profile.uid)
          .map(msg => msg.id);
        
        console.log(`[CHAT] Marking ${unreadIds.length} messages as read`);
        ChatService.markAsRead(currentGroop.id, unreadIds, profile.uid)
          .then(success => {
            if (success) {
              console.log('[CHAT] Messages marked as read, refreshing unread count');
              refreshUnreadCount(); // Update the global unread count
            }
          });
      }
    });
    
    // Cleanup subscription
    return () => {
      console.log(`[CHAT] Unsubscribing from messages for groop: ${currentGroop?.id || 'unknown'}`);
      unsubscribe();
    };
  }, [profile, currentGroop]);
  
  // Send message
  const sendMessage = useCallback(async (text: string, imageUrl?: string) => {
    if (!profile || !currentGroop) {
      console.log('[CHAT] Cannot send message: No profile or groop selected');
      return;
    }
    
    try {
      console.log(`[CHAT] Sending message to groop: ${currentGroop.id}`);
      
      await ChatService.sendMessage(currentGroop.id, {
        text,
        senderId: profile.uid,
        senderName: profile.displayName || 'Anonymous',
        senderAvatar: profile.photoURL || profile.avatarColor || '',
        replyTo: replyingTo?.id
      });
      
      // Clear reply state
      if (replyingTo) setReplyingTo(null);
    } catch (error) {
      console.error('[CHAT] Error in sendMessage:', error);
    }
  }, [profile, currentGroop, replyingTo]);
  
  // Handle reactions
  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!profile || !currentGroop) return;
    
    await ChatService.addReaction(currentGroop.id, messageId, emoji, profile.uid);
  }, [profile, currentGroop]);
  
  // Handle reply
  const handleReply = useCallback((message: ChatMessage) => {
    setReplyingTo({
      id: message.id,
      text: message.text,
      senderName: message.senderName
    });
  }, []);
  
  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // The refreshing state will be reset when new messages come in
  }, []);
  
  // Navigate to members screen
  const navigateToMembers = useCallback(() => {
    navigation.navigate('GroupMembers', { groopId: currentGroop?.id });
  }, [navigation, currentGroop]);
  
  if (!currentGroop) {
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center bg-light`}>
        <Ionicons name="chatbubbles" size={64} color="#CBD5E1" />
        <Text style={tw`text-xl font-bold text-gray-800 mt-4 text-center`}>
          No group selected
        </Text>
        <Text style={tw`text-base text-gray-600 mt-2 text-center`}>
          Select a group to chat with
        </Text>
      </SafeAreaView>
    );
  }
  
  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center bg-light`}>
        <ActivityIndicator size="large" color="#78c0e1" />
        <Text style={tw`mt-4 font-semibold text-primary`}>Loading your chat...</Text>
      </SafeAreaView>
    );
  }
  
  // EmptyChat component for displaying when no messages exist
  const EmptyChat = () => (
    <View style={tw`py-20 items-center`}>
      <View style={tw`w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-3`}>
        <Ionicons name="chatbubble-outline" size={32} color="#7C3AED" />
      </View>
      <Text style={tw`text-neutral font-medium`}>No messages yet</Text>
      <Text style={tw`text-gray-500 text-sm mt-1 text-center max-w-[70%]`}>
        Be the first to say something to the group!
      </Text>
      <TouchableOpacity
        style={tw`mt-6 bg-primary px-5 py-2.5 rounded-lg`}
        onPress={() => inputRef.current?.focus()}
      >
        <Text style={tw`text-white font-medium`}>Start Chatting</Text>
      </TouchableOpacity>
    </View>
  );


  
  return (
    <SafeAreaView style={tw`flex-1 bg-light`}>
      {/* Header
      <View style={tw`flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200`}>
        <TouchableOpacity 
          style={tw`flex-row items-center`} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#7C3AED" />
          <Text style={tw`text-lg font-medium ml-1 text-neutral`}>Back</Text>
        </TouchableOpacity>
        
        <Text style={tw`text-lg font-medium text-neutral`}>
          {currentGroop?.name}
        </Text>
        
        <TouchableOpacity onPress={navigateToMembers}>
          <View style={tw`flex-row items-center`}>
            <Ionicons name="people" size={20} color="#7C3AED" />
            <Text style={tw`text-sm ml-1 text-primary font-medium`}>
              {currentGroop.members.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>*/}
      {/* Status card - similar to Trip Home Base in itinerary */}
      <View style={[
        tw`mx-4 -mt-2 bg-white rounded-xl px-3 py-2.5 shadow-md`, 
        {
          zIndex: 20,
          elevation: 4,
          position: 'relative',
        }
      ]}>
        <View style={tw`flex-row justify-between items-center mb-0.5`}>
          <Text style={tw`font-bold text-neutral text-sm`}>Trip Chat</Text>
          
          <View style={tw`flex-row`}>
            {/* New message indicator */}
            {unreadCount > 0 && (
              <View style={tw`bg-green-100 rounded-full px-2 py-0.5 flex-row items-center`}>
                <View style={tw`h-2 w-2 rounded-full bg-green-500 mr-1`}></View>
                <Text style={tw`text-xs text-green-700`}>{unreadCount} New</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={tw`flex-row items-center justify-between mb-1.5`}>
          <View style={tw`flex-row items-center`}>
            <Ionicons name="lock-closed" size={12} color="#78c0e1" style={tw`mr-1`} />
            <Text style={tw`text-gray-600 text-xs`}>
              End-to-end encrypted
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowEncryptionInfo(true)}
            style={tw`p-1`} // Larger touch target
          >
            <Ionicons name="information-circle-outline" size={16} color="#78c0e1" />
          </TouchableOpacity>
        </View>    
        {/* Actions row */}
        <View style={tw`flex-row justify-center`}>
          <TouchableOpacity 
            style={tw`bg-gray-100 rounded-lg px-2.5 py-0.5 flex-row items-center mr-2`}
          >
            <Ionicons name="image" size={12} color="#1F2937" />
            <Text style={tw`text-xs text-neutral ml-1`}>Photos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={tw`bg-gray-100 rounded-lg px-2.5 py-0.5 flex-row items-center mr-2`}
          >
            <Ionicons name="location" size={12} color="#1F2937" />
            <Text style={tw`text-xs text-neutral ml-1`}>Share Location</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={tw`bg-gray-100 rounded-lg px-2.5 py-0.5 flex-row items-center`}
            onPress={() => navigation.navigate('Itinerary')}
          >
            <Ionicons name="calendar" size={12} color="#1F2937" />
            <Text style={tw`text-xs text-neutral ml-1`}>Plan</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView 
        style={tw`flex-1 mt-2`} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <FlashList
        data={processMessagesWithDateSeparators()}
        renderItem={({ item }) => {
          // Check if item is a date separator
          if ('type' in item && item.type === 'dateSeparator') {
            return <DateSeparator date={item.date} />;
          }
          
          // Regular message (using type assertion)
          return (
            <MessageBubble 
              message={item as ChatMessage}
              isFromCurrentUser={(item as ChatMessage).senderId === profile?.uid}
              onReactionPress={handleReaction}
              onReplyPress={() => handleReply(item as ChatMessage)}
            />
    );
        }}
        keyExtractor={(item) => item.id}
        estimatedItemSize={80}
        contentContainerStyle={tw`px-4 pt-4 pb-2`}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        ListEmptyComponent={<EmptyChat />}
      />
        
        <MessageInput 
          onSend={sendMessage} 
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </KeyboardAvoidingView>
      <EncryptionInfoModal 
        isVisible={showEncryptionInfo}
        onClose={() => setShowEncryptionInfo(false)}
      />
    </SafeAreaView>
  );
}