import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, SafeAreaView, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import tw from '../utils/tw';
import Avatar from '../components/common/Avatar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import EditAvatarModal from '../components/profile/EditAvatarModal';
import { UserAvatar } from '../contexts/AuthProvider';

// Define the navigation prop type
type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen({ navigation }: { navigation: ProfileScreenNavigationProp }) {
  const { user, profile, isLoading, signOut } = useAuth();
  const [isEditAvatarModalVisible, setEditAvatarModalVisible] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(Date.now());
  const [localAvatar, setLocalAvatar] = useState<UserAvatar | null>(null);

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
  
  const handleEditAvatar = () => {
    console.log('[PROFILE] Opening edit avatar modal');
    setEditAvatarModalVisible(true);
  };

  const handleCloseAvatarModal = () => {
    console.log('[PROFILE] Closing edit avatar modal');
    setEditAvatarModalVisible(false);
  };
  
  const handleAvatarUpdated = useCallback((newAvatar: UserAvatar) => {
    console.log('[PROFILE] Received updated avatar:', newAvatar.type);
    // Store the new avatar locally to avoid a full profile refresh
    setLocalAvatar(newAvatar);
    // Force a re-render of the avatar component
    setForceUpdate(Date.now());
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center bg-light`}>
        <Text style={tw`text-neutral`}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  // Use localAvatar if available, otherwise use profile.avatar
  const displayAvatar = localAvatar || profile?.avatar;

  return (
    <SafeAreaView style={tw`flex-1 bg-light`}>
      <ScrollView contentContainerStyle={tw`flex-grow`}>
        {/* Header with title */}
        <View style={tw`px-4 pt-2 pb-4`}>
          <Text style={tw`text-xl font-bold text-neutral`}>My Profile</Text>
        </View>
        
        {/* Avatar section with proper spacing */}
        <View style={tw`items-center px-4 mb-8`}>
          {/* Avatar with Edit button */}
          <TouchableOpacity 
            onPress={handleEditAvatar}
            style={tw`relative`}
          >
            <Avatar
              avatar={displayAvatar}
              displayName={profile?.displayName}
              size={96} // Equivalent to w-24 h-24
              style={tw`shadow-sm`}
              forceUpdate={forceUpdate} // Force avatar to refresh when profile changes
            />
            
            {/* Edit button overlay */}
            <View style={tw`absolute bottom-0 right-0 bg-primary rounded-full w-8 h-8 items-center justify-center shadow-sm`}>
              <Ionicons name="pencil" size={16} color="white" />
            </View>
          </TouchableOpacity>
          
          <Text style={tw`text-2xl font-bold text-neutral mt-3`}>
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

      {/* Edit Avatar Modal */}
      <EditAvatarModal 
        visible={isEditAvatarModalVisible} 
        onClose={handleCloseAvatarModal}
        onAvatarUpdated={handleAvatarUpdated}
      />
    </SafeAreaView>
  );
}