import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/contexts/AuthProvider';
import { GroopProvider } from './src/contexts/GroopProvider';
import { NotificationProvider } from './src/contexts/NotificationProvider';
import './src/services/EncryptionService';

// Enhanced logging function
const log = (message: string, data?: any) => {
  const timestamp = new Date().toLocaleTimeString();
  if (data) {
    console.log(`[APP ${timestamp}] ${message}`, data);
  } else {
    console.log(`[APP ${timestamp}] ${message}`);
  }
};

// Navigation container with state change logging
const NavigationLogger = ({ children }) => {
  const navigationRef = useNavigationContainerRef();
  
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        log('Navigation container is ready');
      }}
      onStateChange={(state) => {
        const currentRouteName = navigationRef.getCurrentRoute()?.name;
        log(`Navigation state changed, current route: ${currentRouteName}`);
      }}
    >
      {children}
    </NavigationContainer>
  );
};

export default function RealAuthIntegratedApp() {
  useEffect(() => {
    log('App mounted');
    return () => log('App unmounted');
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <AuthProvider>
          <GroopProvider>
            <NotificationProvider>
              <NavigationLogger>
                <RootNavigator />
              </NavigationLogger>
            </NotificationProvider>
          </GroopProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});