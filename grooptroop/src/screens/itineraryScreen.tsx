import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, Animated, Image, TouchableOpacity, Linking, Platform } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ItineraryService } from '../services/ItineraryService';
import { ItineraryDay } from '../models/itinerary';
import DaySection from '../components/itinerary/DaySection';
import tw from '../utils/tw';

export default function ItineraryScreen() {
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const fetchItinerary = async () => {
    try {
      const data = await ItineraryService.getItinerary();
      console.log("Itinerary data loaded:", data.length, "days");
      setItinerary(data);
      // Cache the data for offline use
      await ItineraryService.cacheItinerary(data);
    } catch (error) {
      console.error('Error fetching itinerary:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchItinerary();
  };

  useEffect(() => {
    fetchItinerary();
  }, []);

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-light`}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={tw`mt-4 font-semibold text-primary`}>Loading your vibe...</Text>
      </View>
    );
  }

  // Fix headerHeight calculation by ensuring interpolate has proper config
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [180, 80],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={tw`flex-1 bg-light`}>
      {/* Modern gradient header that collapses on scroll */}
      <Animated.View style={[
        tw`px-5 pt-2 pb-6 bg-primary rounded-b-3xl shadow-lg z-10`,
        { height: headerHeight }
      ]}>
        <View style={tw`flex-row justify-between items-center`}>
          <Text style={tw`text-2xl font-bold text-white`}>Nick's Bachelor Party</Text>
          <View style={tw`bg-white bg-opacity-20 rounded-full p-2`}>
            <Ionicons name="notifications-outline" size={22} color="white" />
          </View>
        </View>
        
        <View style={tw`flex-row items-center mt-2`}>
          <Ionicons name="calendar" size={18} color="white" />
          <Text style={tw`text-white font-medium ml-2`}>June 5-8, 2024</Text>
        </View>
        
        {/* Emoji Pills - Gen Z loves these! */}
        <Animated.View style={tw`flex-row flex-wrap mt-4`}>
          <View style={tw`bg-white bg-opacity-20 rounded-full px-3 py-1 mr-2 mb-2`}>
            <Text style={tw`text-white font-medium`}>📍 Mexico City</Text>
          </View>
          <TouchableOpacity 
            style={tw`bg-white bg-opacity-20 rounded-full px-3 py-1 mr-2 mb-2`}
            onPress={() => Linking.openURL('https://airbnb.com/rooms/123456')}
          >
            <View style={tw`flex-row items-center`}>
              <Text style={tw`text-white font-medium`}>🏠 Roma Norte Airbnb</Text>
              <Ionicons name="open-outline" size={14} color="white" style={tw`ml-1`} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={tw`bg-white bg-opacity-20 rounded-full px-3 py-1 mb-2`}
            onPress={() => Linking.openURL('https://goo.gl/maps/abcdefg')}
          >
            <View style={tw`flex-row items-center`}>
              <Text style={tw`text-white font-medium`}>🗺️ View Map</Text>
              <Ionicons name="navigate" size={14} color="white" style={tw`ml-1`} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
      
      {/* Quick access location info - MOVED OUTSIDE THE HEADER */}
      <View style={tw`mx-5 -mt-4 bg-white rounded-2xl px-4 py-3 shadow-md`}>
        <View style={tw`flex-row justify-between items-center mb-2`}>
          <Text style={tw`font-bold text-neutral`}>Trip Home Base</Text>
          <TouchableOpacity 
            style={tw`bg-gray-100 rounded-full px-2 py-1 flex-row items-center`}
            onPress={() => Linking.openURL('https://maps.app.goo.gl/abcdef')}
          >
            <Ionicons name="navigate-outline" size={14} color="#7C3AED" />
            <Text style={tw`text-xs text-primary ml-1`}>Directions</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={tw`text-gray-600`}>Calle Roma Norte 123</Text>
        <Text style={tw`text-gray-600`}>Mexico City, 06700</Text>
        
        <View style={tw`flex-row mt-2`}>
          <TouchableOpacity 
            style={tw`bg-gray-100 rounded-lg px-3 py-1 mr-2 flex-row items-center`}
            onPress={() => Linking.openURL('https://airbnb.com/rooms/123456')}
          >
            <Text style={tw`text-xs text-neutral`}>View on Airbnb</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={tw`bg-gray-100 rounded-lg px-3 py-1 flex-row items-center`}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Clipboard.setString('Calle Roma Norte 123, Mexico City, 06700');
                // Add toast message here if you want
              } else {
                Clipboard.setString('Calle Roma Norte 123, Mexico City, 06700');
              }
            }}
          >
            <Ionicons name="copy-outline" size={14} color="#1F2937" />
            <Text style={tw`text-xs text-neutral ml-1`}>Copy address</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Stats card - ALSO MOVED OUTSIDE THE HEADER */}
      <View style={tw`mx-5 mt-3 bg-white rounded-2xl px-4 py-3 shadow-md`}>
        <View style={tw`flex-row items-center mb-2`}>
          <View style={tw`w-2 h-2 rounded-full bg-accent mr-2`}></View>
          <Text style={tw`text-sm font-medium text-neutral`}>Your Trip Budget</Text>
        </View>
        
        <View style={tw`flex-row justify-between`}>
          <View>
            <Text style={tw`text-xs text-gray-500`}>You owe</Text>
            <Text style={tw`text-lg font-bold text-secondary`}>$475</Text>
          </View>
          
          <View style={tw`h-full w-px bg-gray-200`} />
          
          <View>
            <Text style={tw`text-xs text-gray-500`}>You've paid</Text>
            <Text style={tw`text-lg font-bold text-accent`}>$275</Text>
          </View>
          
          <View style={tw`h-full w-px bg-gray-200`} />
          
          <View>
            <Text style={tw`text-xs text-gray-500`}>Total trip</Text>
            <Text style={tw`text-lg font-bold text-neutral`}>$750</Text>
          </View>
        </View>
      
        {/* Progress bar for payment */}
        <View style={tw`mt-2 h-2 bg-gray-200 rounded-full overflow-hidden`}>
          <View style={tw`h-full bg-gradient-to-r from-accent to-primary rounded-full`} style={{width: '36%'}}></View>
        </View>
      </View>
      
      <ScrollView
        style={tw`flex-1 mt-4`}
        contentContainerStyle={tw`px-5 pb-24`}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#7C3AED', '#F43F5E']} 
          />
        }
      >
        {itinerary.length === 0 ? (
          <View style={tw`py-12 items-center`}>
            <Text style={tw`text-gray-500`}>No itinerary items found</Text>
          </View>
        ) : (
          itinerary.map((day) => (
            <DaySection key={day.date} day={day} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}