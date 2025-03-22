import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { 
  TextInput, 
  Button, 
  Title, 
  Card, 
  Text, 
  DataTable,
  FAB,
  Portal,
  Modal
} from 'react-native-paper';
import { firestore } from '../../services/firebase';
import { collection, addDoc, query, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const LocationSettingsScreen = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    distance: ''
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const locationsQuery = query(collection(firestore, 'locations'));
      const locationsSnapshot = await getDocs(locationsQuery);
      const locationsData = [];
      locationsSnapshot.forEach((doc) => {
        locationsData.push({ id: doc.id, ...doc.data() });
      });
      setLocations(locationsData);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.distance) {
        alert('Please fill in all fields');
        return;
      }

      setLoading(true);
      const locationData = {
        name: formData.name,
        distance: parseFloat(formData.distance),
        createdAt: new Date()
      };

      await addDoc(collection(firestore, 'locations'), locationData);
      
      // Reset form
      setFormData({
        name: '',
        distance: ''
      });
      setShowForm(false);
      fetchLocations();
    } catch (error) {
      console.error('Error adding location:', error);
      alert('Error adding location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (locationId) => {
    try {
      if (!confirm('Are you sure you want to delete this location?')) {
        return;
      }

      setLoading(true);
      await deleteDoc(doc(firestore, 'locations', locationId));
      fetchLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
      alert('Error deleting location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Location Settings</Title>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Location</DataTable.Title>
              <DataTable.Title numeric>Distance (km)</DataTable.Title>
              <DataTable.Title>Actions</DataTable.Title>
            </DataTable.Header>

            {locations.map((location) => (
              <DataTable.Row key={location.id}>
                <DataTable.Cell>{location.name}</DataTable.Cell>
                <DataTable.Cell numeric>{location.distance}</DataTable.Cell>
                <DataTable.Cell>
                  <Button
                    mode="text"
                    onPress={() => handleDelete(location.id)}
                    textColor="red"
                  >
                    Delete
                  </Button>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </Card.Content>
      </Card>

      <Portal>
        <Modal
          visible={showForm}
          onDismiss={() => setShowForm(false)}
          contentContainerStyle={styles.modal}
        >
          <Title>Add New Location</Title>
          <TextInput
            label="Location Name"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            style={styles.input}
          />
          <TextInput
            label="Distance (km)"
            value={formData.distance}
            onChangeText={(text) => setFormData({ ...formData, distance: text })}
            keyboardType="numeric"
            style={styles.input}
          />
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitButton}
          >
            Add Location
          </Button>
        </Modal>
      </Portal>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowForm(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 10,
    elevation: 4,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
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
});

export default LocationSettingsScreen; 