import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { Text, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

// Import auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';

// Import main stack screens
import DashboardScreen from '../screens/main/DashboardScreen';
import DailyReportScreen from '../screens/main/DailyReportScreen';
import ExpenseDetailsScreen from '../screens/main/ExpenseDetailsScreen';
import SystematicTourPlanScreen from '../screens/main/SystematicTourPlanScreen';
import MSLListScreen from '../screens/main/MSLListScreen';
import HOrderScreen from '../screens/main/HOrderScreen';
import OrderProductScreen from '../screens/main/OrderProductScreen';
import UtilityScreen from '../screens/main/UtilityScreen';
import VisualAidScreen from '../screens/main/VisualAidScreen';
import UserProfileScreen from '../screens/main/UserProfileScreen';
import MedicinesListScreen from '../screens/main/MedicinesListScreen';
import DoctorMedicinesScreen from '../screens/main/DoctorMedicinesScreen';
import LeaveScreen from '../screens/main/LeaveScreen';
import NewsScreen from '../screens/main/NewsScreen';

// Import AdminNavigator
import AdminNavigator from './AdminNavigator';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { user, loading } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Logout Error', 'Failed to log out. Please try again.');
    }
  };

  const getAdminScreenOptions = (title) => ({
    title,
    headerRight: () => (
      <TouchableOpacity 
        onPress={handleLogout}
        style={{
          padding: 15,
          marginRight: 10,
          backgroundColor: 'transparent',
        }}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialCommunityIcons 
          name="logout" 
          size={28}
          color="#2196F3"
        />
      </TouchableOpacity>
    ),
  });

  if (loading) {
    return null;
  }

  // Debug logging
  console.log('AppNavigator - Current user:', user);
  console.log('AppNavigator - User role:', user?.role);

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FF671F',
          elevation: 4,
        },
        headerTitleStyle: {
          fontWeight: 'bold',
          color: '#000',
        },
      }}
    >
      {!user ? (
        // Auth Stack
        <>
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Signup" 
            component={SignupScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : user.role === 'admin' ? (
        // Admin Stack
        <Stack.Screen
          name="Admin"
          component={AdminNavigator}
          options={{ headerShown: false }}
        />
      ) : (
        // User Stack
        <>
          <Stack.Screen 
            name="Dashboard" 
            component={DashboardScreen}
            options={{ title: 'Dashboard' }}
          />
          
          <Stack.Screen 
            name="Daily Report" 
            component={DailyReportScreen}
            options={{ title: 'Daily Report' }}
          />
          <Stack.Screen 
            name="Expenses" 
            component={ExpenseDetailsScreen}
            options={{ title: 'Expenses' }}
          />
          <Stack.Screen 
            name="STP" 
            component={SystematicTourPlanScreen}
            options={{ title: 'Systematic Tour Plan' }}
          />
          <Stack.Screen 
            name="MSL List" 
            component={MSLListScreen}
            options={{ title: 'MSL List' }}
          />
          <Stack.Screen 
            name="H-Order" 
            component={HOrderScreen}
            options={{ title: 'H-Order' }}
          />
          <Stack.Screen 
            name="Order Product" 
            component={OrderProductScreen}
            options={{ title: 'Order Product' }}
          />
          <Stack.Screen 
            name="Utility" 
            component={UtilityScreen}
            options={{ title: 'Utility' }}
          />
          <Stack.Screen 
            name="Visual Aid" 
            component={VisualAidScreen}
            options={{ title: 'Visual Aid' }}
          />
          <Stack.Screen 
            name="Profile" 
            component={UserProfileScreen}
            options={{ title: 'Profile' }}
          />
          <Stack.Screen 
            name="Medicines List" 
            component={MedicinesListScreen}
            options={{ title: 'Product List' }}
          />
          <Stack.Screen 
            name="DoctorMedicines" 
            component={DoctorMedicinesScreen}
            options={{ title: 'Doctor Medicines' }}
          />
          <Stack.Screen 
            name="Leave" 
            component={LeaveScreen}
            options={{ title: 'Leave Management' }}
          />
          <Stack.Screen 
            name="News" 
            component={NewsScreen}
            options={{ title: 'Company News' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator; 