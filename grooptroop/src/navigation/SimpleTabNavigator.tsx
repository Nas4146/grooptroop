import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import SimpleDebugScreen from '../screens/SimpleDebugScreen';

const Tab = createBottomTabNavigator();

export default function SimpleTabNavigator() {
  // Add logging when the navigator mounts
  useEffect(() => {
    console.log('[DEBUG] SimpleTabNavigator MOUNTED');
    return () => console.log('[DEBUG] SimpleTabNavigator UNMOUNTED');
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#78c0e1',
        tabBarInactiveTintColor: '#6B7280',
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={SimpleDebugScreen} 
        initialParams={{ name: 'Home' }}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          )
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={SimpleDebugScreen}
        initialParams={{ name: 'Profile' }} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          )
        }}
      />
    </Tab.Navigator>
  );
}