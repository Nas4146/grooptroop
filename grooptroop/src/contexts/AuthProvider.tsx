import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  signInAnonymously as firebaseSignInAnonymously,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { useGoogleAuth, signInWithApple } from '../lib/firebase';

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

// Define the context type
type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  profile: UserProfile | null;
  signInAnonymously: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const SKIP_AUTO_LOGIN = true; // Set to false in production

// Create the context with a null default value
const AuthContext = createContext<AuthContextType | null>(null);

// SecureStore key for persisting auth
const AUTH_PERSISTENCE_KEY = 'grooptroop-auth-persistence';

// Helper function to create/update user document in Firestore
const createUserDocument = async (user: User): Promise<UserProfile> => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  const userData = {
    uid: user.uid,
    displayName: user.displayName || 'User',
    email: user.email,
    photoURL: user.photoURL,
    avatarColor: userSnap.exists() ? userSnap.data().avatarColor : getRandomColor(),
    isAnonymous: user.isAnonymous,
    createdAt: userSnap.exists() ? userSnap.data().createdAt : Timestamp.now(),
    lastActive: Timestamp.now(),
    providers: user.providerData.map(provider => provider.providerId)
  };

  await setDoc(userRef, userData, { merge: true });
   // Convert Timestamps to Dates for our app's use
   return {
    ...userData,
    createdAt: userData.createdAt instanceof Timestamp ? 
               userData.createdAt.toDate() : 
               new Date(),
    lastActive: userData.lastActive instanceof Timestamp ? 
                userData.lastActive.toDate() : 
                new Date()
  } as UserProfile;
};

// Helper function for random avatar color
const getRandomColor = () => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFBE0B', '#FB5607', '#8338EC', '#3A86FF'];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Create the provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Google authentication hook - moved inside the component body
  const googleAuth = useGoogleAuth();

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
  const signInAnonymously = async () => {
    try {
      setIsLoading(true);
      await firebaseSignInAnonymously(auth);
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name if provided
      if (displayName && userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName
        });
      }
      
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
      console.log('[AUTH] Attempting email sign in for:', email);
      setIsLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('[AUTH] Email sign in successful, user:', userCredential.user.uid);
      return userCredential.user;
    } catch (error: any) {
      console.error('[AUTH] Email sign in failed:', error.code, error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Google sign in
  const handleSignInWithGoogle = async () => {
    try {
      setIsLoading(true);
      await googleAuth.signInWithGoogle();
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
  const handleResetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };
  
  // Sign out
  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await firebaseSignOut(auth);
      // User's auth state will be updated by the onAuthStateChanged listener
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('[AUTH] Setting up auth state listener');
    
    return onAuthStateChanged(auth, async (user) => {
      console.log('[AUTH] Auth state changed, user:', user ? `${user.uid} (${user.isAnonymous ? 'anonymous' : 'authenticated'})` : 'null');
      
          // Skip auto-login for anonymous users during development
    if (user && user.isAnonymous && SKIP_AUTO_LOGIN) {
      console.log('[AUTH] Skipping auto-login for anonymous user during development');
      await auth.signOut();
      return;
    }
      if (user) {
        try {
          console.log('[AUTH] Fetching user profile');
          const userData = await createUserDocument(user);
          console.log('[AUTH] User profile loaded:', userData ? 'success' : 'failed');
          setProfile(userData as UserProfile);
          setIsAuthenticated(true);
          
          // Persist auth state
          persistAuthState(user.uid);
        } catch (error) {
          console.error('[AUTH] Error processing authenticated user:', error);
          setIsAuthenticated(false);
          setProfile(null);
        }
      } else {
        console.log('[AUTH] User is signed out');
        setIsAuthenticated(false);
        setUser(null);
        setProfile(null);
        
        // Clear persisted auth state
        persistAuthState(null);      }
      
      setIsLoading(false);
    });
  }, []);

  const value = {
    isAuthenticated,
    isLoading,
    user,
    profile,
    signInAnonymously,
    signIn,
    signUp,
    signInWithGoogle: handleSignInWithGoogle,
    signInWithApple: handleSignInWithApple,
    resetPassword: handleResetPassword,
    signOut: handleSignOut,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Create and export the hook to use this context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};