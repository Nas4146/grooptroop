import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import tw from '../utils/tw';
import GroopHeader from '../components/common/GroopHeader';
import { useNavigation } from '@react-navigation/native';

// Bitmoji avatar image URIs
const BITMOJI_AVATARS = [
  'https://sdk.bitmoji.com/render/panel/20048676-99468787249_4-s5-v1.png?transparent=1',
  'https://sdk.bitmoji.com/render/panel/726e8baa-507a-4496-a3db-16be753fdce5-7b0d9d5c-1a21-4316-a97d-b44b8844501a-v1.png?transparent=1',
  'https://sdk.bitmoji.com/render/panel/39a4e0ed-d71a-43c6-ac27-dbdf8f70d2d2-7b0d9d5c-1a21-4316-a97d-b44b8844501a-v1.png?transparent=1',
  'https://sdk.bitmoji.com/render/panel/10211550-99468787249_4-s5-v1.png?transparent=1',
];

export default function MapScreen() {
  const navigation = useNavigation();
  const [notifyPressed, setNotifyPressed] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  
  // Animation values
  const floatAnim = useRef(new Animated.Value(0)).current;
  
  // Navigate to members
const navigateToMembers = () => {
};

  // Handle notify me action
  const handleNotifyMe = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNotifyPressed(true);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };
  
  // Float animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -15,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={tw`flex-1 bg-light`}>
      <GroopHeader minimal={true} />
      
      <View style={tw`flex-1 items-center justify-center px-6`}>
        {/* Simplified map illustration with floating avatars */}
        <View style={tw`items-center mb-2`}>
          <View style={tw`relative w-64 h-64 mb-4`}>
            {/* Map background */}
            <View style={tw`w-64 h-64 bg-sky-100 rounded-full overflow-hidden border-2 border-sky-200`}>
              <Image 
                source={{uri: 'https://maps.googleapis.com/maps/api/staticmap?center=37.7749,-122.4194&zoom=14&size=400x400&style=feature:all|element:labels|visibility:off&style=feature:road|color:0xffffff&style=feature:landscape|color:0xf0f9ff&style=feature:water|color:0xe1f5fe&key=YOUR_API_KEY'}}
                style={tw`w-full h-full opacity-30`}
                resizeMode="cover"
              />
              
              {/* Simplified compass rose */}
              <View style={tw`absolute top-4 right-4 bg-white bg-opacity-80 rounded-full p-2`}>
                <Ionicons name="compass-outline" size={22} color="#7C3AED" />
              </View>
            </View>
            
            {/* Central avatar */}
            <View style={tw`absolute top-1/2 left-1/2 -mt-8 -ml-8 bg-primary rounded-full w-16 h-16 border-2 border-white items-center justify-center`}>
              <Ionicons name="person" size={30} color="white" />
            </View>
            
            {/* Floating Bitmoji avatars */}
            {[0, 1, 2].map((idx) => {
              // Calculate position in a circle around center
              const angle = (idx * 2 * Math.PI) / 3;
              const radius = 80; 
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              
              return (
                <Animated.View 
                  key={idx} 
                  style={[
                    tw`absolute z-10`,
                    {
                      left: 128 + x - 20,
                      top: 128 + y - 20,
                      transform: [{ translateY: floatAnim }]
                    }
                  ]}
                >
                  <Image 
                    source={{ uri: BITMOJI_AVATARS[idx] }}
                    style={tw`w-18 h-18`}
                    resizeMode="contain"
                  />
                </Animated.View>
              );
            })}
          </View>
          
          <Text style={tw`text-2xl font-bold text-neutral mb-2 text-center`}>
            Find friends on your trip
          </Text>
          <Text style={tw`text-base text-gray-500 text-center mb-6`}>
            Real-time location sharing coming soon
          </Text>
        </View>

        {/* Simplified action button */}
        <TouchableOpacity
          onPress={handleNotifyMe}
          disabled={notifyPressed}
          style={tw`${notifyPressed ? 'bg-green-500' : 'bg-primary'} py-3 px-8 rounded-xl`}
        >
          <View style={tw`flex-row items-center justify-center`}>
            <Ionicons 
              name={notifyPressed ? "checkmark-circle" : "notifications-outline"} 
              size={20} 
              color="white" 
            />
            <Text style={tw`ml-2 text-white font-bold`}>
              {notifyPressed ? 'You will be notified' : 'Notify me when available'}
            </Text>
          </View>
        </TouchableOpacity>
        
        {/* Simple hint text */}
        <Text style={tw`mt-6 text-xs text-gray-500 text-center max-w-xs`}>
          Share your location with friends to find each other at concerts, airports, or anywhere during your trip.
        </Text>
      </View>
      
      {/* Success notification */}
      {showNotification && (
        <View style={tw`absolute bottom-8 left-6 right-6 px-4 py-3 bg-green-500 rounded-xl flex-row items-center`}>
          <Ionicons name="checkmark-circle" size={22} color="white" />
          <Text style={tw`flex-1 text-white font-medium ml-2`}>
            We'll notify you when location sharing launches!
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}