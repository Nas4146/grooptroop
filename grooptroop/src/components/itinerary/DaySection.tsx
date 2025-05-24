import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { ItineraryDay } from '../../models/itinerary';
import EventCard from './EventCard';
import { DaySectionProps } from '../../navigation/types';
import tw from '../../utils/tw';
import { useAuth } from '../../contexts/AuthProvider';
import { useGroop } from '../../contexts/GroopProvider';
import { PaymentService } from '../../services/PaymentService';

export default function DaySection({ day }: DaySectionProps) {
  const { currentGroop } = useGroop();
  const { profile } = useAuth();
  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, boolean>>({});

  // Batch check payment statuses for all events in this day
  useEffect(() => {
    if (currentGroop?.id && profile?.uid) {
      const eventIds = day.events
        .filter(event => event.isPaymentRequired)
        .map(event => event.id);
      
      if (eventIds.length > 0) {
        PaymentService.batchCheckEventPaymentStatus(currentGroop.id, profile.uid, eventIds)
          .then(setPaymentStatuses)
          .catch(console.error);
      }
    }
  }, [currentGroop?.id, profile?.uid, day.events]);

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
            paymentStatus={paymentStatuses[event.id]} // Pass pre-computed status
          />
        ))}
      </View>
    </View>
  );
}