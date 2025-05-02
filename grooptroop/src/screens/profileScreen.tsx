import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthProvider';
import tw from '../utils/tw';

export default function ProfileScreen() {
  const { user, profile, isLoading, signIn } = useAuth();

  if (isLoading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-light`}>
        <Text style={tw`text-neutral`}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 p-4 bg-light`}>
      <View style={tw`items-center mb-6`}>
        {/* User avatar */}
        <View 
          style={[
            tw`w-24 h-24 rounded-full items-center justify-center mb-3`,
            { backgroundColor: profile?.avatarColor || '#7C3AED' }
          ]}
        >
          <Text style={tw`text-white text-3xl font-bold`}>
            {profile?.displayName?.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <Text style={tw`text-2xl font-bold text-neutral`}>
          {profile?.displayName || 'Anonymous User'}
        </Text>
        
        <View style={tw`flex-row items-center mt-1`}>
          <View style={tw`h-2 w-2 rounded-full ${profile?.isAnonymous ? 'bg-amber-400' : 'bg-green-500'} mr-2`} />
          <Text style={tw`text-gray-600`}>
            {profile?.isAnonymous ? 'Anonymous Account' : 'Registered User'}
          </Text>
        </View>
      </View>

      {/* User info */}
      <View style={tw`bg-white rounded-xl p-4 shadow-sm mb-4`}>
        <Text style={tw`text-sm text-gray-500 mb-1`}>User ID</Text>
        <Text style={tw`text-neutral mb-3 font-medium`}>{profile?.uid}</Text>
        
        <Text style={tw`text-sm text-gray-500 mb-1`}>Member Since</Text>
        <Text style={tw`text-neutral mb-3 font-medium`}>
          {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
        </Text>
      </View>
      
      {/* Sign in button for anonymous users */}
      {profile?.isAnonymous && (
        <TouchableOpacity 
          style={tw`bg-primary rounded-xl py-3 items-center mb-4`}
          onPress={() => {
            // Will implement proper sign-in in Phase 1
            alert('Full authentication will be available in Phase 1');
          }}
        >
          <Text style={tw`text-white font-bold`}>Create Account</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}