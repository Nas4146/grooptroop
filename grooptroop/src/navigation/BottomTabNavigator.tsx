import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/profileScreen';
import ItineraryScreen from '../screens/itineraryScreen';
import ChatScreen from '../screens/chatScreen';
import MapScreen from '../screens/mapScreen';
import AdminSettingsScreen from '../screens/AdminSettingsScreen';
import PaymentsScreen from '../screens/paymentsScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

// Home stack navigator
function HomeStackScreen() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen 
        name="Home" 
        component={ItineraryScreen} 
        options={{ headerShown: false }}
      />
    </HomeStack.Navigator>
  );
}

export default function TabNavigator() {
  useEffect(() => {
    console.log('[NAVIGATION] TabNavigator mounted');
    return () => console.log('[NAVIGATION] TabNavigator unmounted');
  }, []);
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'HomeTab':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'ItineraryTab':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'PaymentsTab':
              iconName = focused ? 'card' : 'card-outline';
              break;
            case 'AdminSettingsTab':
              iconName = focused ? 'settings' : 'settings-outline';
              break;  
            case 'ChatTab':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'MapTab':
              iconName = focused ? 'map' : 'map-outline';
              break;
            case 'ProfileTab':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-circle-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: '#6B7280',
      })}
    >
      <Tab.Screen 
        name="ItineraryTab" 
        component={ItineraryScreen} 
        options={{ title: 'Itinerary', headerShown: false }}
      />
      <Tab.Screen 
        name="ChatTab" 
        component={ChatScreen} 
        options={{ title: 'Chat', headerShown: false }}
      />
      <Tab.Screen 
        name="MapTab" 
        component={MapScreen} 
        options={{ title: 'Map', headerShown: false }}  
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{ title: 'Profile', headerShown: false }}
      />
            <Tab.Screen
        name="PaymentsTab"
        component={PaymentsScreen}
        options={{ title: 'Payments', headerShown: false }}
        />
      <Tab.Screen
        name="AdminSettingsTab"
        component={AdminSettingsScreen}
        options={{ title: 'Admin', headerShown: false }}
        />
    </Tab.Navigator>
  );
}