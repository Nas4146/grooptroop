import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';

// Import navigators
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './BottomTabNavigator';

// Import a simple test screen for any modals to reduce complexity
import { View, Text } from 'react-native';

// Simple test screen for modals
const TestModalScreen = ({ route }) => (
  <View style={{flex:1, alignItems:'center', justifyContent:'center', backgroundColor: '#fff'}}>
    <Text style={{fontSize: 18}}>Test Modal Screen</Text>
    <Text>ID: {route.params?.eventId || route.params?.groopId || 'none'}</Text>
  </View>
);

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <Stack.Navigator
      initialRouteName={isAuthenticated ? 'MainTabs' : 'Auth'}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Always include both navigator stacks, but set initial route based on auth state */}
      <Stack.Screen 
        name="Auth" 
        component={AuthNavigator} 
      />
      
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabNavigator} 
      />

      {/* Simplified modal screens using test component */}
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen name="EventDetails" component={TestModalScreen} />
        <Stack.Screen name="GroupMembers" component={TestModalScreen} />
        <Stack.Screen name="AdminSettings" component={TestModalScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
}