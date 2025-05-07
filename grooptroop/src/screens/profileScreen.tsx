import React from 'react';
import { View, Text, TouchableOpacity, Alert, SafeAreaView, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import tw from '../utils/tw';

export default function ProfileScreen() {
  const { user, profile, isLoading, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      console.log('[PROFILE] Attempting to sign out');
      await signOut();
      console.log('[PROFILE] Sign out successful');
    } catch (error) {
      console.error('[PROFILE] Error signing out:', error);
      Alert.alert('Sign Out Failed', 'There was a problem signing out. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center bg-light`}>
        <Text style={tw`text-neutral`}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-light`}>
      <ScrollView contentContainerStyle={tw`flex-grow`}>
        {/* Header with title */}
        <View style={tw`px-4 pt-2 pb-4`}>
          <Text style={tw`text-xl font-bold text-neutral`}>My Profile</Text>
        </View>
        
        {/* Avatar section with proper spacing */}
        <View style={tw`items-center px-4 mb-8`}>
          <View 
            style={[
              tw`w-24 h-24 rounded-full items-center justify-center mb-3 shadow-sm`,
              { backgroundColor: profile?.avatarColor || '#7C3AED' }
            ]}
          >
            <Text style={tw`text-white text-3xl font-bold`}>
              {profile?.displayName?.charAt(0).toUpperCase() || 'A'}
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

        {/* User information cards */}
        <View style={tw`px-4`}>
          {/* Member Since card */}
          <View style={tw`bg-white rounded-xl p-4 shadow-sm mb-4`}>
            <View style={tw`flex-row items-center mb-1`}>
              <Ionicons name="calendar-outline" size={18} color="#7C3AED" style={tw`mr-2`} />
              <Text style={tw`text-sm font-medium text-primary`}>Member Since</Text>
            </View>
            <Text style={tw`text-neutral font-medium ml-6`}>
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'Unknown'}
            </Text>
          </View>
          
          {/* Email card */}
          <View style={tw`bg-white rounded-xl p-4 shadow-sm mb-4`}>
            <View style={tw`flex-row items-center mb-1`}>
              <Ionicons name="mail-outline" size={18} color="#7C3AED" style={tw`mr-2`} />
              <Text style={tw`text-sm font-medium text-primary`}>Email</Text>
            </View>
            <Text style={tw`text-neutral font-medium ml-6`}>
              {profile?.email || user?.email || 'No email available'}
          </Text>
          </View>
          
          {/* Sign in button for anonymous users */}
          {profile?.isAnonymous && (
            <TouchableOpacity 
              style={tw`bg-primary rounded-xl py-3.5 items-center mb-4 flex-row justify-center`}
              onPress={() => {
                Alert.alert('Convert Account', 'Would you like to create a permanent account?', [
                  {
                    text: 'Cancel',
                    style: 'cancel'
                  },
                  {
                    text: 'Create Account',
                    onPress: () => {
                      // Will implement account conversion later
                      Alert.alert('Coming Soon', 'This feature will be available in a future update.');
                    }
                  }
                ]);
              }}
            >
              <Ionicons name="person-add-outline" size={20} color="white" style={tw`mr-2`} />
              <Text style={tw`text-white font-bold`}>Create Permanent Account</Text>
            </TouchableOpacity>
          )}
          
          {/* Sign Out Button */}
          <TouchableOpacity 
            style={tw`bg-red-50 border border-red-200 rounded-xl py-3.5 items-center mt-4 mb-8 flex-row justify-center`}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={tw`text-red-500 font-bold ml-2`}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}