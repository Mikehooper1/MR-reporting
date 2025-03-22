import React, { useState, useRef, useEffect } from 'react';
import { View, Image, Dimensions, Animated, PanResponder, StyleSheet, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Portal, Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as ScreenOrientation from 'expo-screen-orientation';

const VisualAidGallery = ({ visible, onDismiss, visualAids = [], initialIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [scale, setScale] = useState(1);
  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);
  const scaleValue = useRef(new Animated.Value(1)).current;
  const lastGesture = useRef(null);
  const initialPinchDistance = useRef(null);
  const initialScale = useRef(1);

  useEffect(() => {
    // Handle orientation changes
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    // Set landscape orientation when component mounts
    if (visible) {
      StatusBar.setHidden(true);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }

    return () => {
      subscription?.remove();
      // Reset orientation when component unmounts
      StatusBar.setHidden(false);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    };
  }, [visible]);

  useEffect(() => {
    // Reset states when current item changes
    setImageError(false);
    setImageLoading(true);
  }, [currentIndex]);

  // Reset currentIndex if it's out of bounds
  useEffect(() => {
    if (currentIndex >= visualAids.length) {
      setCurrentIndex(Math.max(0, visualAids.length - 1));
    }
  }, [visualAids, currentIndex]);

  const currentItem = visualAids[currentIndex] || null;

  const getFileType = (url) => {
    if (!url) return null;
    
    // Handle data URLs
    if (url.startsWith('data:')) {
      if (url.includes('image/')) return 'image';
      if (url.includes('application/pdf')) return 'pdf';
      return null;
    }

    // Handle regular URLs
    try {
      // Remove query parameters for extension checking
      const urlWithoutParams = url.split('?')[0];
      const extension = urlWithoutParams.toLowerCase().split('.').pop();
      
      // Common image formats
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) return 'image';
      
      // PDF format
      if (extension === 'pdf') return 'pdf';

      // If URL contains specific keywords
      const urlLower = url.toLowerCase();
      if (urlLower.includes('image') || urlLower.includes('photo')) return 'image';
      if (urlLower.includes('pdf')) return 'pdf';

      return null;
    } catch (error) {
      console.error('Error determining file type:', error);
      return null;
    }
  };

  const fileType = currentItem?.visualAidUrl ? getFileType(currentItem.visualAidUrl) : null;

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      const newScale = scale === 1 ? 2 : 1;
      setScale(newScale);

      if (newScale === 1) {
        // Reset position and scale when zooming out
        Animated.parallel([
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 5
          }),
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 5
          }),
          Animated.spring(scaleValue, {
            toValue: 1,
            useNativeDriver: true,
            friction: 7,
            tension: 70
          })
        ]).start(() => {
          lastGesture.current = null;
        });
      } else {
        // Just zoom in
        Animated.spring(scaleValue, {
          toValue: newScale,
          useNativeDriver: true,
          friction: 7,
          tension: 70
        }).start();
      }
    }
    lastTap.current = now;
  };

  const handlePinchGesture = (touches) => {
    if (touches.length < 2) return;

    const touchA = touches[0];
    const touchB = touches[1];

    // Calculate current distance between touches
    const distance = Math.sqrt(
      Math.pow(touchA.pageX - touchB.pageX, 2) +
      Math.pow(touchA.pageY - touchB.pageY, 2)
    );

    // If this is the start of the pinch, store initial values
    if (!initialPinchDistance.current) {
      initialPinchDistance.current = distance;
      initialScale.current = scale;
      return;
    }

    // Calculate new scale based on the change in distance
    const changeRatio = distance / initialPinchDistance.current;
    const newScale = Math.max(0.5, initialScale.current * changeRatio); // Minimum scale of 0.5

    setScale(newScale);
    scaleValue.setValue(newScale);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      const dx = Math.abs(gestureState.dx);
      const dy = Math.abs(gestureState.dy);
      return scale > 1 ? (dx > 2 || dy > 2) : dx > 5; // More sensitive horizontal detection
    },
    onPanResponderGrant: (evt) => {
      const now = Date.now();
      if (now - lastTap.current < 300 && evt.nativeEvent.changedTouches.length === 1) {
        handleDoubleTap();
      }
      lastTap.current = now;
      
      if (scale > 1) {
        lastGesture.current = {
          x: panX._value,
          y: panY._value
        };
      } else {
        // Stop any existing animations
        panX.stopAnimation();
        panX.setValue(0);
      }

      initialPinchDistance.current = null;
    },
    onPanResponderMove: (evt, gestureState) => {
      const touches = evt.nativeEvent.touches;
      
      if (touches.length >= 2) {
        handlePinchGesture(touches);
        return;
      }

      if (scale > 1) {
        if (lastGesture.current) {
          const newX = lastGesture.current.x + gestureState.dx;
          const newY = lastGesture.current.y + gestureState.dy;
          
          const maxPan = (scale - 1) * dimensions.width / 2;
          const boundedX = Math.max(-maxPan, Math.min(maxPan, newX));
          const boundedY = Math.max(-maxPan, Math.min(maxPan, newY));
          
          panX.setValue(boundedX);
          panY.setValue(boundedY);
        }
      } else {
        // Smoother tracking for image switching
        panX.setValue(gestureState.dx);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      initialPinchDistance.current = null;
      initialScale.current = scale;

      if (scale <= 1) {
        const { dx, vx } = gestureState;
        const threshold = dimensions.width * 0.2; // Reduced threshold for easier switching
        const velocity = Math.abs(vx);
        const isQuickSwipe = velocity > 0.3;

        const shouldSwitch = Math.abs(dx) > threshold || isQuickSwipe;

        if (shouldSwitch) {
          if ((dx > 0 || vx > 0.3) && currentIndex > 0) {
            // Swipe right - previous image
            setCurrentIndex(currentIndex - 1);
            Animated.spring(panX, {
              toValue: dimensions.width,
              useNativeDriver: true,
              friction: 8,
              tension: 40,
              velocity: vx
            }).start();
          } else if ((dx < 0 || vx < -0.3) && currentIndex < visualAids.length - 1) {
            // Swipe left - next image
            setCurrentIndex(currentIndex + 1);
            Animated.spring(panX, {
              toValue: -dimensions.width,
              useNativeDriver: true,
              friction: 8,
              tension: 40,
              velocity: vx
            }).start();
          } else {
            // Bounce back if can't switch
            Animated.spring(panX, {
              toValue: 0,
              useNativeDriver: true,
              friction: 8,
              tension: 40,
              velocity: vx
            }).start();
          }
        } else {
          // Return to center with spring physics
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
            tension: 40,
            velocity: vx
          }).start();
        }
      } else if (scale > 1) {
        if (lastGesture.current) {
          const maxPan = (scale - 1) * dimensions.width / 2;
          const newX = Math.max(-maxPan, Math.min(maxPan, panX._value));
          const newY = Math.max(-maxPan, Math.min(maxPan, panY._value));
          
          lastGesture.current = { x: newX, y: newY };
          
          // Smooth bounce back if out of bounds
          Animated.spring(panX, {
            toValue: newX,
            useNativeDriver: true,
            friction: 8,
            tension: 40
          }).start();
          
          Animated.spring(panY, {
            toValue: newY,
            useNativeDriver: true,
            friction: 8,
            tension: 40
          }).start();
        }
      }
    }
  });

  const resetPanAndScale = () => {
    Animated.parallel([
      Animated.spring(panX, {
        toValue: 0,
        useNativeDriver: true,
        friction: 5
      }),
      Animated.spring(panY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 5
      }),
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5
      })
    ]).start(() => {
      setScale(1);
      initialScale.current = 1;
      initialPinchDistance.current = null;
      lastGesture.current = null;
    });
  };

  useEffect(() => {
    // Reset pan and scale when image changes
    resetPanAndScale();
  }, [currentIndex]);

  const renderContent = () => {
    if (!currentItem?.visualAidUrl) {
      return (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="image-off" size={48} color="#666" />
          <Text style={styles.errorText}>No visual aid available</Text>
        </View>
      );
    }

    const tryAsImage = !fileType || fileType === 'image';
    
    if (tryAsImage) {
      return (
        <View style={styles.imageContainer}>
          {imageLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>Loading visual aid...</Text>
            </View>
          )}
          {imageError ? (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="image-off" size={48} color="#666" />
              <Text style={styles.errorText}>Failed to load visual aid</Text>
              <Button 
                mode="contained" 
                onPress={() => {
                  setImageError(false);
                  setImageLoading(true);
                }}
                style={styles.retryButton}
              >
                Retry
              </Button>
            </View>
          ) : (
            <Animated.Image
              source={{ 
                uri: currentItem.visualAidUrl,
                headers: { 'Cache-Control': 'no-cache' }
              }}
              style={[
                styles.image,
                {
                  transform: scale > 1 ? [
                    { scale: scaleValue },
                    { translateX: panX },
                    { translateY: panY }
                  ] : []
                }
              ]}
              resizeMode="contain"
              onError={() => {
                console.error('Error loading image:', currentItem.visualAidUrl);
                setImageError(true);
                setImageLoading(false);
              }}
              onLoad={() => {
                setImageLoading(false);
                resetPanAndScale();
              }}
            />
          )}
        </View>
      );
    }

    if (fileType === 'pdf') {
      return (
        <View style={styles.pdfContainer}>
          <WebView
            source={{ uri: currentItem.visualAidUrl }}
            style={styles.pdf}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Loading PDF...</Text>
              </View>
            )}
            onError={() => setImageError(true)}
            scalesPageToFit={true}
            bounces={false}
          />
        </View>
      );
    }

    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="file-alert" size={48} color="#666" />
        <Text style={styles.errorText}>Unable to display this visual aid</Text>
        <Text style={styles.errorSubText}>URL: {currentItem.visualAidUrl}</Text>
      </View>
    );
  };

  return (
    <Portal>
      <Animated.View
        style={[
          styles.fullScreenContainer,
          { display: visible ? 'flex' : 'none' }
        ]}
      >
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={onDismiss}
        >
          <MaterialCommunityIcons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Animated.View
          style={[
            styles.content,
            {
              transform: scale > 1 ? [] : [
                { translateX: panX },
                {
                  scale: scaleValue.interpolate({
                    inputRange: [-dimensions.width, 0, dimensions.width],
                    outputRange: [0.95, 1, 0.95] // Subtle scale effect
                  })
                }
              ]
            }
          ]}
          {...panResponder.panHandlers}
        >
          {renderContent()}
        </Animated.View>
      </Animated.View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 1000,
  },
  content: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    backgroundColor: 'transparent',
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pdf: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 2000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
  errorSubText: {
    marginTop: 8,
    color: '#999',
    textAlign: 'center',
    fontSize: 12,
  },
  retryButton: {
    marginTop: 16,
  }
});

export default VisualAidGallery; 