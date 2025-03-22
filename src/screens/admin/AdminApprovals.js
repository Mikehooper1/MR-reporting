import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Image, Linking, TouchableOpacity, RefreshControl } from 'react-native';
import { Card, Title, List, Text, Button, ActivityIndicator, Chip, Portal, Dialog, TextInput } from 'react-native-paper';
import { firestore, storage } from '../../services/firebase';
import { collection, query, getDocs, where, doc, updateDoc, orderBy, getDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const AdminApprovals = () => {
  const [loading, setLoading] = useState(true);
  const [pendingItems, setPendingItems] = useState({
    reports: [],
    expenses: [],
    tourPlans: [],
    orders: [],
    visualAids: [],
    utilities: []
  });
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPendingItems();
  }, []);

  const fetchPendingItems = async () => {
    try {
      setLoading(true);
      const [reportsSnap, expensesSnap, tourPlansSnap, ordersSnap, visualAidsSnap, utilitiesSnap] = await Promise.all([
        getDocs(query(
          collection(firestore, 'reports'),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc')
        )),
        getDocs(query(
          collection(firestore, 'expenses'),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc')
        )),
        getDocs(query(
          collection(firestore, 'tourPlans'),
          where('status', '==', 'pending'),
          orderBy('date', 'desc')
        )),
        getDocs(query(
          collection(firestore, 'h-orders'),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc')
        )),
        getDocs(query(
          collection(firestore, 'visualAids'),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc')
        )),
        getDocs(query(
          collection(firestore, 'utilities'),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc')
        ))
      ]);

      // Helper function to get user info
      const getUserInfo = async (userId) => {
        try {
          if (!userId) {
            console.warn('No userId provided to getUserInfo');
            return null;
          }

          // First try with userId field
          let userDoc = await getDocs(query(
            collection(firestore, 'users'),
            where('userId', '==', userId)
          ));

          // If no results, try with uid field
          if (userDoc.empty) {
            userDoc = await getDocs(query(
              collection(firestore, 'users'),
              where('uid', '==', userId)
            ));
          }

          // If still no results, try searching by id
          if (userDoc.empty) {
            const directDoc = await getDoc(doc(firestore, 'users', userId));
            if (directDoc.exists()) {
              const userData = directDoc.data();
              return {
                userName: userData.fullName || userData.displayName || userData.name,
                userEmail: userData.email
              };
            }
          } else {
            const userData = userDoc.docs[0].data();
            return {
              userName: userData.fullName || userData.displayName || userData.name,
              userEmail: userData.email
            };
          }

          console.warn(`No user found for ID: ${userId}`);
          return null;
        } catch (error) {
          console.error('Error fetching user info:', error);
          return null;
        }
      };

      setPendingItems({
        reports: await Promise.all(reportsSnap.docs.map(async doc => {
          const data = doc.data();
          const userInfo = await getUserInfo(data.userId);
          return {
            id: doc.id,
            type: data.reportType || 'Daily Call Report',
            ...data,
            ...(userInfo || {})
          };
        })),
        expenses: await Promise.all(expensesSnap.docs.map(async doc => {
          const data = doc.data();
          const userInfo = await getUserInfo(data.userId);
          return {
            id: doc.id,
            type: data.expenseType || 'Travel',
            ...data,
            ...(userInfo || {})
          };
        })),
        tourPlans: await Promise.all(tourPlansSnap.docs.map(async doc => {
          const data = doc.data();
          const userInfo = await getUserInfo(data.userId);
          return {
            id: doc.id,
            type: 'tourPlan',
            ...doc.data(),
            ...(userInfo || {})
          };
        })),
        orders: await Promise.all(ordersSnap.docs.map(async doc => {
          const data = doc.data();
          const userInfo = await getUserInfo(data.userId);
          return {
            id: doc.id,
            type: 'order',
            ...doc.data(),
            ...(userInfo || {})
          };
        })),
        visualAids: await Promise.all(visualAidsSnap.docs.map(async doc => {
          const data = doc.data();
          const userInfo = await getUserInfo(data.userId);
          return {
            id: doc.id,
            type: 'visualAid',
            ...doc.data(),
            originalType: doc.data().type,
            ...(userInfo || {})
          };
        })),
        utilities: await Promise.all(utilitiesSnap.docs.map(async doc => {
          const data = doc.data();
          const userInfo = await getUserInfo(data.userId);
          return {
            id: doc.id,
            type: 'utility',
            ...doc.data(),
            ...(userInfo || {})
          };
        }))
      });
    } catch (error) {
      console.error('Error fetching pending items:', error);
      alert(`Error fetching pending items: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getCollectionName = (type) => {
    console.log('Getting collection name for type:', type);
    
    // Handle null or undefined type
    if (!type) {
      console.warn('Received null or undefined type');
      return '';
    }

    // Normalize the type to lowercase for consistent matching
    const normalizedType = type.toLowerCase();
    
    // Map of type patterns to collection names
    const typeMap = {
      'daily call report': 'reports',
      'weekly report': 'reports',
      'monthly report': 'reports',
      'travel': 'expenses',
      'food': 'expenses',
      'accommodation': 'expenses',
      'other': 'expenses',
      'leave': 'leaves',
      'personal leave': 'leaves',
      'tourplan': 'tourPlans',
      'order': 'h-orders',
      'visualaid': 'visualAids',
      'product presentation': 'visualAids',
      'clinical data': 'visualAids',
      'marketing material': 'visualAids',
      'training material': 'visualAids',
      'digital content': 'visualAids',
      'print material': 'visualAids',
      'bag': 'utilities',
      'visiting card': 'utilities',
      'other utility': 'utilities'
    };

    // Try exact match first
    const exactMatch = typeMap[normalizedType];
    if (exactMatch) {
      console.log('Found exact match:', exactMatch);
      return exactMatch;
    }

    // If no exact match, try pattern matching
    if (normalizedType.includes('report')) {
      console.log('Matched report pattern');
      return 'reports';
    }
    if (normalizedType.includes('expense')) {
      console.log('Matched expense pattern');
      return 'expenses';
    }
    if (normalizedType.includes('leave')) {
      console.log('Matched leave pattern');
      return 'leaves';
    }
    if (normalizedType.includes('visual') || normalizedType.includes('presentation')) {
      console.log('Matched visual aid pattern');
      return 'visualAids';
    }

    // Log warning for unmatched type
    console.warn(`No collection mapping found for type: ${type}`);
    return '';
  };

  const handleApprove = async (item) => {
    try {
      if (!item) {
        alert('No item selected for approval');
        return;
      }

      console.log('Approving item:', {
        id: item.id,
        type: item.type,
        originalType: item.originalType,
        itemType: item.itemType
      });

      const collectionName = getCollectionName(item.itemType || item.originalType || item.type);
      if (!collectionName) {
        throw new Error(`Invalid item type: ${item.type}`);
      }

      console.log('Resolved collection name:', collectionName);

      setLoading(true);
      
      // First verify the document exists
      const docRef = doc(firestore, collectionName, item.id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error(`Document not found: ${collectionName}/${item.id}`);
      }

      // If this is a report with a selfie, delete the selfie from storage
      if (collectionName === 'reports' && item.selfieUrl) {
        try {
          // Extract the file path from the selfie URL
          const selfieUrl = item.selfieUrl;
          const fileUrl = new URL(selfieUrl);
          const filePath = decodeURIComponent(fileUrl.pathname.split('/o/')[1].split('?')[0]);
          
          // Delete the file from storage
          const fileRef = ref(storage, filePath);
          await deleteObject(fileRef);
          console.log('Successfully deleted selfie from storage');
        } catch (error) {
          console.error('Error deleting selfie from storage:', error);
          // Continue with approval even if selfie deletion fails
        }
      }

      // Then update the document
      await updateDoc(docRef, {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: 'admin',
        lastUpdated: new Date()
      });
      
      console.log('Successfully approved item');

      await fetchPendingItems();
    } catch (error) {
      console.error('Error approving item:', error);
      alert(`Error approving item: ${error.message}\nPlease try again or refresh the page.`);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      if (!selectedItem || !rejectionReason) {
        alert('Please provide a reason for rejection');
        return;
      }

      console.log('Rejecting item:', {
        id: selectedItem.id,
        type: selectedItem.type,
        originalType: selectedItem.originalType,
        itemType: selectedItem.itemType
      });

      const collectionName = getCollectionName(selectedItem.itemType || selectedItem.originalType || selectedItem.type);
      if (!collectionName) {
        throw new Error(`Invalid item type: ${selectedItem.type}`);
      }

      console.log('Resolved collection name:', collectionName);

      setLoading(true);
      
      // First verify the document exists
      const docRef = doc(firestore, collectionName, selectedItem.id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error(`Document not found: ${collectionName}/${selectedItem.id}`);
      }

      // Then update it
      await updateDoc(docRef, {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: 'admin',
        rejectionReason,
        lastUpdated: new Date()
      });
      
      console.log('Successfully rejected item');
      
      setDialogVisible(false);
      setRejectionReason('');
      setSelectedItem(null);
      await fetchPendingItems();
    } catch (error) {
      console.error('Error rejecting item:', error);
      alert(`Error rejecting item: ${error.message}\nPlease try again or refresh the page.`);
    } finally {
      setLoading(false);
    }
  };

  const showRejectDialog = (item) => {
    setSelectedItem(item);
    setDialogVisible(true);
  };

  const filteredItems = () => {
    if (selectedFilter === 'all') {
      return [
        ...pendingItems.reports,
        ...pendingItems.expenses,
        ...pendingItems.tourPlans,
        ...pendingItems.orders,
        ...pendingItems.visualAids,
        ...pendingItems.utilities
      ].sort((a, b) => {
        try {
          const dateA = a.type === 'tourPlan' 
            ? (a.date ? new Date(a.date) : new Date(0))
            : (a.createdAt?.toDate?.() || new Date(0));
          const dateB = b.type === 'tourPlan'
            ? (b.date ? new Date(b.date) : new Date(0))
            : (b.createdAt?.toDate?.() || new Date(0));
          return dateB - dateA;
        } catch (error) {
          console.warn('Error sorting dates:', error);
          return 0;
        }
      });
    }
    return pendingItems[selectedFilter];
  };

  const formatDate = (date, isTourPlan = false) => {
    try {
      if (isTourPlan) {
        return date ? format(new Date(date), 'MMM d, yyyy') : 'No date';
      }
      return date?.toDate?.() ? format(date.toDate(), 'MMM d, yyyy') : 'No date';
    } catch (error) {
      console.warn('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const renderItemDetails = (item) => {
    const userInfo = item.userName ? `Submitted by: ${item.userName}` : 
                    item.userEmail ? `Submitted by: ${item.userEmail}` : 
                    'Submitted by: Unknown User';

    switch (item.type) {
      case 'Daily Call Report':
      case 'Weekly Report':
      case 'Monthly Report':
        return {
          title: `${item.type} - ${formatDate(item.createdAt)}`,
          description: `${userInfo}\n\n${item.description || item.summary}`,
          icon: 'file-document',
          selfieUrl: item.selfieUrl
        };
      case 'Travel':
      case 'Food':
      case 'Accommodation':
      case 'Other':
        const amount = item.amount || '0';
        const allowanceAmount = item.allowanceAmount || '0';
        const fare = item.fare || '0';
        const distance = item.distance || '0';
        const description = item.description || 'No details provided';
        const location = item.location || 'Not specified';
        const visitType = item.visitType || 'Not specified';
        const doctorVisits = item.doctorVisits || '0';
        const chemistVisits = item.chemistVisits || '0';
        
        return {
          title: `${item.type} Expense Details`,
          description: `${userInfo}\n\n` +
                      `Date: ${formatDate(item.createdAt)}\n` +
                      `Location: ${location}\n` +
                      `Visit Type: ${visitType}\n` +
                      `Distance: ${distance} km\n` +
                      `Doctor Visits: ${doctorVisits}\n` +
                      `Chemist Visits: ${chemistVisits}\n\n` +
                      `Allowance Amount: ₹${allowanceAmount}\n` +
                      `Travel Fare: ₹${fare}\n` +
                      `Other Amount: ₹${amount}\n` +
                      `Details: ${description}\n\n` +
                      `Total Amount: ₹${(parseFloat(allowanceAmount) + parseFloat(fare) + parseFloat(amount)).toFixed(2)}`,
          icon: 'currency-usd'
        };
      case 'tourPlan':
        return {
          title: `Tour Plan - ${formatDate(item.date, true)}`,
          description: `${userInfo}\n\nLocation: ${item.location}\nObjective: ${item.objective}`,
          icon: 'calendar'
        };
      case 'order':
        return {
          title: item.title || `Order: ${item.productName}`,
          description: `${userInfo}\n\n${item.description}`,
          icon: 'package-variant'
        };
      case 'visualAid':
        return {
          title: `${item.originalType || 'Visual Aid'} - ${item.title}`,
          description: `${userInfo}\n\nDate: ${formatDate(item.createdAt)}\n${item.description || 'No description'}`,
          icon: 'image'
        };
      case 'utility':
        const utilityType = item.utilityType || 'Other';
        return {
          title: `${utilityType} Request - ${item.title || ''}`,
          description: `${userInfo}\n\nPriority: ${item.priority || 'Normal'}\nLocation: ${item.location || 'N/A'}\n\n${item.description || ''}${item.remarks ? '\n\nRemarks: ' + item.remarks : ''}`,
          icon: utilityType.toLowerCase() === 'bag' ? 'bag-personal' : 
                utilityType.toLowerCase() === 'visiting card' ? 'card-account-details' : 
                'tools'
        };
      default:
        return {
          title: item.type || 'Unknown Item',
          description: `${userInfo}\n\n${item.description || ''}`,
          icon: 'help'
        };
    }
  };

  const handleOpenFile = async (fileUrl, fileName) => {
    try {
      if (!fileUrl) {
        alert('No file available to open');
        return;
      }

      // Check if the URL is accessible
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error('File not accessible');
      }

      // Open the file URL
      await Linking.openURL(fileUrl);
    } catch (error) {
      console.error('Error opening file:', error);
      alert('Unable to open the file. Please try again later.');
    }
  };

  const renderItemCard = (item) => {
    const details = renderItemDetails(item);
    
    return (
      <Card key={item.id} style={styles.itemCard}>
        <Card.Content>
          <View style={styles.itemHeader}>
            <MaterialCommunityIcons name={details.icon} size={24} color="#666" />
            <Title style={styles.itemTitle}>{details.title}</Title>
          </View>
          <Text style={styles.itemDescription}>{details.description}</Text>
          
          {details.selfieUrl && (
            <View style={styles.selfieContainer}>
              <Title style={styles.selfieTitle}>Site Verification Selfie</Title>
              <Image 
                source={{ uri: details.selfieUrl }} 
                style={styles.selfieImage}
              />
            </View>
          )}

          {item.type === 'visualAid' && item.fileUrl && (
            <View style={styles.fileContainer}>
              <TouchableOpacity 
                style={styles.fileButton}
                onPress={() => handleOpenFile(item.fileUrl, item.fileName)}
              >
                <MaterialCommunityIcons name="file-document" size={24} color="#2196F3" />
                <Text style={styles.fileButtonText}>
                  {item.fileName || 'View File'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.itemActions}>
            <Button
              mode="contained"
              onPress={() => handleApprove(item)}
              style={[styles.actionButton, styles.approveButton]}
            >
              Approve
            </Button>
            <Button
              mode="outlined"
              onPress={() => showRejectDialog(item)}
              style={[styles.actionButton, styles.rejectButton]}
            >
              Reject
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchPendingItems();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  if (loading) {
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
        <Title style={styles.screenTitle}>Pending Approvals</Title>
        
        <View style={styles.filterContainer}>
          <Chip
            selected={selectedFilter === 'all'}
            onPress={() => setSelectedFilter('all')}
            style={styles.filterChip}
          >
            All ({filteredItems().length})
          </Chip>
          <Chip
            selected={selectedFilter === 'reports'}
            onPress={() => setSelectedFilter('reports')}
            style={styles.filterChip}
          >
            Reports ({pendingItems.reports.length})
          </Chip>
          <Chip
            selected={selectedFilter === 'expenses'}
            onPress={() => setSelectedFilter('expenses')}
            style={styles.filterChip}
          >
            Expenses ({pendingItems.expenses.length})
          </Chip>
          <Chip
            selected={selectedFilter === 'tourPlans'}
            onPress={() => setSelectedFilter('tourPlans')}
            style={styles.filterChip}
          >
            Tour Plans ({pendingItems.tourPlans.length})
          </Chip>
          <Chip
            selected={selectedFilter === 'orders'}
            onPress={() => setSelectedFilter('orders')}
            style={styles.filterChip}
          >
            Orders ({pendingItems.orders.length})
          </Chip>
          <Chip
            selected={selectedFilter === 'visualAids'}
            onPress={() => setSelectedFilter('visualAids')}
            style={styles.filterChip}
          >
            Visual Aids ({pendingItems.visualAids.length})
          </Chip>
          <Chip
            selected={selectedFilter === 'utilities'}
            onPress={() => setSelectedFilter('utilities')}
            style={styles.filterChip}
          >
            Utilities ({pendingItems.utilities.length})
          </Chip>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <List.Section>
              {filteredItems().map((item) => renderItemCard(item))}
            </List.Section>
          </Card.Content>
        </Card>
      </ScrollView>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Reject Item</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Reason for Rejection"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              mode="outlined"
              multiline
              numberOfLines={3}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleReject} disabled={!rejectionReason}>Reject</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    margin: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  filterChip: {
    margin: 4,
  },
  card: {
    margin: 16,
    elevation: 2,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    marginHorizontal: 4,
    paddingHorizontal: 8,
  },
  approveButton: {
    backgroundColor: '#4caf50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  buttonLabel: {
    fontSize: 12,
  },
  itemCard: {
    marginBottom: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  itemDescription: {
    marginTop: 8,
    marginBottom: 16,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  selfieContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  selfieTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  selfieImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  fileContainer: {
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  fileButtonText: {
    marginLeft: 8,
    color: '#2196F3',
    fontSize: 16,
  },
});

export default AdminApprovals; 