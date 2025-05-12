import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  SafeAreaView,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useGroop } from '../contexts/GroopProvider';
import { useAuth } from '../contexts/AuthProvider';
import tw from '../utils/tw';
import GroopHeader from '../components/common/GroopHeader';

export default function AdminSettingsScreen() {
  const navigation = useNavigation();
  const { currentGroop } = useGroop();
  const { profile } = useAuth();
  const [venmoUsername, setVenmoUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Define navigateToMembers function outside of useEffect
  const navigateToMembers = () => {
    if (currentGroop?.id) {
      navigation.navigate('GroupMembers', { groopId: currentGroop.id });
    }
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
        onPressMembers={navigateToMembers}
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
            
            {/* Payment Settings Section */}
            <View style={tw`mb-8 bg-white p-4 rounded-xl shadow-sm`}>
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
            
            {/* Future sections will go here */}
            <View style={tw`mb-8 bg-white p-4 rounded-xl shadow-sm opacity-50`}>
              <View style={tw`flex-row items-center mb-4`}>
                <Ionicons name="people-outline" size={24} color="#7C3AED" style={tw`mr-3`} />
                <Text style={tw`text-lg font-bold text-neutral`}>Member Management</Text>
              </View>
              <Text style={tw`text-gray-500 italic`}>Coming soon...</Text>
            </View>
            
            <View style={tw`mb-8 bg-white p-4 rounded-xl shadow-sm opacity-50`}>
              <View style={tw`flex-row items-center mb-4`}>
                <Ionicons name="notifications-outline" size={24} color="#7C3AED" style={tw`mr-3`} />
                <Text style={tw`text-lg font-bold text-neutral`}>Notification Settings</Text>
              </View>
              <Text style={tw`text-gray-500 italic`}>Coming soon...</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}