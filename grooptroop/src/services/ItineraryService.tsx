import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../lib/firebase';
import { ItineraryDay, ItineraryEvent } from '../models/itinerary';

export class ItineraryService {
  // Add these cache-related functions
  
  // Cache the itinerary data locally
  static async cacheItinerary(groopId: string, itineraryData: ItineraryDay[]): Promise<void> {
    try {
      console.log('[ITINERARY] Caching itinerary data for groop:', groopId);
      const cacheKey = `itinerary_${groopId}`;
      
      // Add timestamp for cache invalidation
      const cacheData = {
        timestamp: new Date().toISOString(),
        data: itineraryData
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('[ITINERARY] Successfully cached itinerary data');
    } catch (error) {
      console.error('[ITINERARY] Error caching itinerary:', error);
    }
  }
  
  // Get cached itinerary data if available and not expired
  static async getCachedItinerary(groopId: string, maxAgeMinutes: number = 30): Promise<ItineraryDay[] | null> {
    try {
      console.log('[ITINERARY] Trying to get cached itinerary for groop:', groopId);
      const cacheKey = `itinerary_${groopId}`;
      
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (!cachedData) {
        console.log('[ITINERARY] No cached data found');
        return null;
      }
      
      const { timestamp, data } = JSON.parse(cachedData);
      const cacheTime = new Date(timestamp);
      const now = new Date();
      
      // Check if cache is still valid (not older than maxAgeMinutes)
      const cacheAgeMinutes = (now.getTime() - cacheTime.getTime()) / (1000 * 60);
      
      if (cacheAgeMinutes > maxAgeMinutes) {
        console.log('[ITINERARY] Cached data expired');
        return null;
      }
      
      console.log('[ITINERARY] Using cached itinerary data from', timestamp);
      return data;
    } catch (error) {
      console.error('[ITINERARY] Error retrieving cached itinerary:', error);
      return null;
    }
  }
  
  // Clear cache for a specific groop
  static async clearCache(groopId: string): Promise<void> {
    try {
      const cacheKey = `itinerary_${groopId}`;
      await AsyncStorage.removeItem(cacheKey);
      console.log('[ITINERARY] Cache cleared for groop:', groopId);
    } catch (error) {
      console.error('[ITINERARY] Error clearing cache:', error);
    }
  }

  // Update the getItinerary method to use cache
  static async getItinerary(groopId: string, useCache: boolean = true): Promise<ItineraryDay[]> {
    try {
      console.log('[ITINERARY] Fetching itinerary for groop:', groopId);
      
      // Try to get from cache first if useCache is true
      if (useCache) {
        const cachedData = await this.getCachedItinerary(groopId);
        if (cachedData) {
          return cachedData;
        }
      }
      
      // If not in cache or cache disabled, fetch from Firestore
      const daysRef = collection(db, `groops/${groopId}/itinerary`);
      const q = query(daysRef, orderBy('date', 'asc'));
      const daysSnapshot = await getDocs(q);
      
      const itinerary: ItineraryDay[] = [];
      
      for (const dayDoc of daysSnapshot.docs) {
        const dayData = dayDoc.data();
        
// Fetch events for this day
const eventsRef = collection(db, `groops/${groopId}/itinerary/${dayDoc.id}/events`);
const eventsQuery = query(eventsRef, orderBy('time', 'asc'));
const eventsSnapshot = await getDocs(eventsQuery);

const events: ItineraryEvent[] = eventsSnapshot.docs.map(eventDoc => {
  const eventData = eventDoc.data();
  return {
    id: eventDoc.id,
    title: eventData.title,
    date: eventData.date,
    time: eventData.time,
    description: eventData.description,
    location: eventData.location,
    isPaymentRequired: eventData.isPaymentRequired,
    totalCost: eventData.totalCost,
    costPerPerson: eventData.costPerPerson,
    paid: eventData.paid,
    isOptional: eventData.isOptional,
    type: eventData.type,
    tags: eventData.tags,
    attendees: eventData.attendees
  };
});

itinerary.push({
  id: dayDoc.id,
  date: dayData.date,
  formattedDate: dayData.formattedDate,
  events: events
});
}

console.log('[ITINERARY] Found', itinerary.length, 'days in itinerary');

// Cache the data for future use
if (useCache) {
await this.cacheItinerary(groopId, itinerary);
}

return itinerary;
} catch (error) {
console.error('[ITINERARY] Error fetching itinerary:', error);
throw error;
}
  }
  
  // Get a specific day from the itinerary
  static async getItineraryDay(
    groopId: string, 
    date: string
  ): Promise<ItineraryDay | undefined> {
    try {
      console.log('[ITINERARY] Fetching day', date, 'for groop', groopId);
      
      const daysRef = collection(db, `groops/${groopId}/itinerary`);
      const q = query(daysRef, where('date', '==', date));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('[ITINERARY] No day found for date:', date);
        return undefined;
      }
      
      const dayDoc = snapshot.docs[0];
      const dayData = dayDoc.data();
      
      // Fetch events for this day
      const eventsRef = collection(db, `groops/${groopId}/itinerary/${dayDoc.id}/events`);
      const eventsQuery = query(eventsRef, orderBy('time', 'asc'));
      const eventsSnapshot = await getDocs(eventsQuery);
      
      const events: ItineraryEvent[] = eventsSnapshot.docs.map(eventDoc => {
        const eventData = eventDoc.data();
        return {
          id: eventDoc.id,
          title: eventData.title,
          date: eventData.date,
          time: eventData.time,
          description: eventData.description,
          location: eventData.location,
          isPaymentRequired: eventData.isPaymentRequired,
          totalCost: eventData.totalCost,
          costPerPerson: eventData.costPerPerson,
          paid: eventData.paid,
          isOptional: eventData.isOptional,
          type: eventData.type,
          tags: eventData.tags,
          attendees: eventData.attendees
        };
      });
      
      console.log('[ITINERARY] Found day with', events.length, 'events');
      
      return {
        id: dayDoc.id,
        date: dayData.date,
        formattedDate: dayData.formattedDate,
        events: events
      };
    } catch (error) {
      console.error('[ITINERARY] Error fetching day:', error);
      throw error;
    }
  }
  
