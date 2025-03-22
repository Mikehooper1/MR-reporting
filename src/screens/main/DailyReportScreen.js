import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Image, RefreshControl } from 'react-native';
import { 
  TextInput, 
  Button, 
  Title, 
  Card, 
  Text, 
  DataTable, 
  FAB,
  Menu,
  IconButton,
  ActivityIndicator,
  List,
  Searchbar,
  Chip
} from 'react-native-paper';
import { format, isSunday } from 'date-fns';
import { Calendar } from 'react-native-calendars';
import { firestore, auth } from '../../services/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import TypeSelector, { REPORT_TYPES } from '../../components/TypeSelector';
import * as ImagePicker from 'expo-image-picker';
import { uploadSelfie } from '../../services/storage';
import { PREDEFINED_LOCATIONS } from '../../constants/locations';
import { addMSLAddresses, fetchAddressesWithMSL } from '../../services/database';

// Predefined hospitals
const HOSPITALS = [
  'Doctor',
  'Chemist',
  'Stockiest'
];

// Define STP configurations based on headquarters
const STP_CONFIGS = {
  'BHOPAL': [
    'BHOPAL-BHOPAL-BHOPAL',
    'BHOPAL-VIDISHA-BHOPAL',
    'BHOPAL-ITARSI-BHOPAL',
    'BHOPAL-NARMADAPURAM-BHOPAL',
    'BHOPAL-SEHORE-BHOPAL',
    'BHOPAL-ASHTA-BHOPAL',
  ],
  'INDORE': [
    'INDORE-INDORE-INDORE',
    'INDORE-DEWAS-INDORE',
    'INDORE-MHOW-INDORE',
    'INDORE-KHANDWA-INDORE',
    'INDORE-KHARGONE-INDORE',
    'INDORE-DHAMNOD-INDORE',
  ],
  'GWALIOR': [
    'GWALIOR-GWALIOR-GWALIOR',
    'GWALIOR-MORENA-GWALIOR',
    'GWALIOR-DABRA-GWALIOR',
    'GWALIOR-SHIVPURI-GWALIOR',
    'GWALIOR-BHIND-GWALIOR',
  ],
  'JABALPUR': [
    'JABALPUR-JABALPUR-JABALPUR',
    'JABALPUR-SATNA-JABALPUR',
    'JABALPUR-KATNI-JABALPUR',
    'JABALPUR-REWA-JABALPUR',
    'JABALPUR-BHEDAGHAT-JABALPUR',
  ]
};

// Default STP list (will be updated based on user's headquarters)
const DEFAULT_STP_LIST = [
  'GWALIOR-BHOPAL-GWALIOR',
  'GWALIOR-INDORE-GWALIOR',
  'GWALIOR-GWALIOR-GWALIOR',
  'BHOPAL-BHOPAL-BHOPAL',
  'BHOPAL-INDORE-BHOPAL',
  'BHOPAL-GWALIOR-BHOPAL',
  'INDORE-BHOPAL-INDORE',
  'INDORE-INDORE-INDORE',
  'INDORE-GWALIOR-INDORE',
];

