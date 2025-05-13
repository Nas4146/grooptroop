import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthProvider';
import BottomTabNavigator from './BottomTabNavigator';
import SimpleLoginScreen from '../screens/SimpleLoginScreen';
import EventDetailsScreen from '../screens/EventDetailsScreen';
import GroupMembersScreen from '../screens/GroupMembersScreen';
import AdminSettingsScreen from '../screens/AdminSettingsScreen';

const RootStack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  
  useEffect(() => {
    console.log(`[NAVIGATION] RootNavigator rendering with isAuthenticated=${isAuthenticated}, isLoading=${isLoading}`);
  }, [isAuthenticated, isLoading]);
  
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
      {isAuthenticated ? (
        <RootStack.Screen name="MainApp" component={BottomTabNavigator} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
      
      {/* Modal screens */}
      <RootStack.Group screenOptions={{ presentation: 'modal' }}>
        <RootStack.Screen name="EventDetails" component={EventDetailsScreen} />
        <RootStack.Screen name="GroupMembers" component={GroupMembersScreen} />
        <RootStack.Screen name="AdminSettings" component={AdminSettingsScreen} />
      </RootStack.Group>
    </RootStack.Navigator>
  );
}

// Auth navigator
const AuthStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={SimpleLoginScreen} />
    </AuthStack.Navigator>
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