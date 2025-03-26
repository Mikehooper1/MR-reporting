import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { 
  TextInput, 
  Button, 
  Title, 
  Card, 
  Text,
  IconButton,
  Portal,
  FAB,
  Dialog,
  Searchbar,
  List,
  ActivityIndicator,
  Chip
} from 'react-native-paper';
import { firestore } from '../../services/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import VisualAidGallery from '../../components/VisualAidGallery';

const DoctorMedicinesScreen = ({ route }) => {
  const { doctorId, doctorName } = route.params;
  const [medicines, setMedicines] = useState([]);
  const [allMedicines, setAllMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [initialGalleryIndex, setInitialGalleryIndex] = useState(0);

  useEffect(() => {
    fetchDoctorMedicines();
    fetchAllMedicines();
  }, [doctorId]);

  const fetchDoctorMedicines = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(firestore, 'doctorMedicines'),
        where('doctorId', '==', doctorId),
        orderBy('medicineName', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedMedicines = [];
      querySnapshot.forEach((doc) => {
        fetchedMedicines.push({ id: doc.id, ...doc.data() });
      });
      
      setMedicines(fetchedMedicines);
    } catch (error) {
      console.error('Error fetching doctor medicines:', error);
      alert('Error fetching medicines. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllMedicines = async () => {
    try {
      const q = query(
        collection(firestore, 'medicines'),
        orderBy('name', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedMedicines = [];
      querySnapshot.forEach((doc) => {
        fetchedMedicines.push({ id: doc.id, ...doc.data() });
      });
      
      setAllMedicines(fetchedMedicines);
    } catch (error) {
      console.error('Error fetching all medicines:', error);
    }
  };

  const handleAddMedicine = async () => {
    try {
      if (!selectedMedicine) return;

      // Check if medicine is already assigned
      const existingMedicine = medicines.find(m => m.medicineId === selectedMedicine.id);
      if (existingMedicine) {
        alert('This medicine is already assigned to the doctor.');
        return;
      }

      setLoading(true);

      const docData = {
        doctorId,
        doctorName,
        medicineId: selectedMedicine.id,
        medicineName: selectedMedicine.name,
        category: selectedMedicine.category,
        manufacturer: selectedMedicine.manufacturer,
        description: selectedMedicine.description,
        visualAidUrl: selectedMedicine.visualAidUrl || '',
        visualAidFileName: selectedMedicine.visualAidFileName || '',
        assignedAt: new Date()
      };

      await addDoc(collection(firestore, 'doctorMedicines'), docData);

      setShowAddDialog(false);
      setSelectedMedicine(null);
      setSearchQuery('');
      fetchDoctorMedicines();
    } catch (error) {
      console.error('Error adding medicine to doctor:', error);
      alert('Error adding medicine. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMedicine = async (medicineId) => {
    try {
      await deleteDoc(doc(firestore, 'doctorMedicines', medicineId));
      fetchDoctorMedicines();
    } catch (error) {
      console.error('Error removing medicine:', error);
      alert('Error removing medicine. Please try again.');
    }
  };

  const handleOpenVisualAid = (index) => {
    const medicinesWithVisualAids = medicines.filter(med => med.visualAidUrl);
    if (medicinesWithVisualAids.length > 0) {
      setInitialGalleryIndex(index);
      setGalleryVisible(true);
    }
  };

  const filteredMedicines = allMedicines.filter(medicine => 
    medicine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    medicine.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (medicine.manufacturer && medicine.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading medicines...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title style={styles.title}>Dr. {doctorName}</Title>
          <Text style={styles.subtitle}>{medicines.length} Medicines Assigned</Text>
        </Card.Content>
      </Card>

      <ScrollView>
        {medicines.map((medicine, index) => (
          <TouchableOpacity
            key={medicine.id}
            onPress={() => medicine.visualAidUrl && handleOpenVisualAid(
              medicines.filter(med => med.visualAidUrl).findIndex(
                med => med.id === medicine.id
              )
            )}
          >
            <Card style={styles.medicineCard}>
              <Card.Content>
                <View style={styles.medicineHeader}>
                  <Title style={styles.medicineName}>{medicine.medicineName}</Title>
                  <IconButton
                    icon="delete"
                    size={24}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleRemoveMedicine(medicine.id);
                    }}
                  />
                </View>
                <View style={styles.chipContainer}>
                  <Chip style={styles.categoryChip}>{medicine.category}</Chip>
                  {medicine.visualAidUrl && (
                    <Chip 
                      icon={() => <MaterialCommunityIcons name="file-image" size={16} color="#2196F3" />}
                      style={styles.visualAidChip}
                    >
                      Has Visual Aid
                    </Chip>
                  )}
                </View>
                {medicine.description && (
                  <Text style={styles.medicineDescription}>{medicine.description}</Text>
                )}
                {medicine.manufacturer && (
                  <Text style={styles.medicineManufacturer}>
                    Manufacturer: {medicine.manufacturer}
                  </Text>
                )}
                <Text style={styles.assignedDate}>
                  Assigned: {medicine.assignedAt.toDate().toLocaleDateString()}
                </Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Portal>
        <Dialog visible={showAddDialog} onDismiss={() => setShowAddDialog(false)}>
          <Dialog.Title>Add Medicine</Dialog.Title>
          <Dialog.Content>
            <Searchbar
              placeholder="Search medicines by name, category, or manufacturer"
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
            />
            <ScrollView style={styles.searchResults}>
              {filteredMedicines.length === 0 ? (
                <Text style={styles.noResults}>No medicines found</Text>
              ) : (
                filteredMedicines.map((medicine) => (
                  <List.Item
                    key={medicine.id}
                    title={medicine.name}
                    description={`${medicine.category}${medicine.visualAidUrl ? ' • Has Visual Aid' : ''}`}
                    onPress={() => setSelectedMedicine(medicine)}
                    left={props => (
                      <List.Icon {...props} icon={selectedMedicine?.id === medicine.id ? "check" : "pill"} />
                    )}
                    right={props => 
                      medicine.visualAidUrl ? (
                        <MaterialCommunityIcons {...props} name="file-image" size={24} color="#2196F3" />
                      ) : null
                    }
                  />
                ))
              )}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => {
              setShowAddDialog(false);
              setSelectedMedicine(null);
              setSearchQuery('');
            }}>Cancel</Button>
            <Button 
              onPress={handleAddMedicine}
              disabled={!selectedMedicine}
              mode="contained"
            >
              Add
            </Button>
          </Dialog.Actions>
        </Dialog>

        <VisualAidGallery
          visible={galleryVisible}
          onDismiss={() => setGalleryVisible(false)}
          visualAids={medicines.filter(med => med.visualAidUrl)}
          initialIndex={initialGalleryIndex}
        />
      </Portal>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setShowAddDialog(true)}
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
  headerCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  medicineCard: {
    margin: 8,
    marginHorizontal: 16,
    elevation: 2,
    backgroundColor: '#fff',
  },
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medicineName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  chipContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 8,
  },
  categoryChip: {
    marginRight: 8,
    backgroundColor: '#e3f2fd',
  },
  visualAidChip: {
    backgroundColor: '#e8f5e9',
  },
  medicineDescription: {
    marginTop: 8,
    color: '#666',
  },
  medicineManufacturer: {
    marginTop: 4,
    color: '#666',
    fontStyle: 'italic',
  },
  assignedDate: {
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
  searchBar: {
    marginBottom: 16,
  },
  searchResults: {
    maxHeight: 300,
  },
  noResults: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  }
});

export default DoctorMedicinesScreen; 