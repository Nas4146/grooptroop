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
  const [isLoading, setIsLoading] = useState(false); // Start with false

  useEffect(() => {
    if (!profile?.uid) {
      setHasGroops(false);
      setIsLoading(false);
      return;
    }

    const checkUserGroops = async () => {
      try {
        console.log(`[CONTENT_SWITCHER] 🔍 Checking if user has any groops: ${profile.uid}`);
        const userGroops = await GroopService.getUserGroops(profile.uid);
        const hasAnyGroops = userGroops && userGroops.length > 0;
        
        console.log(`[CONTENT_SWITCHER] 📊 User has ${userGroops?.length || 0} groops`);
        setHasGroops(hasAnyGroops);
      } catch (error) {
        console.error('[CONTENT_SWITCHER] ❌ Error checking groops:', error);
        setHasGroops(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserGroops();
  }, [profile]);

  // Show the appropriate screen immediately
  // If hasGroops is false (not null), show NoGroopsScreen
  if (hasGroops === false) {
    return <NoGroopsScreen />;
  }

  // User has groops or we're still checking, show the main app
  // The main app will handle its own loading states gracefully
  return <BottomTabbNavigator />;
}