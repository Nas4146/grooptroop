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
console.log('[SENTRY] Initializing Sentry in App.tsx');
Sentry.init({
  dsn: 'https://4c10d218343709c4a2b2ebac9da0f21e@o4509352771452928.ingest.us.sentry.io/4509352775122944', 
  debug: true, // This enables debug mode
  enableAutoSessionTracking: true,
  tracesSampleRate: 1.0, // Set to 1.0 for testing
  enableAutoPerformanceTracing: true,
  attachStacktrace: true,
  environment: __DEV__ ? 'development' : 'production',
  beforeSend: (event) => {
    console.log('[SENTRY] Sending event to Sentry:', JSON.stringify(event));
    return event;
  }
});

// Add network debugging for Sentry
if (__DEV__) {
  // Monitor network requests to see if Sentry events are being sent
  const originalFetch = global.fetch;
  global.fetch = async (...args) => {
    const [url, options] = args;
    if (typeof url === 'string' && url.includes('sentry.io')) {
      console.log('[SENTRY NETWORK] Sending request to:', url);
      console.log('[SENTRY NETWORK] Request body:', options?.body ? JSON.stringify(options.body).substring(0, 500) + "..." : "No body");
      
      try {
        const response = await originalFetch(...args);
        console.log(`[SENTRY NETWORK] Response: ${response.status} ${response.statusText}`);
        return response;
      } catch (e) {
        console.error('[SENTRY NETWORK] Error in request:', e);
        throw e;
      }
    } else {
      return originalFetch(...args);
    }
  };
}

// Tell SentryService that we've already initialized Sentry
SentryService.markAsInitialized();
console.log('[SENTRY] Initialization complete, startTransaction available?', typeof Sentry.startTransaction === 'function');

// Test that Sentry is working on app start
try {
  throw new Error('App startup test error');
} catch (e) {
  console.log('[SENTRY] Capturing test error at app startup');
  Sentry.captureException(e);
}

// Simple test function to verify Sentry is working
const testSentry = () => {
  console.log('[SENTRY] Running basic Sentry test');
  
  // Basic message
  Sentry.captureMessage('Test message from GroopTroop App');
  
  // Basic error
  try {
    throw new Error('Manual test error from App.tsx');
  } catch (e) {
    Sentry.captureException(e);
  }
  
  console.log('[SENTRY] Test complete, events should appear in dashboard');
};

// Run the test when app starts
testSentry();

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
export default Sentry.wrap(function App() {
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
});