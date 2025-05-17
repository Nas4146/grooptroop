import './src/utils/cryptoPolyfill';
import React, { useEffect } from 'react';
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
import { SimplePerformance } from './src/utils/simplePerformance';
import { useComponentPerformance } from './src/utils/usePerformance';
import { setupAppMonitoring } from './src/utils/appPerformanceMonitor';

// Import the root navigator
import RootNavigator from './src/navigation/RootNavigator';

// Start app load trace at the top level
const appLoadTraceId = SimplePerformance.startTrace('app_load');

// Main app content with navigation
const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const perf = useComponentPerformance('AppContent');
  const navigationRef = useNavigationContainerRef();
  
  // Add this to use the app monitoring
  useEffect(() => {
    // Initialize app-wide performance monitoring
    setupAppMonitoring(navigationRef);
  }, [navigationRef]);
  
  // Track when app is fully mounted and ready
  useEffect(() => {
    if (!isLoading) {
      SimplePerformance.logEvent('app', `App mounted ${isAuthenticated ? 'authenticated' : 'unauthenticated'}`);
    }
  }, [isLoading, isAuthenticated]);
  
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
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[APP ${timestamp}] Navigation container is ready`);
        // End the app load trace when navigation is ready
        SimplePerformance.endTrace(appLoadTraceId);
      }}
      onStateChange={(state) => {
        const timestamp = new Date().toLocaleTimeString();
        const currentRouteName = navigationRef.getCurrentRoute()?.name;
        console.log(`[APP ${timestamp}] Navigation state changed, current route: ${currentRouteName}`);
      }}
    >
      <RootNavigator isAuthenticated={isAuthenticated} />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
};

// Main App component
export default function App() {
  // Track app startup time
  useComponentPerformance('App');
  
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

