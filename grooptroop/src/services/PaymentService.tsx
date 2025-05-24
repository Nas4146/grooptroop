import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  setDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PaymentStatus,
  PaymentMethod,
  PaymentType,
  PaymentError,
  PaymentResponse,
  Payment,
  PaymentItem,
  PaymentSummary
} from '../models/payments';
import { EventData } from '../models/payments';

export class PaymentService {
  // Get all payment items for a user (combines events and accommodations with payment status)
  static async getPaymentItems(groopId: string, userId: string): Promise<PaymentItem[]> {
    console.log(`[PAYMENT_SERVICE] Getting payment items for user ${userId} in groop ${groopId}`);
    
    try {
      // First, get all completed payments by this user to determine what's paid
      const paymentsQuery = query(
        collection(db, 'groops', groopId, 'payments'),
        where('userId', '==', userId),
        where('status', '==', 'completed')
      );
      
      const paymentsSnapshot = await getDocs(paymentsQuery);
      
      // Create sets for quick lookup of paid items
      const paidEventIds = new Set<string>();
      let accommodationPaid = false;
      
      paymentsSnapshot.forEach(doc => {
        const payment = doc.data();
        if (payment.eventId) {
          paidEventIds.add(payment.eventId);
        } else if (payment.type === 'accommodation') {
          accommodationPaid = true;
        }
      });
      
      console.log(`[PAYMENT_SERVICE] Found ${paidEventIds.size} paid events, accommodation paid: ${accommodationPaid}`);
      
      // Get all events that require payment (regardless of paid status)
      const eventsSnapshot = await this.getPayableEvents(groopId);
      
      const paymentItems: PaymentItem[] = [];
      
      // Add all events with payment requirements to payment items
      eventsSnapshot.forEach(eventDoc => {
        const event = { 
          ...eventDoc.data(),
          id: eventDoc.id 
        } as EventData;
        
        if (event.isPaymentRequired && event.costPerPerson) {
          // Check if this event has been paid by looking it up in the set
          const isPaid = paidEventIds.has(eventDoc.id);
          
          console.log(`[PAYMENT_SERVICE] Processing event: ${event.title}, type: ${event.type}`);
          
          // Add to payment items
          paymentItems.push({
            id: eventDoc.id,
            title: event.title || 'Unnamed Event',
            description: event.description || '',
            amountDue: parseFloat(event.costPerPerson.toString()),
            totalCost: event.totalCost ? parseFloat(event.totalCost.toString()) : undefined,
            isPaid: isPaid,
            date: event.date,
            // Ensure we properly set the item type based on the event type
            type: event.type === 'accommodation' ? 'accommodation' : 'event',
            eventType: this.validateEventType(event.type),            
            optional: !!event.isOptional
          });
        }
      });
      
      // Get accommodation info if any
      const groopDoc = await getDoc(doc(db, 'groops', groopId));
      const groopData = groopDoc.data();
      
      if (groopData?.accommodation?.costPerPerson) {
        paymentItems.push({
          id: 'accommodation',
          title: 'Accommodation',
          description: groopData.accommodation.description || 'Stay',
          amountDue: parseFloat(groopData.accommodation.costPerPerson),
          totalCost: groopData.accommodation.totalCost ? parseFloat(groopData.accommodation.totalCost) : undefined,
          isPaid: accommodationPaid,
          type: 'accommodation'
        });
      }
      
      console.log(`[PAYMENT_SERVICE] Returning ${paymentItems.length} payment items (${paymentItems.filter(i => i.isPaid).length} paid)`);
      return paymentItems;
    } catch (error) {
      console.error('[PAYMENT_SERVICE] Error getting payment items:', error);
      return [];
    }
  }

  // Add this helper method to your PaymentService class:
// Helper to validate event type
private static validateEventType(type: string | undefined): 'party' | 'food' | 'activity' | 'other' | undefined {
  if (!type) return undefined;
  
  // Check if the type is one of our valid types
  if (['party', 'food', 'activity', 'other'].includes(type)) {
    return type as 'party' | 'food' | 'activity' | 'other';
  }
  
  // If type is 'accommodation', we'll still render that differently via the 'type' field
  // so we can return 'other' for the eventType to satisfy TypeScript
  if (type === 'accommodation') {
    return 'other';
  }
  
  // Default to 'other' for any unrecognized type
  return 'other';
}

