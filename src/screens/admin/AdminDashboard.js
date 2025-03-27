import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Image, Alert, Dimensions } from 'react-native';
import { Card, Title, Paragraph, DataTable, Searchbar, Text, Button, ActivityIndicator, IconButton, Portal, Dialog, TextInput, Divider } from 'react-native-paper';
import { firestore, storage } from '../../services/firebase';
import { collection, query, getDocs, where, orderBy, Timestamp, addDoc, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { logoutUser } from '../../services/auth';
import { format } from 'date-fns';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ProductManagement from './ProductManagement';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';

const AdminDashboard = ({ navigation }) => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollViewRef = React.useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [statistics, setStatistics] = useState({
    totalEmployees: 0,
    activeToday: 0,
    totalReports: 0,
    pendingApprovals: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sliderImages, setSliderImages] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: null,
    imageFile: null,
  });
  const [editingId, setEditingId] = useState(null);

  const navigationCards = [
    {
      title: 'Leave Approval',
      icon: 'calendar-check',
      color: '#4CAF50',
      onPress: () => navigation.navigate('AdminLeaveApproval'),
      description: 'Review and manage leave requests'
    },
    {
      title: 'News Management',
      icon: 'newspaper',
      color: '#2196F3',
      onPress: () => navigation.navigate('AdminNewsSubmit'),
      description: 'Create and manage news announcements'
    },
  ];

  useEffect(() => {
    fetchUserProfile();
    fetchEmployees();
    fetchStatistics();
    fetchSliderImages();
    // Get screen dimensions
    const { width, height } = Dimensions.get('window');
    setDimensions({ width, height });
  }, []);

  const fetchUserProfile = async () => {
    try {
      if (!user?.uid) return;
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const q = query(
        collection(firestore, 'users'),
        where('role', '!=', 'admin'),
        orderBy('role'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const employeeData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          lastActive: data.lastActive instanceof Timestamp ? data.lastActive.toDate() : data.lastActive
        };
      });
      setEmployees(employeeData);
    } catch (error) {
      console.error('Error fetching employees:', error);
      alert('Error fetching employees data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      // Get total employees
      const employeesQuery = query(
        collection(firestore, 'users'),
        where('role', '!=', 'admin')
      );
      const employeesSnapshot = await getDocs(employeesQuery);
      const totalEmployees = employeesSnapshot.size;

      // Get active employees today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = Timestamp.fromDate(today);
      
      const activeQuery = query(
        collection(firestore, 'users'),
        where('role', '!=', 'admin'),
        where('lastActive', '>=', todayTimestamp)
      );
      const activeSnapshot = await getDocs(activeQuery);
      const activeToday = activeSnapshot.size;

      // Get total reports
      const reportsQuery = query(collection(firestore, 'reports'));
      const reportsSnapshot = await getDocs(reportsQuery);
      const totalReports = reportsSnapshot.size;

      // Get pending approvals
      const [pendingReports, pendingExpenses, pendingTours, pendingOrders, pendingVisualAids] = await Promise.all([
        getDocs(query(collection(firestore, 'reports'), where('status', '==', 'pending'))),
        getDocs(query(collection(firestore, 'expenses'), where('status', '==', 'pending'))),
        getDocs(query(collection(firestore, 'tourPlans'), where('status', '==', 'pending'))),
        getDocs(query(collection(firestore, 'orders'), where('status', '==', 'pending'))),
        getDocs(query(collection(firestore, 'visualAids'), where('status', '==', 'pending')))
      ]);

      const pendingApprovals = 
        pendingReports.size + 
        pendingExpenses.size + 
        pendingTours.size + 
        pendingOrders.size +
        pendingVisualAids.size;

      setStatistics({
        totalEmployees,
        activeToday,
        totalReports,
        pendingApprovals
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      alert('Error fetching dashboard statistics');
    }
  };

  const fetchSliderImages = async () => {
    try {
      setLoading(true);
      const q = query(collection(firestore, 'sliderImages'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const images = [];
      querySnapshot.forEach((doc) => {
        images.push({ id: doc.id, ...doc.data() });
      });
      setSliderImages(images);
    } catch (error) {
      console.error('Error fetching slider images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedAsset = result.assets[0];
        setFormData({
          ...formData,
          imageFile: selectedAsset,
          imageUrl: selectedAsset.uri,
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const uploadImage = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `slider_${Date.now()}.jpg`;
      const storageRef = ref(storage, `sliderImages/${filename}`);
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleAddSlider = async () => {
    try {
      if (!formData.imageUrl) {
        alert('Please fill in all fields and select an image');
        return;
      }

      setLoading(true);
      const imageUrl = await uploadImage(formData.imageUrl);
      
      await addDoc(collection(firestore, 'sliderImages'), {
        title: formData.title,
        description: formData.description,
        imageUrl: imageUrl,
        createdAt: new Date(),
      });

      setShowAddDialog(false);
      setFormData({ title: '', description: '', imageUrl: null, imageFile: null });
      fetchSliderImages();
    } catch (error) {
      console.error('Error adding slider image:', error);
      alert('Error adding slider image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSlider = async () => {
    try {
      if (!formData.title || !formData.description) {
        alert('Please fill in all fields');
        return;
      }

      setLoading(true);
      let imageUrl = formData.imageUrl;

      if (formData.imageFile) {
        imageUrl = await uploadImage(formData.imageUrl);
      }

      await updateDoc(doc(firestore, 'sliderImages', editingId), {
        title: formData.title,
        description: formData.description,
        imageUrl: imageUrl,
        updatedAt: new Date(),
      });

      setShowEditDialog(false);
      setFormData({ title: '', description: '', imageUrl: null, imageFile: null });
      setEditingId(null);
      fetchSliderImages();
    } catch (error) {
      console.error('Error updating slider image:', error);
      alert('Error updating slider image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlider = async (id, imageUrl) => {
    try {
      Alert.alert(
        "Delete Slider Image",
        "Are you sure you want to delete this slider image?",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Delete",
            onPress: async () => {
              try {
                setLoading(true);
                
                if (imageUrl) {
                  const storageRef = ref(storage, imageUrl);
                  await deleteObject(storageRef);
                }

                await deleteDoc(doc(firestore, 'sliderImages', id));
                fetchSliderImages();
              } catch (error) {
                console.error('Error deleting slider image:', error);
                Alert.alert('Error', 'Failed to delete slider image. Please try again.');
              } finally {
                setLoading(false);
              }
            },
            style: "destructive"
          }
        ]
      );
    } catch (error) {
      console.error('Error showing delete confirmation:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const openEditDialog = (image) => {
    setFormData({
      title: image.title,
      description: image.description,
      imageUrl: image.imageUrl,
      imageFile: null,
    });
    setEditingId(image.id);
    setShowEditDialog(true);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Error logging out:', error);
      alert('Failed to log out. Please try again.');
    }
  };

  const filteredEmployees = employees.filter(employee => {
    const searchLower = searchQuery.toLowerCase();
    return (
      employee.fullName?.toLowerCase().includes(searchLower) ||
      employee.email?.toLowerCase().includes(searchLower) ||
      employee.employeeCode?.toLowerCase().includes(searchLower) ||
      employee.role?.toLowerCase().includes(searchLower) ||
      employee.phone?.includes(searchLower)
    );
  });

  const viewEmployeeDetails = (employeeId) => {
    navigation.navigate('EmployeeDetails', { employeeId });
  };

  const getSliderHeight = () => {
    return dimensions.width * 0.5; // 50% of screen width for height
  };

  const renderStatisticsCards = () => (
    <View style={styles.statsContainer}>
      <Card style={styles.statsCard}>
        <Card.Content>
          <Title>TOTAL EMPLOYEES <MaterialCommunityIcons name="account-group" size={24} color="#ADD8E6" /></Title>
          <Paragraph style={styles.statNumber}>{statistics.totalEmployees}</Paragraph>
        </Card.Content>
      </Card>
      <Card style={styles.statsCard}>
        <Card.Content>
          <Title>ACTIVE TODAY <MaterialCommunityIcons name="calendar-check" size={24} color="#ADD8E6" /></Title>
          <Paragraph style={styles.statNumber}>{statistics.activeToday}</Paragraph>
        </Card.Content>
      </Card>
      <Card 
        style={styles.statsCard}
        onPress={() => navigation.navigate('AllReports')}
      >
        <Card.Content>
          <Title>TOTAL BE REPORTS <MaterialCommunityIcons name="file-document-outline" size={24} color="#ADD8E6" /></Title>
          <Paragraph style={styles.statNumber}>{statistics.totalReports}</Paragraph>
          <View style={styles.cardFooter}>
            <Text style={styles.viewMoreText}>View All Reports</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
          </View>
        </Card.Content>
      </Card>
      <Card 
        style={styles.statsCard}
        onPress={() => navigation.navigate('Approvals')}
      >
        <Card.Content>
          <Title>HO ORDER APPROVALS <MaterialCommunityIcons name="folder-outline" size={24} color="#ADD8E6" /></Title>
          <Paragraph style={[styles.statNumber, { color: statistics.pendingApprovals > 0 ? '#f44336' : '#4caf50' }]}>
            {statistics.pendingApprovals}
          </Paragraph>
        </Card.Content>
      </Card>
    </View>
  );

  const renderNavigationCards = () => (
    <View style={styles.navigationContainer}>
      <Title style={styles.sectionTitle}>Quick Actions</Title>
      <View style={styles.navigationGrid}>
        {navigationCards.map((card, index) => (
          <Card
            key={index}
            style={styles.navigationCard}
            onPress={card.onPress}
          >
            <Card.Content>
              <View style={[styles.iconContainer, { backgroundColor: card.color }]}>
                <MaterialCommunityIcons name={card.icon} size={24} color="white" />
              </View>
              <Title style={styles.cardTitle}>{card.title}</Title>
              <Paragraph style={styles.cardDescription}>{card.description}</Paragraph>
            </Card.Content>
          </Card>
        ))}
      </View>
    </View>
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchEmployees(),
        fetchStatistics()
      ]);
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const renderUtilitySection = () => (
    <ScrollView>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Title>Slider Images Management</Title>
            <Button
              mode="contained"
              onPress={() => setShowAddDialog(true)}
              style={styles.addButton}
            >
              Add New Image
            </Button>
          </View>
          <Divider style={styles.divider} />
          
          {sliderImages.map((image) => (
            <Card key={image.id} style={styles.imageCard}>
              <Card.Content>
                <Image
                  source={{ uri: image.imageUrl }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <Title style={styles.imageTitle}>{image.title}</Title>
                <Text style={styles.imageDescription}>{image.description}</Text>
                <View style={styles.actionButtons}>
                  <IconButton
                    icon="pencil"
                    onPress={() => openEditDialog(image)}
                  />
                  <IconButton
                    icon="delete"
                    onPress={() => handleDeleteSlider(image.id, image.imageUrl)}
                  />
                </View>
              </Card.Content>
            </Card>
          ))}
        </Card.Content>
      </Card>

      <Card style={[styles.card, { marginTop: 16 }]}>
        <Card.Content>
          <Title>Product Management</Title>
          <Divider style={styles.divider} />
          <ProductManagement />
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
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
            <View style={styles.header}>
              {/* <Title style={styles.screenTitle}>Admin Dashboard</Title> */}
              {/* <IconButton
                icon="logout"
                size={24}
                onPress={handleLogout}
              /> */}
            </View>
            {/* Image Slider */}
            <View style={[styles.sliderContainer, { height: getSliderHeight() }]}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#2196F3" />
                  <Text style={styles.loadingText}>Loading slider...</Text>
                </View>
              ) : sliderImages.length > 0 ? (
                <>
                  <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={({nativeEvent}) => {
                      const slide = Math.round(
                        nativeEvent.contentOffset.x / nativeEvent.layoutMeasurement.width
                      );
                      setActiveSlide(slide);
                    }}
                    scrollEventThrottle={900}
                  >
                    {sliderImages.map((item, index) => (
                      <View key={item.id} style={[styles.slideItem, { width: dimensions.width }]}>
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={[styles.sliderImage, { 
                            width: dimensions.width,
                            height: getSliderHeight()
                          }]}
                          resizeMode="cover"
                          fadeDuration={0}
                          progressiveRenderingEnabled={true}
                        />
                        {/* <View style={styles.slideOverlay}>
                          <Text style={styles.slideTitle}>{item.title}</Text>
                          <Text style={styles.slideDescription}>{item.description}</Text>
                        </View> */}
                      </View>
                    ))}
                  </ScrollView>
                  
                  {/* Pagination Dots */}
                  <View style={styles.pagination}>
                    {sliderImages.map((_, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => {
                          scrollViewRef.current?.scrollTo({
                            x: index * dimensions.width,
                            animated: true,
                          });
                          setActiveSlide(index);
                        }}
                      >
                        <View
                          style={[
                            styles.paginationDot,
                            index === activeSlide && styles.paginationDotActive
                          ]}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <View style={styles.noSliderContainer}>
                  <Text style={styles.noSliderText}>No slider images available</Text>
                </View>
              )}
            </View>
            {renderStatisticsCards()}
            {renderNavigationCards()}
            <Card style={styles.tableCard}>
              <Card.Content>
                <Title>Employee Overview</Title>
                <Searchbar
                  placeholder="Search by name, email, code, role, or phone..."
                  onChangeText={setSearchQuery}
                  value={searchQuery}
                  style={styles.searchBar}
                />
                <DataTable>
                  <DataTable.Header>
                    <DataTable.Title>Name</DataTable.Title>
                    <DataTable.Title>Code</DataTable.Title>
                    {/* <DataTable.Title>Role</DataTable.Title> */}
                    {/* <DataTable.Title>Contact</DataTable.Title> */}
                    <DataTable.Title>Last Active</DataTable.Title>
                    {/* <DataTable.Title>Status</DataTable.Title> */}
                    <DataTable.Title>Actions</DataTable.Title>
                  </DataTable.Header>

                  {filteredEmployees.map((employee) => (
                    <DataTable.Row key={employee.id}>
                      <DataTable.Cell>
                        <Text style={styles.employeeName}>{employee.fullName}</Text>
                        <Text style={styles.employeeEmail}>{employee.email}</Text>
                      </DataTable.Cell>
                      <DataTable.Cell>{employee.employeeCode}</DataTable.Cell>
                      {/* <DataTable.Cell>
                        <Text style={styles.roleText}>{employee.role || 'N/A'}</Text>
                      </DataTable.Cell> */}
                      {/* <DataTable.Cell>
                        <Text>{employee.phone || 'N/A'}</Text>
                      </DataTable.Cell> */}
                      <DataTable.Cell>
                        {employee.lastActive ? (
                          <Text>{format(employee.lastActive, 'MMM d, h:mm a')}</Text>
                        ) : (
                          <Text style={styles.neverActive}>Never</Text>
                        )}
                      </DataTable.Cell>
                      {/* <DataTable.Cell>
                        <Text style={{
                          color: employee.status === 'active' ? '#4caf50' : '#f44336',
                          fontWeight: 'bold'
                        }}>
                          {employee.status === 'active' ? 'Active' : 'Inactive'}
                        </Text>
                      </DataTable.Cell> */}
                      <DataTable.Cell>
                        <Button
                          mode="contained"
                          onPress={() => viewEmployeeDetails(employee.id)}
                          style={styles.viewButton}
                          labelStyle={styles.viewButtonLabel}
                        >
                          View
                        </Button>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ))}

                  {filteredEmployees.length === 0 && (
                    <DataTable.Row>
                      <DataTable.Cell style={styles.noDataCell}>
                        <Text style={styles.noDataText}>No employees found</Text>
                      </DataTable.Cell>
                    </DataTable.Row>
                  )}
                </DataTable>
              </Card.Content>
            </Card>
          </ScrollView>
        );
      case 'utility':
        return renderUtilitySection();
      default:
        return null;
    }
  };

  const topNavbar = () => (
    <View style={styles.topNavbar}>
      <View style={styles.navbarTitleContainer}>
        <Text style={styles.navbarTitle}>Admin Panel</Text>
      </View>
      {/* <View style={styles.employeeInfo}>
        <Text style={styles.employeeName}>Welcome: {userProfile?.fullName || user?.displayName || 'Admin'}</Text>
        <Text style={styles.employeeCode}>EmpCode: {userProfile?.employeeCode || 'N/A'}</Text>
        <Text style={styles.employeeDesignation}>Designation: {userProfile?.designation || 'Admin'}</Text>
      </View> */}
      <View style={styles.navButtons}>
        <TouchableOpacity
          style={[styles.navButton, activeTab === 'dashboard' && styles.activeNavButton]}
          onPress={() => setActiveTab('dashboard')}
        >
          <MaterialCommunityIcons 
            name="view-dashboard" 
            size={24} 
            color={activeTab === 'dashboard' ? '#fff' : '#666'} 
          />
          <Text style={[styles.navButtonText, activeTab === 'dashboard' && styles.activeNavButtonText]}>
            Dashboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, activeTab === 'utility' && styles.activeNavButton]}
          onPress={() => setActiveTab('utility')}
        >
          <MaterialCommunityIcons 
            name="tools" 
            size={24} 
            color={activeTab === 'utility' ? '#fff' : '#666'} 
          />
          <Text style={[styles.navButtonText, activeTab === 'utility' && styles.activeNavButtonText]}>
            Utility
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {topNavbar()}
      <View style={styles.content}>
        {renderContent()}
      </View>

      <Portal>
        {/* Add Dialog */}
        <Dialog visible={showAddDialog} onDismiss={() => setShowAddDialog(false)}>
          <Dialog.Title>Add New Slider Image</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Title"
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
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
            <Button
              mode="outlined"
              onPress={handleImagePick}
              style={styles.imageButton}
            >
              {formData.imageUrl ? 'Change Image' : 'Select Image'}
            </Button>
            {formData.imageUrl && (
              <Image
                source={{ uri: formData.imageUrl }}
                style={styles.selectedImage}
                resizeMode="cover"
              />
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onPress={handleAddSlider} loading={loading}>Add</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog visible={showEditDialog} onDismiss={() => setShowEditDialog(false)}>
          <Dialog.Title>Edit Slider Image</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Title"
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
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
            <Button
              mode="outlined"
              onPress={handleImagePick}
              style={styles.imageButton}
            >
              Change Image
            </Button>
            {formData.imageUrl && (
              <Image
                source={{ uri: formData.imageUrl }}
                style={styles.selectedImage}
                resizeMode="cover"
              />
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onPress={handleEditSlider} loading={loading}>Update</Button>
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
    flexDirection: 'column',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 8,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    margin: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 8,
  },
  statsCard: {
    width: '48%',
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#fff',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  tableCard: {
    margin: 16,
    elevation: 2,
    backgroundColor: '#fff',
  },
  searchBar: {
    marginVertical: 16,
  },
  employeeName: {
    fontWeight: 'bold',
  },
  employeeEmail: {
    fontSize: 12,
    color: '#666',
  },
  roleText: {
    textTransform: 'capitalize',
  },
  neverActive: {
    color: '#666',
    fontStyle: 'italic',
  },
  viewButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
  },
  viewButtonLabel: {
    fontSize: 12,
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
  navigationContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 16,
  },
  navigationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  navigationCard: {
    width: '48%',
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#fff',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: '#666',
  },
  topNavbar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  navbarTitleContainer: {
    padding: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  navbarTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  navButton: {
    alignItems: 'center',
    width: 70,
    padding: 8,
  },
  activeNavButton: {
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  navButtonText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  activeNavButtonText: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  card: {
    margin: 16,
    backgroundColor: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#4CAF50',
  },
  divider: {
    marginVertical: 16,
  },
  imageCard: {
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  imageTitle: {
    fontSize: 18,
  },
  imageDescription: {
    color: '#666',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  input: {
    marginBottom: 16,
  },
  imageButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  selectedImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  employeeName: {
    fontSize: 14,
    marginRight: 16,
    color: '#333',
  },
  employeeCode: {
    fontSize: 14,
    marginRight: 16,
    color: '#666',
  },
  employeeDesignation: {
    fontSize: 14,
    color: '#666',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  viewMoreText: {
    color: '#666',
    fontSize: 14,
    marginRight: 4,
  },
  sliderContainer: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  slideItem: {
    flex: 1,
    position: 'relative',
  },
  sliderImage: {
    width: '100%',
    height: '100%',
  },
  slideOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  slideTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  slideDescription: {
    color: '#fff',
    fontSize: 14,
  },
  pagination: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  noSliderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSliderText: {
    color: '#666',
    fontSize: 16,
  },
});

export default AdminDashboard; 