import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Image, Button, Alert, TouchableOpacity, Platform } from 'react-native';
import { 
  Avatar,
  Title, 
  Text, 
  Card, 
  Divider,
  ActivityIndicator,
  IconButton,
  Portal,
  Dialog,
  TextInput,
  ProgressBar,
  DataTable
} from 'react-native-paper';
import { auth, firestore } from '../../services/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { logoutUser } from '../../services/auth';
import { format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { uploadFile } from '../../services/storage';

const UserProfileScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editField, setEditField] = useState('');
  const [editValue, setEditValue] = useState('');
  const [performanceStats, setPerformanceStats] = useState({
    totalReports: 0,
    totalOrders: 0,
    totalVisits: 0,
    totalDoctors: 0,
    completedTasks: 0,
    pendingTasks: 0
  });
  const [monthlyTarget, setMonthlyTarget] = useState(0);
  const [currentMonthSales, setCurrentMonthSales] = useState(0);
  const [monthlySalesHistory, setMonthlySalesHistory] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [coverImage, setCoverImage] = useState(null);

  useEffect(() => {
    fetchUserProfile();
    fetchPerformanceStats();
    fetchMonthlySalesData();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userDoc = await getDoc(doc(firestore, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfile(userData);
        setProfileImage(userData.profileImageUrl);
        setCoverImage(userData.coverImageUrl);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformanceStats = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Fetch total doctors
      const doctorsQuery = query(
        collection(firestore, 'doctors'),
        where('userId', '==', userId)
      );
      const doctorsSnapshot = await getDocs(doctorsQuery);
      
      // Fetch total reports
      const reportsQuery = query(
        collection(firestore, 'reports'),
        where('userId', '==', userId)
      );
      const reportsSnapshot = await getDocs(reportsQuery);
      
      // Fetch total orders (both regular and h-orders)
      const ordersQuery = query(
        collection(firestore, 'orders'),
        where('userId', '==', userId)
      );
      const ordersSnapshot = await getDocs(ordersQuery);

      const hOrdersQuery = query(
        collection(firestore, 'h-orders'),
        where('userId', '==', userId)
      );
      const hOrdersSnapshot = await getDocs(hOrdersQuery);

      // Fetch total visits from daily reports (specifically doctor and chemist visits)
      const dailyReportsQuery = query(
        collection(firestore, 'reports'),
        where('userId', '==', userId)
      );
      const dailyReportsSnapshot = await getDocs(dailyReportsQuery);
      
      // Calculate total visits by counting doctor and chemist visits from reports
      let totalVisits = 0;
      dailyReportsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        // Check if the report is a hospital visit to doctor or chemist
        if (data.hospital === 'Doctor' || data.hospital === 'Chemist' || 
            data.hospital?.toLowerCase() === 'doctor' || data.hospital?.toLowerCase() === 'chemist') {
          totalVisits++;
        }
      });

      // Fetch all pending tasks from different collections
      const [pendingReportsSnapshot, pendingExpensesSnapshot, pendingOrdersSnapshot, 
             pendingHOrdersSnapshot, pendingTourPlansSnapshot, pendingLeavesSnapshot] = await Promise.all([
        getDocs(query(
          collection(firestore, 'reports'),
          where('userId', '==', userId),
          where('status', '==', 'pending')
        )),
        getDocs(query(
          collection(firestore, 'expenses'),
          where('userId', '==', userId),
          where('status', '==', 'pending')
        )),
        getDocs(query(
          collection(firestore, 'orders'),
          where('userId', '==', userId),
          where('status', '==', 'pending')
        )),
        getDocs(query(
          collection(firestore, 'h-orders'),
          where('userId', '==', userId),
          where('status', '==', 'pending')
        )),
        getDocs(query(
          collection(firestore, 'tourPlans'),
          where('userId', '==', userId),
          where('status', '==', 'pending')
        )),
        getDocs(query(
          collection(firestore, 'leaves'),
          where('userId', '==', userId),
          where('status', '==', 'pending')
        ))
      ]);

      // Calculate total pending tasks from all collections
      const totalPendingTasks = 
        pendingReportsSnapshot.size + 
        pendingExpensesSnapshot.size + 
        pendingOrdersSnapshot.size + 
        pendingHOrdersSnapshot.size + 
        pendingTourPlansSnapshot.size + 
        pendingLeavesSnapshot.size;

      // Calculate stats
      setPerformanceStats({
        totalDoctors: doctorsSnapshot.size,
        totalReports: reportsSnapshot.size,
        totalOrders: ordersSnapshot.size + hOrdersSnapshot.size,
        totalVisits: totalVisits,
        completedTasks: reportsSnapshot.docs.filter(doc => doc.data().status === 'completed').length,
        pendingTasks: totalPendingTasks
      });
    } catch (error) {
      console.error('Error fetching performance stats:', error);
    }
  };

  const fetchMonthlySalesData = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Get current month's start and end dates
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

      // Fetch current month's target
      const currentMonthTargetId = `${currentYear}_${currentMonth + 1}`;
      const targetDoc = await getDoc(doc(firestore, 'monthlyTargets', userId));
      let currentTarget = 0;
      
      if (targetDoc.exists()) {
        const targetData = targetDoc.data();
        currentTarget = targetData[currentMonthTargetId] || targetData.target || 1000;
        setMonthlyTarget(currentTarget);
      } else {
        setMonthlyTarget(1000);
        currentTarget = 1000;
      }

      // Fetch current month's sales from both collections with date range filter
      const [approvedOrdersSnapshot, approvedHOrdersSnapshot] = await Promise.all([
        getDocs(query(
          collection(firestore, 'orders'),
          where('userId', '==', userId),
          where('status', '==', 'approved'),
          where('createdAt', '>=', startOfMonth),
          where('createdAt', '<=', endOfMonth)
        )),
        getDocs(query(
          collection(firestore, 'h-orders'),
          where('userId', '==', userId),
          where('status', '==', 'approved'),
          where('createdAt', '>=', startOfMonth),
          where('createdAt', '<=', endOfMonth)
        ))
      ]);
      
      // Calculate current month sales
      const currentSales = [
        ...approvedOrdersSnapshot.docs,
        ...approvedHOrdersSnapshot.docs
      ].reduce((total, doc) => {
        const data = doc.data();
        const amount = data.totalAmount || 
                      (data.price && data.quantity ? data.price * data.quantity : 0) || 
                      data.amount || 
                      0;
        return total + amount;
      }, 0);
      
      setCurrentMonthSales(currentSales);

      // Calculate last 6 months of sales data
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const monthIndex = currentMonth - i;
        const yearOffset = Math.floor(monthIndex / 12);
        const adjustedMonth = ((monthIndex % 12) + 12) % 12;
        const year = currentYear + yearOffset;
        
        const monthStart = new Date(year, adjustedMonth, 1);
        const monthEnd = new Date(year, adjustedMonth + 1, 0, 23, 59, 59);
        
        // Get target for this specific month
        const monthTargetId = `${year}_${adjustedMonth + 1}`;
        let monthTarget = currentTarget;
        
        if (targetDoc.exists()) {
          const targetData = targetDoc.data();
          monthTarget = targetData[monthTargetId] || targetData.target || currentTarget;
        }
        
        // Fetch orders for this month with date range filter
        const [monthOrdersSnapshot, monthHOrdersSnapshot] = await Promise.all([
          getDocs(query(
            collection(firestore, 'orders'),
            where('userId', '==', userId),
            where('status', '==', 'approved'),
            where('createdAt', '>=', monthStart),
            where('createdAt', '<=', monthEnd)
          )),
          getDocs(query(
            collection(firestore, 'h-orders'),
            where('userId', '==', userId),
            where('status', '==', 'approved'),
            where('createdAt', '>=', monthStart),
            where('createdAt', '<=', monthEnd)
          ))
        ]);

        const monthSales = [
          ...monthOrdersSnapshot.docs,
          ...monthHOrdersSnapshot.docs
        ].reduce((total, doc) => {
          const data = doc.data();
          const amount = data.totalAmount || 
                        (data.price && data.quantity ? data.price * data.quantity : 0) || 
                        data.amount || 
                        0;
          return total + amount;
        }, 0);

        last6Months.push({
          month: format(monthStart, 'MMM yyyy'),
          sales: monthSales,
          target: monthTarget
        });
      }
      
      setMonthlySalesHistory(last6Months);
    } catch (error) {
      console.error('Error fetching monthly sales data:', error);
    }
  };

  const handleEditField = (field, currentValue) => {
    setEditField(field);
    setEditValue(currentValue || '');
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      await updateDoc(doc(firestore, 'users', userId), {
        [editField]: editValue,
        updatedAt: new Date()
      });

      setProfile(prev => ({
        ...prev,
        [editField]: editValue
      }));

      setShowEditDialog(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Update Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Logout Error', 'Failed to log out. Please try again.', [{ text: 'OK' }]);
    }
  };

  const pickImage = async (type) => {
    try {
      let imageUri;
      
      if (Platform.OS === 'web') {
        // Create a file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        // Handle file selection
        const file = await new Promise((resolve) => {
          input.onchange = (e) => resolve(e.target.files[0]);
          input.click();
        });

        if (!file) return;

        // Convert file to data URL
        imageUri = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        });
      } else {
        // Mobile image picker
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: type === 'profile' ? [1, 1] : [16, 9],
          quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          imageUri = result.assets[0].uri;
        } else {
          return;
        }
      }

      setUploading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Create storage path
      const timestamp = Date.now();
      const storagePath = `users/${userId}/${type}_${timestamp}.jpg`;

      // Upload image
      const downloadURL = await uploadFile(imageUri, storagePath, {
        quality: 0.8,
        maxWidth: type === 'profile' ? 500 : 1200,
        maxHeight: type === 'profile' ? 500 : 675,
      });

      // Update user profile in Firestore
      await updateDoc(doc(firestore, 'users', userId), {
        [`${type}ImageUrl`]: downloadURL,
        updatedAt: new Date()
      });

      // Update local state
      if (type === 'profile') {
        setProfileImage(downloadURL);
      } else {
        setCoverImage(downloadURL);
      }

      Alert.alert('Success', `${type === 'profile' ? 'Profile' : 'Cover'} image updated successfully`);
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', `Failed to update ${type === 'profile' ? 'profile' : 'cover'} image`);
    } finally {
      setUploading(false);
    }
  };

  const renderMonthlySalesData = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Monthly Sales Performance</Title>
        
        <View style={styles.salesHeader}>
          <View style={styles.salesTargetContainer}>
            <Text style={styles.salesLabel}>Monthly Target</Text>
            <Text style={styles.salesValue}>₹{monthlyTarget.toLocaleString()}</Text>
          </View>
          
          <View style={styles.salesCurrentContainer}>
            <Text style={styles.salesLabel}>Current Month Sales</Text>
            <Text style={styles.salesValue}>₹{currentMonthSales.toLocaleString()}</Text>
            <ProgressBar 
              progress={monthlyTarget > 0 ? Math.min(currentMonthSales / monthlyTarget, 1) : 0} 
              color={currentMonthSales >= monthlyTarget ? '#4caf50' : '#2196F3'}
              style={styles.progressBar}
            />
          </View>
        </View>

        <Divider style={styles.divider} />

        <Title style={styles.sectionTitle}>Last 6 Months Performance</Title>
        <DataTable>
          <DataTable.Header>
            <DataTable.Title>Month</DataTable.Title>
            <DataTable.Title numeric>Sales</DataTable.Title>
            <DataTable.Title numeric>Target</DataTable.Title>
            <DataTable.Title numeric>Achievement</DataTable.Title>
          </DataTable.Header>

          {monthlySalesHistory.map((month, index) => (
            <DataTable.Row key={index}>
              <DataTable.Cell>{month.month}</DataTable.Cell>
              <DataTable.Cell numeric>₹{month.sales.toLocaleString()}</DataTable.Cell>
              <DataTable.Cell numeric>₹{month.target.toLocaleString()}</DataTable.Cell>
              <DataTable.Cell numeric>
                <Text style={{
                  color: month.sales >= month.target ? '#4caf50' : '#f44336'
                }}>
                  {month.target > 0 ? `${((month.sales / month.target) * 100).toFixed(1)}%` : 'N/A'}
                </Text>
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text>No profile data found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity 
        onPress={() => pickImage('cover')} 
        style={styles.coverImageContainer}
        activeOpacity={0.7}
      >
        {coverImage ? (
          <Image 
            source={{ uri: coverImage }} 
            style={styles.coverImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.coverImage, styles.placeholderCover]}>
            <MaterialCommunityIcons name="camera-plus" size={40} color="#666" />
            <Text style={styles.uploadText}>Upload Cover Image</Text>
          </View>
        )}
        {uploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => pickImage('profile')} 
          style={styles.profileImageContainer}
          activeOpacity={0.7}
        >
          {profileImage ? (
            <Image 
              source={{ uri: profileImage }} 
              style={styles.profileImage}
              resizeMode="cover"
            />
          ) : (
            <Avatar.Text 
              size={80} 
              label={profile.name ? profile.name.substring(0, 2).toUpperCase() : 'U'} 
            />
          )}
          <View style={styles.editProfileIcon}>
            <MaterialCommunityIcons name="camera" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
        <Title style={styles.name}>{profile.name || profile.fullName}</Title>
        <Text style={styles.employeeCode}>Employee Code: {profile.employeeCode}</Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Personal Information</Title>
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="email" size={24} color="#666" />
            <Text style={styles.infoText}>{profile.email}</Text>
            <IconButton icon="pencil" size={20} onPress={() => handleEditField('email', profile.email)} />
          </View>
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="domain" size={24} color="#666" />
            <Text style={styles.infoText}>Headquarter: {profile.headquarters || 'N/A'}</Text>
          </View>
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="phone" size={24} color="#666" />
            <Text style={styles.infoText}>{profile.phone || 'Not provided'}</Text>
            <IconButton icon="pencil" size={20} onPress={() => handleEditField('phone', profile.phone)} />
          </View>
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker" size={24} color="#666" />
            <Text style={styles.infoText}>{profile.address || 'Not provided'}</Text>
            <IconButton icon="pencil" size={20} onPress={() => handleEditField('address', profile.address)} />
          </View>
        </Card.Content>
      </Card>

      {renderMonthlySalesData()}

      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Job Profile</Title>
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="briefcase" size={24} color="#666" />
            <Text style={styles.infoText}>{profile.designation || 'Medical Sales Representative'}</Text>
          </View>
          <Divider style={styles.divider} />
          
          {/* <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map" size={24} color="#666" />
            <Text style={styles.infoText}>{profile.territory || 'Not assigned'}</Text>
          </View> */}
          {/* <Divider style={styles.divider} /> */}
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar" size={24} color="#666" />
            <Text style={styles.infoText}>
              Joined: {profile.joinDate ? format(profile.joinDate.toDate(), 'dd MMM yyyy') : 'Not provided'}
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Performance Statistics</Title>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{performanceStats.totalDoctors}</Text>
              <Text style={styles.statLabel}>Doctors</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{performanceStats.totalReports}</Text>
              <Text style={styles.statLabel}>Reports</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{performanceStats.totalOrders}</Text>
              <Text style={styles.statLabel}>Total Orders</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{performanceStats.totalVisits}</Text>
              <Text style={styles.statLabel}>Total Visits</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{performanceStats.completedTasks}</Text>
              <Text style={styles.statLabel}>Completed Tasks</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{performanceStats.pendingTasks}</Text>
              <Text style={styles.statLabel}>Pending Tasks</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.logoutContainer}>
        <Button title="Logout" onPress={handleLogout} color="#FF671F" />
      </View>

      <Portal>
        <Dialog visible={showEditDialog} onDismiss={() => setShowEditDialog(false)}>
          <Dialog.Title>Edit {editField}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              value={editValue}
              onChangeText={setEditValue}
              mode="outlined"
              style={styles.dialogInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button title="Cancel" onPress={() => setShowEditDialog(false)} color="#666" />
            <Button title="Save" onPress={handleSaveEdit} color="#2196F3" />
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
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
  header: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 0,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  name: {
    fontSize: 24,
    marginTop: 10,
  },
  employeeCode: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  card: {
    margin: 10,
    elevation: 2, 
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 15,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoText: {
    marginLeft: 15,
    fontSize: 16,
    flex: 1,
  },
  divider: {
    marginVertical: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    elevation: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    color: '#666',
    marginTop: 5,
    fontSize: 12,
  },
  logoutContainer: {
    margin: 20,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    elevation: 2,
  },
  dialogInput: {
    marginTop: 10,
  },
  salesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  salesTargetContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginRight: 8,
  },
  salesCurrentContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginLeft: 8,
  },
  salesLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  salesValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#e1e1e1',
  },
  placeholderCover: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    color: '#666',
    marginTop: 8,
    fontSize: 16,
  },
  profileImageContainer: {
    position: 'relative',
    marginTop: -40,
    zIndex: 1,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: '#e1e1e1',
  },
  editProfileIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: '#fff',
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
});

export default UserProfileScreen; 