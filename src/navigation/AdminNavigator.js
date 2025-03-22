import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

import AdminDashboard from '../screens/admin/AdminDashboard';
import AdminApprovals from '../screens/admin/AdminApprovals';
import EmployeeDetails from '../screens/admin/EmployeeDetails';
import ActivityDetails from '../screens/admin/ActivityDetails';
import AdminUtilityScreen from '../screens/admin/AdminUtilityScreen';
import AdminLeaveApproval from '../screens/admin/AdminLeaveApproval';
import AdminNewsSubmit from '../screens/admin/AdminNewsSubmit';

const Stack = createNativeStackNavigator();

const AdminNavigator = () => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Logout Error', 'Failed to log out. Please try again.');
    }
  };

  const getScreenOptions = (title) => ({
    title,
    headerStyle: {
      backgroundColor: '#FF671F',
    },
    headerTintColor: '#000',
    headerTitleStyle: {
      fontWeight: 'bold',
    },
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

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboard}
        options={getScreenOptions('Admin Dashboard')}
      />
      <Stack.Screen
        name="Approvals"
        component={AdminApprovals}
        options={getScreenOptions('Pending Approvals')}
      />
      <Stack.Screen
        name="EmployeeDetails"
        component={EmployeeDetails}
        options={getScreenOptions('Employee Details')}
      />
      <Stack.Screen
        name="ActivityDetails"
        component={ActivityDetails}
        options={({ route }) => getScreenOptions(route.params?.title || 'Activity Details')}
      />
      <Stack.Screen
        name="AdminUtility"
        component={AdminUtilityScreen}
        options={getScreenOptions('Utility Management')}
      />
      <Stack.Screen
        name="AdminLeaveApproval"
        component={AdminLeaveApproval}
        options={getScreenOptions('Leave Approval')}
      />
      <Stack.Screen
        name="AdminNewsSubmit"
        component={AdminNewsSubmit}
        options={getScreenOptions('News Management')}
      />
    </Stack.Navigator>
  );
};

export default AdminNavigator; 