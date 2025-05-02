import React from 'react';
import { View, Text } from 'react-native';
import { useAuth } from '../contexts/AuthProvider';
import tw from '../utils/tw';

const ChatScreen = () => {
  const { profile, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <Text>Loading...</Text>
      </View>
    );
  }
  
  return (
    <View style={tw`flex-1 p-4`}>
      <Text style={tw`text-lg font-bold`}>Welcome, {profile?.displayName}!</Text>
      <View style={[
        tw`w-10 h-10 rounded-full items-center justify-center mb-2`,
        { backgroundColor: profile?.avatarColor || '#7C3AED' }
      ]}>
        <Text style={tw`text-white font-bold`}>
          {profile?.displayName?.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text>User ID: {profile?.uid}</Text>
      <Text>Status: {profile?.isAnonymous ? 'Anonymous' : 'Registered'}</Text>
      {/* Rest of your chat UI */}
    </View>
  );
};

export default ChatScreen;