  // Add a day to the itinerary
  static async addDay(
    groopId: string, 
    date: string, 
    formattedDate: string
  ): Promise<string> {
    try {
      console.log('[ITINERARY] Adding day', date, 'to groop', groopId);
      
      const daysRef = collection(db, `groops/${groopId}/itinerary`);
      const dayRef = doc(daysRef);
      
      await setDoc(dayRef, {
        date,
        formattedDate
      });
      
      console.log('[ITINERARY] Successfully added day with ID:', dayRef.id);
      return dayRef.id;
    } catch (error) {
      console.error('[ITINERARY] Error adding day:', error);
      throw error;
    }
  }
  
  // Add an event to a day
  static async addEvent(
    groopId: string, 
    dayId: string, 
    event: Omit<ItineraryEvent, 'id'>
  ): Promise<string> {
    try {
      console.log('[ITINERARY] Adding event to day', dayId, 'in groop', groopId);
      
      const eventsRef = collection(db, `groops/${groopId}/itinerary/${dayId}/events`);
      const eventRef = doc(eventsRef);
      
      await setDoc(eventRef, event);
      
      console.log('[ITINERARY] Successfully added event with ID:', eventRef.id);
      return eventRef.id;
    } catch (error) {
      console.error('[ITINERARY] Error adding event:', error);
      throw error;
    }
  }
  
  // Import an entire itinerary (useful for migrating from your static data)
  static async importItinerary(groopId: string, itinerary: ItineraryDay[]): Promise<void> {
    try {
      console.log('[ITINERARY] Importing itinerary with', itinerary.length, 'days for groop', groopId);
      
      for (const day of itinerary) {
        // Add the day
        const dayId = await this.addDay(groopId, day.date, day.formattedDate);
        
        // Add all events for this day
        for (const event of day.events) {
          const { id, ...eventData } = event; // Remove the id as we'll generate a new one
          await this.addEvent(groopId, dayId, eventData);
        }
      }
      
      console.log('[ITINERARY] Successfully imported itinerary');
    } catch (error) {
      console.error('[ITINERARY] Error importing itinerary:', error);
      throw error;
    }
  }

  // Update the static mock data import function to use Firestore
  static async importMockData(groopId: string): Promise<void> {
    try {
      console.log('[ITINERARY] Importing mock data for groop', groopId);
      
      // Get your existing mock data (or you could define it directly here)
      const mockData = this.getMockItineraryData();
      
      // Import it into Firestore for this groop
      await this.importItinerary(groopId, mockData);
      
      console.log('[ITINERARY] Successfully imported mock data');
    } catch (error) {
      console.error('[ITINERARY] Error importing mock data:', error);
      throw error;
    }
  }

  // Your existing mock data function
  static getMockItineraryData(): ItineraryDay[] {
    // Return your existing static data here
    return [
      {
      id: '1',
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
    id: '2',
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
    id:'3',
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
    id:'4',
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
  }
}