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
import { auth, db, signInWithGoogle } from '../lib/firebase';
import { doc, setDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { EncryptionService } from '../services/EncryptionService';
import { KeyExchangeService } from '../services/KeyExchangeService';
import { NotificationService } from '../services/NotificationService';
import { arrayUnion, serverTimestamp } from 'firebase/firestore';

// Add to your existing UserAvatar type
export type UserAvatar = 
  | { type: 'initial'; value: string; color: string }
  | { type: 'image'; value: string }
  | { type: 'bitmoji'; value: string }
  | { type: 'dicebear'; value: string; style: string; seed: string; params?: Record<string, any> };

// Define our user type to include Firestore profile data
export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  avatarColor: string;
  avatar?: UserAvatar;
  isAnonymous: boolean;
  createdAt: Date;
  lastActive: Date;
  providers?: string[];
  publicKey?: string;
  needsKeyGeneration?: boolean;
  hasCompletedOnboarding?: boolean;
}

// Define the context type
type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  profile: UserProfile | null;
  signInAnonymously: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<User>; // Changed from Promise<void> to Promise<User>
  signInWithApple: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const SKIP_AUTO_LOGIN = false; // Set to false in production

// Create the context with a null default value
const AuthContext = createContext<AuthContextType | null>(null);

// SecureStore key for persisting auth
const AUTH_PERSISTENCE_KEY = 'grooptroop-auth-persistence';

// Helper function to create/update user document in Firestore
export const createUserDocument = async (user: User, additionalData?: any) => {
  if (!user) return null;
  
  // Check if user document already exists
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  const now = new Date();
  
  if (!userSnap.exists()) {
    // Create new user document
    const avatarColor = `#${Math.floor(Math.random()*16777215).toString(16)}`;
    const displayName = user.displayName || additionalData?.displayName || `User${Math.floor(Math.random() * 10000)}`;
    
    const userData = {
      uid: user.uid,
      email: user.email || '',
      displayName,
      photoURL: user.photoURL || '',
      avatarColor,
      avatar: {
        type: 'initial',
        value: displayName.charAt(0).toUpperCase(),
        color: avatarColor
      },
      createdAt: now,
      lastActive: now,
      isAnonymous: user.isAnonymous,
      hasCompletedOnboarding: false, // New users haven't completed onboarding
      // Track auth providers
      providers: user.providerData.map(p => p.providerId) || []
    };
    
    try {
      await setDoc(userRef, userData);
      console.log('User document created');
      return userData;
    } catch (error) {
      console.error('Error creating user document:', error);
      return null;
    }
  } else {
    // Update existing user with latest data
    const userData = userSnap.data();
    const updatedData = {
      lastActive: now,
      // Preserve anonymity status if converting anonymous account
      isAnonymous: userData.isAnonymous && user.isAnonymous,
      // Update display name if provided
      ...(user.displayName && { displayName: user.displayName }),
      // Update photo URL if provided  
      ...(user.photoURL && { photoURL: user.photoURL }),
      // Update email if provided
      ...(user.email && { email: user.email }),
      // Update providers list
      providers: user.providerData.map(p => p.providerId)
    };
    
    try {
      await updateDoc(userRef, updatedData);
      return {
        ...userData,
        ...updatedData
      };
    } catch (error) {
      console.error('Error updating user document:', error);
      return userData;
    }
  }
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
  try {
    console.log('[AUTH] Refreshing user profile');
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        // Convert Timestamps to Dates
        const profile = {
          ...userData,
          createdAt: userData.createdAt instanceof Timestamp ? userData.createdAt.toDate() : new Date(),
          lastActive: userData.lastActive instanceof Timestamp ? userData.lastActive.toDate() : new Date()
        } as UserProfile;
        
        console.log('[AUTH] Profile refreshed successfully');
        setProfile(profile);
        return profile;
      }
    }
    
    console.log('[AUTH] Failed to refresh profile - user not found');
    return null;
  } catch (error) {
    console.error('[AUTH] Error refreshing profile:', error);
    return null;
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
      console.log('[AUTH] Starting Google sign in process');
      setIsLoading(true);
      
      // Use the direct signInWithGoogle function instead of googleAuth.signInWithGoogle
      const user = await signInWithGoogle();
      console.log('[AUTH] Google sign in successful, user:', user ? 'Received' : 'Null');
      
      return user;
    } catch (error) {
      console.error('[AUTH] Error in Google sign in:', error);
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

  // Update the registerPushToken method to handle errors gracefully
  const registerPushToken = async (userId: string) => {
    try {
      console.log(`[AUTH] Registering push token for user: ${userId}`);
      
      let token;
      
      // Get push token
      if (NotificationService && typeof NotificationService.registerForPushNotifications === 'function') {
        token = await NotificationService.registerForPushNotifications();
      } else {
        // Fallback if NotificationService is unavailable
        console.log('[AUTH] NotificationService not available, using development token');
        token = 'DEVELOPMENT-TOKEN';
      }
      
      if (!token) {
        console.log('[AUTH] No push token available');
        return;
      }
      
      console.log('[AUTH] Storing push token in user profile');
      // Update user profile with token
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        pushToken: token,
        tokenUpdatedAt: serverTimestamp()
      });
      
    } catch (error) {
      console.error('[AUTH] Error registering push token:', error);
      // Don't throw the error, just log it to avoid app crashes
    }
  };

  useEffect(() => {
    const setupPushToken = async () => {
      if (profile?.uid) {
        await registerPushToken(profile.uid);
      }
    };
    
    setupPushToken();
  }, [profile?.uid]);
  
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
        setUser(user);
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
      persistAuthState(null);
    }
    
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

// In your AuthProvider or wherever profile data is loaded
const fetchUserProfile = async (uid: string) => {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    const userData = userDoc.data();
    return {
      uid,
      displayName: userData.displayName,
      email: userData.email,
      // Make sure avatar is included here
      avatar: userData.avatar,
      // Other fields...
    };
  }
  return null;
};