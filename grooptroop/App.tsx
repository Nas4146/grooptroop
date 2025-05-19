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
import { NetworkMonitor } from './src/utils/networkMonitor';
import { SentryPerformance, Sentry } from './src/utils/sentryPerformance';

// Import the root navigator
import RootNavigator from './src/navigation/RootNavigator';

// Initialize Sentry early in the application lifecycle
SentryPerformance.initialize('YOUR_SENTRY_DSN'); // Replace with your Sentry DSN

// Start app load trace at the top level
const appLoadTraceId = SimplePerformance.startTrace('app_load');
const appStartTransaction = SentryPerformance.startTransaction('app.startup', 'app.lifecycle');

// Main app content with navigation
const AppContent = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const perf = useComponentPerformance('AppContent');
  const navigationRef = useNavigationContainerRef();
  
  // Add this to use the app monitoring
  useEffect(() => {
    // Initialize app-wide performance monitoring
    setupAppMonitoring(navigationRef);
    
    // Initialize network monitoring
    NetworkMonitor.initializeFetchMonitoring();
    
    // Track screen views in Sentry
    if (navigationRef.current) {
      const trackedRoutes = new Set<string>();
      
      navigationRef.addListener('state', () => {
        const currentRouteName = navigationRef.getCurrentRoute()?.name;
        
        if (currentRouteName && !trackedRoutes.has(currentRouteName)) {
          trackedRoutes.add(currentRouteName);
          
          // Track first view of each unique screen
          const screenLoadSpan = Sentry.startTransaction({
            name: `screen.${currentRouteName}.load`,
            op: 'navigation'
          });
          
          // Finish the span after the screen should be rendered
          setTimeout(() => {
            screenLoadSpan.finish();
          }, 1000);
          
          SentryPerformance.trackScreenView(currentRouteName);
        }
      });
    }
    
    // Return cleanup function
    return () => {
      if (navigationRef.current) {
        // Clean up listeners if needed
      }
    };
  }, [navigationRef]);
  
  // Track when app is fully mounted and ready
  useEffect(() => {
    if (!isLoading) {
      SimplePerformance.logEvent('app', `App mounted ${isAuthenticated ? 'authenticated' : 'unauthenticated'}`);
      
      // End the app load trace
      SimplePerformance.endTrace(appLoadTraceId);
      
      // Finish the app start transaction
      appStartTransaction.finish();
      
      // Set user context in Sentry if authenticated
      if (isAuthenticated && user) {
        SentryPerformance.setUser({
          id: user.id,
          username: user.username || undefined,
          email: user.email || undefined
        });
        
        // Add user properties as tags
        Sentry.setTag('user.hasCompletedOnboarding', String(user.hasCompletedOnboarding || false));
        Sentry.setTag('user.isAdmin', String(user.isAdmin || false));
      }
      
      // Track memory usage periodically
      const memoryInterval = setInterval(() => {
        // This is a simple placeholder. In a real app, you would use
        // a proper way to measure memory usage
        SentryPerformance.trackMemoryUsage({
          jsHeapSize: global.performance?.memory?.usedJSHeapSize,
          nativeMemoryUsage: undefined
        });
      }, 60000); // Check every minute
      
      return () => {
        clearInterval(memoryInterval);
      };
    }
  }, [isLoading, isAuthenticated, user]);
  
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
        
        // Track navigation initialization in Sentry
        Sentry.addBreadcrumb({
          category: 'navigation',
          message: 'Navigation container ready',
          level: 'info'
        });
      }}
      onStateChange={(state) => {
        const timestamp = new Date().toLocaleTimeString();
        const currentRouteName = navigationRef.getCurrentRoute()?.name;
        console.log(`[APP ${timestamp}] Navigation state changed, current route: ${currentRouteName}`);
        
        // Track screen transitions
        SentryPerformance.trackUIAction('screenTransition', {
          toScreen: currentRouteName
        });
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

