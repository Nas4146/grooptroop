import React, {useEffect, useState} from 'react';
import 'react-native-gesture-handler';
import './src/styles/global.css';
import { AuthProvider, useAuth } from './src/contexts/AuthProvider';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, ActivityIndicator, Button } from 'react-native';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import tw from './src/utils/tw';
import SimpleTabNavigator from './src/navigation/SimpleTabNavigator';
import SimpleAuthNavigator from './src/navigation/SimpleAuthNavigator';
import TestAuth from './src/screens/TestAuth';
import MinimalTabNavigator from './src/navigation/MinimalTabNavigator';
import { GroopProvider } from './src/contexts/GroopProvider';
import { KeyExchangeService } from './src/services/KeyExchangeService';

// Function to enable/disable debug navigation
const useDebugNavigation = () => {
  const [debugMode, setDebugMode] = useState(false);
  
  // Log changes to debug mode
  useEffect(() => {
    console.log(`[DEBUG] Navigation debug mode: ${debugMode ? 'ON' : 'OFF'}`);
  }, [debugMode]);
  
  return { debugMode, toggleDebugMode: () => setDebugMode(prev => !prev) };
};

const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { debugMode, toggleDebugMode } = useDebugNavigation();
  const { profile } = useAuth();
  
  console.log('[DEBUG] AppContent rendering. Auth status:', isAuthenticated ? 'logged in' : 'not logged in');
  
  // Show loading state
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  useEffect(() => {
    const checkEncryption = async () => {
      if (profile) {
        console.log('[APP] Checking encryption setup for user:', profile.uid);
        await KeyExchangeService.processPendingKeyExchanges(profile.uid);
      }
    };
    
    checkEncryption();
  }, [profile]);
  
  // Regular app content with debug button
  return (
    <NavigationContainer onStateChange={(state) => console.log('[DEBUG] Navigation state changed:', state?.routes?.[state.index]?.name)}>
      <View style={{ flex: 1 }}>
        {debugMode ? (
          // Show navigation based on auth state
          isAuthenticated ? (
            <BottomTabNavigator />
          ) : (
            <TestAuth />
          )
        ) : (
          // Show debug screen in regular mode
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ fontSize: 20, marginBottom: 20 }}>App is working!</Text>
            <Text style={{ marginBottom: 30 }}>Auth status: {isAuthenticated ? 'Logged in' : 'Not logged in'}</Text>
            <Button 
              title="Toggle Navigation Debug Mode" 
              onPress={toggleDebugMode} 
              color="#7C3AED"
            />
          </View>
        )}
      </View>
    </NavigationContainer>
  );
};

// Main App component
export default function App() {
  useEffect(() => {
    console.log('[DEBUG] App component MOUNTED');
    return () => console.log('[DEBUG] App component UNMOUNTED');
  }, []);
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <GroopProvider>
            <AppContent />
          </GroopProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}