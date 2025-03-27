import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Image, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { 
  Card, 
  Title, 
  Text, 
  useTheme,
  IconButton,
  Button,
  Divider,
  ActivityIndicator
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { firestore } from '../../services/firebase';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

const DashboardScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [orientation, setOrientation] = useState('PORTRAIT');
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const scrollViewRef = useRef(null);
  const [sliderImages, setSliderImages] = useState([]);
  const [sliderLoading, setSliderLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
      setOrientation(window.width > window.height ? 'LANDSCAPE' : 'PORTRAIT');
    });

    return () => subscription.remove();
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

  const fetchSliderImages = async () => {
    try {
      setSliderLoading(true);
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
      setSliderLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestNews();
    fetchSliderImages();
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (sliderImages.length > 0) {
      // Auto scroll slider
      const intervalId = setInterval(() => {
        if (scrollViewRef.current) {
          const nextSlide = (activeSlide + 1) % sliderImages.length;
          scrollViewRef.current.scrollTo({
            x: nextSlide * dimensions.width,
            animated: true
          });
          setActiveSlide(nextSlide);
        }
      }, 3000); // Change slide every 3 seconds

      return () => clearInterval(intervalId);
    }
  }, [activeSlide, sliderImages]);

  const fetchLatestNews = async () => {
    try {
      const q = query(
        collection(firestore, 'news'),
        orderBy('createdAt', 'desc'),
        limit(3)
      );
      
      const querySnapshot = await getDocs(q);
      const newsItems = [];
      querySnapshot.forEach((doc) => {
        newsItems.push({ id: doc.id, ...doc.data() });
      });
      
      setNews(newsItems);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchLatestNews(),
        fetchSliderImages()
      ]);
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const navigationIcons = [
   
    {
      title: 'Daily Report',
      icon: 'file-document',
      route: 'Daily Report',
      color: '#E91E63'
    },
    {
      title: 'Products',
      icon: 'pill',
      route: 'Medicines List',
      color: '#4CAF50'
    },
    {
      title: 'Visual Aids',
      icon: 'image',
      route: 'Visual Aid',
      color: '#2196F3'
    },
    {
      title: 'Expenses',
      icon: 'chart-line',
      route: 'Expenses',
      color: '#795548'
    },
    {
      title: 'MSL List',
      icon: 'account-group',
      route: 'MSL List',
      color: '#9C27B0'
    },
    {
      title: 'My Orders',
      icon: 'cart',
      route: 'H-Order',
      color: '#FF9800'
    },
    {
      title: 'PTR/PTS',
      icon: 'calculator',
      route: 'Order Product',
      color: '#3F51B5'
    },
    
    {
      title: 'Leave',
      icon: 'calendar-clock',
      route: 'Leave',
      color: '#009688'
    },
    {
      title: 'Visits',
      icon: 'map-marker-radius',
      route: 'STP',
      color: '#607D8B'
    },
    
    {
      title: 'Utility',
      icon: 'tools',
      route: 'Utility',
      color: '#FF5722'
    },
    {
      title: 'Profile',
      icon: 'account',
      route: 'Profile',
      color: '#00BCD4'
    },
    // {
    //   title: 'Connect With Us',
    //   icon: 'phone-in-talk',
    //   route: 'Profile',
    //   color: '#8BC34A'
    // }
  ];

  const getIconSize = () => {
    return orientation === 'LANDSCAPE' ? '20%' : '25%';
  };

  const getSliderHeight = () => {
    return orientation === 'LANDSCAPE' ? 180 : 250;
  };

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
        {/* Employee Information */}
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>Welcome: {userProfile?.fullName || user?.displayName || 'Employee'}</Text>
          <Text style={styles.employeeCode}>EmpCode: {userProfile?.employeeCode || 'N/A'}</Text>
          <Text style={styles.employeeDesignation}>Designation: {userProfile?.designation || 'MR'}</Text>
        </View>

        {/* Image Slider */}
        <View style={[styles.sliderContainer, { height: getSliderHeight() }]}>
          {sliderLoading ? (
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
                      defaultSource={require('../../../assets/Staylor.png')}
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

        {/* Navigation Icons Grid */}
        <View style={styles.iconsContainer}>
          {navigationIcons.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.iconWrapper, { width: getIconSize() }]}
              onPress={() => navigation.navigate(item.route)}
            >
              <View style={styles.iconBox}>
                <MaterialCommunityIcons 
                  name={item.icon} 
                  size={orientation === 'LANDSCAPE' ? 24 : 28} 
                  color={item.color}
                />
              </View>
              <Text style={[
                styles.iconText,
                { fontSize: orientation === 'LANDSCAPE' ? 10 : 12 }
              ]} numberOfLines={2}>
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* News Board Section */}
        <Card style={[styles.newsCard, { 
          margin: orientation === 'LANDSCAPE' ? 5 : 10,
          marginTop: orientation === 'LANDSCAPE' ? 5 : 10
        }]}>
          <Card.Content>
            <View style={styles.newsTitleContainer}>
              <MaterialCommunityIcons 
                name="newspaper" 
                size={24} 
                color="#1976D2"
                style={styles.newsIcon}
              />
              <Title style={styles.newsTitle}>Message/Alerts</Title>
            </View>
            <Divider style={styles.divider} />
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" />
                <Text style={styles.loadingText}>Loading news...</Text>
              </View>
            ) : news.length > 0 ? (
              news.map((item) => (
                <View key={item.id} style={styles.newsItem}>
                  <Text style={styles.newsItemTitle}>{item.title}</Text>
                  <Text style={styles.newsItemDate}>
                    {item.createdAt?.toDate().toLocaleDateString()}
                  </Text>
                  <Text style={styles.newsItemContent} numberOfLines={2}>
                    {item.content}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noNewsText}>No news available</Text>
            )}
            <Button 
              mode="text" 
              onPress={() => navigation.navigate('News')}
              style={styles.viewAllButton}
            >
              View All News
            </Button>
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
  sliderContainer: {
    position: 'relative',
    backgroundColor: '#fff',
    marginBottom: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  slideItem: {
    position: 'relative',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderImage: {
    height: '100%',
    backgroundColor: '#fff',
  },
  slideOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 15,
    backdropFilter: 'blur(5px)',
  },
  slideTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  slideDescription: {
    color: '#fff',
    fontSize: 14,
  },
  pagination: {
    position: 'absolute',
    bottom: 10,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
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
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  iconsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  iconWrapper: {
    alignItems: 'center',
    padding: 8,
  },
  iconBox: {
    width: 50,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  iconText: {
    textAlign: 'center',
    color: '#333',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    fontWeight: 'bold'
  },
  newsCard: {
    elevation: 2,
    backgroundColor: '#fff',
  },
  newsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  newsIcon: {
    marginRight: 10,
  },
  newsTitle: {
    fontSize: 20,
    color: '#333',
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 10,
  },
  newsItem: {
    marginBottom: 15,
  },
  newsItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  newsItemDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  newsItemContent: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
  viewAllButton: {
    marginTop: 10,
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
  noNewsText: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
  noSliderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  noSliderText: {
    color: '#666',
    fontSize: 16,
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
});

export default DashboardScreen;
