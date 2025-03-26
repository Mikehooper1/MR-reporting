import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, TouchableOpacity, PanResponder, Animated, Image } from 'react-native';
import { 
  TextInput, 
  Button, 
  Title, 
  Card, 
  Text, 
  DataTable, 
  FAB,
  Searchbar,
  Menu,
  HelperText,
  ActivityIndicator,
  Divider,
  List,
  Portal,
  Modal,
  IconButton
} from 'react-native-paper';
import { firestore, auth } from '../../services/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import TypeSelector, { DOCTOR_SPECIALITIES } from '../../components/TypeSelector';

// Predefined hospitals
const HOSPITALS = [
  'Doctor',
  'Chemist',
  'Stockwise'
];

const DOCTOR_TYPES = ['Doctor', 'Chemist', 'Stockiest'];

// Define location configurations based on headquarters
const LOCATIONS_CONFIG = {
  'BHOPAL': ['Bhopal', 'Vidisha', 'Itarsi', 'Narmadapuram', 'Sehore', 'Ashta'],
  'INDORE': ['Indore', 'Dewas', 'Mhow', 'Khandwa', 'Khargone', 'Dhamnod'],
  'GWALIOR': ['Gwalior', 'Morena', 'Dabra', 'Shivpuri', 'Bhind'],
  'JABALPUR': ['Jabalpur', 'Satna', 'Katni', 'Rewa', 'Bhedaghat']
};

// Default locations (will be updated based on user's headquarters)
const DEFAULT_LOCATIONS = ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur'];

// Add SPECIALITIES constant at the top with other constants
const SPECIALITIES = [
  'General Physician',
  'Cardiologist',
  'Neurologist',
  'Pediatrician',
  'Orthopedic',
  'Gynecologist',
  'Dermatologist',
  'ENT Specialist',
  'Ophthalmologist',
  'Dentist'
];

