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

  // Get the full itinerary for a groop
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
            title: eventData.title || '',
            date: eventData.date || '',
            time: eventData.time || '',
            description: eventData.description || '',
            location: eventData.location || '',
            isPaymentRequired: Boolean(eventData.isPaymentRequired) || false,
            totalCost: eventData.totalCost || 0,
            costPerPerson: eventData.costPerPerson || 0,
            paid: Boolean(eventData.paid) || false,
            isOptional: Boolean(eventData.isOptional) || false,
            type: eventData.type || 'other',
            tags: eventData.tags || [],
            attendees: eventData.attendees || 0
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
  
  // Get a specific event from any day in the itinerary
  static async getEvent(
    groopId: string,
    eventId: string
  ): Promise<ItineraryEvent | null> {
    try {
      console.log(`[ITINERARY] Fetching event ${eventId} for groop ${groopId}`);
      
      // First we need to find which day contains this event
      const daysRef = collection(db, `groops/${groopId}/itinerary`);
      const daysSnapshot = await getDocs(daysRef);
      
      // Search through each day to find the event
      for (const dayDoc of daysSnapshot.docs) {
        const eventDocRef = doc(db, `groops/${groopId}/itinerary/${dayDoc.id}/events/${eventId}`);
        const eventSnapshot = await getDoc(eventDocRef);
        
        if (eventSnapshot.exists()) {
          const eventData = eventSnapshot.data();
          return {
            id: eventSnapshot.id,
            title: eventData.title || '',
            date: eventData.date || '',
            time: eventData.time || '',
            description: eventData.description || '',
            location: eventData.location || '',
            isPaymentRequired: Boolean(eventData.isPaymentRequired) || false,
            totalCost: eventData.totalCost || 0,
            costPerPerson: eventData.costPerPerson || 0,
            paid: Boolean(eventData.paid) || false,
            isOptional: Boolean(eventData.isOptional) || false,
            type: eventData.type || 'other',
            tags: eventData.tags || [],
            attendees: eventData.attendees || 0
          };
        }
      }
      
      console.log(`[ITINERARY] No event found with ID: ${eventId}`);
      return null;
    } catch (error) {
      console.error('[ITINERARY] Error fetching event:', error);
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
          title: eventData.title || '',
          date: eventData.date || '',
          time: eventData.time || '',
          description: eventData.description || '',
          location: eventData.location || '',
          isPaymentRequired: Boolean(eventData.isPaymentRequired) || false,
          totalCost: eventData.totalCost || 0,
          costPerPerson: eventData.costPerPerson || 0,
          paid: Boolean(eventData.paid) || false,
          isOptional: Boolean(eventData.isOptional) || false,
          type: eventData.type || 'other',
          tags: eventData.tags || [],
          attendees: eventData.attendees || 0
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
      
      await setDoc(eventRef, {
        ...event,
        createdAt: Timestamp.now() // Add creation timestamp
      });
      
      console.log('[ITINERARY] Successfully added event with ID:', eventRef.id);
      return eventRef.id;
    } catch (error) {
      console.error('[ITINERARY] Error adding event:', error);
      throw error;
    }
  }
  
  // Update an existing event
  static async updateEvent(
    groopId: string,
    dayId: string,
    eventId: string,
    updatedData: Partial<Omit<ItineraryEvent, 'id'>>
  ): Promise<void> {
    try {
      console.log(`[ITINERARY] Updating event ${eventId} in day ${dayId}`);
      
      const eventRef = doc(db, `groops/${groopId}/itinerary/${dayId}/events/${eventId}`);
      const updateData = {
        ...updatedData,
        updatedAt: Timestamp.now()
      };
      
      await setDoc(eventRef, updateData, { merge: true });
      console.log('[ITINERARY] Event successfully updated');
    } catch (error) {
      console.error('[ITINERARY] Error updating event:', error);
      throw error;
    }
  }
  
  // Delete an event
  static async deleteEvent(
    groopId: string,
    dayId: string,
    eventId: string
  ): Promise<void> {
    try {
      console.log(`[ITINERARY] Deleting event ${eventId} from day ${dayId}`);
      
      const eventRef = doc(db, `groops/${groopId}/itinerary/${dayId}/events/${eventId}`);
      await deleteDoc(eventRef);
      
      console.log('[ITINERARY] Event successfully deleted');
    } catch (error) {
      console.error('[ITINERARY] Error deleting event:', error);
      throw error;
    }
  }
  
  // Create sample data for a new groop (for admin use only)
  static async createSampleItinerary(groopId: string, startDate: Date): Promise<void> {
    try {
      console.log('[ITINERARY] Creating sample itinerary for groop', groopId);
      
      // Format dates
      const formatDate = (date: Date): string => {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      };
      
      // Format for display
      const formatDisplayDate = (date: Date): string => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        return `${days[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}${getSuffix(date.getDate())}`;
      };
      
      // Get suffix for day
      const getSuffix = (day: number): string => {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
          case 1: return 'st';
          case 2: return 'nd';
          case 3: return 'rd';
          default: return 'th';
        }
      };
      
      // Create a series of days
      const numDays = 4; // Create 4 days of sample itinerary
      
      for (let i = 0; i < numDays; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        const dateStr = formatDate(currentDate);
        const formattedDate = formatDisplayDate(currentDate);
        
        // Add the day
        const dayId = await this.addDay(groopId, dateStr, formattedDate);
        
        // Add 2-3 events per day
        if (i === 0) { // First day
          await this.addEvent(groopId, dayId, {
            title: 'Arrival & Check-in',
            date: dateStr,
            time: '3:00 PM',
            description: 'Check in to accommodation',
            isPaymentRequired: false,
            isOptional: false,
            type: 'other'
          });
          
          await this.addEvent(groopId, dayId, {
            title: 'Welcome Dinner',
            date: dateStr,
            time: '7:00 PM',
            description: 'Group dinner to kick off the trip',
            location: 'Recommended: Local restaurant near accommodation',
            isPaymentRequired: true,
            totalCost: 200,
            costPerPerson: 25,
            paid: false,
            isOptional: false,
            type: 'food'
          });
        } else if (i === numDays - 1) { // Last day
          await this.addEvent(groopId, dayId, {
            title: 'Checkout & Departure',
            date: dateStr,
            time: '11:00 AM',
            description: 'Check out of accommodation',
            isPaymentRequired: false,
            isOptional: false,
            type: 'other'
          });
        } else { // Middle days
          await this.addEvent(groopId, dayId, {
            title: 'Morning Activity',
            date: dateStr,
            time: '10:00 AM',
            description: 'Explore the local area',
            isPaymentRequired: false,
            isOptional: false,
            type: 'activity'
          });
          
          await this.addEvent(groopId, dayId, {
            title: 'Lunch Options',
            date: dateStr,
            time: '1:00 PM',
            description: 'Various lunch options in the area',
            isPaymentRequired: false,
            isOptional: true,
            type: 'food'
          });
          
          await this.addEvent(groopId, dayId, {
            title: 'Evening Event',
            date: dateStr,
            time: '8:00 PM',
            description: 'Evening entertainment',
            isPaymentRequired: true,
            totalCost: 240,
            costPerPerson: 30,
            paid: false,
            isOptional: false,
            type: 'party'
          });
        }
      }
      
      console.log('[ITINERARY] Successfully created sample itinerary');
    } catch (error) {
      console.error('[ITINERARY] Error creating sample itinerary:', error);
      throw error;
    }
  }

  // Debugging function to test itinerary access
  static async debugItineraryAccess(groopId: string): Promise<void> {
    console.log(`[ITINERARY DEBUG] Attempting to access: groops/${groopId}/itinerary`);
    try {
      const itinerarySnapshot = await getDocs(collection(db, 'groops', groopId, 'itinerary'));
      console.log(`[ITINERARY DEBUG] Success! Got ${itinerarySnapshot.size} items`);
    } catch (error) {
      console.error(`[ITINERARY DEBUG] Failed with error:`, error);
    }
  }
}