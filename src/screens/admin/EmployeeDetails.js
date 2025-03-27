import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, DataTable, Text, Button, ActivityIndicator, List, Divider, TextInput, Portal, Modal, IconButton, Menu, ProgressBar, Dialog } from 'react-native-paper';
import { firestore, auth } from '../../services/firebase';
import { collection, query, getDocs, where, doc, getDoc, updateDoc, addDoc, deleteDoc, setDoc, serverTimestamp, onSnapshot, writeBatch, deleteField } from 'firebase/firestore';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { format } from 'date-fns';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const EmployeeDetails = ({ route, navigation }) => {
  const { employeeId } = route.params;
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingSalary, setEditingSalary] = useState(false);
  const [editingAllowance, setEditingAllowance] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [editingHeadquarters, setEditingHeadquarters] = useState(false);
  const [editingFareRate, setEditingFareRate] = useState(false);
  const [newSalary, setNewSalary] = useState('');
  const [newAllowance, setNewAllowance] = useState('');
  const [newFareRate, setNewFareRate] = useState('');
  const [newLocation, setNewLocation] = useState({ name: '', distance: '' });
  const [newHeadquarters, setNewHeadquarters] = useState('');
  const [locations, setLocations] = useState([]);
  const [activities, setActivities] = useState({
    reports: [],
    expenses: [],
    tourPlans: [],
    orders: []
  });
  const [refreshing, setRefreshing] = useState(false);
  const [farePerKm, setFarePerKm] = useState('0');
  const [selectedSTP, setSelectedSTP] = useState('');
  const [monthlyTarget, setMonthlyTarget] = useState(0);
  const [currentMonthSales, setCurrentMonthSales] = useState(0);
  const [monthlySalesHistory, setMonthlySalesHistory] = useState([]);
  const [editingTarget, setEditingTarget] = useState(false);
  const [newTarget, setNewTarget] = useState('');
  const [showSTPMenu, setShowSTPMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editedUser, setEditedUser] = useState(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [passwordAction, setPasswordAction] = useState('remove');
  const [showHeadquartersMenu, setShowHeadquartersMenu] = useState(false);

  // Update STP_LIST with headquarters and range mapping
  const HEADQUARTERS_CONFIG = {
    'BHOPAL': {
      range: 100, // km
      stps: [
        { name: 'VIDISHA', type: 'ex Headquarter' },
        { name: 'ITARSI', type: 'ex Headquarter' },
        { name: 'NARMADAPURAM', type: 'ex Headquarter' },
        { name: 'SEHORE', type: 'ex Headquarter' },
        { name: 'ASHTA', type: 'ex Headquarter' },
        { name: 'INDORE', type: 'outstation' },
        { name: 'JABALPUR', type: 'outstation' },
        { name: 'GWALIOR', type: 'outstation' }
      ]
    },
    'INDORE': {
      range: 100,
      stps: [
        { name: 'DEWAS', type: 'ex Headquarter' },
        { name: 'MHOW', type: 'ex Headquarter' },
        { name: 'KHANDWA', type: 'outstation' },
        { name: 'KHARGONE', type: 'outstation' },
        { name: 'DHAMNOD', type: 'ex Headquarter' },
        { name: 'BHOPAL', type: 'outstation' },
        { name: 'JABALPUR', type: 'outstation' },
        { name: 'GWALIOR', type: 'outstation' }
      ]
    },
    'GWALIOR': {
      range: 100,
      stps: [
        { name: 'MORENA', type: 'ex Headquarter' },
        { name: 'DABRA', type: 'ex Headquarter' },
        { name: 'SHIVPURI', type: 'ex Headquarter' },
        { name: 'BHIND', type: 'ex Headquarter' },
        { name: 'BHOPAL', type: 'outstation' },
        { name: 'INDORE', type: 'outstation' }
      ]
    },
    'JABALPUR': {
      range: 100,
      stps: [
        { name: 'SATNA', type: 'outstation' },
        { name: 'KATNI', type: 'ex Headquarter' },
        { name: 'REWA', type: 'ex Headquarter' },
        { name: 'BHEDAGHAT', type: 'ex Headquarter' },
        { name: 'BHOPAL', type: 'outstation' },
        { name: 'INDORE', type: 'outstation' },
        { name: 'GWALIOR', type: 'outstation' }
      ]
    }
  };

  // Get available STPs based on headquarters and range
  const getAvailableSTPs = (headquarters) => {
    if (!headquarters || !HEADQUARTERS_CONFIG[headquarters]) {
      return [];
    }
    return HEADQUARTERS_CONFIG[headquarters].stps;
  };

  useEffect(() => {
    fetchEmployeeDetails();
    fetchEmployeeActivities();
    fetchFareRate();
    fetchMonthlySalesData();
  }, [employeeId]);

  const fetchEmployeeDetails = async () => {
    try {
      const employeeDoc = await getDoc(doc(firestore, 'users', employeeId));
      if (!employeeDoc.exists()) {
        Alert.alert('Error', 'Employee not found');
        return;
      }
      
      const employeeData = employeeDoc.data();
      setEmployee({ id: employeeDoc.id, ...employeeData });
      if (employeeData.headquarters) {
        setNewHeadquarters(employeeData.headquarters);
      }

      // Set up real-time listener for employee data
      const unsubscribe = onSnapshot(doc(firestore, 'users', employeeId), (doc) => {
        if (doc.exists()) {
          setEmployee({ id: doc.id, ...doc.data() });
        }
      });

      // Fetch locations from employee's document
      if (employeeData.locations) {
        const allLocations = Object.entries(employeeData.locations).map(([id, location]) => ({
          id,
          ...location
        })).sort((a, b) => a.name.localeCompare(b.name));
        setLocations(allLocations);
      } else {
        setLocations([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching employee details:', error);
      Alert.alert('Error', 'Failed to fetch employee details');
      setLoading(false);
    }
  };

  const fetchEmployeeActivities = async () => {
    try {
      // Fetch recent reports
      const reportsQuery = query(
        collection(firestore, 'reports'),
        where('userId', '==', employeeId),
        where('createdAt', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
      );
      const reportsSnapshot = await getDocs(reportsQuery);
      const reports = reportsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch recent expenses
      const expensesQuery = query(
        collection(firestore, 'expenses'),
        where('userId', '==', employeeId),
        where('createdAt', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      const expenses = expensesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch tour plans
      const tourPlansQuery = query(
        collection(firestore, 'tourPlans'),
        where('userId', '==', employeeId),
        where('date', '>=', new Date().toISOString().split('T')[0])
      );
      const tourPlansSnapshot = await getDocs(tourPlansQuery);
      const tourPlans = tourPlansSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch recent orders
      const ordersQuery = query(
        collection(firestore, 'orders'),
        where('userId', '==', employeeId),
        where('createdAt', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setActivities({
        reports,
        expenses,
        tourPlans,
        orders
      });
    } catch (error) {
      console.error('Error fetching employee activities:', error);
    }
  };

  const fetchFareRate = async () => {
    try {
      const settingsDoc = await getDoc(doc(firestore, 'settings', 'expense'));
      if (settingsDoc.exists()) {
        const fareRate = settingsDoc.data().farePerKm || '0';
        setFarePerKm(fareRate.toString());
      }
    } catch (error) {
      console.error('Error fetching fare rate:', error);
    }
  };

  const fetchMonthlySalesData = async () => {
    try {
      if (!employee) return;
      
      // Get current month's start and end dates
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

      // Fetch current month's target
      const currentMonthTargetId = `${currentYear}_${currentMonth + 1}`;
      const targetDoc = await getDoc(doc(firestore, 'monthlyTargets', employee.id));
      let currentTarget = 0;
      
      if (targetDoc.exists()) {
        const targetData = targetDoc.data();
        currentTarget = targetData[currentMonthTargetId] || targetData.target || 1000;
        setMonthlyTarget(currentTarget);
      } else {
        currentTarget = 1000;
        setMonthlyTarget(currentTarget);
      }

      // Fetch current month's sales from both collections with proper date filtering
      const [approvedOrdersSnapshot, approvedHOrdersSnapshot] = await Promise.all([
        getDocs(query(
          collection(firestore, 'orders'),
          where('userId', '==', employee.id),
          where('status', '==', 'approved'),
          where('createdAt', '>=', startOfMonth),
          where('createdAt', '<=', endOfMonth)
        )),
        getDocs(query(
          collection(firestore, 'h-orders'),
          where('userId', '==', employee.id),
          where('status', '==', 'approved'),
          where('createdAt', '>=', startOfMonth),
          where('createdAt', '<=', endOfMonth)
        ))
      ]);
      
      // Calculate current month sales with improved amount calculation
      const calculateOrderAmount = (order) => {
        const data = order.data();
        if (data.totalAmount) return data.totalAmount;
        if (data.price && data.quantity) return data.price * data.quantity;
        return data.amount || 0;
      };

      const currentSales = [
        ...approvedOrdersSnapshot.docs,
        ...approvedHOrdersSnapshot.docs
      ].reduce((total, doc) => total + calculateOrderAmount(doc), 0);
      
      setCurrentMonthSales(currentSales);

      // Calculate last 6 months of sales data
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const monthIndex = currentMonth - i;
        const yearOffset = Math.floor(monthIndex / 12);
        const adjustedMonth = ((monthIndex % 12) + 12) % 12;
        const year = currentYear + yearOffset;
        
        const monthStart = new Date(year, adjustedMonth, 1);
        const monthEnd = new Date(year, adjustedMonth + 1, 0, 23, 59, 59);
        
        const monthTargetId = `${year}_${adjustedMonth + 1}`;
        let monthTarget = currentTarget;
        
        if (targetDoc.exists()) {
          const targetData = targetDoc.data();
          if (targetData[monthTargetId]) {
            monthTarget = targetData[monthTargetId];
          }
        }
        
        // Fetch orders for this month with proper date filtering
        const [monthOrdersSnapshot, monthHOrdersSnapshot] = await Promise.all([
          getDocs(query(
            collection(firestore, 'orders'),
            where('userId', '==', employee.id),
            where('status', '==', 'approved'),
            where('createdAt', '>=', monthStart),
            where('createdAt', '<=', monthEnd)
          )),
          getDocs(query(
            collection(firestore, 'h-orders'),
            where('userId', '==', employee.id),
            where('status', '==', 'approved'),
            where('createdAt', '>=', monthStart),
            where('createdAt', '<=', monthEnd)
          ))
        ]);

        const monthSales = [
          ...monthOrdersSnapshot.docs,
          ...monthHOrdersSnapshot.docs
        ].reduce((total, doc) => total + calculateOrderAmount(doc), 0);

        last6Months.push({
          month: format(monthStart, 'MMM yyyy'),
          sales: monthSales,
          target: monthTarget
        });
      }
      setMonthlySalesHistory(last6Months);
    } catch (error) {
      console.error('Error fetching monthly sales data:', error);
    }
  };

  const updateBaseSalary = async () => {
    try {
      const salary = parseFloat(newSalary);
      if (isNaN(salary) || salary < 0) {
        alert('Please enter a valid salary amount');
        return;
      }

      const employeeRef = doc(firestore, 'users', employeeId);
      await updateDoc(employeeRef, {
        dailySalary: salary,
        updatedAt: new Date()
      });

      setEmployee({ ...employee, dailySalary: salary });
      setEditingSalary(false);
      alert('Base salary updated successfully');
    } catch (error) {
      console.error('Error updating base salary:', error);
      alert('Error updating base salary. Please try again.');
    }
  };

  const updateAllowance = async () => {
    try {
      const allowance = parseFloat(newAllowance);
      if (isNaN(allowance) || allowance < 0) {
        alert('Please enter a valid allowance amount');
        return;
      }

      const employeeRef = doc(firestore, 'users', employeeId);
      await updateDoc(employeeRef, {
        allowanceAmount: allowance,
        updatedAt: new Date()
      });

      setEmployee({ ...employee, allowanceAmount: allowance });
      setEditingAllowance(false);
      alert('Daily allowance updated successfully');
    } catch (error) {
      console.error('Error updating allowance:', error);
      alert('Error updating allowance. Please try again.');
    }
  };

  const updateFareRate = async () => {
    try {
      const fareRate = parseFloat(newFareRate);
      if (isNaN(fareRate) || fareRate < 0) {
        alert('Please enter a valid fare rate');
        return;
      }

      // Get a reference to the settings document
      const settingsRef = doc(firestore, 'settings', 'expense');

      // Check if the document exists
      const settingsDoc = await getDoc(settingsRef);

      if (settingsDoc.exists()) {
        // Update existing document
        await updateDoc(settingsRef, {
          farePerKm: fareRate,
          updatedAt: new Date()
        });
      } else {
        // Create new document if it doesn't exist
        await setDoc(settingsRef, {
          farePerKm: fareRate,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      setEditingFareRate(false);
      alert('Fare rate updated successfully');
    } catch (error) {
      console.error('Error updating fare rate:', error);
      alert('Error updating fare rate. Please try again.');
    }
  };

  const updateHeadquarters = async () => {
    try {
      if (!newHeadquarters || !HEADQUARTERS_CONFIG[newHeadquarters]) {
        Alert.alert('Invalid Input', 'Please select a valid headquarters');
        return;
      }

      const employeeRef = doc(firestore, 'users', employeeId);
      await updateDoc(employeeRef, {
        headquarters: newHeadquarters,
        updatedAt: new Date()
      });

      setEmployee({ ...employee, headquarters: newHeadquarters });
      setEditingHeadquarters(false);
      Alert.alert('Success', 'Headquarters updated successfully');
    } catch (error) {
      console.error('Error updating headquarters:', error);
      Alert.alert('Error', 'Failed to update headquarters');
    }
  };

  const addLocation = async () => {
    try {
      const distance = parseFloat(newLocation.distance);
      if (!selectedSTP || isNaN(distance) || distance < 0) {
        alert('Please select a location and enter a valid distance');
        return;
      }

      // Validate STP is within headquarters range
      if (employee?.headquarters) {
        const availableSTPs = getAvailableSTPs(employee.headquarters);
        const selectedSTPConfig = availableSTPs.find(stp => stp.name === selectedSTP);
        
        if (!selectedSTPConfig) {
          Alert.alert('Invalid STP', 'Selected STP is not available for this headquarters');
          return;
        }
      }

      const employeeRef = doc(firestore, 'users', employeeId);
      const newLocationData = {
        name: selectedSTP,
        distance: distance,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Update the employee document with the new location
      await updateDoc(employeeRef, {
        [`locations.${selectedSTP}`]: newLocationData
      });

      setEditingLocation(false);
      setNewLocation({ name: '', distance: '' });
      setSelectedSTP('');
      fetchEmployeeDetails();
      alert('Location added successfully');
    } catch (error) {
      console.error('Error adding location:', error);
      alert('Error adding location. Please try again.');
    }
  };

  const deleteLocation = async (locationId) => {
    try {
      const employeeRef = doc(firestore, 'users', employeeId);
      
      // Remove the location from the employee's document
      await updateDoc(employeeRef, {
        [`locations.${locationId}`]: deleteField()
      });

      fetchEmployeeDetails();
      alert('Location deleted successfully');
    } catch (error) {
      console.error('Error deleting location:', error);
      alert('Error deleting location. Please try again.');
    }
  };

  const updateMonthlyTarget = async () => {
    try {
      if (!employee || !newTarget || isNaN(newTarget) || parseInt(newTarget) <= 0) {
        Alert.alert('Invalid Input', 'Please enter a valid target amount');
        return;
      }

      setLoading(true);
      
      // Get the current month and year for the target ID
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const monthTargetId = `${currentYear}_${currentMonth + 1}`;
      
      const targetRef = doc(firestore, 'monthlyTargets', employee.id);
      const targetDoc = await getDoc(targetRef);
      
      if (targetDoc.exists()) {
        // Update the existing document with the new month-specific target
        await updateDoc(targetRef, {
          [monthTargetId]: parseInt(newTarget),
          lastUpdated: serverTimestamp()
        });
      } else {
        // Create a new document with the month-specific target
        await setDoc(targetRef, {
          [monthTargetId]: parseInt(newTarget),
          target: parseInt(newTarget), // Keep a default target as well
          lastUpdated: serverTimestamp()
        });
      }

      setMonthlyTarget(parseInt(newTarget));
      setEditingTarget(false);
      setNewTarget('');
      Alert.alert('Success', 'Monthly target updated successfully');
      
      // Refresh the monthly sales data
      fetchMonthlySalesData();
    } catch (error) {
      console.error('Error updating monthly target:', error);
      Alert.alert('Error', 'Failed to update monthly target');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchEmployeeDetails(),
        fetchEmployeeActivities(),
        fetchMonthlySalesData()
      ]);
    } catch (error) {
      console.error('Error refreshing employee details:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleRemoveUser = async () => {
    try {
      if (!adminPassword) {
        Alert.alert('Error', 'Please enter admin password');
        return;
      }

      // Verify admin password
      const adminUser = auth.currentUser;
      if (!adminUser) {
        Alert.alert('Error', 'Admin not logged in');
        return;
      }

      // Reauthenticate admin
      const credential = EmailAuthProvider.credential(
        adminUser.email,
        adminPassword
      );
      await reauthenticateWithCredential(adminUser, credential);

      // First get the user's auth UID before deleting from Firestore
      const userDoc = await getDoc(doc(firestore, 'users', employeeId));
      if (!userDoc.exists()) {
        Alert.alert('Error', 'User not found');
        return;
      }

      const userData = userDoc.data();
      const userAuthUid = userData.uid;

      // Delete user from Firebase Auth if they have a UID
      if (userAuthUid) {
        try {
          const userToDelete = await auth.getUser(userAuthUid);
          await deleteUser(userToDelete);
        } catch (authError) {
          console.error('Error deleting user from Firebase Auth:', authError);
          // Continue with Firestore deletion even if Auth deletion fails
        }
      }

      // Delete user from Firestore
      await deleteDoc(doc(firestore, 'users', employeeId));

      // Delete user's data from other collections
      const collectionsToClean = ['reports', 'expenses', 'tourPlans', 'orders', 'h-orders'];
      for (const collectionName of collectionsToClean) {
        const userDocsQuery = query(
          collection(firestore, collectionName),
          where('userId', '==', employeeId)
        );
        const userDocsSnapshot = await getDocs(userDocsQuery);
        
        // Delete all documents in batch
        const batch = writeBatch(firestore);
        userDocsSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }

      Alert.alert('Success', 'User and all associated data removed successfully');
      // Navigate back or handle as needed
    } catch (error) {
      console.error('Error removing user:', error);
      let errorMessage = 'Failed to remove user. Please check admin password and try again.';
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect admin password. Please try again.';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'This operation requires recent authentication. Please log in again.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setShowPasswordDialog(false);
      setAdminPassword('');
    }
  };

  const handleResetPassword = async () => {
    try {
      if (!adminPassword) {
        Alert.alert('Error', 'Please enter admin password');
        return;
      }

      // Verify admin password
      const adminUser = auth.currentUser;
      if (!adminUser) {
        Alert.alert('Error', 'Admin not logged in');
        return;
      }

      // Reauthenticate admin
      const credential = EmailAuthProvider.credential(
        adminUser.email,
        adminPassword
      );
      await reauthenticateWithCredential(adminUser, credential);

      // Get user's auth UID
      const userDoc = await getDoc(doc(firestore, 'users', employeeId));
      if (!userDoc.exists() || !userDoc.data().uid) {
        throw new Error('User not found');
      }

      // Generate a random password
      const newPassword = Math.random().toString(36).slice(-8);
      
      // Update password in Firebase Auth through Cloud Function
      const resetPasswordRef = doc(firestore, 'passwordResets', employeeId);
      await setDoc(resetPasswordRef, {
        uid: userDoc.data().uid,
        newPassword: newPassword,
        requestedBy: adminUser.uid,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Wait for Cloud Function to process the password reset
      let attempts = 0;
      const maxAttempts = 10;
      const checkStatus = async () => {
        if (attempts >= maxAttempts) {
          throw new Error('Password reset timeout');
        }

        const resetDoc = await getDoc(resetPasswordRef);
        if (resetDoc.exists()) {
          const status = resetDoc.data().status;
          if (status === 'completed') {
            return true;
          } else if (status === 'error') {
            throw new Error(resetDoc.data().error || 'Password reset failed');
          }
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        return checkStatus();
      };

      await checkStatus();

      // Update the password reset record in Firestore
      await updateDoc(doc(firestore, 'users', employeeId), {
        lastPasswordReset: serverTimestamp(),
        lastPasswordResetBy: adminUser.uid
      });

      // Clean up the password reset document
      await deleteDoc(resetPasswordRef);

      Alert.alert(
        'Success', 
        `Password reset successful. New password: ${newPassword}\n\nPlease share this with the user securely.`
      );
    } catch (error) {
      console.error('Error resetting password:', error);
      let errorMessage = 'Failed to reset password. Please check admin password and try again.';
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect admin password. Please try again.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'User not found.';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'This operation requires recent authentication. Please log in again.';
      } else if (error.message === 'Password reset timeout') {
        errorMessage = 'Password reset timed out. Please try again.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setShowPasswordDialog(false);
      setAdminPassword('');
    }
  };

  const handleBlockUser = async () => {
    try {
      if (!blockReason) {
        Alert.alert('Error', 'Please provide a reason for blocking');
        return;
      }

      const userRef = doc(firestore, 'users', employeeId);
      await updateDoc(userRef, {
        isActive: false,
        status: 'blocked',
        blockedAt: serverTimestamp(),
        blockedBy: auth.currentUser.uid,
        blockReason: blockReason
      });

      setEmployee(prev => ({ ...prev, isActive: false, status: 'blocked' }));
      setShowBlockDialog(false);
      setBlockReason('');
      Alert.alert('Success', 'User blocked successfully');
    } catch (error) {
      console.error('Error blocking user:', error);
      Alert.alert('Error', 'Failed to block user');
    }
  };

  const handleUnblockUser = async () => {
    try {
      const userRef = doc(firestore, 'users', employeeId);
      await updateDoc(userRef, {
        isActive: true,
        status: 'active',
        blockedAt: null,
        blockedBy: null,
        blockReason: null
      });

      setEmployee(prev => ({ ...prev, isActive: true, status: 'active' }));
      Alert.alert('Success', 'User unblocked successfully');
    } catch (error) {
      console.error('Error unblocking user:', error);
      Alert.alert('Error', 'Failed to unblock user');
    }
  };

  const handleEditUser = async () => {
    try {
      if (!editedUser.name || !editedUser.email) {
        Alert.alert('Error', 'Name and email are required');
        return;
      }

      const userRef = doc(firestore, 'users', employeeId);
      await updateDoc(userRef, {
        name: editedUser.name,
        email: editedUser.email,
        phone: editedUser.phone || '',
        region: editedUser.region || '',
        updatedAt: serverTimestamp()
      });

      setEmployee(prev => ({ ...prev, ...editedUser }));
      setShowEditDialog(false);
      Alert.alert('Success', 'User details updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert('Error', 'Failed to update user details');
    }
  };

  const renderEmployeeInfo = () => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Title>Employee Information</Title>
          <Menu
            visible={showUserMenu}
            onDismiss={() => setShowUserMenu(false)}
            anchor={
              <IconButton
                icon="dots-vertical"
                onPress={() => setShowUserMenu(true)}
              />
            }
          >
            <Menu.Item 
              onPress={() => {
                setShowUserMenu(false);
                setShowEditDialog(true);
                setEditedUser({
                  name: employee.name || employee.fullName,
                  email: employee.email,
                  phone: employee.phone || '',
                  region: employee.region || ''
                });
              }}
              title="Edit Details"
              leadingIcon="pencil"
            />
            {employee.isActive ? (
              <Menu.Item
                onPress={() => {
                  setShowUserMenu(false);
                  setShowBlockDialog(true);
                }}
                title="Block User"
                leadingIcon="account-lock"
              />
            ) : (
              <Menu.Item
                onPress={() => {
                  setShowUserMenu(false);
                  handleUnblockUser();
                }}
                title="Unblock User"
                leadingIcon="account-check"
              />
            )}
            <Menu.Item
              onPress={() => {
                setShowUserMenu(false);
                setShowPasswordDialog(true);
                setPasswordAction('reset');
              }}
              title="Reset Password"
              leadingIcon="key-reset"
            />
            <Menu.Item
              onPress={() => {
                setShowUserMenu(false);
                setShowPasswordDialog(true);
                setPasswordAction('remove');
              }}
              title="Remove User"
              leadingIcon="account-remove"
            />
          </Menu>
        </View>
        <List.Item
          title="Name"
          description={employee.name || employee.fullName}
          left={props => <List.Icon {...props} icon="account" />}
        />
        <Divider />
        <List.Item
          title="Email"
          description={employee.email}
          left={props => <List.Icon {...props} icon="email" />}
        />
        <Divider />
        <List.Item
          title="Region"
          description={employee.region || 'N/A'}
          left={props => <List.Icon {...props} icon="map-marker" />}
        />
        <Divider />
        <List.Item
          title="Phone"
          description={employee.phone || 'N/A'}
          left={props => <List.Icon {...props} icon="phone" />}
        />
        <Divider />
        <List.Item
          title="Headquarters"
          description={employee.headquarters || 'Not set'}
          left={props => <List.Icon {...props} icon="office-building" />}
          right={() => (
            <Button mode="contained" onPress={() => {
              setNewHeadquarters(employee.headquarters || '');
              setEditingHeadquarters(true);
            }}>
              Edit
            </Button>
          )}
        />
        <Divider />
        <List.Item
          title="Daily Base Salary"
          description={employee.dailySalary ? `₹${employee.dailySalary}` : 'Not set'}
          left={props => <List.Icon {...props} icon="currency-inr" />}
          right={() => (
            <Button mode="contained" onPress={() => {
              setNewSalary(employee.dailySalary?.toString() || '');
              setEditingSalary(true);
            }}>
              Edit
            </Button>
          )}
        />
        <Divider />
        <List.Item
          title="Status"
          description={employee.isActive && employee.status === 'active' ? 'Active' : 'Inactive'}
          left={props => <List.Icon {...props} icon="account-check" />}
          right={() => (
            <Text style={{ color: employee.isActive && employee.status === 'active' ? '#4caf50' : '#f44336' }}>
              {employee.isActive && employee.status === 'active' ? '● Active' : '● Inactive'}
            </Text>
          )}
        />
      </Card.Content>
    </Card>
  );

  const renderExpenseSettings = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Expense Settings</Title>
        
        <List.Item
          title="Daily Allowance"
          description={employee.allowanceAmount ? `₹${employee.allowanceAmount}` : 'Not set'}
          left={props => <List.Icon {...props} icon="currency-inr" />}
          right={() => (
            <Button mode="contained" onPress={() => {
              setNewAllowance(employee.allowanceAmount?.toString() || '');
              setEditingAllowance(true);
            }}>
              Edit
            </Button>
          )}
        />
        <Divider />

        <List.Item
          title="Fare per Kilometer"
          description={`₹${farePerKm}`}
          left={props => <List.Icon {...props} icon="car" />}
          right={() => (
            <Button mode="contained" onPress={() => {
              setNewFareRate(farePerKm);
              setEditingFareRate(true);
            }}>
              Edit
            </Button>
          )}
        />
        <Divider />
        
        <Title style={styles.sectionTitle}>Locations & Distances</Title>
        <Button
          mode="contained"
          onPress={() => setEditingLocation(true)}
          style={styles.addButton}
        >
          Add New Location
        </Button>
        
        {locations.map((location, index) => (
          <List.Item
            key={location.id || index}
            title={location.name}
            description={`${location.distance} km`}
            right={() => (
              <IconButton
                icon="delete"
                onPress={() => deleteLocation(location.id)}
              />
            )}
          />
        ))}
      </Card.Content>
    </Card>
  );

  const renderActivitySummary = () => (
    <View style={styles.statsContainer}>
      <Card style={[styles.statsCard, styles.expandableCard]}>
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('ActivityDetails', {
              type: 'reports',
              title: 'Reports History',
              employeeId: employeeId
            });
          }}
        >
          <Card.Content>
            <Title>Reports</Title>
            <Paragraph style={styles.statNumber}>{activities.reports.length}</Paragraph>
            <Paragraph>Last 30 days</Paragraph>
            <View style={styles.cardFooter}>
              <Text style={styles.viewMoreText}>View Details</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
            </View>
          </Card.Content>
        </TouchableOpacity>
      </Card>

      <Card style={[styles.statsCard, styles.expandableCard]}>
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('ActivityDetails', {
              type: 'expenses',
              title: 'Expenses History',
              employeeId: employeeId
            });
          }}
        >
          <Card.Content>
            <Title>Expenses</Title>
            <Paragraph style={styles.statNumber}>{activities.expenses.length}</Paragraph>
            <Paragraph>Last 30 days</Paragraph>
            <View style={styles.cardFooter}>
              <Text style={styles.viewMoreText}>View Details</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
            </View>
          </Card.Content>
        </TouchableOpacity>
      </Card>

      <Card style={[styles.statsCard, styles.expandableCard]}>
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('ActivityDetails', {
              type: 'tourPlans',
              title: 'Tour Plans History',
              employeeId: employeeId
            });
          }}
        >
          <Card.Content>
            <Title>Tour Plans</Title>
            <Paragraph style={styles.statNumber}>{activities.tourPlans.length}</Paragraph>
            <Paragraph>Upcoming</Paragraph>
            <View style={styles.cardFooter}>
              <Text style={styles.viewMoreText}>View Details</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
            </View>
          </Card.Content>
        </TouchableOpacity>
      </Card>

      <Card style={[styles.statsCard, styles.expandableCard]}>
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('ActivityDetails', {
              type: 'orders',
              title: 'Orders History',
              employeeId: employeeId
            });
          }}
        >
          <Card.Content>
            <Title>Orders</Title>
            <Paragraph style={styles.statNumber}>{activities.orders.length}</Paragraph>
            <Paragraph>Last 30 days</Paragraph>
            <View style={styles.cardFooter}>
              <Text style={styles.viewMoreText}>View Details</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
            </View>
          </Card.Content>
        </TouchableOpacity>
      </Card>
    </View>
  );

  const renderRecentActivities = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Recent Activities</Title>
        
        <List.Accordion
          title="Recent Reports"
          left={props => <List.Icon {...props} icon="file-document" />}
        >
          {activities.reports.map(report => (
            <List.Item
              key={report.id}
              title={format(report.createdAt.toDate(), 'MMM d, yyyy')}
              description={report.summary}
              right={props => (
                <Text style={{
                  color: report.status === 'approved' ? '#4caf50' :
                         report.status === 'rejected' ? '#f44336' : '#ff9800'
                }}>
                  {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                </Text>
              )}
            />
          ))}
        </List.Accordion>

        <List.Accordion
          title="Recent Expenses"
          left={props => <List.Icon {...props} icon="currency-usd" />}
        >
          {activities.expenses.map(expense => (
            <List.Item
              key={expense.id}
              title={format(expense.createdAt.toDate(), 'MMM d, yyyy')}
              description={`${expense.category} - ₹${expense.amount}`}
              right={props => (
                <Text style={{
                  color: expense.status === 'approved' ? '#4caf50' :
                         expense.status === 'rejected' ? '#f44336' : '#ff9800'
                }}>
                  {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                </Text>
              )}
            />
          ))}
        </List.Accordion>

        <List.Accordion
          title="Upcoming Tour Plans"
          left={props => <List.Icon {...props} icon="calendar" />}
        >
          {activities.tourPlans.map(plan => (
            <List.Item
              key={plan.id}
              title={format(new Date(plan.date), 'MMM d, yyyy')}
              description={`${plan.location} - ${plan.objective}`}
              right={props => (
                <Text style={{
                  color: plan.status === 'approved' ? '#4caf50' :
                         plan.status === 'rejected' ? '#f44336' : '#ff9800'
                }}>
                  {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                </Text>
              )}
            />
          ))}
        </List.Accordion>

        <List.Accordion
          title="Recent Orders"
          left={props => <List.Icon {...props} icon="package-variant" />}
        >
          {activities.orders.map(order => (
            <List.Item
              key={order.id}
              title={format(order.createdAt.toDate(), 'MMM d, yyyy')}
              description={`${order.type} - ${order.productName}`}
              right={props => (
                <Text style={{
                  color: order.status === 'approved' ? '#4caf50' :
                         order.status === 'rejected' ? '#f44336' : '#ff9800'
                }}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Text>
              )}
            />
          ))}
        </List.Accordion>
      </Card.Content>
    </Card>
  );

  const renderMonthlySalesData = () => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Title>Monthly Sales Performance</Title>
          <Button 
            mode="contained" 
            onPress={() => setEditingTarget(true)} 
            style={styles.editTargetButton}
          >
            Edit Target
          </Button>
        </View>
        
        <View style={styles.salesHeader}>
          <View style={styles.salesTargetContainer}>
            <Text style={styles.salesLabel}>Current Month Target</Text>
            <Text style={styles.salesValue}>₹{monthlyTarget.toLocaleString()}</Text>
          </View>
          
          <View style={styles.salesCurrentContainer}>
            <Text style={styles.salesLabel}>Current Month Sales</Text>
            <Text style={styles.salesValue}>₹{currentMonthSales.toLocaleString()}</Text>
            <ProgressBar 
              progress={monthlyTarget > 0 ? Math.min(currentMonthSales / monthlyTarget, 1) : 0} 
              color={currentMonthSales >= monthlyTarget ? '#4caf50' : '#2196F3'}
              style={styles.progressBar}
            />
            <Text style={[styles.achievementText, {
              color: currentMonthSales >= monthlyTarget ? '#4caf50' : '#f44336'
            }]}>
              {monthlyTarget > 0 ? `${((currentMonthSales / monthlyTarget) * 100).toFixed(1)}%` : 'N/A'}
            </Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <Title style={styles.sectionTitle}>Last 6 Months Performance</Title>
        <DataTable>
          <DataTable.Header>
            <DataTable.Title>Month</DataTable.Title>
            <DataTable.Title numeric>Sales</DataTable.Title>
            <DataTable.Title numeric>Target</DataTable.Title>
            <DataTable.Title numeric>Achievement</DataTable.Title>
          </DataTable.Header>

          {monthlySalesHistory.map((month, index) => (
            <DataTable.Row key={index}>
              <DataTable.Cell>{month.month}</DataTable.Cell>
              <DataTable.Cell numeric>₹{month.sales.toLocaleString()}</DataTable.Cell>
              <DataTable.Cell numeric>₹{month.target.toLocaleString()}</DataTable.Cell>
              <DataTable.Cell numeric>
                <Text style={{
                  color: month.sales >= month.target ? '#4caf50' : '#f44336'
                }}>
                  {month.target > 0 ? `${((month.sales / month.target) * 100).toFixed(1)}%` : 'N/A'}
                </Text>
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>
        
        <Portal>
          <Modal visible={editingTarget} onDismiss={() => setEditingTarget(false)} contentContainerStyle={styles.modalContainer}>
            <Card>
              <Card.Title title="Set Monthly Target" subtitle={`For ${format(new Date(), 'MMMM yyyy')}`} />
              <Card.Content>
                <TextInput
                  label="Monthly Target (₹)"
                  value={newTarget}
                  onChangeText={setNewTarget}
                  keyboardType="numeric"
                  style={styles.input}
                />
                <Text style={styles.helperText}>
                  This will set the sales target for the current month ({format(new Date(), 'MMMM yyyy')}).
                </Text>
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => setEditingTarget(false)}>Cancel</Button>
                <Button onPress={updateMonthlyTarget} mode="contained">Save</Button>
              </Card.Actions>
            </Card>
          </Modal>
        </Portal>
      </Card.Content>
    </Card>
  );

  if (loading || !employee) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2196F3']}
            tintColor="#2196F3"
          />
        }
      >
        {renderEmployeeInfo()}
        {renderMonthlySalesData()}
        {renderExpenseSettings()}
        {renderActivitySummary()}
        {renderRecentActivities()}
        
        <Portal>
          <Modal visible={editingSalary} onDismiss={() => setEditingSalary(false)} contentContainerStyle={styles.modalContainer}>
            <Card>
              <Card.Title title="Update Daily Base Salary" />
              <Card.Content>
                <TextInput
                  label="Daily Base Salary (₹)"
                  value={newSalary}
                  onChangeText={setNewSalary}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => setEditingSalary(false)}>Cancel</Button>
                <Button onPress={updateBaseSalary} mode="contained">Save</Button>
              </Card.Actions>
            </Card>
          </Modal>

          <Modal visible={editingAllowance} onDismiss={() => setEditingAllowance(false)} contentContainerStyle={styles.modalContainer}>
            <Card>
              <Card.Title title="Update Daily Allowance" />
              <Card.Content>
                <TextInput
                  label="Daily Allowance (₹)"
                  value={newAllowance}
                  onChangeText={setNewAllowance}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => setEditingAllowance(false)}>Cancel</Button>
                <Button onPress={updateAllowance} mode="contained">Save</Button>
              </Card.Actions>
            </Card>
          </Modal>

          <Modal visible={editingFareRate} onDismiss={() => setEditingFareRate(false)} contentContainerStyle={styles.modalContainer}>
            <Card>
              <Card.Title title="Update Fare per Kilometer" />
              <Card.Content>
                <TextInput
                  label="Fare per Kilometer (₹)"
                  value={newFareRate}
                  onChangeText={setNewFareRate}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => setEditingFareRate(false)}>Cancel</Button>
                <Button onPress={updateFareRate} mode="contained">Save</Button>
              </Card.Actions>
            </Card>
          </Modal>

          <Modal visible={editingLocation} onDismiss={() => setEditingLocation(false)} contentContainerStyle={styles.modalContainer}>
            <Card>
              <Card.Content>
                <Title>Add New Location</Title>
                <Menu
                  visible={showSTPMenu}
                  onDismiss={() => setShowSTPMenu(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setShowSTPMenu(true)}
                      style={styles.input}
                    >
                      {selectedSTP || "Select Location*"}
                    </Button>
                  }
                >
                  {employee.headquarters ? 
                    getAvailableSTPs(employee.headquarters).map((stp) => (
                      <Menu.Item
                        key={stp.name}
                        onPress={() => {
                          setSelectedSTP(stp.name);
                          setShowSTPMenu(false);
                        }}
                        title={`${stp.name} ${stp.type === 'outstation' ? '(Outstation)' : ''}${stp.type === 'ex Headquarter' ? '(Ex Headquarter)' : ''}`}
                        
                      />
                      
                    ))
                    :
                    <Menu.Item
                      title="Set headquarters first"
                      disabled
                    />
                  }
                </Menu>
                <TextInput
                  label="Distance (km)"
                  value={newLocation.distance}
                  onChangeText={(text) => setNewLocation({ ...newLocation, distance: text })}
                  keyboardType="numeric"
                  style={styles.input}
                />
                <View style={styles.modalButtons}>
                  <Button onPress={() => {
                    setEditingLocation(false);
                    setSelectedSTP('');
                    setNewLocation({ name: '', distance: '' });
                  }} style={styles.modalButton}>
                    Cancel
                  </Button>
                  <Button mode="contained" onPress={addLocation} style={styles.modalButton}>
                    Save
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </Modal>

          <Modal visible={editingHeadquarters} onDismiss={() => setEditingHeadquarters(false)} contentContainerStyle={styles.modalContainer}>
            <Card>
              <Card.Title title="Update Headquarters" />
              <Card.Content>
                <Menu
                  visible={showHeadquartersMenu}
                  onDismiss={() => setShowHeadquartersMenu(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setShowHeadquartersMenu(true)}
                      style={styles.input}
                    >
                      {newHeadquarters || "Select Headquarters*"}
                    </Button>
                  }
                >
                  {Object.keys(HEADQUARTERS_CONFIG).map((headquarters) => (
                    <Menu.Item
                      key={headquarters}
                      onPress={() => {
                        setNewHeadquarters(headquarters);
                        setShowHeadquartersMenu(false);
                      }}
                      title={headquarters}
                    />
                  ))}
                </Menu>
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => setEditingHeadquarters(false)}>Cancel</Button>
                <Button onPress={updateHeadquarters} mode="contained">Save</Button>
              </Card.Actions>
            </Card>
          </Modal>

          <Dialog visible={showPasswordDialog} onDismiss={() => setShowPasswordDialog(false)}>
            <Dialog.Title>Admin Authentication Required</Dialog.Title>
            <Dialog.Content>
              <TextInput
                label="Admin Password"
                value={adminPassword}
                onChangeText={setAdminPassword}
                secureTextEntry
                style={styles.input}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowPasswordDialog(false)}>Cancel</Button>
              <Button onPress={handleRemoveUser} mode="contained">Confirm</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editTargetButton: {
    marginLeft: 8,
  },
  salesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  salesTargetContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginRight: 8,
  },
  salesCurrentContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginLeft: 8,
  },
  salesLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  salesValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
  },
  achievementText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 15,
    color: '#333',
  },
  divider: {
    marginVertical: 16,
  },
  modalContainer: {
    padding: 16,
    margin: 16,
    backgroundColor: '#fff',
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  helperText: {
    marginTop: 8,
    marginBottom: 16,
    fontSize: 12,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalButton: {
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 8,
  },
  statsCard: {
    width: '48%',
    marginBottom: 16,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  addButton: {
    marginBottom: 16,
  },
  expandableCard: {
    elevation: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  viewMoreText: {
    color: '#666',
    fontSize: 14,
    marginRight: 4,
  },
});

export default EmployeeDetails; 