import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  KeyboardAvoidingView, 
  Platform,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthProvider';
import { useGroop } from '../contexts/GroopProvider';
import { ChatService } from '../services/chatService';
import { ChatMessage, ReplyingToMessage } from '../models/chat';
import { FlashList } from '@shopify/flash-list';
import MessageBubble from '../components/chat/MessageBubble';
import MessageInput from '../components/chat/MessageInput';
import tw from '../utils/tw';
import { KeyExchangeService } from '../services/KeyExchangeService';

export default function ChatScreen() {
  const { profile } = useAuth();
  const { currentGroop } = useGroop();
  const navigation = useNavigation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<ReplyingToMessage | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const inputRef = useRef(null);
  
  // Debug log
  useEffect(() => {
    console.log(`[CHAT_DEBUG] Current groop ID: ${currentGroop?.id}`);
  }, [currentGroop]);

  useEffect(() => {
    const initializeEncryption = async () => {
      if (profile && currentGroop) {
        // Check if encryption is already set up
        const groopRef = doc(db, 'groops', currentGroop.id);
        const groopSnap = await getDoc(groopRef);
        
        if (!groopSnap.data()?.encryptionEnabled) {
          // Set up encryption for this group
          await ChatService.initializeGroupEncryption(currentGroop.id, profile.uid);
          console.log('[CHAT] Encryption initialized for group:', currentGroop.id);
        }
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
          
        ChatService.markAsRead(currentGroop.id, unreadIds, profile.uid);
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
      {/* Header - Styled like your itinerary screen */}
      <View style={tw`px-4 pt-2 pb-4 bg-primary rounded-b-3xl shadow-lg relative`}>
        <View style={tw`flex-row justify-between items-center`}>
          <Text style={tw`text-xl font-bold text-white`}>{currentGroop.name}</Text>
          <View style={tw`flex-row`}>
            <TouchableOpacity 
              style={tw`bg-white bg-opacity-20 rounded-full p-1.5 mr-2`}
              onPress={navigateToMembers}
            >
              <Ionicons name="people" size={18} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={tw`bg-white bg-opacity-20 rounded-full p-1.5`}>
              <Ionicons name="notifications-outline" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={tw`flex-row items-center mt-2`}>
          <Ionicons name="chatbubble-ellipses" size={16} color="white" />
          <Text style={tw`text-white font-medium ml-2 text-sm`}>
            Group Chat
          </Text>
          
          {/* Member count pill */}
          <View style={tw`bg-white bg-opacity-20 rounded-full px-2.5 py-0.5 ml-3`}>
            <Text style={tw`text-white font-medium text-xs`}>👥 {currentGroop.members.length} Members</Text>
          </View>
          
          {/* Location pill if available */}
          {currentGroop.location && (
            <View style={tw`bg-white bg-opacity-20 rounded-full px-2.5 py-0.5 ml-2`}>
              <Text style={tw`text-white font-medium text-xs`}>📍 {currentGroop.location}</Text>
            </View>
          )}
        </View>
      </View>
      
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
        
        <Text style={tw`text-gray-600 text-xs mb-1.5`}>All messages are encrypted and private to your group</Text>
        
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
          data={messages}
          renderItem={({ item }) => (
            <MessageBubble 
              message={item}
              isFromCurrentUser={item.senderId === profile?.uid}
              onReactionPress={handleReaction}
              onReplyPress={() => handleReply(item)}
            />
          )}
          keyExtractor={(item) => item.id}
          estimatedItemSize={80}
          inverted
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
    </SafeAreaView>
  );
}