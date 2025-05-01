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
  }
  
  export interface ItineraryDay {
    date: string;
    formattedDate: string;
    events: ItineraryEvent[];
  }