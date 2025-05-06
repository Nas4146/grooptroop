import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword, 
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  OAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  EmailAuthProvider,
  User,
  updateProfile
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';

// Firebase configuration
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Google OAuth client IDs
const GOOGLE_CLIENT_ID = Constants.expoConfig?.extra?.googleClientId;
const GOOGLE_IOS_CLIENT_ID = Constants.expoConfig?.extra?.googleIosClientId;
const GOOGLE_ANDROID_CLIENT_ID = Constants.expoConfig?.extra?.googleAndroidClientId;

WebBrowser.maybeCompleteAuthSession();

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
export const useGoogleAuth = () => {
  const [request, response, promptAsync] =
    Google.useAuthRequest({
      clientId:     GOOGLE_CLIENT_ID,
      iosClientId:  GOOGLE_IOS_CLIENT_ID,
      androidClientId: GOOGLE_ANDROID_CLIENT_ID,
      webClientId:  GOOGLE_CLIENT_ID,
    });

  const signInWithGoogle = async () => {
    const result = await promptAsync();

    // only proceed on a successful auth and when .authentication is defined
    if (result.type === 'success' && result.authentication) {
      const { idToken } = result.authentication;

      if (!idToken) {
        throw new Error('No ID token received from Google authentication');
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      await createUserDocument(userCredential.user);
      return userCredential.user;
    }

    return null;
  };

  return { signInWithGoogle, request };
};

// Apple authentication
export const signInWithApple = async () => {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    
    // Create an OAuthProvider for Apple
    const provider = new OAuthProvider('apple.com');
    
    // Create a credential using the token
    const oAuthCredential = provider.credential({
      idToken: credential.identityToken,
    });
    
    // Sign in with the credential
    const userCredential = await signInWithCredential(auth, oAuthCredential);
    
    // Get the user's name from the Apple credential
    const displayName = credential.fullName 
      ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
      : null;
      
    await createUserDocument(userCredential.user, { displayName });
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in with Apple:', error);
    throw error;
  }
};

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