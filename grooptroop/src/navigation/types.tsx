import { ItineraryEvent, ItineraryDay } from '../models/itinerary';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { NavigatorScreenParams } from '@react-navigation/native';

// Auth navigation param types
export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Itinerary: undefined;
  Map: undefined;
  Payments: undefined;
  Chat: undefined;
  Profile: undefined;
};

// Root navigation param types that combine all navigators
export type RootStackParamList = {
  // Auth Flow
  Auth: NavigatorScreenParams<AuthStackParamList>;
  // Main App Flow
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  // Modal screens (accessible from anywhere)
  EventDetails: { eventId: string };
  GroupMembers: { groopId?: string };
  AdminSettings: undefined;
  DevPerformance: undefined; // No parameters needed for this screen
};


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