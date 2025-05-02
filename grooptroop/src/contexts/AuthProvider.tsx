import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, createUserDocument, signInAnonymousUser } from '../lib/firebase';

// Define our user type to include Firestore profile data
type UserProfile = {
  uid: string;
  displayName: string;
  avatarColor: string;
  isAnonymous: boolean;
  createdAt: Date;
  lastActive: Date;
};

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  signIn: async () => {},
  refreshProfile: async () => {},
});

// SecureStore key for persisting auth
const AUTH_PERSISTENCE_KEY = 'grooptroop-auth-persistence';

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Handle auth persistence using SecureStore
  const persistAuthState = async (uid: string | null) => {
    try {
      if (uid) {
        await SecureStore.setItemAsync(AUTH_PERSISTENCE_KEY, uid);
      } else {
        await SecureStore.deleteItemAsync(AUTH_PERSISTENCE_KEY);
      }
    } catch (error) {
      console.error('Error persisting auth state:', error);
    }
  };

  // Fetch user profile document from Firestore
  const refreshProfile = async () => {
    if (user) {
      const userData = await createUserDocument(user);
      setProfile(userData as UserProfile);
    }
  };

  // Sign in anonymously
  const signIn = async () => {
    try {
      setIsLoading(true);
      const user = await signInAnonymousUser();
      // User's auth state will be updated by the onAuthStateChanged listener
      console.log('Anonymous sign-in successful');
    } catch (error) {
      console.error('Error signing in:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      
      // Check if user was previously signed in
      const persistedUid = await SecureStore.getItemAsync(AUTH_PERSISTENCE_KEY);
      
      // Set up auth state listener
      const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
        if (authUser) {
          setUser(authUser);
          persistAuthState(authUser.uid);
          
          // Fetch or create user profile
          const userData = await createUserDocument(authUser);
          setProfile(userData as UserProfile);
        } else {
          setUser(null);
          setProfile(null);
          persistAuthState(null);
          
          // If we had a persisted user but now auth returns null,
          // attempt to sign in again anonymously
          if (persistedUid) {
            signIn();
          } else {
            // First app launch - sign in anonymously
            signIn();
          }
        }
        setIsLoading(false);
      });
      
      // Cleanup subscription
      return () => unsubscribe();
    };
    
    initialize();
  }, []);

  const value = {
    user,
    profile,
    isLoading,
    signIn,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);