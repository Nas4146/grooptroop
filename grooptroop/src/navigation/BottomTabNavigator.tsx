import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from './types';

// Import screens
import ItineraryScreen from '../screens/itineraryScreen';
import MapScreen from '../screens/mapScreen';
import PaymentsScreen from '../screens/paymentsScreen';
import ChatScreen from '../screens/chatScreen';
import ProfileScreen from '../screens/profileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Itinerary" // Set Itinerary as the initial route
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          // Initialize with a default icon name
          let iconName = 'calendar-outline';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Itinerary') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Payments') {
            iconName = focused ? 'card' : 'card-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: '#6B7280',
        headerShown: false,
        tabBarStyle: { paddingBottom: 5, height: 60 }
      })}
    >
      <Tab.Screen name="Itinerary" component={ItineraryScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Payments" component={PaymentsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}