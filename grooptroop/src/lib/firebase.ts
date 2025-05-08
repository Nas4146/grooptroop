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
    console.log('[GOOGLE_AUTH] Full response:', JSON.stringify(userInfo, null, 2));
    
    if (userInfo.type === 'success' && userInfo.data) {
      console.log('[GOOGLE_AUTH] Detected Expo-specific response structure');
      // Log the data structure to understand what's inside
      console.log('[GOOGLE_AUTH] Data structure:', Object.keys(userInfo.data).join(', '));
      
      // Try to find tokens in the data object
      if (userInfo.data.idToken) {
        console.log('[GOOGLE_AUTH] Found ID token in userInfo.data');
        const idToken = userInfo.data.idToken;
        console.log('[GOOGLE_AUTH] Got ID token, length:', idToken.length);
        
        // Create a credential with the token
        const credential = GoogleAuthProvider.credential(idToken);
        console.log('[GOOGLE_AUTH] Firebase credential created');
        
        // Sign in with Firebase using the credential
        const userCredential = await signInWithCredential(auth, credential);
        console.log('[GOOGLE_AUTH] Successfully signed in with Firebase');
        
        // Create or update the user document
        await createUserDocument(userCredential.user);
        
        return userCredential.user;
      } else if (userInfo.data.auth && userInfo.data.auth.idToken) {
        // Try another possible location
        console.log('[GOOGLE_AUTH] Found ID token in userInfo.data.auth');
        const idToken = userInfo.data.auth.idToken;
        // Proceed with the token...
        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        await createUserDocument(userCredential.user);
        return userCredential.user;
      } else {
        // If there's no idToken but we have an access token
        if (userInfo.data.accessToken) {
          console.log('[GOOGLE_AUTH] Using accessToken instead of idToken');
          const credential = GoogleAuthProvider.credential(null, userInfo.data.accessToken);
          const userCredential = await signInWithCredential(auth, credential);
          await createUserDocument(userCredential.user);
          return userCredential.user;
        }
      }
    }
    
    // Fall back to your existing flow if the above doesn't work
    // Get the ID token from the user info
    let idToken = null;

    // Check all possible locations where the ID token might be
    if (userInfo.idToken) {
      console.log('[GOOGLE_AUTH] Found ID token directly in userInfo');
      idToken = userInfo.idToken;
    } else if (userInfo.user?.idToken) {
      console.log('[GOOGLE_AUTH] Found ID token in userInfo.user');
      idToken = userInfo.user.idToken;
    } else if (userInfo.serverAuthCode) {
      console.log('[GOOGLE_AUTH] Got serverAuthCode, need to exchange for tokens');
      throw new Error('Server auth code flow not implemented');
    } else {
      // Add more detailed logging to see what we're actually receiving
      console.log('[GOOGLE_AUTH] Response structure:', 
        Object.keys(userInfo).join(', '));
      
      // If we have an auth object or authentication object, log its structure
      if (userInfo.auth) {
        console.log('[GOOGLE_AUTH] Auth object keys:', Object.keys(userInfo.auth).join(', '));
      }
      if (userInfo.authentication) {
        console.log('[GOOGLE_AUTH] Authentication object keys:', 
          Object.keys(userInfo.authentication).join(', '));
        
        // If there's an accessToken but no idToken, we can use it
        if (userInfo.authentication.accessToken && !userInfo.authentication.idToken) {
          console.log('[GOOGLE_AUTH] Using accessToken instead of idToken');
          const credential = GoogleAuthProvider.credential(
            null, 
            userInfo.authentication.accessToken
          );
          
          const userCredential = await signInWithCredential(auth, credential);
          console.log('[GOOGLE_AUTH] Successfully signed in with Firebase using accessToken');
          await createUserDocument(userCredential.user);
          return userCredential.user;
        }
        
        // If there's an idToken in the authentication object
        if (userInfo.authentication.idToken) {
          console.log('[GOOGLE_AUTH] Found ID token in authentication object');
          idToken = userInfo.authentication.idToken;
        }
      }
      
      // If still no token found, throw error
      if (!idToken) {
        throw new Error('No ID token received from Google');
      }
    }

    // Rest of your existing code...
    console.log('[GOOGLE_AUTH] Got ID token, length:', idToken.length);
    const credential = GoogleAuthProvider.credential(idToken);
    console.log('[GOOGLE_AUTH] Firebase credential created');
    const userCredential = await signInWithCredential(auth, credential);
    console.log('[GOOGLE_AUTH] Successfully signed in with Firebase');
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
}
};