import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, Animated, TouchableOpacity, Linking, Image } from 'react-native';
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
  const [budgetExpanded, setBudgetExpanded] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const budgetAnimation = useRef(new Animated.Value(0)).current;

  // Animation configs
  const animateBudget = (expand: boolean) => {
    Animated.spring(budgetAnimation, {
      toValue: expand ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 40
    }).start();
  };

  // Derived animated values
  const budgetWidth = budgetAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['20%', '100%']
  });
  
  const budgetRight = budgetAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0]
  });
  
  const budgetBorderRadius = budgetAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0]
  });

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

  // Toggle budget expansion and trigger animation
  const toggleBudget = () => {
    const newState = !budgetExpanded;
    setBudgetExpanded(newState);
    animateBudget(newState);
  };

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-light`}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={tw`mt-4 font-semibold text-primary`}>Loading your vibe...</Text>
      </View>
    );
  }

  // Make header collapse to a smaller size
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [150, 70],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={tw`flex-1 bg-light`}>
      {/* Smaller header section with better content isolation */}
      <Animated.View style={[
        tw`px-4 pt-1 pb-4 bg-primary rounded-b-3xl shadow-lg`, 
        { 
          height: headerHeight,
          zIndex: 30,
          elevation: 5,
          position: 'relative',
          overflow: 'hidden',
        }
      ]}>
        <View style={tw`flex-row justify-between items-center`}>
          <Text style={tw`text-xl font-bold text-white`}>Nick's Bachelor Party</Text>
          <View style={tw`bg-white bg-opacity-20 rounded-full p-1.5`}>
            <Ionicons name="notifications-outline" size={18} color="white" />
          </View>
        </View>
        
        {/* Date and Mexico City pill on the same row */}
        <View style={tw`flex-row items-center mt-1`}>
  <Ionicons name="calendar" size={16} color="white" />
  <Text style={tw`text-white font-medium ml-2 text-sm`}>June 5-8, 2024</Text>
  
  {/* Mexico City pill moved to be right next to the date with a small gap */}
  <View style={tw`bg-white bg-opacity-20 rounded-full px-2.5 py-0.5 ml-3`}>
    <Text style={tw`text-white font-medium text-xs`}>📍 Mexico City</Text>
  </View>
</View>

  {/* New Mexico City image section */}
  <View style={tw`items-center mt-3 mb-1`}>
    <View style={tw`w-full h-20 rounded-lg overflow-hidden`}>
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1518659526054-190340b32735?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80' }}
        style={[tw`w-full h-full`, { resizeMode: 'cover' }]}
      />
      {/* Semi-transparent overlay for better text visibility
      <View style={[tw`absolute inset-0 bg-black bg-opacity-30 items-center justify-center`]}>
        <Text style={tw`text-white text-lg font-bold`}>Mexico City</Text>
      </View>*/}
    </View>
  </View>

      </Animated.View>

      {/* Quick access location info */}
      <View style={[
        tw`mx-4 -mt-2 bg-white rounded-xl px-3 py-2.5 shadow-md`, 
        {
          zIndex: 20,
          elevation: 4,
          position: 'relative',
        }
      ]}>
        <View style={tw`flex-row justify-between items-center mb-1`}>
          <Text style={tw`font-bold text-neutral text-sm`}>Trip Home Base</Text>
          
          <View style={tw`flex-row`}>
            {/* View on Airbnb*/}
            <TouchableOpacity 
              style={tw`bg-gray-100 rounded-full px-2 py-0.5 flex-row items-center`}
              onPress={() => Linking.openURL('https://airbnb.com/rooms/123456')}
            >
              <Ionicons name="home" size={12} color="#7C3AED" />
              <Text style={tw`text-xs text-primary ml-1`}>Airbnb</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={tw`text-gray-600 text-xs`}>Calle Roma Norte 123</Text>
        <Text style={tw`text-gray-600 text-xs`}>Mexico City, 06700</Text>
        
{/* Reorganized and centered button row: Copy, View Map, Message Group */}
<View style={tw`flex-row justify-center mt-1.5`}>
    {/* Copy button */}
    <TouchableOpacity 
      style={tw`bg-gray-100 rounded-lg px-2.5 py-0.5 flex-row items-center mr-2`}
      onPress={() => {
        Clipboard.setString('Calle Roma Norte 123, Mexico City, 06700');
      }}
    >
      <Ionicons name="copy-outline" size={12} color="#1F2937" />
      <Text style={tw`text-xs text-neutral ml-1`}>Copy</Text>
    </TouchableOpacity>
    
    {/* View Map button */}
    <TouchableOpacity 
      style={tw`bg-gray-100 rounded-lg px-2.5 py-0.5 flex-row items-center mr-2`}
      onPress={() => Linking.openURL('https://goo.gl/maps/abcdefg')}
    >
      <Ionicons name="map" size={12} color="#1F2937" />
      <Text style={tw`text-xs text-neutral ml-1`}>View Map</Text>
    </TouchableOpacity>
    
    {/* Message Group button */}
    <TouchableOpacity 
      style={tw`bg-gray-100 rounded-lg px-2.5 py-0.5 flex-row items-center`}
      onPress={() => Linking.openURL('sms:?addresses=1235551234,1235556789&body=Hey%20bachelor%20party%20crew!')}
    >
      <Ionicons name="chatbubble-ellipses-outline" size={12} color="#1F2937" />
      <Text style={tw`text-xs text-neutral ml-1`}>Message Group</Text>
    </TouchableOpacity>
  </View>
</View>
      
      <ScrollView
        style={tw`flex-1 mt-3`}
        contentContainerStyle={tw`px-4 pb-20`}
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
      
      {/* NEW: Animated expandable budget button/footer */}
      <Animated.View 
        style={[
          tw`absolute bottom-4 bg-white shadow-lg border border-gray-200`,
          {
            width: budgetWidth,
            right: budgetRight,
            borderRadius: budgetBorderRadius,
            overflow: 'hidden'
          }
        ]}
      >
        <TouchableOpacity 
          style={tw`flex-1`} 
          onPress={toggleBudget}
          activeOpacity={0.9}
        >
          <View style={tw`px-4 py-2.5`}>
            {/* Always visible budget content */}
            <View style={tw`flex-row justify-between items-center`}>
              <View style={tw`flex-row items-center`}>
                <View style={tw`w-2 h-2 rounded-full bg-accent mr-2`}></View>
                <Text style={tw`text-sm font-bold text-neutral`}>Trip $$</Text>
                
                {/* Only show in collapsed state */}
                {!budgetExpanded && (
                  <View style={tw`bg-secondary rounded-full ml-2 px-2`}>
                    <Text style={tw`text-xs font-bold text-white`}>$475</Text>
                  </View>
                )}
              </View>
              
              {/* Arrow indicator that rotates */}
              <Animated.View style={{
                transform: [{
                  rotate: budgetAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '180deg']
                  })
                }]
              }}>
                <Ionicons 
                  name="chevron-up" 
                  size={18} 
                  color="#1F2937" 
                />
              </Animated.View>
            </View>
            
            {/* Additional content that appears when expanded */}
            {budgetExpanded && (
              <View style={tw`mt-2`}>
                <View style={tw`flex-row justify-between items-center`}>
                  <View>
                    <Text style={tw`text-xs text-gray-500`}>You owe</Text>
                    <Text style={tw`text-base font-bold text-secondary`}>$475</Text>
                  </View>
                  
                  <View>
                    <Text style={tw`text-xs text-gray-500`}>You've paid</Text>
                    <Text style={tw`text-base font-bold text-accent`}>$275</Text>
                  </View>
                  
                  <View>
                    <Text style={tw`text-xs text-gray-500`}>Total trip</Text>
                    <Text style={tw`text-base font-bold text-neutral`}>$750</Text>
                  </View>
                </View>
                
                {/* Progress bar for payment */}
                <View style={tw`mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden`}>
                  <View style={tw`h-full bg-gradient-to-r from-accent to-primary rounded-full`} style={{width: '36%'}}></View>
                </View>
                
                {/* Pay now button - only shows in expanded state */}
                <TouchableOpacity 
                  style={tw`bg-primary rounded-full py-2 mt-3 items-center`}
                  onPress={() => {/* Navigate to payment screen */}}
                >
                  <Text style={tw`text-white font-bold text-sm`}>Pay now</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}