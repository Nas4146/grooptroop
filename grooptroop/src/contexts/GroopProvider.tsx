import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { GroopService, Groop } from '../services/GroopService';

interface GroopContextType {
  currentGroop: Groop | null;
  userGroops: Groop[];
  isLoading: boolean;
  error: string | null;
  setCurrentGroop: (groop: Groop | null) => void;
  createNewGroop: (name: string, description?: string, photoURL?: string) => Promise<Groop | null>;
  fetchUserGroops: () => Promise<void>;
  isMember: boolean; // Add this to expose the membership status
}

const GroopContext = createContext<GroopContextType | undefined>(undefined);

export const GroopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [currentGroop, setCurrentGroop] = useState<Groop | null>(null);
  const [userGroops, setUserGroops] = useState<Groop[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Calculate if the current user is a member of the current groop
const isMember = !!currentGroop && !!profile && 
  currentGroop.members.some(memberId => memberId === profile.uid);
  
  // For debugging - you can remove this if not needed
  useEffect(() => {
    if (currentGroop && profile) {
      console.log('[GROOP_CONTEXT] Membership status:', {
        id: currentGroop.id,
        name: currentGroop.name,
        membersCount: currentGroop.members.length,
        isMember: currentGroop.members.some(memberId => memberId === profile.uid)
      });
    }
  }, [currentGroop, profile]);

  // Fetch user's groops when profile changes
  useEffect(() => {
    if (profile) {
      fetchUserGroops();
    }
  }, [profile]);

  // Fetch all groops the user belongs to
  const fetchUserGroops = async () => {
    if (!profile) return;

    try {
      setIsLoading(true);
      setError(null);
      console.log('[GROOP_CONTEXT] Fetching groops for user:', profile.uid);
      
      const groops = await GroopService.getUserGroops(profile.uid);
      setUserGroops(groops);
      
      // If we have groops but no current groop is set, set the first one
      if (groops.length > 0 && !currentGroop) {
        console.log('[GROOP_CONTEXT] Setting first groop as current:', groops[0].name);
        setCurrentGroop(groops[0]);
      }
      
      console.log('[GROOP_CONTEXT] Fetched', groops.length, 'groops');
    } catch (error) {
      console.error('[GROOP_CONTEXT] Error fetching groops:', error);
      setError('Failed to fetch your groops.');
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new groop
  const createNewGroop = async (
    name: string, 
    description?: string, 
    photoURL?: string
  ): Promise<Groop | null> => {
    if (!profile) return null;

    try {
      setIsLoading(true);
      setError(null);
      console.log('[GROOP_CONTEXT] Creating new groop:', name);
      
      const groopId = await GroopService.createGroop(
        name, 
        profile.uid, 
        description, 
        photoURL
      );
      
      // Fetch the newly created groop
      const newGroop = await GroopService.getGroop(groopId);
      
      if (newGroop) {
        // Add to user's groops list and set as current
        setUserGroops(prev => [...prev, newGroop]);
        setCurrentGroop(newGroop);
        console.log('[GROOP_CONTEXT] New groop created and set as current');
      }
      
      return newGroop;
    } catch (error) {
      console.error('[GROOP_CONTEXT] Error creating groop:', error);
      setError('Failed to create a new groop.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GroopContext.Provider 
      value={{ 
        currentGroop, 
        userGroops, 
        isLoading, 
        error,
        setCurrentGroop, 
        createNewGroop, 
        fetchUserGroops,
        isMember  // Expose the membership status
      }}
    >
      {children}
    </GroopContext.Provider>
  );
};

// Custom hook to use the groop context
export const useGroop = () => {
  const context = useContext(GroopContext);
  if (context === undefined) {
    throw new Error('useGroop must be used within a GroopProvider');
  }
  return context;
};