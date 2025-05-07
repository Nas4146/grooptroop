import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Simple screen components
const HomeScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
    <Text style={{ fontSize: 24, marginBottom: 10 }}>Home Screen</Text>
    <Text style={{ textAlign: 'center' }}>This is a minimal home screen</Text>
  </View>
);

const ProfileScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
    <Text style={{ fontSize: 24, marginBottom: 10 }}>Profile Screen</Text>
    <Text style={{ textAlign: 'center' }}>This is a minimal profile screen</Text>
  </View>
);

const Tab = createBottomTabNavigator();

export default function MinimalTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const iconName = route.name === 'Home' ? 'home' : 'person';
          return <Ionicons name={iconName} size={size} color={color} />;
        }
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}