import React from 'react';
import { View, Text } from 'react-native';
import { ItineraryDay } from '../../models/itinerary';
import EventCard from './EventCard';
import { DaySectionProps } from '../../navigation/types';
import tw from '../../utils/tw';

export default function DaySection({ day }: DaySectionProps) {
  return (
    <View style={tw`mb-6`}>
      {/* Modern day header with blob-shaped background - Gen Z loves asymmetrical shapes */}
      <View style={tw`mb-2 flex-row items-center`}>
        <View style={tw`bg-secondary rounded-l-full rounded-tr-3xl rounded-br-lg px-4 py-2`}>
          <Text style={tw`text-base font-bold text-white`}>
            {day.formattedDate}
          </Text>
        </View>
        
        {/* Floating tag for day energy/vibe }
        <View style={tw`ml-2 bg-black bg-opacity-10 rounded-full px-3 py-1`}>
          <Text style={tw`text-xs font-medium text-gray-700`}>chill vibes</Text>
        </View>*/}
      </View>
      
      <View style={tw`ml-2`}>
        {day.events.map((event, index) => (
          <EventCard 
            key={event.id} 
            event={event}
            isFirst={index === 0}
            isLast={index === day.events.length - 1}
          />
        ))}
      </View>
    </View>
  );
}