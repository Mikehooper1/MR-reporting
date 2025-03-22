import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Linking, Platform, FlatList, Dimensions } from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  FAB,
  Portal,
  Dialog,
  TextInput,
  IconButton,
  ActivityIndicator,
  Chip,
  Searchbar,
  HelperText,
} from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { firestore, auth } from '../../services/firebase';
import { createVisualAid, getAllVisualAids, likeVisualAid, incrementViewCount } from '../../services/database';
import { uploadFile } from '../../services/storage';
import { format } from 'date-fns';
import { VISUAL_AID_CATEGORIES } from '../../constants/categories';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

const VisualAidScreen = () => {
  const [visualAids, setVisualAids] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    category: '',
    fileUrl: null,
    fileName: '',
    fileType: '',
    fileError: null
  });

  useEffect(() => {
    fetchVisualAids();
  }, []);

  const fetchVisualAids = async () => {
    try {
      setLoading(true);
      console.log('Fetching visual aids...');
      
      // Get the current user
      const userId = auth.currentUser?.uid;
      console.log('Current user ID:', userId);
      
      const q = query(
        collection(firestore, 'visualAids'),
        orderBy('uploadedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const aids = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Visual aid document:', { id: doc.id, ...data });
        return {
          id: doc.id,
          ...data
        };
      });
      
      console.log(`Found ${aids.length} visual aids`);
      setVisualAids(aids);
    } catch (error) {
      console.error('Error fetching visual aids:', error);
      alert('Error loading visual aids. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        multiple: false,
        copyToCacheDirectory: true
      });

      console.log('DocumentPicker result:', result);

      if (result.canceled) {
        console.log('Document picking was canceled');
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        throw new Error('No file selected');
      }

      const file = result.assets[0];
      
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!file.mimeType || !validTypes.includes(file.mimeType.toLowerCase())) {
        throw new Error('Please select a PDF, JPG, or PNG file');
      }

      // Validate file size (max 100MB)
      const fileInfo = await FileSystem.getInfoAsync(file.uri);
      const maxSize = 100 * 1024 * 1024; // 100MB in bytes
      
      if (fileInfo.size > maxSize) {
        throw new Error('File size must be less than 100 MB');
      }

      setUploadData({
        ...uploadData,
        fileUrl: file.uri,
        fileName: file.name,
        fileType: file.mimeType,
        fileError: null
      });

      console.log('File selected successfully:', {
        name: file.name,
        type: file.mimeType,
        size: fileInfo.size,
        uri: file.uri
      });

    } catch (error) {
      console.error('Error picking file:', error);
      setUploadData(prev => ({
        ...prev,
        fileError: error.message || 'Error selecting file. Please try again.'
      }));
    }
  };

  const handleUpload = async () => {
    try {
      if (!uploadData.title || !uploadData.description || !uploadData.fileUrl) {
        alert('Please fill in all fields and select a file');
        return;
      }

      setUploading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Create a clean filename without spaces and special characters
      const cleanFileName = uploadData.fileName
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, '_');

      // Create a structured storage path
      const storagePath = `visual-aids/${userId}/${uploadData.category}/${Date.now()}_${cleanFileName}`;

      // Upload file to Firebase Storage with proper folder structure and quality settings
      const downloadURL = await uploadFile(
        uploadData.fileUrl,
        storagePath,
        {
          quality: 1.0, // Maximum quality
          maxWidth: 2048, // Maximum width while maintaining aspect ratio
          maxHeight: 2048, // Maximum height while maintaining aspect ratio
          compress: 0.9 // High quality compression
        }
      );

      // Create visual aid document with additional metadata
      await createVisualAid({
        title: uploadData.title,
        description: uploadData.description,
        category: uploadData.category,
        fileUrl: downloadURL,
        fileName: uploadData.fileName,
        fileType: uploadData.fileType,
        storagePath: storagePath,
        userId,
        uploadedBy: auth.currentUser?.displayName || 'Unknown User',
        uploadedAt: new Date(),
        status: 'approved',
        likes: 0,
        viewCount: 0,
        likedBy: [],
        imageQuality: 'high',
        dimensions: {
          width: 2048,
          height: 2048
        }
      });

      setShowUploadDialog(false);
      setUploadData({
        title: '',
        description: '',
        category: '',
        fileUrl: null,
        fileName: '',
        fileType: '',
        fileError: null
      });
      fetchVisualAids();
      
      alert('Visual aid uploaded successfully!');
    } catch (error) {
      console.error('Error uploading visual aid:', error);
      alert('Error uploading visual aid. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleLike = async (visualAidId) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      await likeVisualAid(visualAidId, userId);
      fetchVisualAids();
    } catch (error) {
      console.error('Error liking visual aid:', error);
    }
  };

  const handleView = async (visualAid) => {
    try {
      await incrementViewCount(visualAid.id);
      if (Platform.OS === 'web') {
        window.open(visualAid.fileUrl, '_blank');
      } else {
        await Linking.openURL(visualAid.fileUrl);
      }
    } catch (error) {
      console.error('Error opening visual aid:', error);
      alert('Error opening the file. Please try again.');
    }
  };

  const filteredVisualAids = visualAids.filter(aid => 
    aid.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    aid.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    aid.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Add helper function for safe date formatting
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    try {
      // Handle both Firestore Timestamps and regular Date objects
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'MMM dd, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown date';
    }
  };

  const getFileTypeIcon = (fileType) => {
    if (!fileType) return 'file-question';
    if (fileType.includes('pdf')) return 'file-pdf-box';
    if (fileType.includes('image')) return 'file-image';
    return 'file';
  };

  const getViewButtonLabel = (fileType) => {
    if (!fileType) return 'View File';
    if (fileType.includes('pdf')) return 'View PDF';
    if (fileType.includes('image')) return 'View Image';
    return 'View File';
  };

  const renderItem = ({ item: aid }) => (
    <Card style={styles.gridCard} onPress={() => handleView(aid)}>
      <Card.Cover
        source={{ 
          uri: aid.fileUrl,
          cache: 'force-cache',
        }}
        style={styles.gridImage}
      />
      <Card.Content style={styles.gridContent}>
        <Title numberOfLines={1} style={styles.gridTitle}>{aid.title}</Title>
        <Paragraph numberOfLines={2} style={styles.gridDescription}>
          {aid.description}
        </Paragraph>
        <Chip style={styles.gridChip}>{aid.category}</Chip>
        <View style={styles.gridStats}>
          <View style={styles.statItem}>
            <IconButton
              icon={aid.likedBy?.includes(auth.currentUser?.uid) ? 'heart' : 'heart-outline'}
              size={20}
              onPress={() => handleLike(aid.id)}
            />
            <Paragraph style={styles.statText}>{aid.likes || 0}</Paragraph>
          </View>
          <View style={styles.statItem}>
            <IconButton icon="eye" size={20} />
            <Paragraph style={styles.statText}>{aid.viewCount || 0}</Paragraph>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search visual aids..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
        </View>
      ) : (
        <FlatList
          data={filteredVisualAids}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          ListEmptyComponent={() => (
            <Card style={styles.noResultsCard}>
              <Card.Content>
                <Title>No Visual Aids Found</Title>
                <Paragraph>
                  Be the first to upload a visual aid! Click the + button below to add one.
                </Paragraph>
              </Card.Content>
            </Card>
          )}
        />
      )}

      <Portal>
        <Dialog visible={showUploadDialog} onDismiss={() => setShowUploadDialog(false)}>
          <Dialog.Title>Upload Visual Aid</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Title"
              value={uploadData.title}
              onChangeText={(text) => setUploadData({ ...uploadData, title: text })}
              style={styles.input}
            />
            <TextInput
              label="Description"
              value={uploadData.description}
              onChangeText={(text) => setUploadData({ ...uploadData, description: text })}
              multiline
              numberOfLines={3}
              style={styles.input}
            />
            <TextInput
              label="Category"
              value={uploadData.category}
              onChangeText={(text) => setUploadData({ ...uploadData, category: text })}
              style={styles.input}
            />
            <Button
              mode="outlined"
              onPress={handleFilePick}
              style={styles.fileButton}
              icon={uploadData.fileType?.includes('pdf') ? 'file-pdf-box' : 'file-image'}
            >
              {uploadData.fileName || 'Select File (PDF, JPG, PNG)'}
            </Button>
            {uploadData.fileError && (
              <HelperText type="error" visible={true}>
                {uploadData.fileError}
              </HelperText>
            )}
            {uploadData.fileName && (
              <HelperText type="info" visible={true}>
                Selected file: {uploadData.fileName} ({uploadData.fileType})
              </HelperText>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowUploadDialog(false)}>Cancel</Button>
            <Button onPress={handleUpload} loading={uploading}>Upload</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setShowUploadDialog(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    elevation: 4,
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#f5f5f5',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    padding: 8,
  },
  gridCard: {
    flex: 1,
    margin: 8,
    maxWidth: Dimensions.get('window').width / 2 - 16,
    elevation: 2,
  },
  gridImage: {
    height: 160,
    backgroundColor: '#fff',
  },
  gridContent: {
    padding: 8,
  },
  gridTitle: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
  gridDescription: {
    fontSize: 12,
    lineHeight: 16,
    color: '#666',
    marginBottom: 8,
  },
  gridChip: {
    alignSelf: 'flex-start',
    height: 24,
    marginBottom: 8,
  },
  gridStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    marginLeft: -8,
  },
  noResultsCard: {
    margin: 16,
    backgroundColor: '#fff',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
  input: {
    marginBottom: 16,
  },
  fileButton: {
    marginTop: 8,
    marginBottom: 8,
  },
});

export default VisualAidScreen; 