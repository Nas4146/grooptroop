import { ItineraryEvent, ItineraryDay } from '../models/itinerary';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Auth navigation param types
export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

// Main navigation param types
export type RootStackParamList = {
  Home: undefined;
  Itinerary: undefined;
  Settings: undefined;
  Map: undefined;
  Payments: undefined;
  Chat: undefined;
  Profile: undefined;
  EventDetails: { eventId: string };
  GroupMembers: { groopId?: string };

}; 
//& AuthStackParamList; // Merge with auth types for easier navigation

// Navigation type helpers
export type AuthScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

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