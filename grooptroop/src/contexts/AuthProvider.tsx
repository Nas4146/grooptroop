import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  auth, 
  createUserDocument, 
  signInAnonymousUser, 
  signUpWithEmail,
  signInWithEmail,
  sendPasswordReset,
  useGoogleAuth as useFirebaseGoogleAuth,
  signInWithApple,
  signOut as firebaseSignOut
} from '../lib/firebase';

// Define our user type to include Firestore profile data
export type UserProfile = {
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  avatarColor: string;
  isAnonymous: boolean;
  createdAt: Date;
  lastActive: Date;
  providers?: string[];
};

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  // Phase 0 methods (preserved)
  signInAnonymously: () => Promise<void>;
  // Phase 1 methods (new)
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  signInAnonymously: async () => {},
  signUp: async () => {},
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  resetPassword: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

// SecureStore key for persisting auth
const AUTH_PERSISTENCE_KEY = 'grooptroop-auth-persistence';

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  // Google authentication hook
  const { signInWithGoogle: firebaseSignInWithGoogle } = useFirebaseGoogleAuth();

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

  // Sign in anonymously (preserved from Phase 0)
  const signInAnonymously = async () => {
    try {
      setIsLoading(true);
      await signInAnonymousUser();
      // User's auth state will be updated by the onAuthStateChanged listener
    } catch (error) {
      console.error('Error signing in anonymously:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Email sign up
  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      setIsLoading(true);
      await signUpWithEmail(email, password, displayName);
      // User's auth state will be updated by the onAuthStateChanged listener
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Email sign in
  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      await signInWithEmail(email, password);
      // User's auth state will be updated by the onAuthStateChanged listener
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Google sign in
  const handleSignInWithGoogle = async () => {
    try {
      setIsLoading(true);
      await firebaseSignInWithGoogle();
      // User's auth state will be updated by the onAuthStateChanged listener
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Apple sign in
  const handleSignInWithApple = async () => {
    try {
      setIsLoading(true);
      await signInWithApple();
      // User's auth state will be updated by the onAuthStateChanged listener
    } catch (error) {
      console.error('Error signing in with Apple:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Password reset
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordReset(email);
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  };
  
  // Sign out
  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await firebaseSignOut();
      // User's auth state will be updated by the onAuthStateChanged listener
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
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
          setIsAuthenticated(true);
          persistAuthState(authUser.uid);
          
          // Fetch or create user profile
          const userData = await createUserDocument(authUser);
          setProfile(userData as UserProfile);
        } else {
          setUser(null);
          setProfile(null);
          setIsAuthenticated(false);
          persistAuthState(null);
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
    isAuthenticated,
    signInAnonymously, // Preserved from Phase 0
    signUp,
    signIn,
    signInWithGoogle: handleSignInWithGoogle,
    signInWithApple: handleSignInWithApple,
    resetPassword,
    signOut: handleSignOut,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);