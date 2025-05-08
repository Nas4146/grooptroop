export interface ItineraryEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  location?: string;
  isPaymentRequired: boolean;
  totalCost?: number;
  costPerPerson?: number;
  paid?: boolean;
  isOptional: boolean;
  type?: 'party' | 'food' | 'activity' | 'other'; // Add this line
  tags?: string[]; // Add this for the hashtags feature
  attendees?: number; // Add this for the attendees feature
}
  
  export interface ItineraryDay {
    id: string;
    date: string;
    formattedDate: string;
    events: ItineraryEvent[];
  }