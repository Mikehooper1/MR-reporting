import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, Platform, RefreshControl } from 'react-native';
import { 
  Card, 
  Title, 
  Text, 
  Button, 
  FAB,
  Portal,
  Dialog,
  TextInput,
  List,
  Divider,
  ActivityIndicator,
  IconButton,
  Chip,
  Menu
} from 'react-native-paper';
import { firestore, auth } from '../../services/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';

const LEAVE_TYPES = [
  'Annual Leave',
  'Sick Leave',
  'Personal Leave',
  'Emergency Leave',
  'Unpaid Leave'
];

const LeaveScreen = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showStartDate, setShowStartDate] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    startDate: new Date(),
    endDate: new Date(),
    reason: '',
    status: 'pending'
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const q = query(
        collection(firestore, 'leaves'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedLeaves = [];
      
      for (const doc of querySnapshot.docs) {
        const leaveData = doc.data();
        
        // If userName is 'Unknown User', try to fetch it again
        if (leaveData.userName === 'Unknown User') {
          const userDoc = await getDocs(query(
            collection(firestore, 'users'),
            where('uid', '==', leaveData.userId)
          ));
          
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            leaveData.userName = userData.fullName || userData.name || userData.displayName || userData.email || 'Unknown User';
          }
        }
        
        fetchedLeaves.push({ id: doc.id, ...leaveData });
      }
      
      console.log('Fetched leaves:', fetchedLeaves); // Add logging
      setLeaves(fetchedLeaves);
    } catch (error) {
      console.error('Error fetching leaves:', error);
      alert('Error fetching leaves. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.type || !formData.reason) {
        alert('Please fill in all required fields');
        return;
      }

      const userId = auth.currentUser?.uid;
      if (!userId) return;

      setLoading(true);

      // Log current user data from auth
      const currentUser = auth.currentUser;
      console.log('Current auth user:', {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        phoneNumber: currentUser.phoneNumber
      });

      // First try to get user data directly from the users collection
      const userDocRef = doc(firestore, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      
      let userName = 'Unknown User';
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        console.log('Found user data by direct ID:', userData);
        userName = userData.fullName || userData.name || userData.displayName || userData.email || 'Unknown User';
      } else {
        console.log('No user document found by direct ID, trying query...');
        // Try alternative query
        const userQuerySnapshot = await getDocs(query(
          collection(firestore, 'users'),
          where('email', '==', currentUser.email)
        ));

        if (!userQuerySnapshot.empty) {
          const userData = userQuerySnapshot.docs[0].data();
          console.log('Found user data by email query:', userData);
          userName = userData.fullName || userData.name || userData.displayName || currentUser.email || 'Unknown User';
        } else {
          console.log('No user document found by email either');
          // Use auth user data as fallback
          userName = currentUser.displayName || currentUser.email || 'Unknown User';
        }
      }

      const leaveData = {
        ...formData,
        userId,
        userName,
        userEmail: currentUser.email, // Add email for reference
        createdAt: new Date(),
      };
      console.log('Submitting leave with data:', leaveData);

      await addDoc(collection(firestore, 'leaves'), leaveData);

      setFormData({
        type: '',
        startDate: new Date(),
        endDate: new Date(),
        reason: '',
        status: 'pending'
      });
      setShowForm(false);
      fetchLeaves();
    } catch (error) {
      console.error('Error submitting leave:', error);
      alert('Error submitting leave request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return '#4CAF50';
      case 'rejected':
        return '#F44336';
      default:
        return '#FFC107';
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>No leave requests yet</Text>
      <Text style={styles.emptyStateSubText}>Click the + button to create a new request</Text>
    </View>
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchLeaves();
    } catch (error) {
      console.error('Error refreshing leaves:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      // Handle both Firestore Timestamp and regular Date objects
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  if (loading && !showForm) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading leaves...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showForm ? (
        <ScrollView>
          <Card style={styles.formCard}>
            <Card.Content>
              <Title>New Leave Request</Title>
              
              <Menu
                visible={showTypeMenu}
                onDismiss={() => setShowTypeMenu(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setShowTypeMenu(true)}
                    style={styles.input}
                  >
                    {formData.type || 'Select Leave Type*'}
                  </Button>
                }
              >
                {LEAVE_TYPES.map((type) => (
                  <Menu.Item
                    key={type}
                    onPress={() => {
                      setFormData({ ...formData, type });
                      setShowTypeMenu(false);
                    }}
                    title={type}
                  />
                ))}
              </Menu>

              <View style={styles.dateContainer}>
                <Button
                  mode="outlined"
                  onPress={() => setShowStartDate(true)}
                  style={styles.dateButton}
                >
                  Start Date: {formData.startDate.toLocaleDateString()}
                </Button>

                <Button
                  mode="outlined"
                  onPress={() => setShowEndDate(true)}
                  style={styles.dateButton}
                >
                  End Date: {formData.endDate.toLocaleDateString()}
                </Button>
              </View>

              {showStartDate && Platform.OS !== 'web' && (
                <DateTimePicker
                  value={formData.startDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowStartDate(false);
                    if (selectedDate) {
                      setFormData({ ...formData, startDate: selectedDate });
                    }
                  }}
                />
              )}

              {showEndDate && Platform.OS !== 'web' && (
                <DateTimePicker
                  value={formData.endDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowEndDate(false);
                    if (selectedDate) {
                      setFormData({ ...formData, endDate: selectedDate });
                    }
                  }}
                />
              )}

              <TextInput
                label="Reason*"
                value={formData.reason}
                onChangeText={(text) => setFormData({ ...formData, reason: text })}
                multiline
                numberOfLines={3}
                style={styles.input}
              />

              <View style={styles.formActions}>
                <Button 
                  mode="outlined" 
                  onPress={() => {
                    setShowForm(false);
                    setFormData({
                      type: '',
                      startDate: new Date(),
                      endDate: new Date(),
                      reason: '',
                      status: 'pending'
                    });
                  }}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
                <Button 
                  mode="contained" 
                  onPress={handleSubmit}
                  loading={loading}
                  style={styles.submitButton}
                >
                  Submit
                </Button>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      ) : (
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
          {leaves.length === 0 ? renderEmptyState() : (
            <List.Section>
              {leaves.map((leave) => (
                <Card key={leave.id} style={styles.leaveCard}>
                  <Card.Content>
                    <View style={styles.leaveHeader}>
                      <Title style={styles.leaveType}>{leave.type}</Title>
                      <Chip 
                        style={[styles.statusChip, { backgroundColor: getStatusColor(leave.status) }]}
                      >
                        {leave.status.toUpperCase()}
                      </Chip>
                    </View>
                    <Text style={styles.leaveDates}>
                      {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                    </Text>
                    <Text style={styles.leaveReason}>{leave.reason}</Text>
                    <Text style={styles.leaveDate}>
                      Requested on: {formatDate(leave.createdAt)}
                    </Text>
                  </Card.Content>
                </Card>
              ))}
            </List.Section>
          )}
        </ScrollView>
      )}

      <FAB
        style={styles.fab}
        icon={showForm ? 'close' : 'plus'}
        onPress={() => setShowForm(!showForm)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  formCard: {
    margin: 16,
  },
  input: {
    marginBottom: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  cancelButton: {
    marginRight: 8,
  },
  submitButton: {
    minWidth: 100,
  },
  leaveCard: {
    margin: 8,
    marginHorizontal: 16,
  },
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leaveType: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusChip: {
    height: 28,
  },
  leaveDates: {
    color: '#666',
    marginTop: 4,
    fontSize: 14,
  },
  leaveReason: {
    marginTop: 8,
    color: '#333',
  },
  leaveDate: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#999',
  },
  typeButton: {
    marginBottom: 16,
  },
});

export default LeaveScreen; 