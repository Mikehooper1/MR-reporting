import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Pressable, TouchableOpacity, Alert, LogBox, Dimensions } from 'react-native';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { subscribeToAuthChanges, logoutUser } from './src/services/auth';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import UpdateCheck from './src/components/UpdateCheck';

import './src/services/firebase'; // Import firebase initialization

// Import screens
import LoginScreen from './src/screens/auth/LoginScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import DashboardScreen from './src/screens/main/DashboardScreen';
import DailyReportScreen from './src/screens/main/DailyReportScreen';
import ExpenseDetailsScreen from './src/screens/main/ExpenseDetailsScreen';
import SystematicTourPlanScreen from './src/screens/main/SystematicTourPlanScreen';
import MSLListScreen from './src/screens/main/MSLListScreen';
import HOrderScreen from './src/screens/main/HOrderScreen';
import UtilityScreen from './src/screens/main/UtilityScreen';
import VisualAidScreen from './src/screens/main/VisualAidScreen';
import UserProfileScreen from './src/screens/main/UserProfileScreen';
import MedicinesListScreen from './src/screens/main/MedicinesListScreen';
import DoctorMedicinesScreen from './src/screens/main/DoctorMedicinesScreen';
import { AdminDashboard, AdminApprovals, EmployeeDetails } from './src/screens/admin';
import LeaveScreen from './src/screens/main/LeaveScreen';
import NewsScreen from './src/screens/main/NewsScreen';
import AdminLeaveApproval from './src/screens/admin/AdminLeaveApproval';
import AdminNewsSubmit from './src/screens/admin/AdminNewsSubmit';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Custom theme
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2196F3',
    accent: '#03A9F4',
  },
};

// Loading screen component
function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

// Main stack navigation for regular users
function MainStack({ navigation }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fff',
          elevation: 4,
        },
        headerTitleStyle: {
          fontWeight: 'bold',
          color: '#000',
        },
      }}>
      <Stack.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
        }}
      />
      <Stack.Screen 
        name="Daily Report" 
        component={DailyReportScreen}
        options={{
          title: 'Daily Report',
        }}
      />
      <Stack.Screen 
        name="Expenses" 
        component={ExpenseDetailsScreen}
        options={{
          title: 'Expenses',
        }}
      />
      <Stack.Screen 
        name="STP" 
        component={SystematicTourPlanScreen}
        options={{
          title: 'Systematic Tour Plan',
        }}
      />
      <Stack.Screen 
        name="MSL List" 
        component={MSLListScreen}
        options={{
          title: 'MSL List',
        }}
      />
      <Stack.Screen 
        name="H-Order" 
        component={HOrderScreen}
        options={{
          title: 'H-Order',
        }}
      />
      <Stack.Screen 
        name="Utility" 
        component={UtilityScreen}
        options={{
          title: 'Utility',
        }}
      />
      <Stack.Screen 
        name="Visual Aid" 
        component={VisualAidScreen}
        options={{
          title: 'Visual Aid',
        }}
      />
      <Stack.Screen 
        name="Profile" 
        component={UserProfileScreen}
        options={{
          title: 'Profile',
        }}
      />
      <Stack.Screen 
        name="Medicines List" 
        component={MedicinesListScreen}
        options={{
          title: 'Medicines List',
        }}
      />
      <Stack.Screen 
        name="DoctorMedicines" 
        component={DoctorMedicinesScreen}
        options={{
          title: 'Doctor Medicines',
        }}
      />
      <Stack.Screen 
        name="Leave" 
        component={LeaveScreen}
        options={{
          title: 'Leave Management',
        }}
      />
      <Stack.Screen 
        name="News" 
        component={NewsScreen}
        options={{
          title: 'Company News',
        }}
      />
    </Stack.Navigator>
  );
}

// Admin stack navigation
function AdminStack({ navigation }) {
  const handleLogout = async () => {
    try {
      await logoutUser();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert(
        'Logout Error',
        'Failed to log out. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <Stack.Navigator
      screenOptions={{
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
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        ),
        headerStyle: {
          backgroundColor: '#fff',
          elevation: 4,
        },
        headerTitleStyle: {
          fontWeight: 'bold',
          color: '#000',
        },
      }}>
      <Stack.Screen 
        name="Dashboard" 
        component={AdminDashboard}
        options={{
          title: 'Admin Dashboard',
        }}
      />
      <Stack.Screen 
        name="Approvals" 
        component={AdminApprovals}
        options={{
          title: 'Pending Approvals',
        }}
      />
      <Stack.Screen 
        name="EmployeeDetails" 
        component={EmployeeDetails}
        options={{
          title: 'Employee Details',
        }}
      />
      <Stack.Screen 
        name="AdminLeaveApproval" 
        component={AdminLeaveApproval}
        options={{ title: 'Leave Approval' }}
      />
      <Stack.Screen 
        name="AdminNewsSubmit" 
        component={AdminNewsSubmit}
        options={{ title: 'News Management' }}
      />
    </Stack.Navigator>
  );
}

// Ignore specific deprecation warnings
LogBox.ignoreLogs([
  'Image: style.tintColor is deprecated',
  'Image: style.resizeMode is deprecated',
  "Animated: `useNativeDriver` is not supported"
]);

export default function App() {
  const [authState, setAuthState] = useState({ user: null, role: null });
  const [loading, setLoading] = useState(true);
  const [orientation, setOrientation] = useState('PORTRAIT');

  useEffect(() => {
    // Enable screen rotation
    ScreenOrientation.unlockAsync();

    // Listen for orientation changes
    const subscription = Dimensions.addEventListener('change', ({ window: { width, height } }) => {
      if (width > height) {
        setOrientation('LANDSCAPE');
      } else {
        setOrientation('PORTRAIT');
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((state) => {
      console.log('Auth state updated:', state);
      setAuthState(state);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) {
        console.log('Cleaning up auth subscription');
        unsubscribe();
      }
    };
  }, []);

  if (loading) {
    return (
      <PaperProvider theme={theme}>
        <LoadingScreen />
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
          <UpdateCheck />
        </NavigationContainer>
      </AuthProvider>
    </PaperProvider>
  );
} 