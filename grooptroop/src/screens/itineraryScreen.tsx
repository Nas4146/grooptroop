import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ItineraryService } from '../services/ItineraryService';
import { ItineraryDay } from '../models/itinerary';
import DaySection from '../components/itinerary/DaySection';
import '../styles/commonStyles.css';

export default function ItineraryScreen() {
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItinerary = async () => {
    try {
      const data = await ItineraryService.getItinerary();
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
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text className="mt-4 text-gray-600">Loading your itinerary...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-800">Bachelor Party</Text>
        <Text className="text-violet-600 font-medium">June 5-8, 2024</Text>
      </View>
      
      <ScrollView
  className="flex-1"
  contentContainerStyle={{ padding: 16, paddingBottom: 64 }}
  showsVerticalScrollIndicator={false}
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
      >
        {itinerary.map((day) => (
          <DaySection key={day.date} day={day} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}