import { 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    arrayUnion, 
    arrayRemove, 
    updateDoc, 
    Timestamp,
    serverTimestamp 
  } from 'firebase/firestore';
  import { db } from '../lib/firebase';
  import { UserProfile } from '../contexts/AuthProvider';
  
  // Define our Groop type
  export interface Groop {
    id: string;
    name: string;
    description?: string;
    photoURL?: string;
    location?: string;
    address?: string;
    airbnbUrl?: string;
    mapUrl?: string;
    startDate?: Date;
    endDate?: Date;
    dateRange?: string;
    accommodationCost?: number;
    totalTripCost?: number;
    createdAt: Date;
    createdBy: string;
    members: string[];
    organizers: string[];
  }
  
  export class GroopService {
    // Create a new groop
    static async createGroop(
      name: string, 
      userId: string, 
      description?: string,
      photoURL?: string
    ): Promise<string> {
      try {
        console.log('[GROOP] Creating new groop:', name);
        
        // Create a new document with auto-generated ID
        const groopRef = doc(collection(db, 'groops'));
        const groopId = groopRef.id;
        
        // Set the groop data
        await setDoc(groopRef, {
          name,
          description: description || '',
          photoURL: photoURL || '',
          createdAt: serverTimestamp(),
          createdBy: userId,
          members: [userId],
          organizers: [userId]
        });
        
        // Add this groop to the user's groops
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          groops: arrayUnion(groopId)
        });
        
        console.log('[GROOP] Successfully created groop with ID:', groopId);
        return groopId;
      } catch (error) {
        console.error('[GROOP] Error creating groop:', error);
        throw error;
      }
    }
    
    // Get a specific groop by ID
    static async getGroop(groopId: string): Promise<Groop | null> {
      try {
        console.log('[GROOP] Fetching groop with ID:', groopId);
        const groopRef = doc(db, 'groops', groopId);
        const groopSnap = await getDoc(groopRef);
        
        if (groopSnap.exists()) {
          const groopData = groopSnap.data();
          console.log('[GROOP] Found groop:', groopData.name);
          
          return {
            id: groopSnap.id,
            name: groopData.name,
            description: groopData.description,
            photoURL: groopData.photoURL,
            location: groopData.location,
            address: groopData.address,
            airbnbUrl: groopData.airbnbUrl,
            mapUrl: groopData.mapUrl,
            startDate: groopData.startDate?.toDate(),
            endDate: groopData.endDate?.toDate(),
            dateRange: groopData.dateRange,
            accommodationCost: groopData.accommodationCost,
            totalTripCost: groopData.totalTripCost,
            createdAt: groopData.createdAt?.toDate(),
            createdBy: groopData.createdBy,
            members: groopData.members || [],
            organizers: groopData.organizers || []
          };
        }
        
        console.log('[GROOP] No groop found with ID:', groopId);
        return null;
      } catch (error) {
        console.error('[GROOP] Error fetching groop:', error);
        throw error;
      }
    }
    
    // Get all groops for a user
    static async getUserGroops(userId: string): Promise<Groop[]> {
      try {
        console.log('[GROOP] Fetching groops for user:', userId);
        
        // Get user document to check groops array
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          console.log('[GROOP] User document found, groops array:', userDoc.data().groops);
        } else {
          console.log('[GROOP] User document not found!');
        }
        
        // Original query
        const q = query(collection(db, 'groops'), where('members', 'array-contains', userId));
        const querySnapshot = await getDocs(q);
        
        console.log('[GROOP] Query returned', querySnapshot.docs.length, 'documents');
        
        const groops: Groop[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          groops.push({
            id: doc.id,
            name: data.name,
            description: data.description,
            photoURL: data.photoURL,
            location: data.location,
            address: data.address,
            airbnbUrl: data.airbnbUrl,
            mapUrl: data.mapUrl,
            startDate: data.startDate?.toDate(),
            endDate: data.endDate?.toDate(),
            dateRange: data.dateRange,
            accommodationCost: data.accommodationCost,
            totalTripCost: data.totalTripCost,
            createdAt: data.createdAt?.toDate(),
            createdBy: data.createdBy,
            members: data.members || [],
            organizers: data.organizers || []
          });
        });
        
        console.log('[GROOP] Found', groops.length, 'groops for user');
        return groops;
      } catch (error) {
        console.error('[GROOP] Error fetching user groops:', error);
        throw error;
      }
    }
    
    // Add a member to a groop
    static async addMember(groopId: string, userId: string): Promise<void> {
      try {
        console.log('[GROOP] Adding user', userId, 'to groop', groopId);
        
        // Add user to groop members
        const groopRef = doc(db, 'groops', groopId);
        await updateDoc(groopRef, {
          members: arrayUnion(userId)
        });
        
        // Add groop to user's groops
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          groops: arrayUnion(groopId)
        });
        
        console.log('[GROOP] Successfully added member to groop');
      } catch (error) {
        console.error('[GROOP] Error adding member to groop:', error);
        throw error;
      }
    }
    
    // Remove a member from a groop
    static async removeMember(groopId: string, userId: string): Promise<void> {
      try {
        console.log('[GROOP] Removing user', userId, 'from groop', groopId);
        
        // Remove user from groop members
        const groopRef = doc(db, 'groops', groopId);
        await updateDoc(groopRef, {
          members: arrayRemove(userId),
          // Also remove from organizers if they are one
          organizers: arrayRemove(userId)
        });
        
        // Remove groop from user's groops
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          groops: arrayRemove(groopId)
        });
        
        console.log('[GROOP] Successfully removed member from groop');
      } catch (error) {
        console.error('[GROOP] Error removing member from groop:', error);
        throw error;
      }
    }
    
    // Check if a user is a member of a specific groop
    static async isMember(groopId: string, userId: string): Promise<boolean> {
      try {
        console.log('[GROOP] Checking if user', userId, 'is member of groop', groopId);
        
        const groopRef = doc(db, 'groops', groopId);
        const groopSnap = await getDoc(groopRef);
        
        if (groopSnap.exists()) {
          const members = groopSnap.data().members || [];
          const isMember = members.includes(userId);
          console.log('[GROOP] User is member:', isMember);
          return isMember;
        }
        
        console.log('[GROOP] Groop not found, user is not a member');
        return false;
      } catch (error) {
        console.error('[GROOP] Error checking membership:', error);
        throw error;
      }
    }
  }