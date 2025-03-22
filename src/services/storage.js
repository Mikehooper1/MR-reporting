import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export const uploadFile = async (uri, storagePath) => {
  try {
    // Create a reference to the full path in storage
    const storageRef = ref(storage, storagePath);

    // For Expo/React Native, we need to fetch the file first
    const response = await fetch(uri);
    const blob = await response.blob();

    // Upload the file
    const snapshot = await uploadBytes(storageRef, blob);
    console.log('File uploaded successfully to path:', storagePath);

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

export const uploadImage = async (uri, path, userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required for image upload');
    }

    // Convert URI to blob
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }
    const blob = await response.blob();

    // Create a reference to the file in Firebase Storage
    const storageRef = ref(storage, path);

    // Upload the file with basic metadata
    const metadata = {
      contentType: blob.type
    };

    const snapshot = await uploadBytes(storageRef, blob, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    if (error.code === 'storage/unauthorized') {
      throw new Error('You are not authorized to upload images');
    } else if (error.code === 'storage/canceled') {
      throw new Error('Upload was canceled');
    } else if (error.code === 'storage/unknown') {
      throw new Error('An unknown error occurred while uploading the image');
    }
    throw error;
  }
};

export const uploadSelfie = async (uri, userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required for selfie upload');
    }

    const timestamp = new Date().getTime();
    const path = `selfies/${userId}/${timestamp}.jpg`;
    
    // Upload the selfie
    const downloadURL = await uploadImage(uri, path, userId);
    
    // Schedule deletion after 3 days
    const deletionTime = new Date();
    deletionTime.setDate(deletionTime.getDate() + 3);
    
    // Store deletion information in Firestore
    const selfieRef = ref(storage, path);
    const selfieData = {
      path: path,
      deletionTime: deletionTime,
      downloadURL: downloadURL
    };
    
    return selfieData;
  } catch (error) {
    console.error('Error uploading selfie:', error);
    throw error;
  }
};

export const deleteFile = async (path) => {
  try {
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}; 