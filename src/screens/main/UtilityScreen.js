import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { 
  TextInput, 
  Button, 
  Title, 
  Card, 
  Text, 
  DataTable, 
  FAB 
} from 'react-native-paper';
import { format } from 'date-fns';
import { firestore, auth } from '../../services/firebase';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import TypeSelector, { UTILITY_TYPES, PRIORITY_TYPES } from '../../components/TypeSelector';

const UtilityScreen = () => {
  const [utilities, setUtilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    priority: '',
    title: '',
    description: '',
    location: '',
    remarks: ''
  });

  useEffect(() => {
    fetchUtilities();
  }, []);

  const fetchUtilities = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const q = query(
        collection(firestore, 'utilities'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedUtilities = [];
      querySnapshot.forEach((doc) => {
        fetchedUtilities.push({ id: doc.id, ...doc.data() });
      });
      
      setUtilities(fetchedUtilities);
    } catch (error) {
      console.error('Error fetching utilities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeSelect = (type) => {
    setFormData({ ...formData, type });
    setShowTypeMenu(false);
  };

  const handlePrioritySelect = (priority) => {
    setFormData({ ...formData, priority });
    setShowPriorityMenu(false);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.type  || !formData.location) {
        alert('Please fill in all required fields');
        return;
      }

      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      await addDoc(collection(firestore, 'utilities'), {
        ...formData,
        userId,
        status: 'pending',
        createdAt: new Date(),
      });

      setFormData({
        type: '',
        priority: '',
        title: '',
        description: '',
        location: '',
        remarks: ''
      });
      setShowForm(false);
      fetchUtilities();
    } catch (error) {
      console.error('Error submitting utility request:', error);
      alert('Error submitting request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'approved':
        return { color: 'green' };
      case 'rejected':
        return { color: 'red' };
      default:
        return { color: 'orange' };
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return { color: 'red' };
      case 'medium':
        return { color: 'orange' };
      case 'low':
        return { color: 'green' };
      default:
        return {};
    }
  };

  return (
    <View style={styles.container}>
      {showForm ? (
        <ScrollView>
          <Card style={styles.formCard}>
            <Card.Content>
              <Title>New Utility Request</Title>
              
              <TypeSelector
                visible={showTypeMenu}
                onDismiss={() => setShowTypeMenu(!showTypeMenu)}
                onSelect={handleTypeSelect}
                types={UTILITY_TYPES}
                selectedType={formData.type}
                label="Select Request Type"
              />

              <TypeSelector
                visible={showPriorityMenu}
                onDismiss={() => setShowPriorityMenu(!showPriorityMenu)}
                onSelect={handlePrioritySelect}
                types={PRIORITY_TYPES}
                selectedType={formData.priority}
                label="Select Priority"
              />

              {/* <TextInput
                label="Title"
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                style={styles.input}
              /> */}

              <TextInput
                label="Description"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={3}
                style={styles.input}
              />

              <TextInput
                label="Location"
                value={formData.location}
                onChangeText={(text) => setFormData({ ...formData, location: text })}
                style={styles.input}
              />
              
              {/* <TextInput
                label="Remarks"
                value={formData.remarks}
                onChangeText={(text) => setFormData({ ...formData, remarks: text })}
                multiline
                style={styles.input}
              /> */}

              <Button 
                mode="contained" 
                onPress={handleSubmit}
                loading={loading}
                style={styles.submitButton}
              >
                Submit Request
              </Button>
            </Card.Content>
          </Card>
        </ScrollView>
      ) : (
        <ScrollView>
          <DataTable>
            <DataTable.Header style={styles.dataTableHeader}>
              <DataTable.Title>Date</DataTable.Title>
              <DataTable.Title>Type</DataTable.Title>
              <DataTable.Title>Title</DataTable.Title>
              <DataTable.Title>Priority</DataTable.Title>
              <DataTable.Title>Status</DataTable.Title>
            </DataTable.Header>

            {utilities.map((utility) => (
              <DataTable.Row key={utility.id}>
                <DataTable.Cell>
                  {format(utility.createdAt.toDate(), 'dd/MM/yyyy')}
                </DataTable.Cell>
                <DataTable.Cell>{utility.type}</DataTable.Cell>
                <DataTable.Cell>{utility.title}</DataTable.Cell>
                <DataTable.Cell>
                  <Text style={getPriorityStyle(utility.priority)}>
                    {utility.priority}
                  </Text>
                </DataTable.Cell>
                <DataTable.Cell>
                  <Text style={getStatusStyle(utility.status)}>
                    {utility.status.toUpperCase()}
                  </Text>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
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
    backgroundColor: '#fff',
  },
  formCard: {
    margin: 16,
    backgroundColor: '#fff',
  },
  input: {
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  dataTableHeader: {
    backgroundColor: '#CCCCFF',
  },
});

export default UtilityScreen; 