import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthProvider';
import BottomTabbNavigator from './BottomTabNavigator';
import TestSimpleLoginScreen from '../screens/TestSimpleLoginScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';

const RootStack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isAuthenticated, isLoading, profile } = useAuth();
  
  useEffect(() => {
    console.log(`[NAVIGATION] RootNavigator rendering with isAuthenticated=${isAuthenticated}, isLoading=${isLoading}`);
    if (profile) {
      console.log(`[NAVIGATION] User profile loaded, hasCompletedOnboarding=${profile.hasCompletedOnboarding}`);
    }
  }, [isAuthenticated, isLoading, profile]);
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }
  
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        // Not authenticated - show login
        <RootStack.Screen name="Auth" component={TestSimpleLoginScreen} />
      ) : profile && !profile.hasCompletedOnboarding ? (
        // Authenticated but needs profile setup
        <RootStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      ) : (
        // Fully authenticated with completed profile
        <RootStack.Screen name="MainApp" component={BottomTabbNavigator} />
      )}
      
      {/* Modal screens */}
      <RootStack.Group screenOptions={{ presentation: 'modal' }}>
        {/* Add your modal screens here */}
      </RootStack.Group>
    </RootStack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
});