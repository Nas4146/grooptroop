import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItineraryEvent } from '../../models/itinerary';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, EventCardProps } from '../../navigation/types';
import tw from '../../utils/tw';

type EventDetailsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EventDetails'>;

export default function EventCard({ 
  event, 
  isSelected = false,
  isFirst = false,
  isLast = false 
}: EventCardProps) {
  const navigation = useNavigation<EventDetailsNavigationProp>();
  const handlePress = () => {
    navigation.navigate('EventDetails', { eventId: event.id });
  };

  // Get event color and mood based on event type
  const getEventMood = () => {
    switch(event.type) {
      case 'party':
        return {
          bg: 'bg-rose-100',
          border: 'border-rose-300',
          icon: 'wine',
          color: '#F43F5E',
          emoji: '🎉'
        };
      case 'food':
        return {
          bg: 'bg-amber-100',
          border: 'border-amber-300',
          icon: 'restaurant',
          color: '#F59E0B',
          emoji: '🍕'
        };
      case 'activity':
        return {
          bg: 'bg-sky-100',
          border: 'border-sky-300',
          icon: 'bicycle',
          color: '#0EA5E9',
          emoji: '🏄‍♂️'
        };
      default:
        return {
          bg: 'bg-sky-100',
          border: 'border-sky-300',
          icon: 'calendar',
          color: '#7C3AED',
          emoji: '📅'
        };
    }
  };

  const mood = getEventMood();

  return (
    <View style={tw`relative ${!isFirst ? 'mt-4' : ''}`}>
      {/* Timeline connector - Gen Z loves this spatial continuity */}
      {!isLast && (
        <View style={tw`absolute left-[23px] top-[55px] bottom-0 w-0.5 bg-gray-200 z-0`}></View>
      )}
      
      <View style={tw`flex-row`}>
        {/* Event time bubble */}
        <View style={tw`w-12 h-12 rounded-full ${mood.bg} items-center justify-center mr-3 z-10`}>
          <Text style={tw`text-xs font-bold text-gray-700`}>{event.time}</Text>
        </View>
        
        <TouchableOpacity
          onPress={handlePress}
          style={tw`flex-1 rounded-2xl px-4 py-3 shadow-sm ${
            isSelected 
              ? 'bg-violet-100 border border-violet-300' 
              : `bg-white border ${mood.border}`
          } ${event.isOptional ? 'opacity-80' : 'opacity-100'}`}
        >
          <View style={tw`flex-row justify-between items-start`}>
            <View style={tw`flex-1`}>
              {/* Row with title and mood emoji */}
              <View style={tw`flex-row items-center`}>
                <Text style={tw`text-xl font-bold ${
                  event.isOptional ? 'text-gray-500' : 'text-gray-800'
                }`}>
                  {event.title}
                </Text>
                <Text style={tw`ml-2 text-lg`}>{mood.emoji}</Text>
                
                {event.isOptional && (
                  <View style={tw`ml-auto px-2 py-0.5 bg-gray-200 rounded-full`}>
                    <Text style={tw`text-xs font-semibold text-gray-600`}>skip?</Text>
                  </View>
                )}
              </View>
              
              {/* Location with modern icon */}
              {event.location && (
                <View style={tw`flex-row items-center mt-1.5`}>
                  <View style={tw`w-6 h-6 rounded-full ${mood.bg} items-center justify-center mr-2`}>
                    <Ionicons name="location" size={14} color={mood.color} />
                  </View>
                  <Text style={tw`text-sm text-gray-600`}>{event.location}</Text>
                </View>
              )}
              
              {/* Description with stylized first letter - Gen Z typography trick */}
              <Text style={tw`text-gray-600 mt-2`}>
                <Text style={tw`text-lg font-bold text-gray-800`}>
                  {event.description?.charAt(0)}
                </Text>
                {event.description?.slice(1)}
              </Text>
              
              {/* Trending hashtags */}
              {event.tags && (
                <View style={tw`flex-row flex-wrap mt-2`}>
                  {event.tags.map(tag => (
                    <Text key={tag} style={tw`mr-2 text-secondary font-medium`}>
                      #{tag}
                    </Text>
                  ))}
                </View>
              )}
            </View>
            
            {/* Payment indicator with modern styling */}
            {event.isPaymentRequired && (
              <View style={tw`items-center ml-3`}>
                <View style={tw`rounded-full p-2.5 ${
                  event.paid ? 'bg-green-100' : 'bg-amber-100'
                }`}>
                  <Ionicons 
                    testID={event.paid ? "icon-checkmark-circle" : "icon-card-outline"}
                    name={event.paid ? "checkmark-circle" : "card-outline"} 
                    size={22} 
                    color={event.paid ? "#10B981" : "#F59E0B"} 
                  />
                </View>
                <View style={tw`${event.paid ? 'bg-green-100' : 'bg-amber-100'} px-2 py-1 rounded-full mt-1`}>
                  <Text style={tw`text-xs font-bold ${event.paid ? 'text-green-700' : 'text-amber-700'}`}>
                    ${event.costPerPerson}
                  </Text>
                </View>
              </View>
            )}
          </View>
          
          {/* People attending indicators */}
          {event.attendees && (
            <View style={tw`flex-row items-center mt-3`}>
              <View style={tw`flex-row -space-x-2`}>
                {[1,2,3].map(i => (
                  <View key={i} style={tw`w-6 h-6 rounded-full border-2 border-white`}>
                    <Image 
                      source={{ uri: `https://i.pravatar.cc/100?img=${i+10}` }} 
                      style={tw`w-full h-full rounded-full`}
                    />
                  </View>
                ))}
                <View style={tw`w-6 h-6 rounded-full bg-primary border-2 border-white items-center justify-center`}>
                  <Text style={tw`text-xs text-white font-bold`}>+3</Text>
                </View>
              </View>
              <Text style={tw`text-xs text-gray-500 ml-2`}>6 attending</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}