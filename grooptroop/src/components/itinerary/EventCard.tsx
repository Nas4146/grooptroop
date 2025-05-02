import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItineraryEvent } from '../../models/itinerary';
import { useNavigation } from '@react-navigation/native';
import tw from '../../utils/tw';

interface EventCardProps {
  event: ItineraryEvent;
  isSelected?: boolean;
}

export default function EventCard({ event, isSelected = false }: EventCardProps) {
  const navigation = useNavigation();

  const handlePress = () => {
    navigation.navigate('EventDetails', { eventId: event.id });
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={tw`mb-4 rounded-2xl px-4 py-3 shadow-sm ${
        isSelected 
          ? 'bg-violet-100 border border-violet-300' 
          : 'bg-white border border-gray-100'
      } ${event.isOptional ? 'opacity-80' : 'opacity-100'}`}
    >
      <View style={tw`flex-row justify-between items-start`}>
        <View style={tw`flex-1`}>
          <View style={tw`flex-row items-center`}>
            <Text style={tw`font-semibold text-lg ${
              event.isOptional ? 'text-gray-500' : 'text-gray-800'
            }`}>
              {event.title}
            </Text>
            {event.isOptional && (
              <View style={tw`ml-2 px-2 py-0.5 bg-gray-200 rounded-full`}>
                <Text style={tw`text-xs text-gray-600`}>Optional</Text>
              </View>
            )}
          </View>
          
          <View style={tw`flex-row items-center mt-1`}>
            <Ionicons name="time-outline" size={14} color="#6B7280" />
            <Text style={tw`text-gray-500 text-sm ml-1`}>{event.time}</Text>
            
            {event.location && (
              <View style={tw`flex-row items-center ml-3`}>
                <Ionicons name="location-outline" size={14} color="#6B7280" />
                <Text style={tw`text-gray-500 text-sm ml-1`}>{event.location}</Text>
              </View>
            )}
          </View>
          
          <Text style={tw`text-gray-600 mt-2`}>{event.description}</Text>
        </View>
        
        {event.isPaymentRequired && (
          <View style={tw`flex items-center`}>
            <View style={tw`rounded-full p-2 ${
              event.paid ? 'bg-green-100' : 'bg-amber-100'
            }`}>
              <Ionicons 
                testID={event.paid ? "icon-checkmark-circle" : "icon-card-outline"}
                name={event.paid ? "checkmark-circle" : "card-outline"} 
                size={22} 
                color={event.paid ? "#10B981" : "#F59E0B"} 
              />
            </View>
            <Text style={tw`text-xs mt-1`}>
              ${event.costPerPerson}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}