  // Get all payments made by a specific user
  static async getUserPayments(groopId: string, userId: string): Promise<Payment[]> {
    console.log(`[PAYMENT_SERVICE] Getting payments for user ${userId} in groop ${groopId}`);
    
    try {
      const paymentsRef = collection(db, 'groops', groopId, 'payments');
      const q = query(
        paymentsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const payments: Payment[] = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        payments.push({
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          groopId: data.groopId,
          type: data.type,
          eventId: data.eventId,
          amount: data.amount,
          description: data.description,
          status: data.status,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          method: data.method,
          paymentProof: data.paymentProof,
          notes: data.notes
        });
      });
      
      console.log(`[PAYMENT_SERVICE] Found ${payments.length} payments`);
      return payments;
    } catch (error) {
      console.error('[PAYMENT_SERVICE] Error getting user payments:', error);
      throw error;
    }
  }

  // Get events that require payment
  static async getPayableEvents(groopId: string): Promise<QueryDocumentSnapshot<DocumentData>[]> {
    console.log(`[PAYMENT_SERVICE] Getting payable events for groop ${groopId}`);
    
    try {
      // First get all days
      const daysRef = collection(db, 'groops', groopId, 'itinerary');
      const daysSnapshot = await getDocs(daysRef);
      
      const events: QueryDocumentSnapshot<DocumentData>[] = [];
      
      // For each day, get its events
      const dayPromises = daysSnapshot.docs.map(async (dayDoc) => {
        const eventsRef = collection(db, 'groops', groopId, 'itinerary', dayDoc.id, 'events');
        const eventsQuery = query(eventsRef, where('isPaymentRequired', '==', true));
        const eventsSnapshot = await getDocs(eventsQuery);
        
        eventsSnapshot.forEach(eventDoc => {
          events.push(eventDoc);
        });
      });
      
      await Promise.all(dayPromises);
      console.log(`[PAYMENT_SERVICE] Found ${events.length} payable events`);
      return events;
    } catch (error) {
      console.error('[PAYMENT_SERVICE] Error getting payable events:', error);
      throw error;
    }
  }

  // Get payment summary for a user (total owed, total paid, remaining)
  static async getUserPaymentSummary(groopId: string, userId: string): Promise<PaymentSummary> {
    console.log(`[PAYMENT_SERVICE] Getting payment summary for user ${userId} in groop ${groopId}`);
    
    try {
      const items = await this.getPaymentItems(groopId, userId);
      
      const totalOwed = items.reduce((sum, item) => sum + item.amountDue, 0);
      const totalPaid = items.reduce((sum, item) => sum + (item.isPaid ? item.amountDue : 0), 0);
      const remaining = totalOwed - totalPaid;
      
      console.log(`[PAYMENT_SERVICE] Payment summary: Total: $${totalOwed}, Paid: $${totalPaid}, Remaining: $${remaining}`);
      
      return {
        totalOwed,
        totalPaid,
        remaining
      };
    } catch (error) {
      console.error('[PAYMENT_SERVICE] Error getting user payment summary:', error);
      throw error;
    }
  }

  // Save active payment information to handle app switches
  static async saveActivePaymentInfo(paymentId: string, groopId: string): Promise<void> {
    try {
      await AsyncStorage.setItem('activePayment', JSON.stringify({
        paymentId,
        groopId,
        timestamp: new Date().toISOString()
      }));
      console.log(`[PAYMENT_SERVICE] Saved active payment info: ${paymentId}`);
    } catch (error) {
      console.error('[PAYMENT_SERVICE] Error saving active payment info:', error);
    }
  }

  // Get active payment information
  static async getActivePaymentInfo(): Promise<{paymentId: string, groopId: string} | null> {
    try {
      const info = await AsyncStorage.getItem('activePayment');
      if (!info) return null;
      
      const data = JSON.parse(info);
      
      // Check if payment info is recent (within last hour)
      const timestamp = new Date(data.timestamp);
      const now = new Date();
      if (now.getTime() - timestamp.getTime() > 60 * 60 * 1000) {
        // Payment is too old, clear it
        await AsyncStorage.removeItem('activePayment');
        return null;
      }
      
      return {
        paymentId: data.paymentId,
        groopId: data.groopId
      };
    } catch (error) {
      console.error('[PAYMENT_SERVICE] Error getting active payment info:', error);
      return null;
    }
  }

  // Clear active payment information
  static async clearActivePaymentInfo(): Promise<void> {
    try {
      await AsyncStorage.removeItem('activePayment');
      console.log('[PAYMENT_SERVICE] Cleared active payment info');
    } catch (error) {
      console.error('[PAYMENT_SERVICE] Error clearing active payment info:', error);
    }
  }

  // Initiate Venmo payment
  static async initiateVenmoPayment(
    groopId: string,
    eventId: string | undefined,
    amount: number,
    description: string,
    userId: string,
    userName: string
  ): Promise<PaymentResponse> {
    console.log(`[PAYMENT_SERVICE] Initiating Venmo payment of $${amount} for user ${userId}`);
    
    try {
      // First, check if the groop has a Venmo recipient set up
      const groopDoc = await getDoc(doc(db, 'groops', groopId));
      const groopData = groopDoc.data();
      
      if (!groopData?.paymentSettings?.venmoUsername) {
        console.error('[PAYMENT_SERVICE] No Venmo username configured for this groop');
        return { 
          success: false, 
          error: 'No Venmo account is set up for this trip. Please contact the organizer.',
          errorDetail: {
            code: 'no_venmo_username',
            message: 'No Venmo username configured for this group'
          }
        };
      }
      
      const venmoUsername = groopData.paymentSettings.venmoUsername;
      
      // Create a pending payment record
      const paymentData = {
        userId,
        userName,
        groopId,
        type: eventId ? 'event' : 'accommodation',
        eventId: eventId || null,
        amount,
        description,
        status: 'pending' as PaymentStatus,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        method: 'venmo' as PaymentMethod
      };
      
      // Add to Firestore first so we have a record even if the deep link fails
      const paymentRef = await addDoc(
        collection(db, 'groops', groopId, 'payments'),
        paymentData
      );
      
      console.log(`[PAYMENT_SERVICE] Created pending payment with ID: ${paymentRef.id}`);
      
      // Format amount with exactly 2 decimal places
      const formattedAmount = amount.toFixed(2);
      
      // Save active payment info to handle app switches
      await this.saveActivePaymentInfo(paymentRef.id, groopId);
      
      // Generate the Venmo deep link URL with proper return URL
      // The return_url parameter allows the app to come back to GroopTroop after payment
      const returnUrl = 'grooptroop://payment';
      const venmoUrl = `venmo://paycharge?txn=pay&recipients=${venmoUsername}&amount=${formattedAmount}&note=${encodeURIComponent(description)}&return_url=${encodeURIComponent(returnUrl)}`;
      
      console.log(`[PAYMENT_SERVICE] Opening Venmo with URL: ${venmoUrl}`);
      
      // Check if Venmo is installed and can be opened
      try {
        const canOpen = await Linking.canOpenURL(venmoUrl);
        
        if (!canOpen) {
          console.log('[PAYMENT_SERVICE] Venmo app is not installed or cannot be opened');
          
          // Update payment status
          await updateDoc(doc(db, 'groops', groopId, 'payments', paymentRef.id), {
            status: 'failed',
            notes: 'Venmo app is not installed or cannot be opened',
            updatedAt: Timestamp.now()
          });
          
          // Clear active payment
          await this.clearActivePaymentInfo();
          
          return { 
            success: false, 
            error: 'Venmo app is not installed or not configured properly. Please install Venmo or check app permissions.',
            errorDetail: {
              code: 'venmo_not_installed',
              message: 'Venmo app is not installed or cannot be opened'
            }
          };
        }
        
        // Open Venmo
        await Linking.openURL(venmoUrl);
        
        // Return success with the payment ID for later confirmation
        return { 
          success: true, 
          paymentId: paymentRef.id
        };
      } catch (error) {
        console.error('[PAYMENT_SERVICE] Error opening Venmo:', error);
        
        // Update payment status
        await updateDoc(doc(db, 'groops', groopId, 'payments', paymentRef.id), {
          status: 'failed',
          notes: `Error opening Venmo: ${error instanceof Error ? error.message : String(error)}`,
          updatedAt: Timestamp.now()
        });
        
        // Clear active payment
        await this.clearActivePaymentInfo();
        
        // Provide more specific error message for iOS permissions issue
        let errorMessage = 'Failed to open Venmo. Please try again.';
        const errorString = String(error);
        
        if (errorString.includes('LSApplicationQueriesSchemes') && Platform.OS === 'ios') {
          errorMessage = 'This app needs to be configured to open Venmo. Please contact support.';
        } else if (errorString.includes('Activity not found') && Platform.OS === 'android') {
          errorMessage = 'Venmo app is not installed on your device. Please install Venmo first.';
        }
        
        return { 
          success: false, 
          error: errorMessage,
          errorDetail: {
            code: 'venmo_open_failed',
            message: error instanceof Error ? error.message : String(error)
          }
        };
      }
    } catch (error) {
      console.error('[PAYMENT_SERVICE] Error initiating Venmo payment:', error);
      return { 
        success: false, 
        error: 'Failed to initiate payment. Please try again.',
        errorDetail: {
          code: 'payment_initiation_failed',
          message: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  // Confirm a pending payment
  static async confirmPayment(paymentId: string, groopId: string): Promise<boolean> {
    console.log(`[PAYMENT_SERVICE] Confirming payment ${paymentId}`);
    
    try {
      // Get payment info first to validate it exists and is pending
      const paymentDocRef = doc(db, 'groops', groopId, 'payments', paymentId);
      const paymentDoc = await getDoc(paymentDocRef);
      
      if (!paymentDoc.exists()) {
        console.error(`[PAYMENT_SERVICE] Payment ${paymentId} does not exist`);
        return false;
      }
      
      const paymentData = paymentDoc.data();
      if (paymentData.status !== 'pending') {
        console.log(`[PAYMENT_SERVICE] Payment ${paymentId} is already in status: ${paymentData.status}`);
        // If it's already completed, just return true
        return paymentData.status === 'completed';
      }
      
      // Update the payment status in Firestore
      await updateDoc(paymentDocRef, {
        status: 'completed',
        updatedAt: Timestamp.now()
      });
      
      // Clear active payment
      await this.clearActivePaymentInfo();
      
      console.log(`[PAYMENT_SERVICE] Payment ${paymentId} confirmed successfully`);
      return true;
    } catch (error) {
      console.error('[PAYMENT_SERVICE] Error confirming payment:', error);
      return false;
    }
  }

  // Cancel a pending payment
  static async cancelPayment(paymentId: string, groopId: string): Promise<boolean> {
    console.log(`[PAYMENT_SERVICE] Cancelling payment ${paymentId}`);
    
    try {
      // Get payment info first to validate it exists
      const paymentDocRef = doc(db, 'groops', groopId, 'payments', paymentId);
      const paymentDoc = await getDoc(paymentDocRef);
      
      if (!paymentDoc.exists()) {
        console.error(`[PAYMENT_SERVICE] Payment ${paymentId} does not exist`);
        return false;
      }
      
      // Update the payment status in Firestore
      await updateDoc(paymentDocRef, {
        status: 'failed',
        updatedAt: Timestamp.now(),
        notes: 'Cancelled by user'
      });
      
      // Clear active payment
      await this.clearActivePaymentInfo();
      
      console.log(`[PAYMENT_SERVICE] Payment ${paymentId} cancelled successfully`);
      return true;
    } catch (error) {
      console.error('[PAYMENT_SERVICE] Error cancelling payment:', error);
      return false;
    }
  }

  // Handle deep linking from Venmo back to our app
  static async handlePaymentDeepLink(url: string): Promise<{handled: boolean, paymentId?: string, groopId?: string}> {
    console.log(`[PAYMENT_SERVICE] Handling deep link: ${url}`);
    
    // Check if this is a payment return URL
    if (!url.includes('grooptroop://payment')) {
      return { handled: false };
    }
    
    // Retrieve active payment info
    const activePayment = await this.getActivePaymentInfo();
    if (!activePayment) {
      console.log('[PAYMENT_SERVICE] No active payment found for this deep link');
      return { handled: true };
    }
    
    console.log(`[PAYMENT_SERVICE] Found active payment: ${activePayment.paymentId}`);
    
    return {
      handled: true,
      paymentId: activePayment.paymentId,
      groopId: activePayment.groopId
    };
  }

  // Check if a specific event is paid by a user
  static async isEventPaid(groopId: string, userId: string, eventId: string): Promise<boolean> {
    console.log(`[PAYMENT_SERVICE] Checking if event ${eventId} is paid by user ${userId}`);
    
    try {
      const paymentsRef = collection(db, 'groops', groopId, 'payments');
      const q = query(
        paymentsRef,
        where('userId', '==', userId),
        where('eventId', '==', eventId),
        where('status', '==', 'completed')
      );
      
      const querySnapshot = await getDocs(q);
      const isPaid = !querySnapshot.empty;
      
      console.log(`[PAYMENT_SERVICE] Event ${eventId} paid status: ${isPaid}`);
      return isPaid;
    } catch (error) {
      console.error(`[PAYMENT_SERVICE] Error checking event payment status:`, error);
      return false;
    }
  }

  // Add this static method to your PaymentService class:

  static clearPaymentStatusCache() {
    // This method clears any cached payment data to ensure fresh fetch
    console.log('[PAYMENT_SERVICE] Clearing payment status cache');
    // If you implement actual caching later, clear it here
  }

  // Create a direct payment (already paid outside the app)
static async createDirectPayment(
  groopId: string,
  eventId: string | undefined,
  amount: number,
  description: string,
  userId: string,
  userName: string
): Promise<PaymentResponse> {
  console.log(`[PAYMENT_SERVICE] Creating direct payment record of $${amount} for user ${userId}`);
  
  try {
    // Create a payment record
    const paymentData = {
      userId,
      userName,
      groopId,
      type: eventId ? 'event' as PaymentType : 'accommodation' as PaymentType,
      eventId: eventId || null,
      amount,
      description,
      status: 'pending' as PaymentStatus, // Start as pending, will be confirmed right after
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      method: 'venmo' as PaymentMethod, // Default to Venmo for now
      notes: 'User reported payment was already made outside the app'
    };
    
    
    // Add to Firestore
    const paymentRef = await addDoc(
      collection(db, 'groops', groopId, 'payments'),
      paymentData
    );
    
    console.log(`[PAYMENT_SERVICE] Created direct payment with ID: ${paymentRef.id}`);
    
    return {
      success: true,
      paymentId: paymentRef.id
    };
  } catch (error) {
    console.error('[PAYMENT_SERVICE] Error creating direct payment:', error);
    return {
      success: false,
      error: 'Failed to record your payment. Please try again.',
      errorDetail: {
        code: 'direct_payment_failed',
        message: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

  // Add a batch payment status check method
  static async batchCheckEventPaymentStatus(
    groopId: string, 
    userId: string, 
    eventIds: string[]
  ): Promise<Record<string, boolean>> {
    try {
      console.log(`[PAYMENT_SERVICE] Batch checking payment status for ${eventIds.length} events`);
      
      // Get all payment records for this user in one query
      const paymentsRef = collection(db, `groops/${groopId}/payments`);
      const q = query(
        paymentsRef,
        where('userId', '==', userId),
        where('eventId', 'in', eventIds.slice(0, 10)) // Firestore 'in' limit is 10
      );
      
      const snapshot = await getDocs(q);
      const paidEvents: Record<string, boolean> = {};
      
      // Initialize all as unpaid
      eventIds.forEach(id => paidEvents[id] = false);
      
      // Mark paid events
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.eventId && data.status === 'completed') {
          paidEvents[data.eventId] = true;
        }
      });
      
      console.log(`[PAYMENT_SERVICE] Batch check complete: ${Object.values(paidEvents).filter(Boolean).length}/${eventIds.length} paid`);
      return paidEvents;
    } catch (error) {
      console.error('[PAYMENT_SERVICE] Error in batch payment check:', error);
      // Return all false if error
      const result: Record<string, boolean> = {};
      eventIds.forEach(id => result[id] = false);
      return result;
    }
  }
}