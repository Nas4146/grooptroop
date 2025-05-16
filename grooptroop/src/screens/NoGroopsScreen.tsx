import React from 'react';
import { View, Text, Image, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthProvider';
import tw from '../utils/tw';

export default function NoGroopsScreen() {
  console.log('[NO_GROOPS_SCREEN] 🖥️ Rendering NoGroopsScreen');
  
  const { signOut } = useAuth();
  
  const handleSignOut = async () => {
    try {
      console.log('[NO_GROOPS_SCREEN] Attempting to sign out');
      await signOut();
      console.log('[NO_GROOPS_SCREEN] Sign out successful');
    } catch (error) {
      console.error('[NO_GROOPS_SCREEN] Error signing out:', error);
      Alert.alert('Sign Out Failed', 'There was a problem signing out. Please try again.');
    }
  };
  
  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <View style={tw`flex-1 justify-center items-center p-6`}>
        <Image 
          source={require('../assets/GTlogo.png')}
          style={tw`w-64 h-64`}
          resizeMode="contain"
        />
        <Text style={tw`text-2xl font-bold text-center mb-4 mt-6 text-neutral-800`}>
          Welcome to GroopTroop!
        </Text>
        <Text style={tw`text-base text-center text-gray-500 mb-8`}>
          You're not part of any groops yet. You'll need an invitation link to join one.
        </Text>
        
        {/* Sign Out Button - matching the one on profile screen */}
        <TouchableOpacity 
          style={tw`bg-red-50 border border-red-200 rounded-xl py-3.5 px-8 items-center mt-6 flex-row justify-center`}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={tw`text-red-500 font-bold ml-2`}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}