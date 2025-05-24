import React from 'react';
import { View, Text } from 'react-native';
import { ItineraryDay } from '../../models/itinerary';
import EventCard from './EventCard';
import { DaySectionProps } from '../../navigation/types';
import tw from '../../utils/tw';

export default function DaySection({ day }: DaySectionProps) {
  return (
    <View style={tw`mb-5`}>
      {/* Modern day header with blob-shaped background */}
      <View style={tw`mb-1.5 flex-row items-center`}>
        <View style={tw`bg-secondary rounded-l-full rounded-tr-3xl rounded-br-lg px-3 py-1.5`}>
          <Text style={tw`text-sm font-bold text-white`}>
            {day.formattedDate}
          </Text>
        </View>
      </View>
      
      <View style={tw`ml-1.5`}>
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