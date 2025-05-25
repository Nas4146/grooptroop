import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthProvider';
import GroopsContentSwitcher from '../components/navigation/GroopsContentSwitcher';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import SimpleLoginScreen from '../screens/SimpleLoginScreen';
import DevPerformanceScreen from '../screens/DevPerformanceScreen';
import tw from '../utils/tw';

const RootStack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isAuthenticated, isLoading, profile } = useAuth();
  
  useEffect(() => {
    console.log(`[NAVIGATION] 🔄 RootNavigator rendering with isAuthenticated=${isAuthenticated}, isLoading=${isLoading}`);
    if (profile) {
      console.log(`[NAVIGATION] 👤 User profile loaded, hasCompletedOnboarding=${profile.hasCompletedOnboarding}`);
    }
  }, [isAuthenticated, isLoading, profile]);
  
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <RootStack.Screen name="Auth" component={SimpleLoginScreen} />
      ) : profile && !profile.hasCompletedOnboarding ? (
        <RootStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      ) : (
        <RootStack.Screen name="MainApp" component={GroopsContentSwitcher} />
      )}
      
      <RootStack.Screen 
        name="DevPerformance" 
        component={DevPerformanceScreen} 
        options={{ 
          title: "Performance Monitor",
        }} 
      />
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