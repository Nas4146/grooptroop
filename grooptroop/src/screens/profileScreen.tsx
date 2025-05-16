import React, { useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  SafeAreaView, 
  ScrollView,
  TextInput,
  ActivityIndicator,
  Animated
} from 'react-native';
import { useAuth } from '../contexts/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import tw from '../utils/tw';
import Avatar from '../components/common/Avatar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import EditAvatarModal from '../components/profile/EditAvatarModal';
import { UserAvatar } from '../contexts/AuthProvider';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Define the navigation prop type
type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen({ navigation }: { navigation: ProfileScreenNavigationProp }) {
  const { user, profile, isLoading, signOut } = useAuth();
  const [isEditAvatarModalVisible, setEditAvatarModalVisible] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(Date.now());
  const [localAvatar, setLocalAvatar] = useState<UserAvatar | null>(null);
  
  // Name editing states
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(profile?.displayName || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [localDisplayName, setLocalDisplayName] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  
  // Toast animation
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;

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
  
  // Start editing name
  const startEditingName = () => {
    console.log('[PROFILE] Starting name edit');
    setNameValue(localDisplayName || profile?.displayName || '');
    setIsEditingName(true);
    // Focus on input after a short delay to ensure it's rendered
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };
  
  // Cancel name edit
  const cancelNameEdit = () => {
    console.log('[PROFILE] Canceling name edit');
    setNameValue(localDisplayName || profile?.displayName || '');
    setIsEditingName(false);
  };
  
  // Save name change
  const saveNameChange = async () => {
    if (!nameValue.trim()) {
      Alert.alert('Error', 'Display name cannot be empty');
      return;
    }
    
    if (!user) {
      Alert.alert('Error', 'You need to be logged in to update your name');
      return;
    }
    
    try {
      console.log('[PROFILE] Saving new display name:', nameValue.trim());
      setIsSavingName(true);
      
      // Update Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: nameValue.trim()
      });
      
      console.log('[PROFILE] Name updated successfully');
      
      // Update local state to avoid full refresh
      setLocalDisplayName(nameValue.trim());
      
      // Show toast notification
      showToastMessage('Name updated successfully');
      
      // Exit edit mode
      setIsEditingName(false);
      
    } catch (error) {
      console.error('[PROFILE] Error updating name:', error);
      Alert.alert('Error', 'Failed to update display name. Please try again.');
    } finally {
      setIsSavingName(false);
    }
  };
  
  // Show toast message
  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowToast(false));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center bg-light`}>
        <Text style={tw`text-neutral`}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  // Use localAvatar if available, otherwise use profile.avatar
  const displayAvatar = localAvatar || profile?.avatar;
  // Use localDisplayName if available, otherwise use profile.displayName
  const displayName = localDisplayName || profile?.displayName || 'Anonymous User';

  return (
    <SafeAreaView style={tw`flex-1 bg-light`}>
      {/* Toast notification */}
      {showToast && (
        <Animated.View 
          style={[
            tw`absolute top-5 self-center py-2 px-4 rounded-lg bg-green-600 z-50 mx-4`,
            { opacity: toastOpacity }
          ]}
        >
          <Text style={tw`text-white font-medium text-center`}>{toastMessage}</Text>
        </Animated.View>
      )}
      
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
              displayName={displayName}
              size={96} // Equivalent to w-24 h-24
              style={tw`shadow-sm`}
              forceUpdate={forceUpdate} // Force avatar to refresh when profile changes
            />
            
            {/* Edit button overlay */}
            <View style={tw`absolute bottom-0 right-0 bg-primary rounded-full w-8 h-8 items-center justify-center shadow-sm`}>
              <Ionicons name="pencil" size={16} color="white" />
            </View>
          </TouchableOpacity>
          
          {/* Editable display name */}
          {isEditingName ? (
            <View style={tw`flex-row items-center mt-3`}>
              <TextInput
                ref={inputRef}
                style={tw`text-2xl font-bold text-neutral border-b border-primary px-2 min-w-[200px] text-center`}
                value={nameValue}
                onChangeText={setNameValue}
                maxLength={30}
                autoCapitalize="words"
                selectTextOnFocus
              />
              <View style={tw`flex-row ml-2`}>
                <TouchableOpacity 
                  style={tw`p-1.5 bg-green-100 rounded-full mr-2`}
                  onPress={saveNameChange}
                  disabled={isSavingName}
                >
                  {isSavingName ? (
                    <ActivityIndicator size="small" color="#10B981" />
                  ) : (
                    <Ionicons name="checkmark" size={18} color="#10B981" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={tw`p-1.5 bg-red-100 rounded-full`}
                  onPress={cancelNameEdit}
                >
                  <Ionicons name="close" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={tw`flex-row items-center mt-3`}
              onPress={startEditingName}
            >
              <Text style={tw`text-2xl font-bold text-neutral`}>
                {displayName}
              </Text>
              <Ionicons name="create-outline" size={18} color="#6B7280" style={tw`ml-2`} />
            </TouchableOpacity>
          )}
          
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
              {(() => {
                // Handle different date formats properly
                try {
                  if (!profile?.createdAt) return 'Unknown';
                  
                  // Handle Firestore Timestamp objects
                  if (profile.createdAt?.toDate) {
                    return profile.createdAt.toDate().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                  }
                  
                  // Handle Date objects or ISO strings
                  const date = new Date(profile.createdAt);
                  if (isNaN(date.getTime())) return 'Unknown';
                  
                  return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                } catch (error) {
                  console.log('[PROFILE] Error formatting date:', error);
                  return 'Unknown';
                }
              })()}
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