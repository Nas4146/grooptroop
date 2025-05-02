import { ItineraryEvent, ItineraryDay } from '../models/itinerary';

// Navigation param types
export type RootStackParamList = {
  Itinerary: undefined;
  Map: undefined;
  Payments: undefined;
  Chat: undefined;
  Profile: undefined;
  EventDetails: { eventId: string };
};

// Component prop types
export interface EventCardProps {
  event: ItineraryEvent;
  isSelected?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}

export interface DaySectionProps {
  day: ItineraryDay;
}