const VisualAidGallery = ({ visible, onDismiss, visualAids = [], initialIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const { width, height } = Dimensions.get('window');
  const pan = useRef(new Animated.ValueXY()).current;
  const [imageQuality, setImageQuality] = useState('high');
  const [imageLoading, setImageLoading] = useState(true);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);

  useEffect(() => {
    if (visualAids && visualAids.length > 0 && currentIndex < visualAids.length) {
      setCurrentImageUrl(visualAids[currentIndex]);
    }
  }, [currentIndex, visualAids]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        if (Math.abs(gestureState.dx) > width * 0.2) {
          if (gestureState.dx > 0 && currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
          } else if (gestureState.dx < 0 && currentIndex < visualAids.length - 1) {
            setCurrentIndex(currentIndex + 1);
          }
        }
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false
        }).start();
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false
        }).start();
      }
    })
  ).current;

  const handleNext = () => {
    if (currentIndex < visualAids.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const getHighQualityImageUrl = (url) => {
    if (!url) return null;
    if (url.includes('quality=') || url.includes('q=')) {
      return url.replace(/quality=\d+/g, 'quality=100').replace(/q=\d+/g, 'q=100');
    }
    return url;
  };

  if (!visualAids || visualAids.length === 0) {
    return null;
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modalContainer, {
          backgroundColor: '#000000',
          margin: 0,
          padding: 0,
          flex: 1,
        }]}
      >
        <View style={[styles.galleryContainer, { backgroundColor: '#000000' }]}>
          <IconButton
            icon="close"
            size={24}
            color="#ffffff"
            onPress={onDismiss}
            style={styles.closeButton}
          />
          
          <Animated.View 
            style={[
              styles.imageContainer,
              {
                transform: [
                  { translateX: pan.x },
                  { scale: pan.x.interpolate({
                    inputRange: [-width, 0, width],
                    outputRange: [0.8, 1, 0.8],
                    extrapolate: 'clamp'
                  })}
                ]
              }
            ]}
            {...panResponder.panHandlers}
          >
            {imageLoading && (
              <ActivityIndicator 
                size="large" 
                color="#ffffff" 
                style={styles.loader}
              />
            )}
            {currentImageUrl && (
              <Image
                source={{ 
                  uri: getHighQualityImageUrl(currentImageUrl),
                  cache: 'force-cache',
                  headers: {
                    'Cache-Control': 'max-age=31536000',
                  }
                }}
                style={[
                  styles.galleryImage,
                  imageLoading && styles.hiddenImage
                ]}
                resizeMode="contain"
                resizeMethod="scale"
                progressiveRenderingEnabled={true}
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
                onError={(e) => {
                  console.error('Image loading error:', e);
                  setImageLoading(false);
                }}
              />
            )}
          </Animated.View>

          <View style={styles.galleryControls}>
            <IconButton
              icon="chevron-left"
              size={32}
              color="#ffffff"
              onPress={handlePrevious}
              disabled={currentIndex === 0}
            />
            <Text style={[styles.imageCounter, { color: '#ffffff' }]}>
              {currentIndex + 1} / {visualAids.length}
            </Text>
            <IconButton
              icon="chevron-right"
              size={32}
              color="#ffffff"
              onPress={handleNext}
              disabled={currentIndex === visualAids.length - 1}
            />
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

const MSLListScreen = ({ navigation }) => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showSpecialityMenu, setShowSpecialityMenu] = useState(false);
  const [showHospitalMenu, setShowHospitalMenu] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    speciality: '',
    hospital: '',
    mrName: '',
    phone: '',
    email: '',
    address: '',
    remarks: '',
    type: '',
    city: ''
  });
  const [errors, setErrors] = useState({});
  const [showGallery, setShowGallery] = useState(false);
  const [selectedVisualAids, setSelectedVisualAids] = useState([]);
  const [selectedVisualAidIndex, setSelectedVisualAidIndex] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  const [locationsList, setLocationsList] = useState(DEFAULT_LOCATIONS);

  useEffect(() => {
    fetchDoctors();
    fetchUserProfile();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const q = query(
        collection(firestore, 'doctors'),
        where('userId', '==', userId),
        orderBy('name')
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedDoctors = [];
      querySnapshot.forEach((doc) => {
        fetchedDoctors.push({ id: doc.id, ...doc.data() });
      });
      
      setDoctors(fetchedDoctors);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userDoc = await getDoc(doc(firestore, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserProfile(userData);
        
        // Set locations list based on user's headquarters
        if (userData.headquarters && LOCATIONS_CONFIG[userData.headquarters]) {
          setLocationsList(LOCATIONS_CONFIG[userData.headquarters]);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleSpecialitySelect = (speciality) => {
    setFormData({ ...formData, speciality });
    setShowSpecialityMenu(false);
  };

  const handleHospitalSelect = (hospital) => {
    // If selecting Chemist or Stockwise, clear speciality and don't allow selection
    if (hospital === 'Chemist' || hospital === 'Stockwise') {
      setFormData({ 
        ...formData, 
        hospital,
        speciality: '' // Clear speciality when selecting Chemist or Stockwise
      });
    } else {
      setFormData({ ...formData, hospital });
    }
    setShowHospitalMenu(false);
  };

  const handleSubmit = async () => {
    try {
      if (!validateForm()) {
        return;
      }

      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      await addDoc(collection(firestore, 'doctors'), {
        ...formData,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      setFormData({
        name: '',
        speciality: '',
        hospital: '',
        mrName: '',
        phone: '',
        email: '',
        address: '',
        remarks: '',
        type: '',
        city: ''
      });
      setShowForm(false);
      fetchDoctors();
      alert('Doctor/Chemist added successfully!');
    } catch (error) {
      console.error('Error submitting:', error);
      alert('Error adding entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorPress = (doctor) => {
    navigation.navigate('DoctorMedicines', {
      doctorId: doctor.id,
      doctorName: doctor.name
    });
  };

  // Filter doctors based on search query
  const filteredDoctors = doctors.filter(doctor => 
    doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doctor.speciality.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doctor.hospital.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.mrName) newErrors.mrName = 'MR Name is required';
    if (!formData.phone) newErrors.phone = 'Phone Number is required';
    if (!formData.type) newErrors.type = 'Type is required';
    if (formData.type === 'Doctor' && !formData.speciality) {
      newErrors.speciality = 'Speciality is required for doctors';
    }
    if (!formData.city) newErrors.city = 'Location is required';
    if (!formData.address) newErrors.address = 'Address is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleVisualAidPress = (visualAids, index) => {
    setSelectedVisualAids(visualAids);
    setSelectedVisualAidIndex(index);
    setShowGallery(true);
  };

  return (
    <View style={styles.container}>
      {showForm ? (
        <ScrollView>
          <Card style={styles.formCard}>
            <Card.Content>
              <Title>Add New Doctor</Title>
              
              <Menu
                visible={showTypeMenu}
                onDismiss={() => setShowTypeMenu(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setShowTypeMenu(true)}
                    style={styles.input}
                  >
                    {formData.type || "Select Doctor/Chemist*"}
                  </Button>
                }
              >
                {DOCTOR_TYPES.map((type) => (
                  <Menu.Item
                    key={type}
                    onPress={() => {
                      setFormData({ ...formData, type, speciality: '' });
                      setShowTypeMenu(false);
                    }}
                    title={type}
                  />
                ))}
              </Menu>
              {errors.type && <HelperText type="error">{errors.type}</HelperText>}

              {formData.type === 'Doctor' && (
                <>
                  <Menu
                    visible={showSpecialityMenu}
                    onDismiss={() => setShowSpecialityMenu(false)}
                    anchor={
                      <Button
                        mode="outlined"
                        onPress={() => setShowSpecialityMenu(true)}
                        style={styles.input}
                      >
                        {formData.speciality || "Select Speciality*"}
                      </Button>
                    }
                  >
                    {SPECIALITIES.map((speciality) => (
                      <Menu.Item
                        key={speciality}
                        onPress={() => {
                          setFormData({ ...formData, speciality });
                          setShowSpecialityMenu(false);
                        }}
                        title={speciality}
                      />
                    ))}
                  </Menu>
                  {errors.speciality && <HelperText type="error">{errors.speciality}</HelperText>}
                </>
              )}

              <TextInput
                label="Name*"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                style={styles.input}
                error={!!errors.name}
              />
              {errors.name && <HelperText type="error">{errors.name}</HelperText>}

              <TextInput
                label="MR Name*"
                value={formData.mrName}
                onChangeText={(text) => setFormData({ ...formData, mrName: text })}
                style={styles.input}
                error={!!errors.mrName}
              />
              {errors.mrName && <HelperText type="error">{errors.mrName}</HelperText>}

              <Menu
                visible={showLocationMenu}
                onDismiss={() => setShowLocationMenu(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setShowLocationMenu(true)}
                    style={styles.input}
                  >
                    {formData.city || "Select Location*"}
                  </Button>
                }
              >
                {locationsList.map((location) => (
                  <Menu.Item
                    key={location}
                    onPress={() => {
                      setFormData({ ...formData, city: location });
                      setShowLocationMenu(false);
                    }}
                    title={location}
                  />
                ))}
              </Menu>
              {errors.city && <HelperText type="error">{errors.city}</HelperText>}

              <TextInput
                label="Phone Number*"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
                style={styles.input}
                error={!!errors.phone}
              />
              {errors.phone && <HelperText type="error">{errors.phone}</HelperText>}

              <TextInput
                label="Email"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />

              <TextInput
                label="Address*"
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                multiline
                numberOfLines={3}
                style={styles.input}
                error={!!errors.address}
              />
              {errors.address && <HelperText type="error">{errors.address}</HelperText>}

              <TextInput
                label="Remarks"
                value={formData.remarks}
                onChangeText={(text) => setFormData({ ...formData, remarks: text })}
                multiline
                style={styles.input}
              />

              <Button 
                mode="contained" 
                onPress={handleSubmit}
                loading={loading}
                style={styles.submitButton}
                disabled={loading}
              >
                Add Doctor
              </Button>
            </Card.Content>
          </Card>
        </ScrollView>
      ) : (
        <ScrollView>
          <Card style={styles.searchCard}>
            <Card.Content>
              <Searchbar
                placeholder="Search doctors by name, speciality or type..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchBar}
              />
            </Card.Content>
          </Card>

          <DataTable>
            <DataTable.Header style={styles.dataTableHeader}>
              <DataTable.Title textStyle={{color: '#000000'}}>Name</DataTable.Title>
              <DataTable.Title textStyle={{color: '#000000'}}>Type</DataTable.Title>
              <DataTable.Title textStyle={{color: '#000000'}}>Speciality</DataTable.Title>
              <DataTable.Title textStyle={{color: '#000000'}}>Location</DataTable.Title>
              <DataTable.Title textStyle={{color: '#000000'}}>Visual Aids</DataTable.Title>
            </DataTable.Header>

            {filteredDoctors.map((doctor) => (
              <DataTable.Row 
                key={doctor.id}
                onPress={() => handleDoctorPress(doctor)}
                style={styles.doctorRow}
              >
                <DataTable.Cell textStyle={{color: '#000000'}}>{doctor.name}</DataTable.Cell>
                <DataTable.Cell textStyle={{color: '#000000'}}>{doctor.type}</DataTable.Cell>
                <DataTable.Cell textStyle={{color: '#000000'}}>{doctor.type === 'Doctor' ? doctor.speciality : '-'}</DataTable.Cell>
                <DataTable.Cell textStyle={{color: '#000000'}}>{doctor.city}</DataTable.Cell>
                <DataTable.Cell>
                  {doctor.visualAids && doctor.visualAids.length > 0 ? (
                    <TouchableOpacity
                      onPress={() => handleVisualAidPress(doctor.visualAids, 0)}
                      style={styles.visualAidButton}
                    >
                      <Text style={styles.visualAidCount}>
                        {doctor.visualAids.length} Visual Aids
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.noVisualAids}>No Visual Aids</Text>
                  )}
                </DataTable.Cell>
              </DataTable.Row>
            ))}

            {filteredDoctors.length === 0 && (
              <DataTable.Row>
                <DataTable.Cell>No doctors found</DataTable.Cell>
                <DataTable.Cell></DataTable.Cell>
                <DataTable.Cell></DataTable.Cell>
                <DataTable.Cell></DataTable.Cell>
                <DataTable.Cell></DataTable.Cell>
              </DataTable.Row>
            )}
          </DataTable>
        </ScrollView>
      )}

      <FAB
        style={styles.fab}
        icon={showForm ? 'close' : 'plus'}
        onPress={() => setShowForm(!showForm)}
      />

      <VisualAidGallery
        visible={showGallery}
        onDismiss={() => setShowGallery(false)}
        visualAids={selectedVisualAids}
        initialIndex={selectedVisualAidIndex}
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
  searchCard: {
    margin: 16,
    marginBottom: 8,
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#f5f5f5',
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
  doctorRow: {
    cursor: 'pointer',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  galleryContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  imageContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  galleryImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.8,
    resizeMode: 'contain',
    backgroundColor: '#000000',
    transform: [{ scale: 1.1 }],
  },
  hiddenImage: {
    opacity: 0,
  },
  loader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -15 }],
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  galleryControls: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 10,
  },
  imageCounter: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 20,
  },
  visualAidButton: {
    backgroundColor: '#e3f2fd',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  visualAidCount: {
    color: '#1976d2',
    fontSize: 12,
  },
  noVisualAids: {
    color: '#757575',
    fontSize: 12,
    fontStyle: 'italic',
  },
  dataTableHeader: {
    backgroundColor: '#CCCCFF',
  },
});

export default MSLListScreen; 