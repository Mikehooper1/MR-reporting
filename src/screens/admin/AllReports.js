import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Card, Title, Text, DataTable, Searchbar, ActivityIndicator, Chip } from 'react-native-paper';
import { firestore } from '../../services/firebase';
import { collection, query, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';

const AllReports = () => {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const reportsQuery = query(
        collection(firestore, 'reports'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(reportsQuery);
      
      const reportsData = await Promise.all(querySnapshot.docs.map(async reportDoc => {
        const data = reportDoc.data();
        // Fetch user info for each report
        const userDocRef = doc(firestore, 'users', data.userId);
        const userDocSnap = await getDoc(userDocRef);
        const userData = userDocSnap.exists() ? userDocSnap.data() : null;
        
        return {
          id: reportDoc.id,
          ...data,
          userName: userData?.fullName || 'Unknown User',
          userCode: userData?.employeeCode || 'N/A'
        };
      }));
      
      setReports(reportsData);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = (
      report.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.userCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (selectedStatus === 'all') return matchesSearch;
    return matchesSearch && report.status === selectedStatus;
  });

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
        <Card style={styles.card}>
          <Card.Content>
            <Title>All Reports</Title>
            <Searchbar
              placeholder="Search reports..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
            />

            <ScrollView horizontal style={styles.filterContainer}>
              <Chip
                selected={selectedStatus === 'all'}
                onPress={() => setSelectedStatus('all')}
                style={styles.filterChip}
              >
                All ({reports.length})
              </Chip>
              <Chip
                selected={selectedStatus === 'pending'}
                onPress={() => setSelectedStatus('pending')}
                style={styles.filterChip}
              >
                Pending ({reports.filter(r => r.status === 'pending').length})
              </Chip>
              <Chip
                selected={selectedStatus === 'approved'}
                onPress={() => setSelectedStatus('approved')}
                style={styles.filterChip}
              >
                Approved ({reports.filter(r => r.status === 'approved').length})
              </Chip>
              <Chip
                selected={selectedStatus === 'rejected'}
                onPress={() => setSelectedStatus('rejected')}
                style={styles.filterChip}
              >
                Rejected ({reports.filter(r => r.status === 'rejected').length})
              </Chip>
            </ScrollView>

            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Date</DataTable.Title>
                <DataTable.Title>Employee</DataTable.Title>
                <DataTable.Title>Title</DataTable.Title>
                <DataTable.Title>Status</DataTable.Title>
              </DataTable.Header>

              {filteredReports.map((report) => (
                <DataTable.Row key={report.id}>
                  <DataTable.Cell>
                    {format(report.createdAt.toDate(), 'MMM d, yyyy')}
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <Text style={styles.employeeName}>{report.userName}</Text>
                    <Text style={styles.employeeCode}>{report.userCode}</Text>
                  </DataTable.Cell>
                  <DataTable.Cell>
                    {report.title || 'Daily Report'}
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <Text style={{ color: getStatusColor(report.status) }}>
                      {report.status.toUpperCase()}
                    </Text>
                  </DataTable.Cell>
                </DataTable.Row>
              ))}

              {filteredReports.length === 0 && (
                <DataTable.Row>
                  <DataTable.Cell style={styles.noDataCell}>
                    <Text style={styles.noDataText}>No reports found</Text>
                  </DataTable.Cell>
                </DataTable.Row>
              )}
            </DataTable>
          </Card.Content>
        </Card>
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
  card: {
    margin: 16,
    elevation: 2,
    backgroundColor: '#fff',
  },
  searchBar: {
    marginVertical: 16,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterChip: {
    marginRight: 8,
  },
  employeeName: {
    fontWeight: 'bold',
  },
  employeeCode: {
    fontSize: 12,
    color: '#666',
  },
  noDataCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },
  noDataText: {
    color: '#666',
    fontStyle: 'italic',
  },
});

export default AllReports; 