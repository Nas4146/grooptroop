import React, { useEffect, useState } from 'react';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import EventDetailsModal from '../components/itinerary/EventDetails';
import { ItineraryService } from '../services/ItineraryService';
import { useGroop } from '../contexts/GroopProvider';
import { ItineraryEvent } from '../models/itinerary';

type EventDetailsScreenRouteProp = RouteProp<RootStackParamList, 'EventDetails'>;

export default function EventDetailsScreen() {
  const route = useRoute<EventDetailsScreenRouteProp>();
  const navigation = useNavigation();
  const { currentGroop } = useGroop();
  const [event, setEvent] = useState<ItineraryEvent | null>(null);
  
  const { eventId } = route.params;
  
  // Fetch the event details
  useEffect(() => {
    const fetchEvent = async () => {
      if (currentGroop && eventId) {
        // Changed method name from getEventById to getEvent
        const eventData = await ItineraryService.getEvent(currentGroop.id, eventId);
        setEvent(eventData);
      }
    };
    
    fetchEvent();
  }, [eventId, currentGroop]);
  
  const handleClose = () => {
    navigation.goBack();
  };
  
  const handlePayment = () => {
    // Implement payment logic or navigation
    console.log('Handle payment for event:', eventId);
  };
  
  return (
    <EventDetailsModal
      visible={true}
      event={event}
      groopId={currentGroop?.id || ''}
      onClose={handleClose}
      onPayment={handlePayment}
    />
  );
}