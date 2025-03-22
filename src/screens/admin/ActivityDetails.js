import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Card, Title, Text, ActivityIndicator, List, Divider, Searchbar } from 'react-native-paper';
import { firestore } from '../../services/firebase';
import { collection, query, getDocs, where, orderBy, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

const ActivityDetails = ({ route }) => {
  const { type, title, employeeId } = route.params;
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      let data = [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (type === 'orders') {
        // Fetch from both 'orders' and 'h-orders' collections
        const [ordersSnapshot, hOrdersSnapshot] = await Promise.all([
          getDocs(query(
            collection(firestore, 'orders'),
            where('userId', '==', employeeId),
            where('createdAt', '>=', thirtyDaysAgo),
            orderBy('createdAt', 'desc')
          )),
          getDocs(query(
            collection(firestore, 'h-orders'),
            where('userId', '==', employeeId),
            where('createdAt', '>=', thirtyDaysAgo),
            orderBy('createdAt', 'desc')
          ))
        ]);

        // Combine data from both collections
        const ordersData = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          orderType: 'regular'
        }));
        
        const hOrdersData = hOrdersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          orderType: 'h-order'
        }));

        data = [...ordersData, ...hOrdersData].sort((a, b) => 
          b.createdAt.toDate() - a.createdAt.toDate()
        );
      } else {
        // Handle other activity types
        let q;
        const baseQuery = collection(firestore, type);

        switch (type) {
          case 'reports':
          case 'expenses':
            q = query(
              baseQuery,
              where('userId', '==', employeeId),
              where('createdAt', '>=', thirtyDaysAgo),
              orderBy('createdAt', 'desc')
            );
            break;
          case 'tourPlans':
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            q = query(
              baseQuery,
              where('userId', '==', employeeId),
              where('date', '>=', today.toISOString().split('T')[0]),
              orderBy('date', 'desc')
            );
            break;
          default:
            throw new Error('Invalid activity type');
        }

        const snapshot = await getDocs(q);
        data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      setActivities(data);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchActivities();
    setRefreshing(false);
  };

  const filteredActivities = activities.filter(activity => {
    const searchLower = searchQuery.toLowerCase();
    switch (type) {
      case 'reports':
        return (
          activity.title?.toLowerCase().includes(searchLower) ||
          activity.summary?.toLowerCase().includes(searchLower) ||
          activity.description?.toLowerCase().includes(searchLower) ||
          activity.location?.toLowerCase().includes(searchLower) ||
          activity.status?.toLowerCase().includes(searchLower)
        );
      case 'expenses':
        return (
          activity.category?.toLowerCase().includes(searchLower) ||
          activity.description?.toLowerCase().includes(searchLower) ||
          activity.amount?.toString().includes(searchLower) ||
          activity.location?.toLowerCase().includes(searchLower)
        );
      case 'tourPlans':
        return (
          activity.location?.toLowerCase().includes(searchLower) ||
          activity.objective?.toLowerCase().includes(searchLower) ||
          activity.description?.toLowerCase().includes(searchLower)
        );
      case 'orders':
        return (
          activity.productName?.toLowerCase().includes(searchLower) ||
          activity.type?.toLowerCase().includes(searchLower) ||
          activity.description?.toLowerCase().includes(searchLower) ||
          (activity.totalAmount || activity.amount)?.toString().includes(searchLower)
        );
      default:
        return true;
    }
  });

  const renderActivityItem = (activity) => {
    switch (type) {
      case 'reports':
        return (
          <Card style={styles.activityCard} key={activity.id}>
            <Card.Content>
              <View style={styles.headerRow}>
                <Title>{format(activity.createdAt.toDate(), 'MMM d, yyyy')}</Title>
                <Text style={[styles.status, { color: getStatusColor(activity.status) }]}>
                  {activity.status}
                </Text>
              </View>
              <Text style={styles.title}>{activity.title}</Text>
              <Text style={styles.summary}>{activity.summary}</Text>
              {activity.description && (
                <Text style={styles.description}>{activity.description}</Text>
              )}
              {activity.location && (
                <Text style={styles.location}>Location: {activity.location}</Text>
              )}
              {activity.remarks && (
                <Text style={styles.remarks}>Remarks: {activity.remarks}</Text>
              )}
              {activity.rejectionReason && activity.status === 'rejected' && (
                <Text style={styles.rejectionReason}>Rejection Reason: {activity.rejectionReason}</Text>
              )}
            </Card.Content>
          </Card>
        );

      case 'expenses':
        return (
          <Card style={styles.activityCard} key={activity.id}>
            <Card.Content>
              <View style={styles.headerRow}>
                <Title>{format(activity.createdAt.toDate(), 'MMM d, yyyy')}</Title>
                <Text style={[styles.status, { color: getStatusColor(activity.status) }]}>
                  {activity.status}
                </Text>
              </View>
              <Text style={styles.category}>{activity.category}</Text>
              <Text style={styles.amount}>₹{activity.amount}</Text>
              {activity.description && (
                <Text style={styles.description}>{activity.description}</Text>
              )}
              {activity.location && (
                <Text style={styles.location}>Location: {activity.location}</Text>
              )}
              {activity.rejectionReason && activity.status === 'rejected' && (
                <Text style={styles.rejectionReason}>Rejection Reason: {activity.rejectionReason}</Text>
              )}
            </Card.Content>
          </Card>
        );

      case 'tourPlans':
        return (
          <Card style={styles.activityCard} key={activity.id}>
            <Card.Content>
              <View style={styles.headerRow}>
                <Title>{format(new Date(activity.date), 'MMM d, yyyy')}</Title>
                <Text style={[styles.status, { color: getStatusColor(activity.status) }]}>
                  {activity.status}
                </Text>
              </View>
              <Text style={styles.location}>Location: {activity.location}</Text>
              <Text style={styles.objective}>Objective: {activity.objective}</Text>
              {activity.description && (
                <Text style={styles.description}>{activity.description}</Text>
              )}
              {activity.rejectionReason && activity.status === 'rejected' && (
                <Text style={styles.rejectionReason}>Rejection Reason: {activity.rejectionReason}</Text>
              )}
            </Card.Content>
          </Card>
        );

      case 'orders':
        return (
          <Card style={styles.activityCard} key={activity.id}>
            <Card.Content>
              <View style={styles.headerRow}>
                <Title>{format(activity.createdAt.toDate(), 'MMM d, yyyy')}</Title>
                <Text style={[styles.status, { color: getStatusColor(activity.status) }]}>
                  {activity.status}
                </Text>
              </View>
              <Text style={styles.productName}>{activity.productName}</Text>
              <View style={styles.orderInfoRow}>
                <Text style={styles.orderType}>
                  Type: {activity.orderType === 'h-order' ? 'H-Order' : 'Regular Order'}
                </Text>
                <Text style={styles.amount}>₹{activity.totalAmount || activity.amount}</Text>
              </View>
              {activity.description && (
                <Text style={styles.description}>{activity.description}</Text>
              )}
              {activity.rejectionReason && activity.status === 'rejected' && (
                <Text style={styles.rejectionReason}>Rejection Reason: {activity.rejectionReason}</Text>
              )}
            </Card.Content>
          </Card>
        );

      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return '#4caf50';
      case 'rejected':
        return '#f44336';
      case 'pending':
        return '#ff9800';
      default:
        return '#666';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />
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
        {filteredActivities.length > 0 ? (
          filteredActivities.map(renderActivityItem)
        ) : (
          <Card style={styles.noDataCard}>
            <Card.Content>
              <Text style={styles.noDataText}>No activities found</Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    marginBottom: 16,
    elevation: 2,
  },
  activityCard: {
    marginBottom: 16,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  status: {
    textTransform: 'capitalize',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summary: {
    fontSize: 16,
    marginBottom: 8,
  },
  description: {
    color: '#666',
    marginTop: 8,
  },
  location: {
    color: '#666',
    marginTop: 4,
  },
  category: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  amount: {
    fontSize: 18,
    color: '#2196F3',
    marginVertical: 4,
  },
  objective: {
    fontSize: 16,
    marginVertical: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  orderType: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  remarks: {
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  rejectionReason: {
    color: '#f44336',
    marginTop: 8,
    fontStyle: 'italic',
  },
  noDataCard: {
    marginTop: 16,
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
});

export default ActivityDetails; 