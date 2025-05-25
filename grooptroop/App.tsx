import './src/utils/cryptoPolyfill';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import 'react-native-gesture-handler';
import './src/styles/global.css';
import { AuthProvider, useAuth } from './src/contexts/AuthProvider';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { View, Text, ActivityIndicator } from 'react-native';
import tw from './src/utils/tw';
import { GroopProvider } from './src/contexts/GroopProvider';
import { NotificationProvider } from './src/contexts/NotificationProvider';
import { PaymentProvider } from './src/contexts/PaymentProvider';
import { useSentryPerformance } from './src/hooks/useSentryPerformance';
import * as Sentry from '@sentry/react-native';

// Import the root navigator
import RootNavigator from './src/navigation/RootNavigator';

// Test function with proper async/await and flush
const testSentry = async () => {
  // Completely disable in production builds
  if (process.env.NODE_ENV === 'production' || !__DEV__) {
    return;
  }
  
  // Limit to once per app session
  if (window.sentryTestRun) {
    return;
  }
  window.sentryTestRun = true;
  
  console.log('[SENTRY] Running basic Sentry test');
  
  // Only run a minimal test
  Sentry.addBreadcrumb({
    category: 'startup',
    message: 'App initialized successfully',
    level: 'info'
  });
  
  console.log('[SENTRY] Test complete');
};

// Main app content with navigation
const AppContent = () => {
  const { isAuthenticated, isLoading: authLoading, user, profile } = useAuth();
  const perf = useSentryPerformance('AppContent');
  const navigationRef = useNavigationContainerRef();
  const [appReady, setAppReady] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Starting up...');
  
  useEffect(() => {
    // Set user context in Sentry if authenticated
    if (!authLoading && isAuthenticated && user) {
      try {
        Sentry.setUser({
          id: user.uid,
          email: user.email || 'unknown',
          username: profile?.displayName || 'unknown'
        });
      } catch (e) {
        console.error('[SENTRY] Error setting user context:', e);
      }
    }
  }, [authLoading, isAuthenticated, user, profile]);

  // Handle the complete app initialization
  useEffect(() => {
    const initializeApp = async () => {
      if (authLoading) {
        setLoadingMessage('Starting up...');
        return;
      }

      if (!isAuthenticated) {
        setAppReady(true);
        return;
      }

      if (!profile?.hasCompletedOnboarding) {
        setLoadingMessage('Setting up your profile...');
        setAppReady(true);
        return;
      }

      // User is authenticated and has completed onboarding
      // Pre-check if they have groops to show appropriate message
      setLoadingMessage('Loading your groops...');
      
      // Small delay to let the user see the message
      setTimeout(() => {
        setAppReady(true);
      }, 500);
    };

    initializeApp();
  }, [authLoading, isAuthenticated, profile]);

  // Log authentication status
  useEffect(() => {
    const status = authLoading ? 'loading' : isAuthenticated ? 'logged in' : 'not logged in';
    console.log(`[APP] AppContent rendering. Auth status: ${status}`);
  });

  // Show single loading screen for ALL loading states
  if (!appReady) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-light`}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={tw`mt-4 text-primary font-medium`}>
          {loadingMessage}
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <RootNavigator />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
};

export default function App() {
  useEffect(() => {
    testSentry();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <GroopProvider>
            <PaymentProvider>
              <NotificationProvider>
                <AppContent />
              </NotificationProvider>
            </PaymentProvider>
          </GroopProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}