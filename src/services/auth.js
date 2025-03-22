import { auth } from './firebase';
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { firestore } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export const createUserProfile = async (userId, userData) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const userRef = doc(firestore, 'users', userId);
    await setDoc(userRef, {
      ...userData,
      name: userData.fullName,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      status: 'active',
      totalReports: 0,
      totalOrders: 0,
      totalVisits: 0
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
    // Add more context to the error
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please check Firebase rules.');
    } else if (error.code === 'not-found') {
      throw new Error('Database path not found. Please check Firebase configuration.');
    } else {
      throw error;
    }
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userRef = doc(firestore, 'users', userCredential.user.uid);
    
    // Get user data to check if blocked
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();
    
    // Check if user is blocked
    if (!userData.isActive || userData.status === 'blocked') {
      // Sign out the user if they are blocked
      await signOut(auth);
      throw new Error('Your account has been blocked. Please contact the administrator.');
    }
    
    // Update last active timestamp
    await updateDoc(userRef, {
      lastActive: new Date(),
      lastLoginAt: new Date()
    });
    
    return {
      user: userCredential.user,
      role: userData?.role || 'user'
    };
  } catch (error) {
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    // Force clear the auth state
    auth.currentUser = null;
    return true;
  } catch (error) {
    console.error('Error signing out:', error);
    throw new Error('Failed to sign out. Please try again.');
  }
};

export const subscribeToAuthChanges = (callback) => {
  let unsubscribe = null;
  try {
    unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
      if (user) {
        try {
          const userRef = doc(firestore, 'users', user.uid);
          
          // Update last active timestamp
          await updateDoc(userRef, {
            lastActive: new Date()
          });
          
          const userDoc = await getDoc(userRef);
          const userData = userDoc.data();
          callback({
            user,
            role: userData?.role || 'user'
          });
        } catch (error) {
          console.error('Error getting user data:', error);
          // If we can't get user data, treat as logged out
          callback({ user: null, role: null });
        }
      } else {
        console.log('Setting null auth state');
        callback({ user: null, role: null });
      }
    }, (error) => {
      console.error('Auth state change error:', error);
      callback({ user: null, role: null });
    });
  } catch (error) {
    console.error('Error setting up auth listener:', error);
  }
  return unsubscribe;
}; 