import { firestore } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  where, 
  getDocs,
  updateDoc,
  increment,
  runTransaction
} from 'firebase/firestore';

// Generate a unique employee code
export const generateEmployeeCode = async () => {
  try {
    const counterRef = doc(firestore, 'counters', 'employeeCount');
    
    // Use a transaction to ensure atomic updates
    const newCode = await runTransaction(firestore, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      let currentCount;
      if (!counterDoc.exists()) {
        // Initialize counter if it doesn't exist
        currentCount = 1;
        await setDoc(counterRef, { count: currentCount });
      } else {
        currentCount = counterDoc.data().count + 1;
        transaction.update(counterRef, { count: currentCount });
      }
      
      const prefix = 'SHV'; // Sheelvo prefix
      const year = new Date().getFullYear().toString().substr(-2);
      const number = currentCount.toString().padStart(4, '0');
      
      return `${prefix}${year}${number}`;
    });
    
    return newCode;
  } catch (error) {
    console.error('Error generating employee code:', error);
    throw error;
  }
};

// Create or update user profile
export const createUserProfile = async (userId, userData) => {
  try {
    const employeeCode = await generateEmployeeCode();
    const userRef = doc(firestore, 'users', userId);
    
    await setDoc(userRef, {
      ...userData,
      employeeCode,
      role: 'user',
      dailySalary: 0,
      joinDate: new Date(),
      totalReports: 0,
      totalOrders: 0,
      totalVisits: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }, { merge: true });

    return employeeCode;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

// Get user profile
export const getUserProfile = async (userId) => {
  try {
    const userRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// Update user statistics
export const updateUserStats = async (userId, stats) => {
  try {
    const userRef = doc(firestore, 'users', userId);
    await setDoc(userRef, {
      ...stats,
      updatedAt: new Date()
    }, { merge: true });
  } catch (error) {
    console.error('Error updating user stats:', error);
    throw error;
  }
}; 