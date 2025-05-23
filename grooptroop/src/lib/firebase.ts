import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import Constants from 'expo-constants';

// Firebase configuration - simplified approach
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId
};

// Initialize Firebase with basic setup
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Helper function to create a new user document
export const createUserDocument = async (user: User) => {
  if (!user) return null;
  
  // Check if user document already exists
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  // Only create new document if it doesn't exist
  if (!userSnap.exists()) {
    // Create minimal profile for anonymous users
    const userData = {
      uid: user.uid,
      createdAt: new Date(),
      isAnonymous: user.isAnonymous,
      lastActive: new Date(),
      displayName: `Grooper${Math.floor(Math.random() * 10000)}`,
      avatarColor: `#${Math.floor(Math.random()*16777215).toString(16)}`,
    };
    
    try {
      await setDoc(userRef, userData);
      console.log('Anonymous user document created');
      return userData;
    } catch (error) {
      console.error('Error creating user document:', error);
      return null;
    }
  }
  
  return userSnap.data();
};

// Sign in anonymously
export const signInAnonymousUser = async () => {
  try {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in anonymously:', error);
    throw error;
  }
};