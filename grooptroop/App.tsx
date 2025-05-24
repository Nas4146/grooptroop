import './src/utils/cryptoPolyfill';
import React, { useEffect } from 'react';
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
  const { isAuthenticated, isLoading, user, profile } = useAuth();
  // Use the hook with a try/catch for safety
  const perf = useSentryPerformance('AppContent');
  const navigationRef = useNavigationContainerRef();
  
  useEffect(() => {
    // Set user context in Sentry if authenticated
    if (!isLoading && isAuthenticated && user) {
      try {
        Sentry.setUser({
          id: user.uid,
          username: user.displayName || undefined,
          email: user.email || undefined
        });
        
        if (profile) {
          Sentry.setTag('user.hasCompletedOnboarding', String(profile.hasCompletedOnboarding || false));
          Sentry.setTag('user.isAdmin', String(profile.isAdmin || false));
        }
      } catch (e) {
        console.error('[SENTRY] Error setting user data:', e);
      }
    }
    
    // Run test after a delay to ensure initialization is complete
    setTimeout(() => {
      testSentry().catch(e => console.error('[SENTRY] Test error:', e));
    }, 2000);
    
  }, [isLoading, isAuthenticated, user, profile]);
  
  console.log('[APP] AppContent rendering. Auth status:', isAuthenticated ? 'logged in' : 'not logged in');
  
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
      ref={navigationRef}
      onReady={() => {
        perf.trackInteraction('navigation_ready');
        Sentry.addBreadcrumb({
          category: 'navigation',
          message: 'Navigation container ready',
          level: 'info'
        });
      }}
    >
      <RootNavigator />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
};

// Main App component
function App() {
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

export default App;