import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuth } from '../../contexts/AuthProvider';
import { GroopService } from '../../services/GroopService';
import NoGroopsScreen from '../../screens/NoGroopsScreen';
import BottomTabbNavigator from '../../navigation/BottomTabNavigator';
import tw from '../../utils/tw';

export default function GroopsContentSwitcher() {
  const { profile } = useAuth();
  const [hasGroops, setHasGroops] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Function to check if user has any groops
    const checkUserGroops = async () => {
      if (!profile) {
        console.log('[CONTENT_SWITCHER] ⚠️ No profile available, skipping check');
        setIsLoading(false);
        return;
      }

      try {
        console.log('[CONTENT_SWITCHER] 🔍 Checking if user has any groops:', profile.uid);
        setIsLoading(true);
        
        // Use the GroopService directly to get user's groops
        const groops = await GroopService.getUserGroops(profile.uid);
        
        console.log('[CONTENT_SWITCHER] 📊 User has', groops.length, 'groops');
        setHasGroops(groops.length > 0);
      } catch (error) {
        console.error('[CONTENT_SWITCHER] ❌ Error checking groops:', error);
        setHasGroops(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserGroops();
  }, [profile]); // Only re-run when profile changes

  if (isLoading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-white`}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={tw`mt-4 text-gray-600`}>Loading your groops...</Text>
      </View>
    );
  }

  // If hasGroops is false (not null), show NoGroopsScreen
  if (hasGroops === false) {
    return <NoGroopsScreen />;
  }

  // User has groops, show the main app
  return <BottomTabbNavigator />;
}