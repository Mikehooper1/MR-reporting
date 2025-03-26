import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Linking, Dimensions, Image } from 'react-native';
import { 
  TextInput, 
  Button, 
  Title, 
  Card, 
  Text, 
  DataTable, 
  FAB,
  IconButton,
  List,
  Divider,
  Portal,
  Dialog,
  Searchbar,
  ActivityIndicator,
} from 'react-native-paper';
import { WebView } from 'react-native-webview';
import { firestore, auth } from '../../services/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import * as DocumentPicker from 'expo-document-picker';
import { uploadFile } from '../../services/storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { createVisualAid } from '../../services/database';
import VisualAidGallery from '../../components/VisualAidGallery';

const MedicinesListScreen = () => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showVisualAidDialog, setShowVisualAidDialog] = useState(false);
  const [showMedicineCategoryMenu, setShowMedicineCategoryMenu] = useState(false);
  const [showVisualAidCategoryMenu, setShowVisualAidCategoryMenu] = useState(false);
  const [visualAids, setVisualAids] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVisualAid, setSelectedVisualAid] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    manufacturer: '',
    visualAidUrl: '',
    visualAidFileName: '',
    visualAidTitle: '',
    visualAidCategory: ''
  });
  const [showVisualAidPreview, setShowVisualAidPreview] = useState(false);
  const [currentVisualAid, setCurrentVisualAid] = useState(null);
  const [visualAidLoading, setVisualAidLoading] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [visualAidsForGallery, setVisualAidsForGallery] = useState([]);
  const [initialGalleryIndex, setInitialGalleryIndex] = useState(0);

  useEffect(() => {
    fetchMedicines();
    fetchVisualAids();
  }, []);

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(firestore, 'medicines'),
        orderBy('name', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedMedicines = [];
      querySnapshot.forEach((doc) => {
        fetchedMedicines.push({ id: doc.id, ...doc.data() });
      });
      
      setMedicines(fetchedMedicines);
    } catch (error) {
      console.error('Error fetching medicines:', error);
      alert('Error fetching medicines. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchVisualAids = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const q = query(
        collection(firestore, 'visualAids'),
        where('userId', '==', userId),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedVisualAids = [];
      querySnapshot.forEach((doc) => {
        fetchedVisualAids.push({ id: doc.id, ...doc.data() });
      });
      
      setVisualAids(fetchedVisualAids);
    } catch (error) {
      console.error('Error fetching visual aids:', error);
    }
  };

  const handleSelectVisualAid = (visualAid) => {
    setSelectedVisualAid(visualAid);
    setFormData(prev => ({
      ...prev,
      visualAidUrl: visualAid.fileUrl,
      visualAidFileName: visualAid.fileName,
      visualAidTitle: visualAid.title,
      visualAidCategory: visualAid.category,
      category: visualAid.category || prev.category,
      description: visualAid.description ? 
        `${prev.description ? prev.description + '\n\n' : ''}Related to: ${visualAid.description}` : 
        prev.description
    }));
    setShowVisualAidDialog(false);
  };

  const filteredVisualAids = visualAids.filter(aid => 
    aid.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    aid.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    aid.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        copyToCacheDirectory: true
      });

      if (result.type === 'success') {
        const fileExt = result.name.split('.').pop().toLowerCase();
        const fileType = fileExt === 'pdf' ? 'application/pdf' : `image/${fileExt}`;
        
        setSelectedFile({
          uri: result.uri,
          name: result.name,
          type: fileType
        });

        setFormData(prev => ({
          ...prev,
          visualAidFileName: result.name,
          visualAidTitle: result.name.split('.')[0],
        }));
      }
    } catch (error) {
      console.error('Error picking file:', error);
      alert('Error selecting file. Please try again.');
    }
  };

  const isValidFileType = (fileName) => {
    const validExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    const fileExt = fileName.split('.').pop().toLowerCase();
    return validExtensions.includes(fileExt);
  };

  const uploadVisualAidFile = async (uri) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      if (!isValidFileType(selectedFile.name)) {
        throw new Error('Invalid file type. Please upload PDF, JPG, or PNG files only.');
      }

      const timestamp = Date.now();
      const fileName = `medicine-visual-aids/${userId}/${timestamp}-${selectedFile.name}`;

      console.log('Starting upload with:', {
        uri,
        fileName,
        fileType: selectedFile.type,
        userId
      });

      const downloadUrl = await uploadFile(uri, fileName, userId);
      return downloadUrl;
    } catch (error) {
      console.error('Error in uploadVisualAidFile:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.category) {
        alert('Please fill in all required fields');
        return;
      }

      setLoading(true);

      let visualAidUrl = formData.visualAidUrl;
      let visualAidFileName = formData.visualAidFileName;
      let visualAidTitle = formData.visualAidTitle;

      if (selectedFile) {
        visualAidUrl = await uploadVisualAidFile(selectedFile.uri);
        visualAidFileName = selectedFile.name;
        visualAidTitle = selectedFile.name;

        await createVisualAid({
          title: visualAidTitle,
          description: `Visual aid for ${formData.name}`,
          category: formData.category,
          fileUrl: visualAidUrl,
          fileName: visualAidFileName,
          fileType: selectedFile.type,
          userId: auth.currentUser?.uid,
          uploadedBy: auth.currentUser?.displayName || 'Unknown User',
          uploadedAt: new Date(),
          status: 'approved'
        });
      }

      await addDoc(collection(firestore, 'medicines'), {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        manufacturer: formData.manufacturer,
        visualAidUrl,
        visualAidFileName,
        visualAidTitle,
        createdAt: new Date(),
      });

      setFormData({
        name: '',
        description: '',
        category: '',
        manufacturer: '',
        visualAidUrl: '',
        visualAidFileName: '',
        visualAidTitle: '',
        visualAidCategory: ''
      });
      setSelectedFile(null);
      setSelectedVisualAid(null);
      setShowForm(false);
      fetchMedicines();
      fetchVisualAids();
    } catch (error) {
      console.error('Error adding medicine:', error);
      alert('Error adding medicine. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (medicineId) => {
    try {
      await deleteDoc(doc(firestore, 'medicines', medicineId));
      fetchMedicines();
    } catch (error) {
      console.error('Error deleting medicine:', error);
      alert('Error deleting medicine. Please try again.');
    }
  };

  const handleOpenFile = async (fileUrl, fileName, title) => {
    try {
      if (!fileUrl) {
        alert('No visual aid available for this medicine');
        return;
      }

      // Create a list of all medicines with visual aids
      const visualAidsWithFiles = medicines.filter(med => med.visualAidUrl);
      
      // Log all available visual aids for debugging
      console.log('Processing visual aids:', visualAidsWithFiles.map(med => ({
        url: med.visualAidUrl,
        name: med.name,
        fileName: med.visualAidFileName,
        title: med.visualAidTitle
      })));
      
      // Find the index of the current visual aid
      const currentIndex = visualAidsWithFiles.findIndex(med => med.visualAidUrl === fileUrl);
      
      // Format the visual aids for the gallery with all necessary fields
      const formattedVisualAids = visualAidsWithFiles.map(medicine => ({
        visualAidUrl: medicine.visualAidUrl,  // Don't modify the URL, it's already in the correct format
        medicineName: medicine.name,
        title: medicine.visualAidTitle || medicine.name,
        fileName: medicine.visualAidFileName,
        description: medicine.description,
        category: medicine.category
      }));

      console.log('Opening gallery with:', {
        totalVisualAids: formattedVisualAids.length,
        currentIndex,
        currentVisualAid: formattedVisualAids[currentIndex]
      });

      setVisualAidsForGallery(formattedVisualAids);
      setInitialGalleryIndex(Math.max(0, currentIndex));
      setGalleryVisible(true);
    } catch (error) {
      console.error('Error opening file:', error);
      alert('Unable to open the visual aid. Please try again later.');
    }
  };

  return (
    <View style={styles.container}>
      {showForm ? (
        <ScrollView>
          <Card style={styles.formCard}>
            <Card.Content>
              <TextInput
                label="Medicine Name*"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                style={styles.input}
              />
              <TextInput
                label="Description"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={3}
                style={styles.input}
              />
              <TextInput
                label="Category*"
                value={formData.category}
                onChangeText={(text) => setFormData({ ...formData, category: text })}
                style={styles.input}
              />
              <TextInput
                label="Manufacturer"
                value={formData.manufacturer}
                onChangeText={(text) => setFormData({ ...formData, manufacturer: text })}
                style={styles.input}
              />
              
              <View style={styles.visualAidSection}>
                <Title style={styles.sectionTitle}>Visual Aid</Title>
                
                {selectedVisualAid ? (
                  <Card style={styles.selectedVisualAidCard}>
                    <Card.Content>
                      <Text style={styles.visualAidTitle}>{selectedVisualAid.title}</Text>
                      <Text style={styles.visualAidInfo}>
                        Category: {selectedVisualAid.category}
                      </Text>
                      {selectedVisualAid.description && (
                        <Text style={styles.visualAidDescription}>
                          {selectedVisualAid.description}
                        </Text>
                      )}
                      <Button 
                        mode="outlined" 
                        onPress={() => {
                          setSelectedVisualAid(null);
                          setFormData(prev => ({
                            ...prev,
                            visualAidUrl: '',
                            visualAidFileName: '',
                            visualAidTitle: '',
                            visualAidCategory: ''
                          }));
                        }}
                        style={styles.changeButton}
                      >
                        Change Visual Aid
                      </Button>
                    </Card.Content>
                  </Card>
                ) : (
                  <View style={styles.visualAidButtons}>
                    <Button
                      mode="outlined"
                      onPress={() => setShowVisualAidDialog(true)}
                      icon="file-search"
                      style={styles.visualAidButton}
                    >
                      Select Existing Visual Aid
                    </Button>
                    <Text style={styles.orText}>OR</Text>
                    <Button
                      mode="outlined"
                      onPress={handleFilePick}
                      icon="file-upload"
                      style={styles.visualAidButton}
                    >
                      Upload New Visual Aid
                    </Button>
                    <Text style={styles.formatText}>
                      Accepted formats: PDF, JPG, PNG
                    </Text>
                  </View>
                )}
                
                {selectedFile && (
                  <Card style={styles.selectedFileCard}>
                    <Card.Content>
                      <Text style={styles.fileName}>Selected file: {selectedFile.name}</Text>
                      <TextInput
                        label="Visual Aid Title"
                        value={formData.visualAidTitle}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, visualAidTitle: text }))}
                        style={styles.input}
                      />
                      <Button 
                        mode="outlined" 
                        onPress={() => {
                          setSelectedFile(null);
                          setFormData(prev => ({
                            ...prev,
                            visualAidFileName: '',
                            visualAidTitle: ''
                          }));
                        }}
                        style={styles.changeButton}
                      >
                        Remove File
                      </Button>
                    </Card.Content>
                  </Card>
                )}
              </View>

              <View style={styles.formActions}>
                <Button 
                  mode="outlined" 
                  onPress={() => {
                    setShowForm(false);
                    setFormData({
                      name: '',
                      description: '',
                      category: '',
                      manufacturer: '',
                      visualAidUrl: '',
                      visualAidFileName: '',
                      visualAidTitle: '',
                      visualAidCategory: ''
                    });
                    setSelectedFile(null);
                    setSelectedVisualAid(null);
                  }}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
                <Button 
                  mode="contained" 
                  onPress={handleSubmit}
                  loading={loading}
                  disabled={loading}
                  style={styles.submitButton}
                >
                  Submit
                </Button>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      ) : (
        <ScrollView>
          <List.Section>
            {medicines.map((medicine) => (
              <Card key={medicine.id} style={styles.medicineCard}>
                <Card.Content>
                  <View style={styles.medicineHeader}>
                    <Title style={styles.medicineName}>{medicine.name}</Title>
                    <IconButton
                      icon="delete"
                      size={24}
                      onPress={() => handleDelete(medicine.id)}
                    />
                  </View>
                  <Text style={styles.medicineCategory}>{medicine.category}</Text>
                  {medicine.description && (
                    <Text style={styles.medicineDescription}>{medicine.description}</Text>
                  )}
                  {medicine.manufacturer && (
                    <Text style={styles.medicineManufacturer}>
                      Manufacturer: {medicine.manufacturer}
                    </Text>
                  )}
                  {medicine.visualAidUrl && (
                    <TouchableOpacity 
                      onPress={() => handleOpenFile(medicine.visualAidUrl, medicine.visualAidFileName, medicine.visualAidTitle)}
                      style={styles.visualAidButton}
                    >
                      <MaterialCommunityIcons 
                        name="file-pdf-box" 
                        size={24} 
                        color="#2196F3" 
                      />
                      <Text style={styles.visualAidButtonText}>
                        View Visual Aid: {medicine.visualAidTitle || 'PDF'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </Card.Content>
              </Card>
            ))}
          </List.Section>
        </ScrollView>
      )}

      <Portal>
        <Dialog visible={showVisualAidDialog} onDismiss={() => setShowVisualAidDialog(false)}>
          <Dialog.Title>Select Visual Aid</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Category"
              value={formData.visualAidCategory}
              onChangeText={(text) => setFormData({ ...formData, visualAidCategory: text })}
              style={styles.input}
            />
            <Searchbar
              placeholder="Search visual aids..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
            />
            <ScrollView style={styles.visualAidList}>
              {filteredVisualAids.length === 0 ? (
                <Text style={styles.noResults}>No visual aids found</Text>
              ) : (
                filteredVisualAids.map((aid) => (
                  <TouchableOpacity
                    key={aid.id}
                    onPress={() => handleSelectVisualAid(aid)}
                  >
                    <Card style={styles.visualAidCard}>
                      <Card.Content>
                        <View style={styles.visualAidRow}>
                          <IconButton
                            icon={aid.fileType?.includes('pdf') ? 'file-pdf-box' : 'file-image'}
                            size={24}
                            style={styles.fileIcon}
                          />
                          <View style={styles.visualAidInfo}>
                            <Text style={styles.visualAidTitle}>{aid.title}</Text>
                            <Text style={styles.visualAidCategory}>{aid.category}</Text>
                          </View>
                        </View>
                      </Card.Content>
                    </Card>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowVisualAidDialog(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
        
        <Dialog 
          visible={showVisualAidPreview} 
          onDismiss={() => {
            setShowVisualAidPreview(false);
            setCurrentVisualAid(null);
          }}
          style={styles.visualAidDialog}
        >
          <Dialog.Title>{currentVisualAid?.title || 'Visual Aid'}</Dialog.Title>
          <Dialog.Content>
            {visualAidLoading ? (
              <View style={styles.visualAidLoading}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>Loading visual aid...</Text>
              </View>
            ) : currentVisualAid ? (
              currentVisualAid.isImage ? (
                <Image
                  source={{ uri: currentVisualAid.uri }}
                  style={styles.imagePreview}
                  resizeMode="contain"
                />
              ) : (
                <WebView
                  source={{ uri: currentVisualAid.uri }}
                  style={styles.pdf}
                  startInLoadingState={true}
                  renderLoading={() => (
                    <View style={styles.visualAidLoading}>
                      <ActivityIndicator size="large" />
                      <Text style={styles.loadingText}>Loading PDF...</Text>
                    </View>
                  )}
                  onError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.warn('WebView error: ', nativeEvent);
                  }}
                />
              )
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => {
              setShowVisualAidPreview(false);
              setCurrentVisualAid(null);
            }}>Close</Button>
          </Dialog.Actions>
        </Dialog>

        <VisualAidGallery
          visible={galleryVisible}
          onDismiss={() => setGalleryVisible(false)}
          visualAids={visualAidsForGallery}
          initialIndex={initialGalleryIndex}
        />
      </Portal>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setShowForm(true)}
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
  medicineCard: {
    margin: 8,
    marginHorizontal: 16,
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
  },
  medicineCategory: {
    color: '#666',
    marginTop: 4,
  },
  medicinePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 4,
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
  visualAidSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  visualAidButtons: {
    marginTop: 8,
  },
  visualAidButton: {
    marginBottom: 8,
  },
  orText: {
    textAlign: 'center',
    marginVertical: 8,
  },
  selectedVisualAidCard: {
    marginTop: 8,
    backgroundColor: '#f5f5f5',
  },
  selectedFileCard: {
    marginTop: 8,
    backgroundColor: '#f5f5f5',
  },
  visualAidTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  visualAidInfo: {
    marginTop: 4,
    color: '#666',
  },
  fileName: {
    marginBottom: 8,
  },
  changeButton: {
    marginTop: 8,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  cancelButton: {
    marginRight: 8,
  },
  searchBar: {
    marginBottom: 8,
  },
  visualAidList: {
    maxHeight: 400,
  },
  visualAidCard: {
    marginBottom: 8,
  },
  visualAidRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIcon: {
    margin: 0,
    marginRight: 8,
  },
  visualAidInfo: {
    flex: 1,
  },
  visualAidCategory: {
    color: '#666',
    fontSize: 12,
  },
  noResults: {
    textAlign: 'center',
    marginTop: 16,
    color: '#666',
  },
  visualAidDialog: {
    maxWidth: '95%',
    marginVertical: 40,
  },
  visualAidLoading: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdf: {
    width: Dimensions.get('window').width * 0.9,
    height: Dimensions.get('window').height * 0.7,
  },
  imagePreview: {
    width: Dimensions.get('window').width * 0.9,
    height: Dimensions.get('window').height * 0.7,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  formatText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    marginTop: 8,
  },
  visualAidDescription: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 8,
  },
});

export default MedicinesListScreen; 