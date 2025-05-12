import './src/utils/cryptoPolyfill';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState, useRef } from 'react';
import 'react-native-gesture-handler';
import './src/styles/global.css';
import { AppState, AppStateStatus } from 'react-native';
import { AuthProvider, useAuth } from './src/contexts/AuthProvider';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { View, Text, ActivityIndicator, Button, Linking } from 'react-native';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import tw from './src/utils/tw';
import { GroopProvider } from './src/contexts/GroopProvider';
import { KeyExchangeService } from './src/services/KeyExchangeService';
import { NotificationProvider } from './src/contexts/NotificationProvider';
import { NotificationService } from './src/services/NotificationService';

// Function to enable/disable debug navigation
const useDebugNavigation = () => {
  const [debugMode, setDebugMode] = useState(__DEV__ ? false : false); // Default to false
  
  // Log changes to debug mode
  useEffect(() => {
    console.log(`[DEBUG] Navigation debug mode: ${debugMode ? 'ON' : 'OFF'}`);
  }, [debugMode]);
  
  return { debugMode, toggleDebugMode: () => setDebugMode(prev => !prev) };
};

// Define the type for our navigation structure
type RootParamList = {
  Chat: { groopId?: string };
  Itinerary: { groopId?: string };
  Payments: { groopId?: string };
  Map: undefined;
  Profile: undefined;
  Admin: undefined;
  SignIn: { groopId?: string };
  SignUp: undefined;
};

// Fixed typing for the linking configuration
const linking: LinkingOptions<RootParamList> = {
  prefixes: ['grooptroop://', 'https://grooptroop.app', 'https://grp.trp'],
  config: {
    screens: {
      Chat: 'chat/:groopId?',
      Itinerary: 'itinerary/:groopId?',
      Payments: 'payments/:groopId?',
      Map: 'map',
      Profile: 'profile',
      SignIn: 'signin',
      SignUp: 'signup'
    }
  },
  // Handle short invite links
  getInitialURL: async () => {
    const url = await Linking.getInitialURL();
    console.log('[LINKING] Initial URL:', url);
    
    if (url) {
      // Handle short links like https://grp.trp/abc123
      const shortLinkMatch = url.match(/https:\/\/grp\.trp\/([a-zA-Z0-9]+)/);
      if (shortLinkMatch && shortLinkMatch[1]) {
        const shortCode = shortLinkMatch[1];
        console.log('[LINKING] Detected short code:', shortCode);
        // Convert to the standard Chat URL format with groopId
        return `grooptroop://chat/${shortCode}`;
      }
    }
    return url;
  },
  // Handle incoming links
  subscribe: (listener) => {
    const onReceiveURL = ({ url }: { url: string }) => {
      console.log('[LINKING] Received URL:', url);
      
      // Handle short links like https://grp.trp/abc123
      const shortLinkMatch = url.match(/https:\/\/grp\.trp\/([a-zA-Z0-9]+)/);
      if (shortLinkMatch && shortLinkMatch[1]) {
        const shortCode = shortLinkMatch[1];
        console.log('[LINKING] Detected short code:', shortCode);
        // Convert to the standard Chat URL format with groopId
        listener(`grooptroop://chat/${shortCode}`);
        return;
      }
      listener(url);
    };
    
    // Listen to incoming links
    const subscription = Linking.addEventListener('url', onReceiveURL);
    
    return () => {
      subscription.remove();
    };
  }
};

const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { debugMode, toggleDebugMode } = useDebugNavigation();
  const { profile } = useAuth();
  
  useEffect(() => {
    const checkEncryption = async () => {
      if (profile) {
        console.log('[APP] Checking encryption setup for user:', profile.uid);
        await KeyExchangeService.processPendingKeyExchanges(profile.uid);
      }
    };
    
    checkEncryption();
  }, [profile]);

  console.log('[DEBUG] AppContent rendering. Auth status:', isAuthenticated ? 'logged in' : 'not logged in');
  
  // Show loading state
  if (isLoading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-100`}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={tw`mt-3 text-gray-500`}>Loading...</Text>
      </View>
    );
  }
  
  return (
    <NavigationContainer 
      linking={linking}
      onStateChange={(state) => console.log('[DEBUG] Navigation state changed:', state?.routes?.[state.index]?.name)}
    >
      <View style={tw`flex-1`}>
        {__DEV__ && debugMode ? (
          // Show debug screen in development mode when debug toggle is on
          <View style={tw`flex-1 justify-center items-center p-5`}>
            <Text style={tw`text-xl mb-5`}>Development Mode</Text>
            <Text style={tw`mb-6 text-gray-500`}>Auth status: {isAuthenticated ? 'Logged in' : 'Not logged in'}</Text>
            <Button 
              title="Show App Navigation" 
              onPress={toggleDebugMode} 
              color="#7C3AED"
            />
          </View>
        ) : (
          // Show either the auth navigator or the bottom tab navigator based on auth state
          isAuthenticated ? <BottomTabNavigator /> : <AuthNavigator />
        )}
      </View>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
};

// Main App component
export default function App() {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // Set up notification handlers
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    
    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[APP] Notification received in foreground:', notification);
    });
    
    // Listen for user interaction with notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[APP] Notification response received:', response);
      
      // Extract data from notification
      const data = response.notification.request.content.data;
      
      if (data.groopId && data.messageId) {
        console.log(`[APP] Navigating to chat: ${data.groopId}`);
        // Navigation will be handled by the notification context
      }
    });
    
    // Request notification permissions
    requestNotificationPermissions();
    
    return () => {
      // Clean up listeners
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const requestNotificationPermissions = async () => {
    try {
      const permissionResult = await NotificationService.requestPermission();
      console.log(`[APP] Notification permission ${permissionResult ? 'granted' : 'denied'}`);
      return permissionResult;
    } catch (error) {
      console.error('[APP] Error requesting notification permissions:', error);
      return false;
    }
  };

  return (
    <GestureHandlerRootView style={tw`flex-1`}>
      <SafeAreaProvider>
        <AuthProvider>
          <GroopProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </GroopProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}