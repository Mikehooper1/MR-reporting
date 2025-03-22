import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, firestore } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext({
  user: null,
  loading: true,
  setUser: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async (uid) => {
      try {
        const userDocRef = doc(firestore, 'users', uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          return userDocSnap.data()?.role || 'user';
        }
        return 'user';
      } catch (error) {
        console.error('Error fetching user role:', error);
        return 'user';
      }
    };

    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const role = await fetchUserRole(firebaseUser.uid);
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            role: role
          };
          setUser(userData);
          await AsyncStorage.setItem('user', JSON.stringify(userData));
          console.log('User role set to:', role); // Debug log
        } catch (error) {
          console.error('Error setting user data:', error);
        }
      } else {
        setUser(null);
        await AsyncStorage.removeItem('user');
      }
      setLoading(false);
    });

    // Check for stored user data on mount
    const initializeAuth = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          // Verify the role is still valid
          const currentRole = await fetchUserRole(userData.uid);
          userData.role = currentRole;
          setUser(userData);
          console.log('Restored user with role:', currentRole); // Debug log
        }
      } catch (error) {
        console.error('Error loading auth state:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 