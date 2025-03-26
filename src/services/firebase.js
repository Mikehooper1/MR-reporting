import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, collection, doc, getDoc } from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDIWzgCVlq_Az6gkdZ4r3Cdus1LcAhqAuk",
  authDomain: "sheelvo-mr.firebaseapp.com",
  projectId: "sheelvo-mr",
  storageBucket: "sheelvo-mr.firebasestorage.app",
  messagingSenderId: "402453123027",
  appId: "1:402453123027:android:a3e43395a8c51f3a936926",
  measurementId: "G-MEASUREMENT_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const storage = getStorage(app);

// Initialize Firestore with persistence
let firestore;
const initializeFirestore = async () => {
  firestore = getFirestore(app);
  if (Platform.OS === 'web') {
    try {
      await enableIndexedDbPersistence(firestore);
    } catch (err) {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence failed: Multiple tabs open');
      } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence not available in this environment');
      }
    }
  }
};

initializeFirestore();

// Handle auth state persistence
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      // Fetch user role from Firestore
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.data();
      
      // Store user data including role
      if (Platform.OS === 'web') {
        localStorage.setItem('user', JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: userData?.role || 'user' // Default to 'user' if role not found
        }));
      } else {
        await AsyncStorage.setItem('user', JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: userData?.role || 'user'
        }));
      }
    } catch (error) {
      console.error('Error saving auth state:', error);
    }
  } else {
    // User is signed out, clear stored data
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem('user');
      } else {
        await AsyncStorage.removeItem('user');
      }
    } catch (error) {
      console.error('Error clearing auth state:', error);
    }
  }
});

// Initialize auth state from storage
const initializeAuthState = async () => {
  try {
    let storedUser;
    if (Platform.OS === 'web') {
      storedUser = localStorage.getItem('user');
    } else {
      storedUser = await AsyncStorage.getItem('user');
    }
    
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      console.log('Restored auth state for user:', userData.email, 'Role:', userData.role);
      return userData;
    }
  } catch (error) {
    console.error('Error initializing auth state:', error);
  }
  return null;
};

initializeAuthState();

export { auth, firestore, storage };
export default app; 