const DailyReportScreen = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [showHospitalMenu, setShowHospitalMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [showSTPMenu, setShowSTPMenu] = useState(false);
  const [showTravelTypeMenu, setShowTravelTypeMenu] = useState(false);
  const [showMSLMenu, setShowMSLMenu] = useState(false);
  const [mslList, setMslList] = useState([]);
  const [filteredMSLList, setFilteredMSLList] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [stpList, setStpList] = useState(DEFAULT_STP_LIST);
  const [formData, setFormData] = useState({
    type: '',
    title: '',
    description: '',
    location: '',
    address: '',
    remarks: '',
    selfieUrl: null,
    hospital: '',
    stp: '',
    travelType: '',
    mslPlace: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [refreshing, setRefreshing] = useState(false);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    fetchReports();
    requestCameraPermission();
    initializeMSLAddresses();
    fetchMSLList();
    updateMarkedDates();
    fetchUserProfile();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera permissions to make this work!');
      return false;
    }
    return true;
  };

  const takeSelfie = async () => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploading(true);
        const userId = auth.currentUser?.uid;
        if (!userId) {
          alert('User not authenticated. Please login again.');
          return;
        }
        
        const selfieData = await uploadSelfie(result.assets[0].uri, userId);
        setFormData({ ...formData, selfieUrl: selfieData.downloadURL });
        setUploading(false);
      }
    } catch (error) {
      console.error('Error taking selfie:', error);
      alert('Error taking selfie. Please try again.');
      setUploading(false);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const q = query(
        collection(firestore, 'reports'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedReports = [];
      querySnapshot.forEach((doc) => {
        fetchedReports.push({ id: doc.id, ...doc.data() });
      });
      
      setReports(fetchedReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAddressSuggestions = async (searchText) => {
    try {
      setSearchingAddress(true);
      const addresses = await fetchAddressesWithMSL(searchText);
      setAddressSuggestions(addresses);
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleAddressChange = (text) => {
    setFormData({ ...formData, address: text });
    if (text.length >= 3) {
      fetchAddressSuggestions(text);
    } else {
      setAddressSuggestions([]);
    }
  };

  const selectAddress = (address) => {
    setFormData({ ...formData, address });
    setAddressSuggestions([]);
  };

  const handleHospitalSelect = (hospital) => {
    setFormData({ ...formData, hospital });
    setShowHospitalMenu(false);

    // Filter doctor list based on selected hospital type and location
    if (formData.location) {
      const filteredDoctors = mslList.filter(doc => 
        doc.type === hospital && 
        doc.city?.toUpperCase() === formData.location.toUpperCase()
      );
      setFilteredMSLList(filteredDoctors);
    }
  };

  const handleSTPSelect = (stp) => {
    setFormData({ ...formData, stp });
    setShowSTPMenu(false);
  };

  const handleTravelTypeSelect = (type) => {
    setFormData({ ...formData, travelType: type });
    setShowTravelTypeMenu(false);
    
    if (formData.stp) {
      const cities = formData.stp.split('-');
      const location = type === 'HQ' ? cities[0] : cities[1];
      setFormData(prev => ({ 
        ...prev, 
        travelType: type, 
        location,
        title: '',
        mslPlace: ''
      }));
      
      // Filter doctor list based on selected location and hospital type
      const filteredDoctors = mslList.filter(doc => 
        doc.city?.toUpperCase() === location.toUpperCase() &&
        (!formData.hospital || doc.type === formData.hospital)
      );
      setFilteredMSLList(filteredDoctors);
    }
  };

  const handleMSLSelect = (doctor) => {
    setFormData({ 
      ...formData, 
      title: doctor.name,
      mslPlace: doctor.place || '',
      address: doctor.address || ''  // Auto-fill address if available
    });
    setShowMSLMenu(false);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.type || !formData.title || !formData.description || 
          !formData.location || !formData.address || !formData.selfieUrl || 
          !formData.hospital || !formData.stp || !formData.travelType || !formData.date) {
        alert('Please fill in all required fields and take a selfie');
        return;
      }

      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Save the address for future auto-fill
      await addDoc(collection(firestore, 'addresses'), {
        address: formData.address,
        userId,
        createdAt: new Date()
      });

      // Create a proper Date object from the date string
      const [year, month, day] = formData.date.split('-').map(Number);
      const reportDate = new Date(year, month - 1, day, 12, 0, 0, 0); // Set to noon to avoid timezone issues

      // Save the report with the selected date
      await addDoc(collection(firestore, 'reports'), {
        ...formData,
        userId,
        status: 'pending',
        createdAt: new Date(),
        date: reportDate
      });

      // Update marked dates after successful submission
      updateMarkedDates();

      setFormData({
        type: '',
        title: '',
        description: '',
        location: '',
        address: '',
        remarks: '',
        selfieUrl: null,
        hospital: '',
        stp: '',
        travelType: '',
        mslPlace: '',
        date: new Date().toISOString().split('T')[0]
      });
      setShowForm(false);
      fetchReports();
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Error submitting report. Please try again.');
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

  const handleTypeSelect = (type) => {
    setFormData({ ...formData, type });
    setShowTypeMenu(false);
  };

  const initializeMSLAddresses = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      await addMSLAddresses(userId);
    } catch (error) {
      console.error('Error initializing MSL addresses:', error);
    }
  };

  const fetchMSLList = async () => {
    try {
      const q = query(
        collection(firestore, 'doctors'),  // Changed from 'mslList' to 'doctors'
        orderBy('name', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const doctorData = [];
      querySnapshot.forEach((doc) => {
        doctorData.push({ 
          id: doc.id, 
          ...doc.data(),
          displayName: `${doc.data().name} (${doc.data().place || 'No Area'})`
        });
      });
      setMslList(doctorData);
    } catch (error) {
      console.error('Error fetching doctor list:', error);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchReports();
    } catch (error) {
      console.error('Error refreshing reports:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const updateMarkedDates = () => {
    const newMarkedDates = {};
    
    // Mark all Sundays as red (off day)
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (isSunday(d)) {
        const dateString = format(d, 'yyyy-MM-dd');
        newMarkedDates[dateString] = {
          dots: [{ color: '#FF0000' }]
        };
      }
    }

    // Mark reports based on their type
    reports.forEach(report => {
      try {
        let reportDate;
        if (report.date) {
          if (report.date.toDate) {
            // Handle Firestore Timestamp
            reportDate = report.date.toDate();
          } else if (report.date instanceof Date) {
            // Handle Date object
            reportDate = report.date;
          } else {
            // Handle date string
            const [year, month, day] = report.date.split('-').map(Number);
            reportDate = new Date(year, month - 1, day);
          }
          
          const dateString = format(reportDate, 'yyyy-MM-dd');
          const dotColor = report.type === 'Headquarter' ? '#00FF00' : '#800080'; // Green for Headquarter, Purple for Interior
          
          if (newMarkedDates[dateString]) {
            // If date already has a dot (Sunday), add the new dot
            newMarkedDates[dateString].dots.push({ color: dotColor });
          } else {
            newMarkedDates[dateString] = {
              dots: [{ color: dotColor }]
            };
          }
        }
      } catch (error) {
        console.error('Error processing date for report:', error);
      }
    });

    setMarkedDates(newMarkedDates);
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date.dateString);
    // You can add additional logic here when a date is selected
  };

  const fetchUserProfile = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userDoc = await getDoc(doc(firestore, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserProfile(userData);
        
        // Set STP list based on user's headquarters
        if (userData.headquarters && STP_CONFIGS[userData.headquarters]) {
          setStpList(STP_CONFIGS[userData.headquarters]);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const renderForm = () => (
    <ScrollView>
      <Card style={styles.formCard}>
        <Card.Content>
          <Title>New Daily Report</Title>
          
          <View style={styles.calendarContainer}>
            <Calendar
              current={formData.date}
              onDayPress={(day) => {
                setFormData({ ...formData, date: day.dateString });
              }}
              markedDates={{
                [formData.date]: { selected: true, selectedColor: '#2196F3' }
              }}
              minDate={new Date().toISOString().split('T')[0]}
              maxDate={new Date().toISOString().split('T')[0]}
            />
          </View>

          <TypeSelector
            visible={showTypeMenu}
            onDismiss={() => setShowTypeMenu(!showTypeMenu)}
            onSelect={handleTypeSelect}
            types={REPORT_TYPES}
            selectedType={formData.type}
            label="Select Report Type"
          />

          <Menu
            visible={showSTPMenu}
            onDismiss={() => setShowSTPMenu(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setShowSTPMenu(true)}
                style={styles.input}
              >
                {formData.stp || "Select STP*"}
              </Button>
            }
          >
            {stpList.map((stp) => (
              <Menu.Item
                key={stp}
                onPress={() => handleSTPSelect(stp)}
                title={stp}
              />
            ))}
          </Menu>

          {formData.stp && (
            <Menu
              visible={showTravelTypeMenu}
              onDismiss={() => setShowTravelTypeMenu(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setShowTravelTypeMenu(true)}
                  style={styles.input}
                >
                  {formData.travelType ? 
                    (formData.travelType === 'HQ' ? 'Headquarter' : 'Interior') : 
                    "Select Travel Type*"}
                </Button>
              }
            >
              <Menu.Item
                onPress={() => handleTravelTypeSelect('HQ')}
                title="Headquarter"
              />
              <Menu.Item
                onPress={() => handleTravelTypeSelect('INT')}
                title="Interior"
              />
            </Menu>
          )}

          <Menu
            visible={showHospitalMenu}
            onDismiss={() => setShowHospitalMenu(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setShowHospitalMenu(true)}
                style={styles.input}
              >
                {formData.hospital || "Select Doctor/Chemist*"}
              </Button>
            }
          >
            {HOSPITALS.map((hospital) => (
              <Menu.Item
                key={hospital}
                onPress={() => handleHospitalSelect(hospital)}
                title={hospital}
              />
            ))}
          </Menu>

          <TextInput
            label="Location*"
            value={formData.location}
            style={styles.input}
            disabled={true}
          />

          <Menu
            visible={showMSLMenu}
            onDismiss={() => setShowMSLMenu(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setShowMSLMenu(true)}
                style={styles.input}
                disabled={!formData.location || !formData.hospital}
              >
                {formData.title ? `${formData.title} (${formData.mslPlace})` : `Select ${formData.hospital || 'Doctor/Chemist'}*`}
              </Button>
            }
          >
            {filteredMSLList.length > 0 ? (
              filteredMSLList.map((doctor) => (
                <Menu.Item
                  key={doctor.id}
                  onPress={() => handleMSLSelect(doctor)}
                  title={doctor.displayName}
                  description={`${doctor.place || 'No Area'}`}
                  right={(props) => (
                    <View style={styles.mslMenuItemRight}>
                      <Text style={styles.mslPlace}>{doctor.place}</Text>
                    </View>
                  )}
                />
              ))
            ) : (
              <Menu.Item 
                title={`No ${formData.hospital || 'doctors/chemists'} found for this location`} 
                disabled 
              />
            )}
          </Menu>
          
          {formData.title && (
            <View style={styles.selectedMSLInfo}>
              <Text style={styles.mslInfoLabel}>Selected Details:</Text>
              <Text style={styles.mslInfoValue}>{formData.title}</Text>
              <Text style={styles.mslInfoValue}>{formData.mslPlace} Area</Text>
              <Text style={styles.mslInfoType}>{formData.hospital}</Text>
            </View>
          )}
          
          <TextInput
            label="Description"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
            numberOfLines={3}
            style={styles.input}
          />
          
          <View>
            <TextInput
              label="Address*"
              value={formData.address}
              onChangeText={handleAddressChange}
              style={styles.input}
            />
            {searchingAddress && (
              <ActivityIndicator style={{ marginTop: 10 }} />
            )}
            {addressSuggestions.length > 0 && (
              <Card style={styles.suggestionsCard}>
                <Card.Content>
                  {addressSuggestions.map((suggestion, index) => (
                    <List.Item
                      key={index}
                      title={suggestion.address}
                      description={suggestion.doctorName}
                      left={props => <List.Icon {...props} icon="map-marker" />}
                      right={props => 
                        suggestion.isMSL ? (
                          <Chip 
                            mode="outlined" 
                            style={styles.mslChip}
                            textStyle={styles.mslChipText}
                          >
                            MSL
                          </Chip>
                        ) : null
                      }
                      onPress={() => {
                        selectAddress(suggestion.address);
                        if (suggestion.doctorName) {
                          setFormData(prev => ({
                            ...prev,
                            title: suggestion.doctorName,
                            location: suggestion.location || prev.location
                          }));
                        }
                      }}
                    />
                  ))}
                </Card.Content>
              </Card>
            )}
          </View>
          
          <TextInput
            label="Remarks"
            value={formData.remarks}
            onChangeText={(text) => setFormData({ ...formData, remarks: text })}
            multiline
            style={styles.input}
          />

          <View style={styles.selfieContainer}>
            <Title style={styles.selfieTitle}>Site Verification Selfie</Title>
            {formData.selfieUrl ? (
              <View style={styles.selfiePreview}>
                <Image 
                  source={{ uri: formData.selfieUrl }} 
                  style={styles.selfieImage}
                />
                <IconButton
                  icon="close"
                  size={24}
                  onPress={() => setFormData({ ...formData, selfieUrl: null })}
                  style={styles.removeSelfieButton}
                />
              </View>
            ) : (
              <Button
                mode="outlined"
                onPress={takeSelfie}
                loading={uploading}
                icon="camera"
                style={styles.selfieButton}
              >
                Take Selfie
              </Button>
            )}
            <Text style={styles.selfieNote}>
              Please take a selfie at your current location to verify your presence
            </Text>
          </View>

          <Button 
            mode="contained" 
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitButton}
          >
            Submit Report
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {showForm ? renderForm() : (
        <>
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
            <DataTable>
              <DataTable.Header style={styles.dataTableHeader}>
                <DataTable.Title textStyle={{fontWeight: 'bold'}}>Date</DataTable.Title>
                <DataTable.Title textStyle={{fontWeight: 'bold'}}>Type</DataTable.Title>
                <DataTable.Title textStyle={{fontWeight: 'bold'}}>Doctor</DataTable.Title>
                <DataTable.Title textStyle={{fontWeight: 'bold'}}>Status</DataTable.Title>
              </DataTable.Header>

              {reports.map((report) => (
                <DataTable.Row key={report.id}>
                  <DataTable.Cell>
                    {format(report.createdAt.toDate(), 'dd/MM/yyyy')}
                  </DataTable.Cell>
                  <DataTable.Cell>{report.type}</DataTable.Cell>
                  <DataTable.Cell>{report.title}</DataTable.Cell>
                  <DataTable.Cell>
                    <Text style={getStatusStyle(report.status)}>
                      {report.status.toUpperCase()}
                    </Text>
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          </ScrollView>

          <FAB
            style={styles.fab}
            icon="plus"
            onPress={() => setShowForm(true)}
          />
        </>
      )}
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
  selfieContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  selfieTitle: {
    marginBottom: 8,
  },
  selfieButton: {
    marginVertical: 8,
  },
  selfieImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  selfiePreview: {
    position: 'relative',
  },
  removeSelfieButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
  },
  selfieNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  suggestionsCard: {
    marginTop: -8,
    marginBottom: 16,
  },
  mslChip: {
    backgroundColor: '#e8f5e9',
    marginVertical: 4,
  },
  mslChipText: {
    color: '#2e7d32',
    fontSize: 12,
  },
  travelTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  travelTypeButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  mslMenuItemRight: {
    marginRight: 8,
    justifyContent: 'center',
  },
  mslPlace: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  selectedMSLInfo: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  mslInfoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  mslInfoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  mslInfoType: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  calendarContainer: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    backgroundColor: '#fff',
  },
  dataTableHeader: {
    backgroundColor: '#CCCCFF',
  },
  dataTableTitle: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DailyReportScreen; 