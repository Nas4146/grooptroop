import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, Animated, TouchableOpacity, Linking, Image } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ItineraryService } from '../services/ItineraryService';
import { ItineraryDay } from '../models/itinerary';
import DaySection from '../components/itinerary/DaySection';
import tw from '../utils/tw';
import { useGroop } from '../contexts/GroopProvider';

export default function ItineraryScreen() {
  const { currentGroop, userGroops, fetchUserGroops, setCurrentGroop } = useGroop();  const navigation = useNavigation();
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [budgetExpanded, setBudgetExpanded] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const budgetAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchUserGroops();
  }, []);

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
    if (!currentGroop) {
      console.log('[ITINERARY] No groop selected, skipping itinerary fetch');
      setItinerary([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
  
    try {
      console.log(`[ITINERARY] Fetching itinerary for groop: ${currentGroop.name} (${currentGroop.id})`);
      setLoading(true);
      
      // Clear cache if refreshing
      if (refreshing) {
        console.log('[ITINERARY] Refreshing, clearing cache first');
        await ItineraryService.clearCache(currentGroop.id);
      }
      
      // When refreshing, bypass cache
      const data = await ItineraryService.getItinerary(
        currentGroop.id, 
        !refreshing // Use cache unless refreshing
      );
      
      console.log("[ITINERARY] Data loaded:", data.length, "days", 
        data.reduce((total, day) => total + day.events.length, 0), "events");
      setItinerary(data);
    } catch (error) {
      console.error('[ITINERARY] Error fetching itinerary:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderGroopSelector = () => {
    if (userGroops.length <= 1) return null;
    
    return (
      <View style={tw`px-4 mb-4`}>
        <Text style={tw`text-gray-600 mb-1`}>Select a Groop</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw`pb-2`}
        >
          {userGroops.map((groop) => (
            <TouchableOpacity
              key={groop.id}
              style={tw`mr-3 p-2 rounded-lg ${currentGroop?.id === groop.id ? 'bg-primary' : 'bg-gray-200'}`}
              onPress={() => {
                // Use the setCurrentGroop from your already destructured hook
                setCurrentGroop(groop);
              }}
            >
              <Text style={tw`${currentGroop?.id === groop.id ? 'text-white' : 'text-gray-700'}`}>
                {groop.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchItinerary();
  };

  useEffect(() => {
    if (currentGroop) {
      fetchItinerary();
    } else {
      setLoading(false);
    }
  }, [currentGroop]);

  if (!currentGroop) {
    return (
      <SafeAreaView style={tw`flex-1 bg-light`}>
        <View style={tw`flex-1 justify-center items-center p-6`}>
          <Ionicons name="people-outline" size={64} color="#CBD5E1" />
          <Text style={tw`text-xl font-bold text-gray-800 mt-4 text-center`}>
            You're not in any groops yet
          </Text>
          <Text style={tw`text-base text-gray-600 mt-2 mb-6 text-center`}>
            Create a new groop or ask someone to invite you to join their groop.
          </Text>
          <TouchableOpacity
            style={tw`bg-primary rounded-lg py-4 px-6 w-full items-center mb-4`}
            onPress={() => navigation.navigate('CreateGroop')}
          >
            <Text style={tw`text-white font-bold text-lg`}>Create New Groop</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={tw`border border-gray-300 rounded-lg py-4 px-6 w-full items-center`}
            onPress={() => navigation.navigate('JoinGroop')}
          >
            <Text style={tw`text-gray-700 font-bold text-lg`}>Join a Groop</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-light`}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={tw`mt-4 font-semibold text-primary`}>Loading your vibe...</Text>
      </View>
    );
  }

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
      {/* Render groop selector if user has multiple groops */}
      {renderGroopSelector()}
      
      {/* Header section with dynamic groop data */}
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
          <Text style={tw`text-xl font-bold text-white`}>{currentGroop.name}</Text>
          <View style={tw`bg-white bg-opacity-20 rounded-full p-1.5`}>
            <Ionicons name="notifications-outline" size={18} color="white" />
          </View>
        </View>
        
        {/* Date and location pill on the same row */}
        <View style={tw`flex-row items-center mt-1`}>
          {currentGroop.dateRange && (
            <>
              <Ionicons name="calendar" size={16} color="white" />
              <Text style={tw`text-white font-medium ml-2 text-sm`}>
                {currentGroop.dateRange}
              </Text>
            </>
          )}
          
          {/* Location pill */}
          {currentGroop.location && (
            <View style={tw`bg-white bg-opacity-20 rounded-full px-2.5 py-0.5 ml-3`}>
              <Text style={tw`text-white font-medium text-xs`}>📍 {currentGroop.location}</Text>
            </View>
          )}
             <View style={tw`flex-row justify-end px-4 mt-2`}>
  <TouchableOpacity
    style={tw`bg-gray-200 px-3 py-1 rounded-full flex-row items-center`}
    onPress={async () => {
      setLoading(true);
      // Clear cache and force refresh
      await ItineraryService.clearCache(currentGroop.id);
      await fetchItinerary();
    }}
  >
    <Ionicons name="refresh" size={14} color="#333" />
    <Text style={tw`text-xs font-medium ml-1 text-gray-700`}>Refresh</Text>
  </TouchableOpacity>
</View>
        </View>
  
        {/* Location image section */}
        {currentGroop.photoURL && (
          <View style={tw`items-center mt-3 mb-1`}>
            <View style={tw`w-full h-20 rounded-lg overflow-hidden`}>
              <Image
                source={{ uri: currentGroop.photoURL }}
                style={[tw`w-full h-full`, { resizeMode: 'cover' }]}
              />
            </View>
          </View>
        )}
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
    {/* View on Airbnb with payment indicator */}
    <TouchableOpacity 
      style={tw`bg-gray-100 rounded-full px-2 py-0.5 flex-row items-center`}
      onPress={() => Linking.openURL('https://airbnb.com/rooms/123456')}
    >
      <Ionicons name="home" size={12} color="#7C3AED" />
      <Text style={tw`text-xs text-primary ml-1`}>Airbnb</Text>
    </TouchableOpacity>
  </View>
</View>

{/* Add payment information row */}
<View style={tw`flex-row items-center justify-between mb-0.5`}>
  <View>
    <Text style={tw`text-gray-600 text-xs`}>Calle Roma Norte 123</Text>
    <Text style={tw`text-gray-600 text-xs`}>Mexico City, 06700</Text>
  </View>
  
  <View style={tw`flex-row items-center`}>
    <View style={tw`rounded-full p-1.5 bg-amber-100 mr-1.5`}>
      <Ionicons 
        name="card-outline" 
        size={16} 
        color="#F59E0B" 
      />
    </View>
    <View style={tw`bg-amber-100 px-2 py-0.5 rounded-full`}>
      <Text style={tw`text-xs font-bold text-amber-700`}>$150</Text>
    </View>
  </View>
</View>
        
            {/* Add this button
    <TouchableOpacity
      style={tw`bg-primary mt-4 px-6 py-3 rounded-lg`}
      onPress={async () => {
        try {
          setLoading(true);
          await ItineraryService.importMockData(currentGroop.id);
          console.log('[ITINERARY] Successfully imported mock data');
          
          // Refresh the itinerary
          await fetchItinerary();
        } catch (error) {
          console.error('[ITINERARY] Error importing mock data:', error);
        }
      }}
    >
      <Text style={tw`text-white font-bold`}>Import Sample Itinerary</Text>
    </TouchableOpacity>*/}
{/* Reorganized and centered button row: Copy, View Map, Message Group */}
<View style={tw`flex-row justify-start mt-1.5`}>
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