import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  SafeAreaView,
  ScrollView,
  Share,
  Platform,
  Clipboard
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useGroop } from '../contexts/GroopProvider';
import { useAuth } from '../contexts/AuthProvider';
import tw from '../utils/tw';
import GroopHeader from '../components/common/GroopHeader';
import * as Haptics from 'expo-haptics';
import { InvitationService } from '../services/InvitationService';
import { RootStackParamList } from '../navigation/types';

export default function AdminSettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { currentGroop } = useGroop();
  const { profile } = useAuth();
  const [venmoUsername, setVenmoUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  
const navigateToMembers = () => {
};
  
  useEffect(() => {
    if (!currentGroop || !profile) {
      setLoading(false);
      return;
    }
    
    console.log('[ADMIN_SETTINGS] Checking authorization for user:', profile.uid);
    console.log('[ADMIN_SETTINGS] Groop data:', {
      createdBy: currentGroop.createdBy,
      organizerID: currentGroop.organizerID || []
    });

    // Check if the current user is a creator or an organizer
    const isCreator = currentGroop.createdBy === profile.uid;
    const isOrganizer = Array.isArray(currentGroop.organizerID) && 
                        currentGroop.organizerID.includes(profile.uid);
    
    const authorized = isCreator || isOrganizer;
    console.log(`[ADMIN_SETTINGS] User authorization: ${authorized ? 'Granted' : 'Denied'}`);
    setIsAuthorized(authorized);
    
    if (authorized) {
      loadSettings();
    } else {
      setLoading(false);
    }
  }, [currentGroop, profile]);
  
  const loadSettings = async () => {
    try {
      setLoading(true);
      const groopDoc = await getDoc(doc(db, 'groops', currentGroop.id));
      const groopData = groopDoc.data();
      
      console.log('[ADMIN_SETTINGS] Loaded groop settings:', {
        paymentSettings: groopData?.paymentSettings || 'undefined'
      });
      
      // Load payment settings
      if (groopData?.paymentSettings?.venmoUsername) {
        setVenmoUsername(groopData.paymentSettings.venmoUsername);
      }
      
      // Load other settings as needed
      
    } catch (error) {
      console.error('[ADMIN_SETTINGS] Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSavePaymentSettings = async () => {
    if (!currentGroop) return;
    
    try {
      setSaving(true);
      await updateDoc(doc(db, 'groops', currentGroop.id), {
        paymentSettings: {
          venmoUsername: venmoUsername.trim()
        }
      });
      
      Alert.alert('Success', 'Payment settings updated successfully');
    } catch (error) {
      console.error('[ADMIN_SETTINGS] Error saving payment settings:', error);
      Alert.alert('Error', 'Failed to save payment settings');
    } finally {
      setSaving(false);
    }
  };

  // Generate an invitation link with the current groop ID
  const generateInviteLink = async () => {
    if (!currentGroop || !profile) return;
    
    try {
      console.log('[ADMIN_SETTINGS] Generating invite link for groop:', currentGroop.id);
      setGeneratingLink(true);
      
      // Generate a short code for the invitation
      const shortCode = await InvitationService.generateInviteCode(currentGroop.id, profile.uid);
      
      // Create a shorter, more shareable link
      const baseUrl = 'https://grp.trp';
      const link = `${baseUrl}/${shortCode}`;
      
      console.log('[ADMIN_SETTINGS] Generated invite link:', link);
      setInviteLink(link);
    } catch (error) {
      console.error('[ADMIN_SETTINGS] Error generating invite link:', error);
      Alert.alert('Error', 'Failed to generate invitation link');
    } finally {
      setGeneratingLink(false);
    }
  };

  // Copy invite link to clipboard
  const copyInviteLink = () => {
    if (!inviteLink) return;
    
    try {
      console.log('[ADMIN_SETTINGS] Copying invite link to clipboard');
      
      // On iOS, make sure we're copying as plain text rather than as a URL object
      const plainTextLink = inviteLink.toString();
      Clipboard.setString(plainTextLink);
      
      // Show toast
      setShowCopiedToast(true);
      // Provide haptic feedback for better UX
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setTimeout(() => setShowCopiedToast(false), 2000);
    } catch (error) {
      console.error('[ADMIN_SETTINGS] Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy link to clipboard');
    }
  };

  // Share the invite link using the native share dialog
  const shareInviteLink = async () => {
    if (!inviteLink || !currentGroop) return;
    
    try {
      console.log('[ADMIN_SETTINGS] Opening share dialog for invite link');
      
      const message = `You've been invited to join ${currentGroop.name} Groop!`;
      const plainTextLink = inviteLink.toString();
      
      // Share as plain text for better cross-platform compatibility
      const result = await Share.share({
        message: `${message}\n${plainTextLink}`,
        title: `Join ${currentGroop.name} on GroopTroop`,
        // Don't use the URL property here to avoid iOS binary encoding issues
      });
      
      if (result.action === Share.sharedAction) {
        console.log('[ADMIN_SETTINGS] Invite shared successfully');
        if (result.activityType) {
          console.log(`[ADMIN_SETTINGS] Shared via ${result.activityType}`);
        }
      } else if (result.action === Share.dismissedAction) {
        console.log('[ADMIN_SETTINGS] Share dialog dismissed');
      }
    } catch (error) {
      console.error('[ADMIN_SETTINGS] Error sharing invite link:', error);
      Alert.alert('Error', 'Failed to share invitation link');
    }
  };
  
  if (!currentGroop) {
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center bg-light`}>
        <Text>No groop selected</Text>
      </SafeAreaView>
    );
  }
  
  if (!isAuthorized) {
    return (
      <SafeAreaView style={tw`flex-1 bg-light`}>
        <View style={tw`flex-1 justify-center items-center p-6`}>
          <Ionicons name="lock-closed" size={64} color="#CBD5E1" />
          <Text style={tw`text-xl font-bold text-gray-800 mt-4 text-center`}>
            Access Denied
          </Text>
          <Text style={tw`text-gray-600 text-center mt-2`}>
            You need to be a groop organizer or admin to access these settings.
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={tw`flex-1 bg-light`}>
      <GroopHeader 
        minimal={true} 
        showMembers={true}
        isChatScreen={false}
        isItineraryScreen={false}
      />
      
      {loading ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      ) : (
        <ScrollView style={tw`flex-1`}>
          <View style={tw`p-4`}>
            <Text style={tw`text-xl font-bold text-neutral mb-6`}>
              {currentGroop.name} Settings
            </Text>
            
            {/* Invite Members Section */}
            <View style={tw`mb-8 bg-white p-4 rounded-xl`}>
              <View style={tw`flex-row items-center mb-4`}>
                <Ionicons name="people-outline" size={24} color="#7C3AED" style={tw`mr-3`} />
                <Text style={tw`text-lg font-bold text-neutral`}>Invite Members</Text>
              </View>
              
              <Text style={tw`text-sm text-gray-600 mb-4`}>
                Generate a link to invite friends to join your groop
              </Text>
              
              {!inviteLink ? (
                <TouchableOpacity
                  style={tw`bg-primary py-3 rounded-lg items-center flex-row justify-center`}
                  onPress={generateInviteLink}
                  disabled={generatingLink}
                >
                  {generatingLink ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Ionicons name="link-outline" size={18} color="white" style={tw`mr-2`} />
                      <Text style={tw`text-white font-bold`}>Generate Invite Link</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <View>
                  {/* Improved link field that's selectable but not editable */}
                  <View style={tw`bg-gray-100 rounded-lg p-3.5 mb-4 flex-row items-center`}>
                    <TouchableOpacity 
                      style={tw`flex-1 mr-2 flex-row items-center`}
                      onPress={copyInviteLink}
                      activeOpacity={0.7}
                    >
                      <Text 
                        style={tw`text-gray-700 text-sm font-medium flex-1`} 
                        selectable={true} // Make text selectable for manual copy/paste
                        numberOfLines={1}
                      >
                        {inviteLink}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={copyInviteLink} 
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={tw`p-1`}
                    >
                      <Ionicons name="copy-outline" size={20} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={tw`flex-row`}>
                    {/* Removed the Copy button - now only using the icon in the field */}
                    <TouchableOpacity
                      style={tw`flex-1 bg-primary py-2.5 rounded-lg items-center flex-row justify-center`}
                      onPress={shareInviteLink}
                    >
                      <Ionicons name="share-social-outline" size={18} color="white" style={tw`mr-2`} />
                      <Text style={tw`text-white font-bold`}>Share</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
            
            {/* Payment Settings Section */}
            <View style={tw`mb-8 bg-white p-4 rounded-xl`}>
              <View style={tw`flex-row items-center mb-4`}>
                <Ionicons name="wallet-outline" size={24} color="#7C3AED" style={tw`mr-3`} />
                <Text style={tw`text-lg font-bold text-neutral`}>Payment Settings</Text>
              </View>
              
              <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>Venmo Username</Text>
              <TextInput
                style={tw`border border-gray-300 rounded-lg p-3 mb-2 bg-white`}
                value={venmoUsername}
                onChangeText={setVenmoUsername}
                placeholder="Enter Venmo username (without @)"
                autoCapitalize="none"
              />
              
              <Text style={tw`text-xs text-gray-500 mb-4`}>
                This is the Venmo account that will receive payments from group members.
              </Text>
              
              <TouchableOpacity
                style={tw`bg-primary py-2 rounded-lg items-center`}
                onPress={handleSavePaymentSettings}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={tw`text-white font-bold`}>Save Payment Settings</Text>
                )}
              </TouchableOpacity>
            </View>
            
            {/* Future sections */}
            <View style={tw`mb-8 bg-white p-4 rounded-xl opacity-50`}>
              <View style={tw`flex-row items-center mb-4`}>
                <Ionicons name="notifications-outline" size={24} color="#7C3AED" style={tw`mr-3`} />
                <Text style={tw`text-lg font-bold text-neutral`}>Notification Settings</Text>
              </View>
              <Text style={tw`text-gray-500 italic`}>Coming soon...</Text>
            </View>
            
            {/* Performance Monitor Section - New */}
            <View style={tw`mb-8 bg-white p-4 rounded-xl`}>
              <View style={tw`flex-row items-center mb-4`}>
                <Ionicons name="speedometer-outline" size={24} color="#7C3AED" style={tw`mr-3`} />
                <Text style={tw`text-lg font-bold text-neutral`}>Performance Monitor</Text>
              </View>
              
              <Text style={tw`text-sm text-gray-600 mb-4`}>
                Monitor the performance of your groop and identify areas for improvement.
              </Text>
              
              <TouchableOpacity
                style={tw`bg-primary py-3 rounded-lg items-center flex-row justify-center`}
                onPress={() => navigation.navigate('DevPerformance')}
              >
                <Text style={tw`text-white font-bold`}>Open Performance Monitor</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
      
      {/* Toast notification for copy action */}
      {showCopiedToast && (
        <View style={tw`absolute bottom-8 left-4 right-4 bg-gray-800 rounded-lg px-4 py-3 flex-row items-center justify-center`}>
          <Ionicons name="checkmark-circle" size={20} color="#22c55e" style={tw`mr-2`} />
          <Text style={tw`text-white font-medium`}>Invite link copied to clipboard!</Text>
        </View>
      )}
    </SafeAreaView>
  );
}