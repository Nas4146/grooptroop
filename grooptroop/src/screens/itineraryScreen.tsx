import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, Animated, TouchableOpacity, Linking, Image, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ItineraryService } from '../services/ItineraryService';
import { ItineraryDay } from '../models/itinerary';
import DaySection from '../components/itinerary/DaySection';
import tw from '../utils/tw';
import { useGroop } from '../contexts/GroopProvider';
import PaymentSheet from '../components/payments/PaymentSheet';
import { PaymentService } from '../services/PaymentService';
import { useAuth } from '../contexts/AuthProvider';
import GroopHeader from '../components/common/GroopHeader';

export default function ItineraryScreen() {
  const { currentGroop, userGroops, fetchUserGroops, setCurrentGroop } = useGroop();
  const navigation = useNavigation();
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [budgetExpanded, setBudgetExpanded] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const budgetAnimation = useRef(new Animated.Value(0)).current;
  const [accommodationPaymentVisible, setAccommodationPaymentVisible] = useState(false);
  const [totalOwed, setTotalOwed] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalTripCost, setTotalTripCost] = useState(0);
  const { profile } = useAuth();
  const [addressCopied, setAddressCopied] = useState(false);

  useEffect(() => {
    fetchUserGroops();
  }, []);

    useFocusEffect(
    useCallback(() => {
      // Refresh itinerary data
      fetchItineraryData();
    }, [])
  );

  // Animation configs
  const animateBudget = (expand: boolean) => {
    Animated.spring(budgetAnimation, {
      toValue: expand ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 40
    }).start();
  };

  // Derived animated values - Fix the string format for percentages
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

  const fetchPaymentSummary = async () => {
    if (!currentGroop || !profile) return;
    
    try {
      const summary = await PaymentService.getUserPaymentSummary(currentGroop.id, profile.uid);
      setTotalOwed(summary.totalOwed);
      setTotalPaid(summary.totalPaid);
      setTotalTripCost(currentGroop.totalTripCost ? parseFloat(currentGroop.totalTripCost) : 0);
    } catch (error) {
      console.error('[ITINERARY_SCREEN] Error loading payment data:', error);
    }
  };

  // Add this function below your fetchPaymentSummary function:

  const fetchItineraryData = useCallback(() => {
    console.log("[ITINERARY] Refreshing data from focus effect");
    
    // Refresh itinerary without showing the loading indicator
    if (currentGroop) {
      // We want to fetch fresh data but don't need the loading spinner
      // since this happens when returning to the tab
      ItineraryService.clearCache(currentGroop.id).then(() => {
        fetchItinerary();
      });
      
      // Also refresh payment data
      if (profile) {
        fetchPaymentSummary();
        
        // Additionally, refresh any payment status in the PaymentService
        PaymentService.clearPaymentStatusCache();
      }
    }
  }, [currentGroop, profile]);

  useEffect(() => {
    if (currentGroop && profile) {
      fetchPaymentSummary();
    }
  }, [currentGroop, profile]);

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
    if (currentGroop && profile) {
      fetchPaymentSummary();
    }
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

  // Make header collapse to a smaller size
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [180, 70], // Increased from 150 to 180 to allow for taller image
    extrapolate: 'clamp',
  });

  return (
    <KeyboardAvoidingView 
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={tw`flex-1`}
    >
    <SafeAreaView style={tw`flex-1 bg-light`}>
      {/* Add GroopHeader but pass isItineraryScreen=true so it returns null */}
      <GroopHeader 
        isItineraryScreen={true} 
        showMembers={false}
      />
      
      {/* Render groop selector if user has multiple groops */}
      {renderGroopSelector()}
      
      {/* Keep your existing header section with dynamic groop data */}
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
        {/* Your existing header content remains unchanged */}
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
        </View>
        
        {/* Location image section */}
        {currentGroop.photoURL && (
          <View style={tw`items-center mt-3 mb-1`}>
            <View style={tw`w-full h-40 rounded-lg overflow-hidden`}>
              {/* Changed h-20 to h-28 to make the image taller */}
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
        tw`mx-4 -mt-2 bg-white rounded-xl px-3 py-3 shadow-md`, 
        {
          zIndex: 20,
          elevation: 4,
          position: 'relative',
        }
      ]}>
        {/* Restructured layout to handle long addresses better */}
        <View style={tw`flex-row items-start mb-2`}>
          <View style={tw`flex-1 pr-3`}>
            <Text style={tw`font-bold text-neutral text-sm`}>Trip Home Base</Text>
            
            {/* Address information - constrained width */}
            <Text style={tw`text-gray-600 text-xs mt-0.5`} numberOfLines={2}>
              {currentGroop?.accommodation?.address1 || 'Address not available'}
            </Text>
            {currentGroop?.accommodation?.address2 && (
              <Text style={tw`text-gray-600 text-xs`}>
                {currentGroop.accommodation.address2}
              </Text>
            )}
          </View>

          {/* Payment indicator as a separate column */}
          <View style={tw`items-center`}>
            <TouchableOpacity
              style={tw`items-center`}
              onPress={() => setAccommodationPaymentVisible(true)}
            > 
              <Ionicons 
                name="card-outline" 
                size={14} 
                color={currentGroop?.accommodation?.isPaid ? "#22c55e" : "#f59e0b"} 
                style={tw`mb-0.5 self-center`} 
              />
              <View style={tw`bg-gray-100 rounded-full px-2.5 py-1 flex-row items-center`}>
                <View style={tw`h-4 w-4 rounded-full ${currentGroop?.accommodation?.isPaid ? 'bg-green-500' : 'bg-amber-500'} mr-1.5`} />
                <Text style={tw`text-xs font-medium ${currentGroop?.accommodation?.isPaid ? 'text-green-700' : 'text-gray-700'}`}>
                  ${currentGroop?.accommodation?.costPerPerson || 0}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
            
        {/* Reorganized and centered button row: Copy, View Map, Message Group */}
        <View style={tw`flex-row justify-start mt-1.5`}>
          {/* Copy button with visual feedback */}
          <TouchableOpacity 
            style={tw`bg-gray-100 rounded-lg px-2.5 py-0.5 flex-row items-center mr-2`}
            onPress={() => {
              try {
                // Use the correct address field from accommodation data
                const address = currentGroop?.accommodation?.address1 || 'Address not available';
                console.log('[ITINERARY] Copying address:', address);
                
                Clipboard.setString(address);
                
                // Show visual feedback instead of Alert
                setAddressCopied(true);
                
                // Reset after 2 seconds
                setTimeout(() => {
                  setAddressCopied(false);
                }, 2000);
              } catch (error) {
                console.error('[ITINERARY] Failed to copy address:', error);
                Alert.alert('Error', 'Could not copy the address to clipboard');
              }
            }}
          >
            <Ionicons 
              name={addressCopied ? "checkmark" : "copy-outline"} 
              size={12} 
              color={addressCopied ? "#22c55e" : "#1F2937"} 
            />
            <Text 
              style={tw`text-xs ${addressCopied ? 'text-green-600 font-medium' : 'text-neutral'} ml-1`}
            >
              {addressCopied ? 'Copied' : 'Copy'}
            </Text>
          </TouchableOpacity>
          
          {/* View Map button */}
          <TouchableOpacity 
            style={tw`bg-gray-100 rounded-lg px-2.5 py-0.5 flex-row items-center mr-2`}
            onPress={() => {
              if (currentGroop?.accommodation?.address1) {
                // Get the address
                const address = currentGroop.accommodation.address1;
                console.log('[ITINERARY] Address to open in maps:', address);
                
                // Always use the actual address from accommodation data to construct the URL
                const encodedAddress = encodeURIComponent(address);
                const mapUrl = `https://maps.google.com/?q=${encodedAddress}`;
                
                console.log('[ITINERARY] Opening map with URL:', mapUrl);
                Linking.openURL(mapUrl);
              } else {
                Alert.alert('No Address', 'No address information available for this accommodation');
              }
            }}
          >
            <Ionicons name="map" size={12} color="#1F2937" />
            <Text style={tw`text-xs text-neutral ml-1`}>View Map</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={tw`bg-gray-100 rounded-lg px-2.5 py-0.5 flex-row items-center`}
            onPress={() => navigation.navigate('Chat')}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={12} color="#1F2937" />
            <Text style={tw`text-xs text-neutral ml-1`}>Message Group</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView
        style={tw`flex-1 mt-2`}
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
          <View style={tw`py-8 items-center`}>
            <Text style={tw`text-gray-500`}>No itinerary items found</Text>
          </View>
        ) : (
          itinerary.map((day) => (
            <DaySection key={day.date} day={day} />
          ))
        )}
      </ScrollView>
      
      {/* Animated expandable budget button/footer */}
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
                <Text style={tw`text-sm font-bold text-neutral`}>$$</Text>
                
                {/* Only show in collapsed state */}
                {!budgetExpanded && (
                  <View style={tw`bg-secondary bg-opacity-10 rounded-full ml-2 px-2`}>
                    <Text style={tw`text-base font-bold text-secondary`}>${totalOwed.toFixed(2)}</Text>
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
                    <Text style={tw`text-base font-bold text-secondary`}>${totalOwed.toFixed(2)}</Text>
                  </View>
                  
                  <View>
                    <Text style={tw`text-xs text-gray-500`}>You've paid</Text>
                    <Text style={tw`text-base font-bold text-accent`}>${totalPaid.toFixed(2)}</Text>
                  </View>
                  
                  <View>
                    <Text style={tw`text-xs text-gray-500`}>Total trip</Text>
                    <Text style={tw`text-base font-bold text-neutral`}>${totalTripCost.toFixed(2)}</Text>
                  </View>
                </View>
                
                {/* Progress bar for payment */}
                <View style={tw`mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden`}>
                  <View 
                    style={[
                      tw`h-full bg-gradient-to-r from-accent to-primary rounded-full`, 
                      {
                        width: `${totalOwed > 0 ? Math.min(100, (totalPaid / totalOwed) * 100) : 0}%`
                      }
                    ]}
                  />
                </View>
                
                {/* Pay now button - only shows in expanded state */}
                <TouchableOpacity 
                  style={tw`bg-primary rounded-full py-2 mt-3 items-center`}
                  onPress={() => {
                    const remaining = totalOwed - totalPaid;
                    if (remaining > 0) {
                      setAccommodationPaymentVisible(true);
                    } else {
                      alert('You have already paid for this accommodation.');
                    }
                  }}
                >
                  <Text style={tw`text-white font-bold text-sm`}>Pay Now</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
      
      {/* Payment Sheet Modal */}
      <PaymentSheet
        visible={accommodationPaymentVisible}
        onClose={() => setAccommodationPaymentVisible(false)}
        groopId={currentGroop?.id || ''}
        amount={currentGroop?.accommodation?.costPerPerson || 0}
        description={`Payment for Accommodation: ${currentGroop?.accommodation?.description || 'Stay'}`}
        title="Pay for Accommodation"
      />
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}