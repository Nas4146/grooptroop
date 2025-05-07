import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ItineraryScreen from '../screens/itineraryScreen';
import { RootStackParamList } from './types';


// Simple screen components - you can replace these with real ones later
/*const HomeScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 24, marginBottom: 20 }}>Home Screen</Text>
    <Text>Welcome to GroopTroop!</Text>
  </View>
);*/

const SettingsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 24, marginBottom: 20 }}>Settings Screen</Text>
    <Text>Your profile settings will go here</Text>
  </View>
);

const Tab = createBottomTabNavigator<RootStackParamList>();

export default function MinimalTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const iconName = route.name === 'Home' ? 'home' : 'settings';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: '#6B7280',
      })}
    >
  <Tab.Screen name="Itinerary" component={ItineraryScreen} />
  <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}