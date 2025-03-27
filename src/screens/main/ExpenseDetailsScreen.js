import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, Alert } from 'react-native';
import { 
  Button, 
  Card, 
  Title, 
  Text, 
  Switch,
  Divider,
  DataTable,
  TextInput,
  Menu
} from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { format, isSunday } from 'date-fns';
import { firestore, auth } from '../../services/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, getDoc, orderBy, deleteDoc } from 'firebase/firestore';

const ExpenseDetailsScreen = () => {
  const [isOnLeave, setIsOnLeave] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [savedDraft, setSavedDraft] = useState(null);
  const [formData, setFormData] = useState({
    reportDate: '',
    expenseType: 'Travel',
    doctorVisits: '0',
    chemistVisits: '0',
    tourPlan: '',
    visitType: '',
    location: '',
    allowanceAmount: '0',
    distance: '0',
    fare: '0.00'
  });
  const [loading, setLoading] = useState(false);
  const [otherExpenses, setOtherExpenses] = useState([]);
  const [showExpenseTypeMenu, setShowExpenseTypeMenu] = useState(false);
  const [newExpense, setNewExpense] = useState({
    type: '',
    date: '',
    remark: ''
  });
  const [monthlyTotals, setMonthlyTotals] = useState({
    totalAllowance: 0,
    totalFare: 0,
    totalOtherExpense: 0,
    totalBaseSalary: 0,
    grandTotal: 0
  });
  const [dailyReports, setDailyReports] = useState({});
  const [markedDates, setMarkedDates] = useState({});
  const [locations, setLocations] = useState([]);
  const [farePerKm, setFarePerKm] = useState(0);
  const [showLocationMenu, setShowLocationMenu] = useState(false);

  // Add useEffect to fetch daily reports when component mounts
  useEffect(() => {
    fetchDailyReports();
  }, []);

  // Add useEffect to fetch locations and fare rate when component mounts
  useEffect(() => {
    fetchLocationsAndFareRate();
  }, []);

  // Add function to fetch daily reports
  const fetchDailyReports = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const q = query(
        collection(firestore, 'reports'),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const reports = {};
      querySnapshot.forEach((doc) => {
        const report = doc.data();
        const dateStr = format(report.date.toDate(), 'yyyy-MM-dd');
        reports[dateStr] = report;
      });
      
      setDailyReports(reports);
      updateMarkedDates(reports);
    } catch (error) {
      console.error('Error fetching daily reports:', error);
    }
  };

  // Add function to update marked dates
  const updateMarkedDates = (reports) => {
    const newMarkedDates = {};
    
    // Mark all Sundays as red (off day)
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (isSunday(d)) {
        const dateString = format(d, 'yyyy-MM-dd');
        newMarkedDates[dateString] = {
          dots: [{ color: '#FF0000' }]
        };
      }
    }

    // Mark reports based on their type
    Object.entries(reports).forEach(([dateStr, report]) => {
      const dotColor = report.travelType === 'HQ' ? '#00FF00' : '#800080'; // Green for Headquarter, Purple for Interior
      
      if (newMarkedDates[dateStr]) {
        // If date already has a dot (Sunday), add the new dot
        newMarkedDates[dateStr].dots.push({ color: dotColor });
      } else {
        newMarkedDates[dateStr] = {
          dots: [{ color: dotColor }]
        };
      }
    });

    setMarkedDates(newMarkedDates);
  };

  // Add useEffect to fetch daily report when date is selected
  useEffect(() => {
    if (selectedDate) {
      fetchDailyReport();
      fetchSavedDraft();
      calculateMonthlyTotals();
    }
  }, [selectedDate]);

  const fetchDailyReport = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId || !selectedDate) return;

      // First fetch user's allowance settings
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      const userData = userDoc.data();
      const userAllowanceAmount = userData?.allowanceAmount || '0';

      // Fetch all locations configured by admin
      const locationsQuery = query(collection(firestore, 'locations'));
      const locationsSnapshot = await getDocs(locationsQuery);
      const locationDistances = {};
      locationsSnapshot.forEach((doc) => {
        const locationData = doc.data();
        locationDistances[locationData.name.toLowerCase()] = locationData.distance;
      });

      console.log('Fetching daily report for date:', selectedDate);

      // Convert selectedDate to a Date object for querying
      const reportDate = new Date(selectedDate);
      reportDate.setHours(0, 0, 0, 0);

      const reportsQuery = query(
        collection(firestore, 'reports'),
        where('userId', '==', userId),
        where('date', '>=', reportDate),
        where('date', '<=', new Date(reportDate.getTime() + 24 * 60 * 60 * 1000))
      );

      const querySnapshot = await getDocs(reportsQuery);
      
      if (!querySnapshot.empty) {
        // Get all reports for the day
        const dayReports = [];
        querySnapshot.forEach(doc => {
          const report = doc.data();
          console.log('Found report:', report);
          dayReports.push(report);
        });
        console.log('Found reports for the day:', dayReports);

        // Count doctor and chemist visits
        const doctorVisits = dayReports.filter(report => 
          report.hospital?.toLowerCase() === 'doctor' || report.hospital === 'Doctor'
        ).length.toString();

        const chemistVisits = dayReports.filter(report => 
          report.hospital?.toLowerCase() === 'chemist' || report.hospital === 'Chemist'
        ).length.toString();

        // Get travel type and location from the first report of the day
        const firstReport = dayReports[0];
        const visitType = firstReport.travelType === 'HQ' ? 'Local' : 'Interior';
        const location = firstReport.location || '';

        // Get distance from admin-configured locations
        let distance = '0';
        if (location && locationDistances[location.toLowerCase()]) {
          distance = locationDistances[location.toLowerCase()].toString();
        }

        // Use the allowance amount from user profile
        const allowanceAmount = userAllowanceAmount;

        // Update form with daily report data
        setFormData({
          reportDate: selectedDate,
          expenseType: 'Travel',
          doctorVisits,
          chemistVisits,
          tourPlan: firstReport?.stp || 'No tour plan found',
          visitType,
          location,
          allowanceAmount,
          distance,
          fare: firstReport.fare || '0.00'
        });

        console.log('Updated form data with:', {
          doctorVisits,
          chemistVisits,
          visitType,
          location,
          allowanceAmount,
          distance
        });
      } else {
        console.log('No daily reports found for:', selectedDate);
        // Reset form data if no daily report found
        setFormData({
          reportDate: selectedDate,
          expenseType: 'Travel',
          doctorVisits: '0',
          chemistVisits: '0',
          tourPlan: '',
          visitType: '',
          location: '',
          allowanceAmount: userAllowanceAmount,
          distance: '0',
          fare: '0.00'
        });
      }
    } catch (error) {
      console.error('Error fetching daily report:', error);
    }
  };

  const fetchSavedDraft = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId || !selectedDate) return;

      const dateParts = selectedDate.split('-');
      const formattedDate = `${dateParts[1]}-${dateParts[2]}`;

      const draftsQuery = query(
        collection(firestore, 'expenses'),
        where('userId', '==', userId),
        where('reportDate', '==', formattedDate),
        where('status', '==', 'draft')
      );

      const querySnapshot = await getDocs(draftsQuery);
      if (!querySnapshot.empty) {
        const draftDoc = querySnapshot.docs[0];
        const draftData = { id: draftDoc.id, ...draftDoc.data() };
        setSavedDraft(draftData);
        
        // Update form with draft data
        setFormData({
          reportDate: selectedDate,
          expenseType: draftData.expenseType || 'Travel',
          doctorVisits: draftData.doctorVisits || '0',
          chemistVisits: draftData.chemistVisits || '0',
          tourPlan: draftData.tourPlan || '',
          visitType: draftData.visitType || '',
          location: draftData.location || '',
          allowanceAmount: draftData.allowanceAmount || '0',
          distance: draftData.distance || '0',
          fare: draftData.fare || '0.00'
        });
      } else {
        setSavedDraft(null);
      }
    } catch (error) {
      console.error('Error fetching saved draft:', error);
    }
  };

  const handleSave = async () => {
    try {
      if (!selectedDate) {
        Alert.alert('Error', 'Please select a date');
        return;
      }

      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      setLoading(true);

      // Convert date to MM-DD format for consistency
      const dateParts = selectedDate.split('-');
      const formattedDate = `${dateParts[1]}-${dateParts[2]}`;

      // Check if draft already exists
      const draftsQuery = query(
        collection(firestore, 'expenses'),
        where('userId', '==', userId),
        where('reportDate', '==', formattedDate),
        where('status', '==', 'draft')
      );

      const querySnapshot = await getDocs(draftsQuery);
      
      const expenseData = {
        userId,
        ...formData,
        otherExpenses: otherExpenses,
        reportDate: formattedDate,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'draft',
        itemType: 'expense',
        requiresApproval: false
      };

      if (!querySnapshot.empty) {
        // Update existing draft
        const draftDoc = querySnapshot.docs[0];
        await updateDoc(doc(firestore, 'expenses', draftDoc.id), expenseData);
      } else {
        // Create new draft
        await addDoc(collection(firestore, 'expenses'), expenseData);
      }

      Alert.alert('Success', 'Expense saved as draft');
      // Refresh drafts
      fetchSavedDraft();
    } catch (error) {
      console.error('Error saving draft:', error);
      Alert.alert('Error', 'Failed to save draft. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!selectedDate) {
        Alert.alert('Error', 'Please select a date');
        return;
      }

      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      setLoading(true);

      // Convert date to MM-DD format for consistency
      const dateParts = selectedDate.split('-');
      const formattedDate = `${dateParts[1]}-${dateParts[2]}`;

      if (isOnLeave) {
        // Get user data for leave request
        const userDocRef = doc(firestore, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        let userName = 'Unknown User';
        const currentUser = auth.currentUser;
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          userName = userData.fullName || userData.name || userData.displayName || userData.email || 'Unknown User';
        } else {
          userName = currentUser.displayName || currentUser.email || 'Unknown User';
        }

        // Submit leave request with same format as LeaveScreen
        const leaveData = {
          userId,
          userName,
          userEmail: currentUser.email,
          type: 'Personal Leave',
          startDate: new Date(selectedDate),
          endDate: new Date(selectedDate),
          reason: 'Leave request submitted from Expense screen',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          itemType: 'leave'
        };

        await addDoc(collection(firestore, 'leaves'), leaveData);
        Alert.alert('Success', 'Leave request submitted successfully');
      } else {
        // Submit expense
        const expenseData = {
          userId,
          ...formData,
          otherExpenses: otherExpenses,
          reportDate: formattedDate,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'pending',
          itemType: 'expense',
          requiresApproval: true
        };
        await addDoc(collection(firestore, 'expenses'), expenseData);
        Alert.alert('Success', 'Expense submitted successfully');
      }

      // Clear form after successful submission
      setSelectedDate(null);
      setIsOnLeave(false);
      setFormData({
        reportDate: '',
        expenseType: 'Travel',
        doctorVisits: '0',
        chemistVisits: '0',
        tourPlan: '',
        visitType: '',
        location: '',
        allowanceAmount: '0',
        distance: '0',
        fare: '0.00'
      });
      setOtherExpenses([]);
      setSavedDraft(null);
    } catch (error) {
      console.error('Error submitting:', error);
      Alert.alert('Error', 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update the draft notification section
  const renderDraftNotification = () => {
    if (!savedDraft || !savedDraft.createdAt) return null;

    let dateStr;
    try {
      // Handle both Firestore Timestamp and regular Date objects
      const date = savedDraft.createdAt.toDate ? savedDraft.createdAt.toDate() : new Date(savedDraft.createdAt);
      dateStr = format(date, 'dd/MM/yyyy HH:mm');
    } catch (error) {
      console.error('Error formatting date:', error);
      dateStr = 'Unknown date';
    }

    const clearDraft = async () => {
      try {
        if (savedDraft.id) {
          // Delete the draft document from Firestore
          await deleteDoc(doc(firestore, 'expenses', savedDraft.id));
          
          // Reset local state
          setSavedDraft(null);
          // Reset form data when clearing draft
          setFormData({
            reportDate: selectedDate,
            expenseType: 'Travel',
            doctorVisits: '0',
            chemistVisits: '0',
            tourPlan: '',
            visitType: '',
            location: '',
            allowanceAmount: '0',
            distance: '0',
            fare: '0.00'
          });
          
          // Fetch daily report data again to restore the correct values
          fetchDailyReport();
        }
      } catch (error) {
        console.error('Error clearing draft:', error);
        Alert.alert('Error', 'Failed to clear draft. Please try again.');
      }
    };

    return (
      <View style={styles.draftContainer}>
        <Text style={styles.draftText}>
          Draft saved on {dateStr}
        </Text>
        <Button
          mode="text"
          onPress={clearDraft}
          style={styles.clearDraftButton}
        >
          Clear Draft
        </Button>
      </View>
    );
  };

  const calculateMonthlyTotals = async () => {
    try {
      if (!selectedDate) return;

      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const dateParts = selectedDate.split('-');
      const year = dateParts[0];
      const month = dateParts[1];

      // Get user's base salary first
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      const baseSalary = userDoc.exists() ? (userDoc.data().dailySalary || 0) : 0;
      
      console.log('Base salary fetched:', baseSalary); // Debug log

      // Query all expenses and leaves for the current month
      const expensesQuery = query(
        collection(firestore, 'expenses'),
        where('userId', '==', userId),
        where('status', 'in', ['pending', 'approved'])
      );

      const leavesQuery = query(
        collection(firestore, 'leaves'),
        where('userId', '==', userId),
        where('status', 'in', ['pending', 'approved'])
      );

      const [expensesSnapshot, leavesSnapshot] = await Promise.all([
        getDocs(expensesQuery),
        getDocs(leavesQuery)
      ]);

      let totalAllowance = 0;
      let totalFare = 0;
      let totalOtherExpense = 0;
      let totalBaseSalary = 0;
      let workingDays = 0;
      let leaveDates = new Set();

      // Collect all leave dates
      leavesSnapshot.forEach(doc => {
        const leave = doc.data();
        if (leave.startDate && leave.endDate) {
          const start = leave.startDate.toDate ? leave.startDate.toDate() : new Date(leave.startDate);
          const end = leave.endDate.toDate ? leave.endDate.toDate() : new Date(leave.endDate);
          
          // Add all dates between start and end to leaveDates
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = format(d, 'MM-dd');
            leaveDates.add(dateStr);
          }
        }
      });

      console.log('Leave dates:', Array.from(leaveDates)); // Debug log

      // Process expenses
      expensesSnapshot.forEach(doc => {
        const expense = doc.data();
        
        if (!expense.reportDate) return;

        // Handle both MM-DD and YYYY-MM-DD formats
        let expenseMonth;
        let expenseDay;
        if (expense.reportDate.includes('-')) {
          const parts = expense.reportDate.split('-');
          // If format is YYYY-MM-DD
          if (parts.length === 3) {
            expenseMonth = parts[1]; // Get month from YYYY-MM-DD
            expenseDay = parts[2];
          } else {
            expenseMonth = parts[0]; // Get month from MM-DD
            expenseDay = parts[1];
          }
        }

        // Only include expenses from the current month
        if (expenseMonth === month) {
          totalAllowance += parseFloat(expense.allowanceAmount) || 0;
          totalFare += parseFloat(expense.fare) || 0;
          
          // Calculate other expenses total
          if (expense.otherExpenses && Array.isArray(expense.otherExpenses)) {
            expense.otherExpenses.forEach(otherExpense => {
              totalOtherExpense += parseFloat(otherExpense.amount) || 0;
            });
          }

          // Add base salary if this day is not a leave day
          const dateStr = `${expenseMonth}-${expenseDay}`;
          if (!leaveDates.has(dateStr)) {
            totalBaseSalary += baseSalary;
            workingDays++;
          }
        }
      });

      // Add current form data if it exists and not on leave
      if (formData && !isOnLeave && selectedDate) {
        totalAllowance += parseFloat(formData.allowanceAmount) || 0;
        totalFare += parseFloat(formData.fare) || 0;
        
        // Add base salary for current day if not on leave
        const currentDateStr = format(new Date(selectedDate), 'MM-dd');
        if (!leaveDates.has(currentDateStr)) {
          totalBaseSalary += baseSalary;
          workingDays++;
        }
      }

      console.log('Monthly totals calculation:', {
        baseSalary,
        workingDays,
        totalBaseSalary,
        totalAllowance,
        totalFare,
        totalOtherExpense
      }); // Debug log

      const grandTotal = totalAllowance + totalFare + totalOtherExpense + totalBaseSalary;

      setMonthlyTotals({
        totalAllowance,
        totalFare,
        totalOtherExpense,
        totalBaseSalary,
        grandTotal
      });

    } catch (error) {
      console.error('Error calculating monthly totals:', error);
    }
  };

  // Add useEffect to recalculate totals when otherExpenses change
  useEffect(() => {
    calculateMonthlyTotals();
  }, [otherExpenses, formData.fare, formData.allowanceAmount]);

  const fetchLocationsAndFareRate = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Fetch user document to get locations
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Convert locations object to array format
        const locationsData = userData.locations ? Object.entries(userData.locations).map(([id, location]) => ({
          id,
          ...location
        })) : [];
        setLocations(locationsData);
      } else {
        setLocations([]);
      }

      // Fetch fare rate
      const settingsDoc = await getDoc(doc(firestore, 'settings', 'expense'));
      if (settingsDoc.exists()) {
        const fareRate = settingsDoc.data().farePerKm || 0;
        console.log('Fetched fare rate from settings:', fareRate);
        // Ensure fareRate is converted to a number
        const fareRateNum = Number(fareRate);
        setFarePerKm(fareRateNum);
        console.log('Fare per km set to:', fareRateNum);
      } else {
        console.error('No expense settings document found');
        setFarePerKm(0);
      }
    } catch (error) {
      console.error('Error fetching locations and fare rate:', error);
      setFarePerKm(0);
      setLocations([]);
    }
  };

  const calculateFare = (distance) => {
    const distanceNum = parseFloat(distance);
    const fareNum = parseFloat(farePerKm);
    
    console.log('Fare calculation details:', {
      distance: distanceNum,
      farePerKm: fareNum,
      isDistanceValid: !isNaN(distanceNum),
      isFareValid: !isNaN(fareNum)
    });

    if (isNaN(distanceNum) || isNaN(fareNum)) {
      console.warn('Invalid distance or fare rate');
      return '0.00';
    }
    
    const calculatedFare = (distanceNum * fareNum).toFixed(2);
    console.log('Calculated fare:', calculatedFare);
    return calculatedFare;
  };

  const handleLocationSelect = (location) => {
    console.log('Selected location:', location);
    console.log('Current fare per km:', farePerKm);
    
    const fare = calculateFare(location.distance);
    
    console.log('Setting form data with:', {
      location: location.name,
      distance: location.distance.toString(),
      fare: fare
    });

    setFormData(prevData => ({
      ...prevData,
      location: location.name,
      distance: location.distance.toString(),
      fare: fare
    }));
    
    setShowLocationMenu(false);
    // Recalculate monthly totals after updating fare
    calculateMonthlyTotals();
  };

  const renderOtherExpenses = () => (
    <View style={styles.otherExpensesSection}>
      <Title style={styles.sectionTitle}>Other Expenses</Title>
      
      {/* List of added expenses */}
      {otherExpenses.map((expense, index) => (
        <View key={index} style={styles.expenseItem}>
          <View style={styles.expenseItemHeader}>
            <Text style={styles.expenseType}>Type: {expense.type}</Text>
            <Text style={styles.expenseAmount}>₹{expense.amount || '0'}</Text>
          </View>
          <Text>Date: {expense.date}</Text>
          <Text>Remark: {expense.remark}</Text>
        </View>
      ))}

      {/* Add new expense form */}
      <View style={styles.addExpenseForm}>
        <Menu
          visible={showExpenseTypeMenu}
          onDismiss={() => setShowExpenseTypeMenu(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setShowExpenseTypeMenu(true)}
              style={styles.expenseTypeButton}
            >
              {newExpense.type || 'Select Expense Type'}
            </Button>
          }
        >
          <Menu.Item
            onPress={() => {
              setNewExpense({ ...newExpense, type: 'Food' });
              setShowExpenseTypeMenu(false);
            }}
            title="Food"
          />
          <Menu.Item
            onPress={() => {
              setNewExpense({ ...newExpense, type: 'Transport' });
              setShowExpenseTypeMenu(false);
            }}
            title="Transport"
          />
          <Menu.Item
            onPress={() => {
              setNewExpense({ ...newExpense, type: 'Accommodation' });
              setShowExpenseTypeMenu(false);
            }}
            title="Accommodation"
          />
          <Menu.Item
            onPress={() => {
              setNewExpense({ ...newExpense, type: 'Other' });
              setShowExpenseTypeMenu(false);
            }}
            title="Other"
          />
        </Menu>

        <TextInput
          label="Amount"
          value={newExpense.amount}
          onChangeText={(text) => setNewExpense({ ...newExpense, amount: text })}
          style={styles.expenseInput}
          keyboardType="numeric"
          placeholder="0.00"
        />

        <TextInput
          label="Date"
          value={newExpense.date}
          onChangeText={(text) => setNewExpense({ ...newExpense, date: text })}
          style={styles.expenseInput}
          placeholder="MM-DD"
        />

        <TextInput
          label="Remark"
          value={newExpense.remark}
          onChangeText={(text) => setNewExpense({ ...newExpense, remark: text })}
          style={styles.expenseInput}
        />

        <Button
          mode="contained"
          onPress={() => {
            if (newExpense.type && newExpense.date && newExpense.remark && newExpense.amount) {
              setOtherExpenses(prev => [...prev, newExpense]);
              setNewExpense({ type: '', date: '', remark: '', amount: '' });
            } else {
              Alert.alert('Error', 'Please fill in all fields');
            }
          }}
          style={styles.addButton}
        >
          Add
        </Button>
      </View>

      {/* Monthly Totals Section */}
      <Card style={styles.totalsCard}>
        <Card.Content>
          <Title>Monthly Totals</Title>
          <DataTable>
            <DataTable.Row>
              <DataTable.Cell>Total Base Salary</DataTable.Cell>
              <DataTable.Cell>₹{monthlyTotals.totalBaseSalary?.toFixed(2) || '0.00'}</DataTable.Cell>
            </DataTable.Row>
            <DataTable.Row>
              <DataTable.Cell>Total Allowance</DataTable.Cell>
              <DataTable.Cell>₹{monthlyTotals.totalAllowance.toFixed(2)}</DataTable.Cell>
            </DataTable.Row>
            <DataTable.Row>
              <DataTable.Cell>Total Fare</DataTable.Cell>
              <DataTable.Cell>₹{monthlyTotals.totalFare.toFixed(2)}</DataTable.Cell>
            </DataTable.Row>
            <DataTable.Row>
              <DataTable.Cell>Total Other Expense</DataTable.Cell>
              <DataTable.Cell>₹{monthlyTotals.totalOtherExpense.toFixed(2)}</DataTable.Cell>
            </DataTable.Row>
            <DataTable.Row style={styles.grandTotalRow}>
              <DataTable.Cell>Grand Total</DataTable.Cell>
              <DataTable.Cell>₹{monthlyTotals.grandTotal.toFixed(2)}</DataTable.Cell>
            </DataTable.Row>
          </DataTable>
        </Card.Content>
      </Card>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.formCard}>
        <Card.Content>
          <Title>Daily Report Entry</Title>

          {/* Leave Switch and Calendar Section */}
          <View style={styles.leaveSection}>
            <View style={styles.leaveContainer}>
              <Text style={styles.leaveText}>Mark as Leave Day</Text>
              <Switch
                value={isOnLeave}
                onValueChange={(value) => {
                  setIsOnLeave(value);
                  // Reset form data when switching to leave
                  if (value) {
                    setFormData({
                      reportDate: selectedDate,
                      expenseType: 'Travel',
                      doctorVisits: '0',
                      chemistVisits: '0',
                      tourPlan: '',
                      visitType: '',
                      location: '',
                      allowanceAmount: '0',
                      distance: '0',
                      fare: '0.00'
                    });
                  }
                }}
              />
            </View>
            
            <Calendar
              onDayPress={day => {
                setSelectedDate(day.dateString);
              }}
              markedDates={{
                ...markedDates,
                ...(selectedDate ? { [selectedDate]: { selected: true } } : {}),
                ...(savedDraft ? { [savedDraft.reportDate]: { marked: true, dotColor: 'orange' } } : {})
              }}
              style={styles.calendar}
            />
          </View>

          <Divider style={styles.divider} />

          {/* Show draft notification if exists */}
          {renderDraftNotification()}

          {/* Show expense details only if not on leave */}
          {!isOnLeave && selectedDate && (
            <>
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title>Field</DataTable.Title>
                  <DataTable.Title>Value</DataTable.Title>
                </DataTable.Header>

                <DataTable.Row>
                  <DataTable.Cell>Report Date</DataTable.Cell>
                  <DataTable.Cell>{selectedDate || 'Select date above'}</DataTable.Cell>
                </DataTable.Row>

                <DataTable.Row>
                  <DataTable.Cell>Expense Type</DataTable.Cell>
                  <DataTable.Cell>Travel</DataTable.Cell>
                </DataTable.Row>

                <DataTable.Row>
                  <DataTable.Cell>Doctor Visits</DataTable.Cell>
                  <DataTable.Cell>{formData.doctorVisits}</DataTable.Cell>
                </DataTable.Row>

                <DataTable.Row>
                  <DataTable.Cell>Chemist Visits</DataTable.Cell>
                  <DataTable.Cell>{formData.chemistVisits}</DataTable.Cell>
                </DataTable.Row>

                <DataTable.Row>
                  <DataTable.Cell>Tour Plan</DataTable.Cell>
                  <DataTable.Cell>{formData.tourPlan || 'No tour plan found'}</DataTable.Cell>
                </DataTable.Row>

                <DataTable.Row>
                  <DataTable.Cell>Visit Type</DataTable.Cell>
                  <DataTable.Cell>{formData.visitType || 'Not specified'}</DataTable.Cell>
                </DataTable.Row>

                <DataTable.Row>
                  <DataTable.Cell>Location</DataTable.Cell>
                  <DataTable.Cell>
                    <Menu
                      visible={showLocationMenu}
                      onDismiss={() => setShowLocationMenu(false)}
                      anchor={
                        <Button
                          mode="outlined"
                          onPress={() => setShowLocationMenu(true)}
                        >
                          {formData.location || 'Select Location'}
                        </Button>
                      }
                    >
                      {locations.map(location => (
                        <Menu.Item
                          key={location.id}
                          onPress={() => handleLocationSelect(location)}
                          title={`${location.name} (${location.distance} km)`}
                        />
                      ))}
                    </Menu>
                  </DataTable.Cell>
                </DataTable.Row>

                <DataTable.Row>
                  <DataTable.Cell>Allowance Amount</DataTable.Cell>
                  <DataTable.Cell>₹{formData.allowanceAmount}</DataTable.Cell>
                </DataTable.Row>

                <DataTable.Row>
                  <DataTable.Cell>Distance (km)</DataTable.Cell>
                  <DataTable.Cell>{formData.distance}</DataTable.Cell>
                </DataTable.Row>

                <DataTable.Row>
                  <DataTable.Cell>Fare </DataTable.Cell>
                  <DataTable.Cell>₹{formData.fare}</DataTable.Cell>
                </DataTable.Row>
              </DataTable>
            </>
          )}

          {/* Leave message when on leave */}
          {isOnLeave && selectedDate && (
            <View style={styles.leaveMessageContainer}>
              <Text style={styles.leaveMessage}>
                This day will be marked as leave. No expense details are required.
              </Text>
            </View>
          )}

          {/* Add Other Expenses section before the buttons */}
          {!isOnLeave && selectedDate && renderOtherExpenses()}

          {/* Action Buttons */}
          {selectedDate && (
            <View style={styles.buttonContainer}>
              {!isOnLeave && (
                <Button
                  mode="outlined"
                  onPress={handleSave}
                  loading={loading}
                  style={[styles.button, { marginBottom: 8 }]}
                >
                  Save as Draft
                </Button>
              )}

              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={loading}
                style={styles.button}
              >
                {isOnLeave ? 'Submit Leave Request' : 'Submit Expense'}
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  formCard: {
    margin: 16,
    backgroundColor: '#fff',
  },
  leaveSection: {
    marginBottom: 16,
  },
  leaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  leaveText: {
    fontSize: 16,
    fontWeight: '500',
  },
  calendar: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
  },
  divider: {
    marginVertical: 16,
  },
  draftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  draftText: {
    color: '#F57C00',
    flex: 1,
  },
  clearDraftButton: {
    marginLeft: 8,
  },
  leaveMessageContainer: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 4,
    marginBottom: 16,
  },
  leaveMessage: {
    color: '#2E7D32',
    textAlign: 'center',
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 16,
  },
  button: {
    width: '100%',
  },
  otherExpensesSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  addExpenseForm: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  expenseTypeButton: {
    marginBottom: 8,
  },
  expenseInput: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  addButton: {
    marginTop: 8,
  },
  expenseItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  totalsCard: {
    marginTop: 16,
    elevation: 2,
  },
  grandTotalRow: {
    backgroundColor: '#f5f5f5',
    fontWeight: 'bold',
  },
  expenseItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  expenseType: {
    fontWeight: 'bold',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
});

export default ExpenseDetailsScreen;
