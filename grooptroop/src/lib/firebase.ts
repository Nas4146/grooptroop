import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword, 
  GoogleAuthProvider,
  signInWithCredential,
  OAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  EmailAuthProvider,
  User,
  updateProfile,
  initializeAuth,
  getReactNativePersistence 
} from 'firebase/auth';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, doc, setDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import Constants from 'expo-constants';
import { GoogleSignin } from '@react-native-google-signin/google-signin';


// Firebase configuration
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId
};

const GOOGLE_CLIENT_ID = Constants.expoConfig?.extra?.googleClientId;
const GOOGLE_IOS_CLIENT_ID = Constants.expoConfig?.extra?.googleIosClientId;
const GOOGLE_ANDROID_CLIENT_ID = Constants.expoConfig?.extra?.googleAndroidClientId;

console.log('[FIREBASE] Google Auth Config:', {
  clientId: GOOGLE_CLIENT_ID ? 'Set' : 'Missing',
  iosClientId: GOOGLE_IOS_CLIENT_ID ? 'Set' : 'Missing',
  androidClientId: GOOGLE_ANDROID_CLIENT_ID ? 'Set' : 'Missing'
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
export const db = getFirestore(app);

console.log('[GOOGLE_AUTH] Configuring with client IDs:', {
  web: GOOGLE_CLIENT_ID ? 'Set' : 'Missing',
  ios: GOOGLE_IOS_CLIENT_ID ? 'Set' : 'Missing',
  android: GOOGLE_ANDROID_CLIENT_ID ? 'Set' : 'Missing'
});

// Configure Google Sign In with the extracted client IDs
GoogleSignin.configure({
  webClientId: GOOGLE_CLIENT_ID,
  offlineAccess: true,
  iosClientId: GOOGLE_IOS_CLIENT_ID, 
});


// Helper function to create/update a user document
export const createUserDocument = async (user: User, additionalData?: any) => {
  if (!user) return null;
  
  // Check if user document already exists
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  const now = new Date();
  
  if (!userSnap.exists()) {
    // Create new user document
    const userData = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || additionalData?.displayName || `User${Math.floor(Math.random() * 10000)}`,
      photoURL: user.photoURL || '',
      avatarColor: additionalData?.avatarColor || `#${Math.floor(Math.random()*16777215).toString(16)}`,
      createdAt: now,
      lastActive: now,
      isAnonymous: user.isAnonymous,
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

// Sign in anonymously (preserved from Phase 0)
export const signInAnonymousUser = async () => {
  try {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in anonymously:', error);
    throw error;
  }
};

// Email authentication methods
export const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update profile with display name if provided
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
    
    await createUserDocument(userCredential.user, { displayName });
    return userCredential.user;
  } catch (error) {
    console.error('Error signing up with email:', error);
    throw error;
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in with email:', error);
    throw error;
  }
};

export const sendPasswordReset = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    console.error('Error sending password reset:', error);
    throw error;
  }
};

// Google authentication
export const signInWithGoogle = async () => {
  try {
    console.log('[GOOGLE_AUTH] Starting Google sign-in process with native module');
    
    // Check if Play Services are available (Android only)
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices();
    }
    console.log(`[GOOGLE_AUTH] Running on platform: ${Platform.OS}`);
    
    // Sign in with Google
    console.log('[GOOGLE_AUTH] Starting Google sign-in flow');
    const userInfo = await GoogleSignin.signIn();
    console.log('[GOOGLE_AUTH] Google sign-in successful, got user info');
    
    // Get the ID token from the user info
    // In newer versions, it's in userInfo.idToken
    if (!userInfo.idToken) {
      throw new Error('No ID token received from Google');
    }
    
    console.log('[GOOGLE_AUTH] Got ID token, length:', userInfo.idToken.length);
    
    // Create a credential with the token
    const credential = GoogleAuthProvider.credential(userInfo.idToken);
    console.log('[GOOGLE_AUTH] Firebase credential created');
    
    // Sign in with Firebase using the credential
    const userCredential = await signInWithCredential(auth, credential);
    console.log('[GOOGLE_AUTH] Successfully signed in with Firebase');
    
    // Create or update the user document
    await createUserDocument(userCredential.user);
    
    return userCredential.user;
  } catch (error: any) {
    console.error('[GOOGLE_AUTH] Error during Google authentication:', error);
    
    // Provide more detailed error messages based on error type
    if (error.code === 'SIGN_IN_CANCELLED') {
      console.log('[GOOGLE_AUTH] User cancelled the sign-in flow');
      throw new Error('Sign in was cancelled');
    } else if (error.code === 'SIGN_IN_REQUIRED') {
      console.log('[GOOGLE_AUTH] User needs to sign in again');
      throw new Error('Please sign in again');
    } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
      console.log('[GOOGLE_AUTH] Play Services not available or outdated');
      throw new Error('Google Play Services are not available or outdated');
    } else {
      console.log('[GOOGLE_AUTH] Other error:', error.message);
      throw error;
    }
};
}

// Sign out
export const signOut = async () => {
  try {
    await auth.signOut();
    return true;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};