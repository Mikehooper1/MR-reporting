import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { 
  Card, 
  Title, 
  Text, 
  Button, 
  ActivityIndicator,
  Chip,
  Divider 
} from 'react-native-paper';
import { firestore } from '../../services/firebase';
import { collection, query, where, getDocs, doc, updateDoc, orderBy, getDoc } from 'firebase/firestore';

const AdminLeaveApproval = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPendingLeaves();
  }, []);

  const fetchPendingLeaves = async () => {
    try {
      const q = query(
        collection(firestore, 'leaves'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedLeaves = [];
      querySnapshot.forEach((doc) => {
        fetchedLeaves.push({ id: doc.id, ...doc.data() });
      });
      
      setLeaves(fetchedLeaves);
    } catch (error) {
      console.error('Error fetching leaves:', error);
      alert('Error fetching leave requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveAction = async (leaveId, status) => {
    try {
      setLoading(true);
      
      // First, get the leave document to get the date and user info
      const leaveRef = doc(firestore, 'leaves', leaveId);
      const leaveDoc = await getDoc(leaveRef);
      
      if (!leaveDoc.exists()) {
        throw new Error('Leave document not found');
      }

      const leaveData = leaveDoc.data();

      // Update the leave status
      await updateDoc(leaveRef, {
        status,
        updatedAt: new Date(),
      });

      // Find and update the corresponding expense entry
      const expensesQuery = query(
        collection(firestore, 'expenses'),
        where('userId', '==', leaveData.userId),
        where('date', '==', leaveData.startDate),
        where('type', '==', 'Leave')
      );

      const expenseSnapshot = await getDocs(expensesQuery);
      
      if (!expenseSnapshot.empty) {
        const expenseDoc = expenseSnapshot.docs[0];
        await updateDoc(doc(firestore, 'expenses', expenseDoc.id), {
          status,
          updatedAt: new Date()
        });
      }
      
      // Refresh the list
      fetchPendingLeaves();
    } catch (error) {
      console.error('Error updating leave status:', error);
      alert('Error updating leave status. Please try again.');
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

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchPendingLeaves();
    } catch (error) {
      console.error('Error refreshing leaves:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading leave requests...</Text>
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
        {leaves.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No pending leave requests</Text>
          </View>
        ) : (
          leaves.map((leave) => (
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
                <Text style={styles.userName}>Requested by: {leave.userName}</Text>
                <Text style={styles.leaveDates}>
                  {leave.startDate ? (leave.startDate.toDate ? leave.startDate.toDate().toLocaleDateString() : new Date(leave.startDate).toLocaleDateString()) : 'N/A'} - 
                  {leave.endDate ? (leave.endDate.toDate ? leave.endDate.toDate().toLocaleDateString() : new Date(leave.endDate).toLocaleDateString()) : 'N/A'}
                </Text>
                <Text style={styles.leaveReason}>{leave.reason}</Text>
                <Divider style={styles.divider} />
                <View style={styles.actionButtons}>
                  <Button 
                    mode="contained" 
                    onPress={() => handleLeaveAction(leave.id, 'approved')}
                    style={[styles.actionButton, styles.approveButton]}
                  >
                    Approve
                  </Button>
                  <Button 
                    mode="contained" 
                    onPress={() => handleLeaveAction(leave.id, 'rejected')}
                    style={[styles.actionButton, styles.rejectButton]}
                  >
                    Reject
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
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
  userName: {
    color: '#666',
    marginTop: 4,
    fontSize: 14,
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
  divider: {
    marginVertical: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    marginLeft: 8,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
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
  },
});

export default AdminLeaveApproval; 