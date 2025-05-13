import './src/utils/cryptoPolyfill';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useRef } from 'react';
import 'react-native-gesture-handler';
import './src/styles/global.css';
import { AuthProvider, useAuth } from './src/contexts/AuthProvider';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, ActivityIndicator } from 'react-native';
import tw from './src/utils/tw';
import { GroopProvider } from './src/contexts/GroopProvider';
import { KeyExchangeService } from './src/services/KeyExchangeService';
import { NotificationProvider } from './src/contexts/NotificationProvider';
import { NotificationService } from './src/services/NotificationService';

// Import the root navigator
import RootNavigator from './src/navigation/RootNavigator';

// Main app content with navigation
const AppContent = () => {
  const { isAuthenticated, isLoading, profile } = useAuth();
  
  useEffect(() => {
    // Set up global error handler for debugging
    const originalConsoleError = console.error;
    console.error = (message, ...optionalParams) => {
      originalConsoleError(message, ...optionalParams);
      
      // Log additional details for navigation errors
      if (typeof message === 'string' && message.includes('undefined')) {
        console.log('[DEBUG] Error details - Auth state:', isAuthenticated);
        console.log('[DEBUG] Navigation error occurred with undefined component');
      }
    };
    
    return () => {
      console.error = originalConsoleError;
    };
  }, [isAuthenticated]);
  
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
    <NavigationContainer>
      <RootNavigator isAuthenticated={isAuthenticated} />
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
    
    // Notification setup code
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[APP] Notification received in foreground:', notification);
    });
    
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[APP] Notification response received:', response);
    });
    
    requestNotificationPermissions();
    
    return () => {
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