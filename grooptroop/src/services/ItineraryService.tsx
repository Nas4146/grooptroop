import { ItineraryDay, ItineraryEvent } from '../models/itinerary';

// Static data for now - will be replaced with Firebase later
const mockItineraryData: ItineraryDay[] = [
  {
    date: '2024-06-05',
    formattedDate: 'Thursday June 5th',
    events: [
      {
        id: '1',
        title: 'Explore Roma Norte/Condesa & Find Dinner',
        date: '2024-06-05',
        time: '8:00 PM',
        description: 'Explore the neighborhoods and find dinner somewhere (No Reservation)',
        isPaymentRequired: false,
        isOptional: false,
      },
      {
        id: '2',
        title: 'Jueves @ Outline',
        date: '2024-06-05',
        time: '10:00 PM',
        description: 'Night out at Outline',
        isPaymentRequired: false,
        isOptional: true,
      }
    ]
  },
  {
    date: '2024-06-06',
    formattedDate: 'Friday June 6th',
    events: [
      {
        id: '3',
        title: 'Chapultepec Park + Taco Tour',
        date: '2024-06-06',
        time: '11:00 AM',
        description: 'Visit the park and go on a taco tour',
        isPaymentRequired: false,
        isOptional: false,
      },
      {
        id: '4a',
        title: 'Dinner @ Taverna',
        date: '2024-06-06',
        time: '6:00 PM',
        description: 'Dinner at Taverna',
        location: 'Taverna Restaurant',
        isPaymentRequired: true,
        totalCost: 130,
        costPerPerson: 13,
        paid: false,
        isOptional: true,
      },
      {
        id: '4b',
        title: 'Dinner @ Blanco Colima',
        date: '2024-06-06',
        time: '6:00 PM',
        description: 'Dinner at Blanco Colima',
        location: 'Blanco Colima Restaurant',
        isPaymentRequired: true,
        totalCost: 150,
        costPerPerson: 15,
        paid: false,
        isOptional: true,
      },
      {
        id: '4c',
        title: 'Dinner @ Huset',
        date: '2024-06-06',
        time: '6:00 PM',
        description: 'Dinner at Huset',
        location: 'Huset Restaurant',
        isPaymentRequired: true,
        totalCost: 140,
        costPerPerson: 14,
        paid: false,
        isOptional: true,
      },
      {
        id: '5',
        title: 'Lucha Libre Wrestling',
        date: '2024-06-06',
        time: '8:30 PM',
        description: 'Watch traditional Mexican wrestling',
        isPaymentRequired: true,
        totalCost: 200,
        costPerPerson: 20,
        paid: false,
        isOptional: false,
      }
    ]
  },
  {
    date: '2024-06-07',
    formattedDate: 'Saturday June 7th',
    events: [
      {
        id: '6',
        title: 'Chapultepec Park + Taco Tour',
        date: '2024-06-07',
        time: '11:00 AM',
        description: 'Visit the park and go on a taco tour',
        isPaymentRequired: false,
        isOptional: false,
      },
      {
        id: '7',
        title: 'Early Dinner @ Esquina comun',
        date: '2024-06-07',
        time: '4:00 PM',
        description: 'Early dinner at Esquina comun',
        location: 'Esquina comun Restaurant',
        isPaymentRequired: true,
        totalCost: 120,
        costPerPerson: 12,
        paid: false,
        isOptional: false,
      },
      {
        id: '8a',
        title: 'Dinner @ Contramar',
        date: '2024-06-07',
        time: '6:00 PM',
        description: 'Dinner at Contramar',
        location: 'Contramar Restaurant',
        isPaymentRequired: true,
        totalCost: 160,
        costPerPerson: 16,
        paid: false,
        isOptional: true,
      },
      {
        id: '8b',
        title: 'Dinner @ Cueva',
        date: '2024-06-07',
        time: '6:30 PM',
        description: 'Dinner at Cueva',
        location: 'Cueva Restaurant',
        isPaymentRequired: true,
        totalCost: 140,
        costPerPerson: 14,
        paid: false,
        isOptional: true,
      },
      {
        id: '9',
        title: 'Supra Rooftop',
        date: '2024-06-07',
        time: '9:00 PM',
        description: 'Party at Supra Rooftop',
        location: 'Supra Rooftop',
        isPaymentRequired: true,
        totalCost: 250,
        costPerPerson: 25,
        paid: false,
        isOptional: false,
      }
    ]
  },
  {
    date: '2024-06-08',
    formattedDate: 'Sunday June 8th',
    events: [
      {
        id: '10',
        title: 'Depart',
        date: '2024-06-08',
        time: 'All Day',
        description: 'Return home',
        isPaymentRequired: false,
        isOptional: false,
      }
    ]
  }
];

// Service methods
export const ItineraryService = {
  getItinerary: async (): Promise<ItineraryDay[]> => {
    // Simulating API call with a delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockItineraryData);
      }, 500);
    });
  },
  
  getItineraryDay: async (date: string): Promise<ItineraryDay | undefined> => {
    // Simulating API call with a delay
    return new Promise((resolve) => {
      setTimeout(() => {
        const day = mockItineraryData.find(day => day.date === date);
        resolve(day);
      }, 300);
    });
  },

  // Cache methods to be implemented later with AsyncStorage
  cacheItinerary: async (data: ItineraryDay[]): Promise<void> => {
    // Will implement with AsyncStorage
    console.log('Caching itinerary data...');
  }
};