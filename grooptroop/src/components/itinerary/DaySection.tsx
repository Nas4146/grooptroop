import React from 'react';
import { View, Text } from 'react-native';
import { ItineraryDay } from '../../models/itinerary';
import EventCard from './EventCard';
import tw from '../../utils/tw';

interface DaySectionProps {
  day: ItineraryDay;
}

export default function DaySection({ day }: DaySectionProps) {
  return (
    <View style={tw`mb-8`}>
      <Text style={tw`text-xl font-bold mb-3 text-gray-800 px-4`}>
        {day.formattedDate}
      </Text>
      
      {day.events.map((event) => (
        <EventCard 
          key={event.id} 
          event={event}
        />
      ))}
    </View>
  );
}