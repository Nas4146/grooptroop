import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  KeyboardAvoidingView, 
  Platform,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthProvider';
import { ChatService } from '../services/chatService';
import { ChatMessage } from '../models/chat';
import { FlashList } from '@shopify/flash-list';
import MessageBubble from '../components/chat/MessageBubble';
import MessageInput from '../components/chat/MessageInput';
import tw from '../utils/tw';

// Temporary hardcoded group ID for Phase 0
const DEFAULT_GROUP_ID = 'default-group';

export default function ChatScreen() {
  const { profile, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Load messages
  useEffect(() => {
    if (!profile) return;
    
    // Subscribe to messages
    const unsubscribe = ChatService.subscribeToMessages(DEFAULT_GROUP_ID, (newMessages) => {
      setMessages(newMessages);
      setLoading(false);
      setRefreshing(false);
    });
    
    // Cleanup subscription
    return () => unsubscribe();
  }, [profile]);
  
  // Send message
  const sendMessage = useCallback(async (text: string) => {
    if (!profile) return;
    
    await ChatService.sendMessage(DEFAULT_GROUP_ID, {
      text,
      senderId: profile.uid,
      senderName: profile.displayName || 'Anonymous',
      senderAvatar: profile.avatarColor,
      replyTo: replyingTo
    });
    
    // Clear reply state
    if (replyingTo) setReplyingTo(null);
  }, [profile, replyingTo]);
  
  // Handle reactions
  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!profile) return;
    
    await ChatService.addReaction(DEFAULT_GROUP_ID, messageId, emoji, profile.uid);
  }, [profile]);
  
  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // The refreshing state will be reset when new messages come in
  }, []);
  
  if (authLoading || loading) {
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center bg-light`}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={tw`mt-4 font-semibold text-primary`}>Loading your chat...</Text>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={tw`flex-1 bg-light`}>
      {/* Header - Styled like your itinerary screen */}
      <View style={tw`px-4 pt-2 pb-4 bg-primary rounded-b-3xl shadow-lg relative`}>
        <View style={tw`flex-row justify-between items-center`}>
          <Text style={tw`text-xl font-bold text-white`}>Group Chat</Text>
          <View style={tw`flex-row`}>
            <TouchableOpacity style={tw`bg-white bg-opacity-20 rounded-full p-1.5 mr-2`}>
              <Ionicons name="people" size={18} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={tw`bg-white bg-opacity-20 rounded-full p-1.5`}>
              <Ionicons name="notifications-outline" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={tw`flex-row items-center mt-2`}>
          <Ionicons name="chatbubble-ellipses" size={16} color="white" />
          <Text style={tw`text-white font-medium ml-2 text-sm`}>Nick's Bachelor Party</Text>
          
          {/* Member count pill */}
          <View style={tw`bg-white bg-opacity-20 rounded-full px-2.5 py-0.5 ml-3`}>
            <Text style={tw`text-white font-medium text-xs`}>👥 6 Members</Text>
          </View>
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
            <View style={tw`bg-green-100 rounded-full px-2 py-0.5 flex-row items-center`}>
              <View style={tw`h-2 w-2 rounded-full bg-green-500 mr-1`}></View>
              <Text style={tw`text-xs text-green-700`}>New</Text>
            </View>
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
              onReplyPress={(id) => setReplyingTo(id)}
            />
          )}
          keyExtractor={(item) => item.id}
          estimatedItemSize={80}
          inverted
          contentContainerStyle={tw`px-4 pt-4 pb-2`}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={tw`py-20 items-center`}>
              <View style={tw`w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-3`}>
                <Ionicons name="chatbubble-outline" size={32} color="#7C3AED" />
              </View>
              <Text style={tw`text-neutral font-medium`}>No messages yet</Text>
              <Text style={tw`text-gray-500 text-sm mt-1 text-center max-w-[70%]`}>
                Send the first message to start planning your trip!
              </Text>
            </View>
          }
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