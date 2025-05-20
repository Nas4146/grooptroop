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
import { SentryService, usePerformance } from '../utils/sentryService';

export default function ItineraryScreen() {
  const { currentGroop, userGroops, fetchUserGroops, setCurrentGroop } = useGroop();
  const navigation = useNavigation();
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [accommodationPaymentVisible, setAccommodationPaymentVisible] = useState(false);
  const [totalOwed, setTotalOwed] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalTripCost, setTotalTripCost] = useState(0);
  const { profile } = useAuth();
  const [addressCopied, setAddressCopied] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Replace with SentryService hook
  // const perf = useComponentPerformance('ItineraryScreen');
  const perf = usePerformance('ItineraryScreen');
  
  // Create a transaction reference for the screen
  const sentryTransaction = useRef(SentryService.startTransaction(
    'ItineraryScreen', 
    'screen_view'
  ));

  useEffect(() => {
    fetchUserGroops();
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Refresh itinerary data
      fetchItineraryData();
    }, [])
  );

  const fetchItinerary = async (): Promise<ItineraryDay[]> => {
    if (!currentGroop) {
      console.log('[ITINERARY] No groop selected, skipping itinerary fetch');
      setItinerary([]);
      setLoading(false);
      setRefreshing(false);
      return [];
    }

    // Add performance tracking
    const fetchSpan = sentryTransaction.current?.startChild(
      'fetch_itinerary_data',
      'data_fetch'
    );
    
    // Use optional chaining for all fetchSpan method calls
    fetchSpan?.setTag('groopId', currentGroop.id);
    
    try {
      console.log(`[ITINERARY] Fetching itinerary for groop: ${currentGroop.name} (${currentGroop.id})`);
      setLoading(true);

      // Clear cache if refreshing
      if (refreshing) {
        console.log('[ITINERARY] Refreshing, clearing cache first');
        await ItineraryService.clearCache(currentGroop.id);
        
        // Use optional chaining
        fetchSpan?.setTag('cache', 'cleared');
      }

      // When refreshing, bypass cache
      const data = await ItineraryService.getItinerary(
        currentGroop.id,
        !refreshing // Use cache unless refreshing
      );

      const eventCount = data.reduce((total, day) => total + day.events.length, 0);

      console.log(
        '[ITINERARY] Data loaded:',
        data.length,
        'days',
        eventCount,
        'events'
      );

      // Add null check before accessing fetchSpan methods
      if (fetchSpan) {
        fetchSpan.setData('days', data.length);
        fetchSpan.setData('events', eventCount);
        fetchSpan.setStatus('ok');
      }
      
      setItinerary(data);
      return data; // Make sure to return the data
    } catch (error) {
      console.error('[ITINERARY] Error fetching itinerary:', error);
      
      // Report error
      SentryService.captureError(error as Error, {
        context: 'ItineraryScreen.fetchItinerary',
        groopId: currentGroop.id
      });
      
      // Add null check here too
      if (fetchSpan) {
        fetchSpan.setStatus('internal_error');
        fetchSpan.setData('error', (error as Error).message);
      }
      return []; // Return empty array on error
    } finally {
      setLoading(false);
      setRefreshing(false);
      // And here
      if (fetchSpan) {
        fetchSpan.finish();
      }
    }
  };

  const fetchPaymentSummary = async () => {
    if (!currentGroop || !profile) return;

    try {
      const summary = await PaymentService.getUserPaymentSummary(currentGroop.id, profile.uid);
      setTotalOwed(summary.totalOwed);
      setTotalPaid(summary.totalPaid);
      
      // Check if totalTripCost is a string or number and handle appropriately
      if (currentGroop.totalTripCost) {
        if (typeof currentGroop.totalTripCost === 'string') {
          setTotalTripCost(parseFloat(currentGroop.totalTripCost));
        } else {
          setTotalTripCost(currentGroop.totalTripCost);
        }
      } else {
        setTotalTripCost(0);
      }
    } catch (error) {
      console.error('[ITINERARY_SCREEN] Error loading payment data:', error);
    }
  };

  const fetchItineraryData = useCallback((): Promise<ItineraryDay[]> => {
    console.log('[ITINERARY] Refreshing data from focus effect');

    // Refresh itinerary without showing the loading indicator
    if (currentGroop) {
      // We want to fetch fresh data but don't need the loading spinner
      // since this happens when returning to the tab
      return ItineraryService.clearCache(currentGroop.id).then(() => {
        return fetchItinerary();
      });

      // Also refresh payment data
      if (profile) {
        fetchPaymentSummary();

        // Additionally, refresh any payment status in the PaymentService
        PaymentService.clearPaymentStatusCache();
      }
    }
    
    // Return empty array if no groop
    return Promise.resolve([]);
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

  // Track when the component mounts
  useEffect(() => {
    // Replace this:
    // const mountTraceId = SimplePerformance.startTrace('itinerary_screen_mount');
    
    // With this:
    const mountSpan = sentryTransaction.current.startChild(
      'itinerary_screen_mount', 
      'component_lifecycle'
    );
    
    SentryService.logEvent('screen', 'ItineraryScreen mounted');
    
    return () => {
      // Replace this:
      // SimplePerformance.endTrace(mountTraceId);
    
      // With this:
      mountSpan.finish();
      sentryTransaction.current.finish();
      SentryService.logEvent('screen', 'ItineraryScreen unmounted');
    };
  }, []);

  // Load data with performance tracking
  const loadItineraryData = async (): Promise<ItineraryDay[] | null> => {
    // Create dataLoadSpan with optional chaining
    const dataLoadSpan = sentryTransaction.current?.startChild(
      'itinerary_data_load', 
      'data_fetch'
    );
    
    try {
      // Your existing data loading code
      const data = await fetchItineraryData();

      // If this is the first successful load, record it
      if (isFirstLoad && data && data.length > 0) {
        // Replace this:
        // UserPerceptionMetrics.recordFirstScreenRender('ItineraryScreen');
        
        // With this:
        SentryService.logEvent('performance', 'First render complete', {
          screen: 'ItineraryScreen',
          dataPoints: data.length
        });
        
        // Add null check before calling methods on dataLoadSpan
        if (dataLoadSpan) {
          dataLoadSpan.setData('loadSuccess', true);
          dataLoadSpan.setData('dataPoints', data.length);
        }
        
        setIsFirstLoad(false);
      }

      return data;
    } catch (error) {
      console.error('Error loading itinerary:', error);
      
      // Add error tracking
      SentryService.captureError(error as Error, {
        context: 'ItineraryScreen.loadItineraryData'
      });
      
      // Add null check before calling methods on dataLoadSpan
      if (dataLoadSpan) {
        dataLoadSpan.setData('error', (error as Error).message);
        dataLoadSpan.setStatus('internal_error');
      }
      
      return null;
    } finally {
      // Add null check before calling methods on dataLoadSpan
      if (dataLoadSpan) {
        dataLoadSpan.finish();
      }
    }
  };

  // Track user interactions
  const handleItemPress = (itemId: string) => {
    // Create interactionSpan with optional chaining
    const interactionSpan = sentryTransaction.current?.startChild(
      `interact_item_${itemId.slice(0, 6)}`,
      'user_interaction'
    );
    
    // Add null check before calling methods on interactionSpan
    if (interactionSpan) {
      interactionSpan.setTag('itemId', itemId);
    }
    
    // Your existing handler code
    navigateToDetails(itemId);
    
    // Add null check before calling methods on interactionSpan
    if (interactionSpan) {
      interactionSpan.finish();
    }
    
    SentryService.logEvent('interaction', 'Itinerary item selected', { itemId });
  };

  // Add this function before or after handleItemPress
  const navigateToDetails = (eventId: string) => {
    console.log(`[ITINERARY] Navigating to event details: ${eventId}`);
    
    // Find the event in the itinerary data
    let selectedEvent = null;
    
    for (const day of itinerary) {
      const event = day.events.find(e => e.id === eventId);
      if (event) {
        selectedEvent = event;
        break;
      }
    }
    
    if (selectedEvent) {
      // Navigate to the event details screen
      // Assuming you have a modal or screen for event details
      // You might need to adjust this navigation call based on your app's routing structure
      navigation.navigate('EventDetails', { 
        eventId: eventId,
        groopId: currentGroop?.id
      });
    } else {
      console.warn('[ITINERARY] Event not found:', eventId);
    }
  };

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
                  color={currentGroop?.accommodation?.isPaid ? '#22c55e' : '#f59e0b'}
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
                name={addressCopied ? 'checkmark' : 'copy-outline'}
                size={12}
                color={addressCopied ? '#22c55e' : '#1F2937'}
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
              onPress={() => {
                console.log('[ITINERARY] Navigating to Chat tab');
                navigation.navigate('ChatTab');
              }}
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
            itinerary.map((day) => {
              // Filter out accommodation events from each day's events
              const filteredEvents = day.events.filter((event) => event.type !== 'accommodation');

              // Create a new day object with filtered events
              const filteredDay = {
                ...day,
                events: filteredEvents,
              };

              // Only render days that have events after filtering
              if (filteredEvents.length > 0) {
                return <DaySection key={day.date} day={filteredDay} />;
              }

              // If all events were filtered out (only accommodations), don't render this day
              return null;
            })
          )}
        </ScrollView>

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