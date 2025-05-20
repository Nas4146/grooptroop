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
import { SentryService, usePerformance } from './src/utils/sentryService';
import * as Sentry from '@sentry/react-native';

// Import the root navigator
import RootNavigator from './src/navigation/RootNavigator';

// Initialize Sentry at the very beginning of your app
Sentry.init({
  dsn: 'YOUR_SENTRY_DSN', 
  enableAutoSessionTracking: true,
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  enableAutoPerformanceTracing: true,
  attachStacktrace: true,
  environment: __DEV__ ? 'development' : 'production'
});

// Tell SentryService that we've already initialized Sentry
SentryService.markAsInitialized();

// Main app content with navigation
const AppContent = () => {
  // Update this line to include profile
  const { isAuthenticated, isLoading, user, profile } = useAuth();
  const perf = usePerformance('AppContent');
  const navigationRef = useNavigationContainerRef();
  
  useEffect(() => {
    // Set up navigation tracking
    const unsubscribeNav = SentryService.configureNavigation(navigationRef);
    // Set up network monitoring
    SentryService.setupNetworkMonitoring();
    
    // Set user context in Sentry if authenticated
    if (!isLoading && isAuthenticated && user) {
      SentryService.setUser({
        id: user.uid,
        username: user.displayName || undefined,
        email: user.email || undefined
      });
      
      // Now profile is properly defined
      if (profile) {
        SentryService.setTag('user.hasCompletedOnboarding', String(profile.hasCompletedOnboarding || false));
        SentryService.setTag('user.isAdmin', String(profile.isAdmin || false));
      }
    }
    
    // Track memory usage periodically
    const memoryInterval = setInterval(() => {
      // Use type assertion to avoid TypeScript error
      const jsHeapSize = (global.performance as any)?.memory?.usedJSHeapSize;
      SentryService.trackMemoryUsage(jsHeapSize);
    }, 60000); // Check every minute
    
    return () => {
      unsubscribeNav();
      clearInterval(memoryInterval);
    };
  }, [isLoading, isAuthenticated, user, profile, navigationRef]);
  
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
        SentryService.logEvent('navigation', 'Navigation container ready');
      }}
    >
      <RootNavigator />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
};

// Main App component
export default function App() {
  const perf = usePerformance('App');
  
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

