import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Image } from 'react-native';
import { 
  Card, 
  Title, 
  Text, 
  DataTable, 
  Button, 
  TextInput, 
  Portal, 
  Modal,
  IconButton,
  ActivityIndicator,
  HelperText,
  Surface,
  Divider
} from 'react-native-paper';
import { firestore, storage } from '../../services/firebase';
import { collection, query, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ 
    name: '', 
    price: '',  
    pts: '',    
    ptr: '',    
    gst: '',    
    discount: '', // Discount percentage
    discountAmount: '', // New field for calculated discount amount
    strip: '',   
    unit: '',    
    imageUrl: null,
  });
  const [editingProductId, setEditingProductId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Define margins (can be adjusted as needed)
  const PTS_MARGIN = -0.09; // 20% margin for stockist
  const PTR_MARGIN = 0.35; // 35% margin for retailer

  useEffect(() => {
    fetchProducts();
  }, []);

  // Calculate PTS, PTR, and GST in Rupees based on base price
  const calculatePrices = (basePrice, gst, discount) => {
    if (!basePrice || isNaN(basePrice)) return { pts: '', ptr: '', gstAmount: '', discountAmount: '' };
    
    const baseValue = parseFloat(basePrice);
    const gstValue = (gst / 100) * baseValue / (1 + (gst / 100)); // Calculate GST in Rupees
    const discountValue = (discount / 100) * baseValue; // Calculate discount amount
    
    const priceAfterDiscount = baseValue - discountValue;
    const ptr = (baseValue - gstValue) * 0.8; // Update PTR calculation based on new formula
    const pts = ptr * 0.9; // Update PTS calculation based on new formula
    
    return {
      pts: pts.toFixed(2),
      ptr: ptr.toFixed(2),
      gstAmount: gstValue.toFixed(2), // Return GST amount
      discountAmount: discountValue.toFixed(2) // Return discount amount
    };
  };

  // Handle base price change and auto-calculate PTS, PTR, GST, and Discount
  const handlePriceChange = (price) => {
    const { pts, ptr, gstAmount, discountAmount } = calculatePrices(price, newProduct.gst, newProduct.discount);
    setNewProduct({
      ...newProduct,
      price,
      pts,
      ptr,
      gstAmount, // Store GST amount in state
      discountAmount // Store discount amount in state
    });
  };

  const calculateDiscountPercentage = (strip, unit) => {
    const stripValue = parseFloat(strip) || 0;
    const unitValue = parseFloat(unit) || 0;
    if (stripValue + unitValue === 0) return 0; // Avoid division by zero
    return (unitValue / (stripValue + unitValue)) * 100; // Calculate discount percentage
  };

  const handleStripChange = (strip) => {
    const updatedStrip = strip;
    const discount = calculateDiscountPercentage(updatedStrip, newProduct.unit);
    setNewProduct({ ...newProduct, strip: updatedStrip, discount: discount.toFixed(2) });
  };

  const handleUnitChange = (unit) => {
    const updatedUnit = unit;
    const discount = calculateDiscountPercentage(newProduct.strip, updatedUnit);
    setNewProduct({ ...newProduct, unit: updatedUnit, discount: discount.toFixed(2) });
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const productsQuery = query(collection(firestore, 'products'));
      const productsSnapshot = await getDocs(productsQuery);
      const productsList = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsList);
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to fetch products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploadingImage(true);
        const imageUrl = await uploadImage(result.assets[0].uri);
        setNewProduct({ ...newProduct, imageUrl });
        setUploadingImage(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      setUploadingImage(false);
    }
  };

  const uploadImage = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const filename = `products/${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      
      return downloadUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  };

  const deleteImage = async (imageUrl) => {
    if (!imageUrl) return;
    
    try {
      const storageRef = ref(storage, imageUrl);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  const handleAddProduct = async () => {
    try {
      const price = parseFloat(newProduct.price || '0');
      const pts = parseFloat(newProduct.pts || '0');
      const ptr = parseFloat(newProduct.ptr || '0');
      const gst = parseFloat(newProduct.gst || '0');
      const discount = parseFloat(newProduct.discount || '0');

      if (!newProduct.name || isNaN(price) || price < 0) {
        Alert.alert('Validation Error', 'Please enter valid product details');
        return;
      }

      await addDoc(collection(firestore, 'products'), {
        name: newProduct.name,
        price: price,
        pts: pts,
        ptr: ptr,
        gst: gst,
        discount: discount,
        imageUrl: newProduct.imageUrl,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      setEditingProduct(false);
      setNewProduct({ name: '', price: '', pts: '', ptr: '', gst: '', discount: '', strip: '', unit: '', imageUrl: null });
      fetchProducts();
      Alert.alert('Success', 'Product added successfully');
    } catch (error) {
      console.error('Error adding product:', error);
      Alert.alert('Error', 'Failed to add product. Please try again.');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProductId(product.id);
    setNewProduct({ 
      name: product.name, 
      price: product.price?.toString() || '',
      pts: product.pts?.toString() || '',
      ptr: product.ptr?.toString() || '',
      gst: product.gst?.toString() || '',
      discount: product.discount?.toString() || '',
      strip: product.strip || '',
      unit: product.unit || '',
      imageUrl: product.imageUrl || null
    });
    setEditingProduct(true);
  };

  const handleUpdateProduct = async () => {
    try {
      const price = parseFloat(newProduct.price || '0');
      const pts = parseFloat(newProduct.pts || '0');
      const ptr = parseFloat(newProduct.ptr || '0');
      const gst = parseFloat(newProduct.gst || '0');
      const discount = parseFloat(newProduct.discount || '0');

      if (!newProduct.name || isNaN(price) || price < 0) {
        Alert.alert('Validation Error', 'Please enter valid product details');
        return;
      }

      await updateDoc(doc(firestore, 'products', editingProductId), {
        name: newProduct.name,
        price: price,
        pts: pts,
        ptr: ptr,
        gst: gst,
        discount: discount,
        strip: newProduct.strip,
        unit: newProduct.unit,
        imageUrl: newProduct.imageUrl,
        updatedAt: new Date()
      });

      setEditingProduct(false);
      setEditingProductId(null);
      setNewProduct({ name: '', price: '', pts: '', ptr: '', gst: '', discount: '', strip: '', unit: '', imageUrl: null });
      fetchProducts();
      Alert.alert('Success', 'Product updated successfully');
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('Error', 'Failed to update product. Please try again.');
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      const product = products.find(p => p.id === productId);
      if (product?.imageUrl) {
        await deleteImage(product.imageUrl);
      }
      await deleteDoc(doc(firestore, 'products', productId));
      fetchProducts();
      Alert.alert('Success', 'Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      Alert.alert('Error', 'Failed to delete product. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <Title style={styles.headerTitle}>Product Management</Title>
          <Button
            mode="contained"
            onPress={() => {
              setEditingProductId(null);
              setNewProduct({ name: '', price: '', pts: '', ptr: '', gst: '', discount: '', strip: '', unit: '', imageUrl: null });
              setEditingProduct(true);
            }}
            style={styles.addButton}
            icon="plus"
          >
            Add New Product
          </Button>
        </View>
      </Surface>

      <Card style={styles.card}>
        <Card.Content>
          <DataTable>
            <DataTable.Header style={styles.tableHeader}>
              <DataTable.Title style={styles.imageColumn}>
                <Text style={styles.columnTitle}>Image</Text>
              </DataTable.Title>
              <DataTable.Title style={styles.productNameColumn}>
                <Text style={styles.columnTitle}>Product Name</Text>
              </DataTable.Title>
              <DataTable.Title numeric style={styles.priceColumn}>
                <Text style={styles.columnTitle}>MRP</Text>
              </DataTable.Title>
              <DataTable.Title numeric style={styles.priceColumn}>
                <Text style={styles.columnTitle}>PTS</Text>
              </DataTable.Title>
              <DataTable.Title numeric style={styles.priceColumn}>
                <Text style={styles.columnTitle}>PTR</Text>
              </DataTable.Title>
              <DataTable.Title style={styles.actionsColumn}>
                <Text style={styles.columnTitle}>Actions</Text>
              </DataTable.Title>
            </DataTable.Header>

            {products.map((product) => (
              <DataTable.Row key={product.id} style={styles.tableRow}>
                <DataTable.Cell style={styles.imageColumn}>
                  {product.imageUrl ? (
                    <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
                  ) : (
                    <View style={styles.placeholderImage}>
                      <MaterialCommunityIcons name="image-off" size={24} color="#666" />
                    </View>
                  )}
                </DataTable.Cell>
                <DataTable.Cell style={styles.productNameColumn}>
                  <Text style={styles.productName}>{product.name}</Text>
                </DataTable.Cell>
                <DataTable.Cell numeric style={styles.priceColumn}>
                  <Text style={styles.priceText}>₹{(product.price || 0).toLocaleString()}</Text>
                </DataTable.Cell>
                <DataTable.Cell numeric style={styles.priceColumn}>
                  <Text style={styles.priceText}>₹{(product.pts || 0).toLocaleString()}</Text>
                </DataTable.Cell>
                <DataTable.Cell numeric style={styles.priceColumn}>
                  <Text style={styles.priceText}>₹{(product.ptr || 0).toLocaleString()}</Text>
                </DataTable.Cell>
                <DataTable.Cell style={styles.actionsColumn}>
                  <View style={styles.actionButtons}>
                    <IconButton
                      icon="pencil"
                      iconColor="#2196F3"
                      size={20}
                      onPress={() => handleEditProduct(product)}
                      style={styles.actionButton}
                    />
                    <IconButton
                      icon="delete"
                      iconColor="#FF5252"
                      size={20}
                      onPress={() => handleDeleteProduct(product.id)}
                      style={styles.actionButton}
                    />
                  </View>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </Card.Content>
      </Card>

      <Portal>
        <Modal
          visible={editingProduct}
          onDismiss={() => {
            setEditingProduct(false);
            setEditingProductId(null);
            setNewProduct({ name: '', price: '', pts: '', ptr: '', gst: '', discount: '', discountAmount: '', strip: '', unit: '', imageUrl: null });
          }}
          contentContainerStyle={styles.modalContainer}>
          <Surface style={styles.modalContent}>
            <Title style={styles.modalTitle}>{editingProductId ? 'Edit Product' : 'Add New Product'}</Title>
            <Divider style={styles.modalDivider} />

            <View style={styles.imageUploadContainer}>
              {newProduct.imageUrl ? (
                <View style={styles.selectedImageContainer}>
                  <Image source={{ uri: newProduct.imageUrl }} style={styles.selectedImage} />
                  <IconButton
                    icon="close-circle"
                    size={24}
                    color="#FF5252"
                    style={styles.removeImageButton}
                    onPress={() => setNewProduct({ ...newProduct, imageUrl: null })}
                  />
                </View>
              ) : (
                <Button
                  mode="outlined"
                  onPress={pickImage}
                  loading={uploadingImage}
                  icon="camera"
                  style={styles.uploadButton}
                >
                  Upload Image
                </Button>
              )}
            </View>
            
            <TextInput
              label="Product Name"
              value={newProduct.name}
              onChangeText={(text) => setNewProduct({ ...newProduct, name: text })}
              style={styles.input}
              mode="outlined"
            />
           
            <TextInput
              label="GST (%)"
              value={newProduct.gst}
              onChangeText={(text) => setNewProduct({ ...newProduct, gst: text })}
              keyboardType="numeric"
              style={styles.input}
              mode="outlined"
            />
             <TextInput
              label="MRP (₹)"
              value={newProduct.price}
              onChangeText={handlePriceChange}
              keyboardType="numeric"
              style={styles.input}
              mode="outlined"
              right={<TextInput.Affix text="₹" />}
            />
            <TextInput
              label="Strip"
              value={newProduct.strip}
              onChangeText={handleStripChange}
              keyboardType="numeric"
              style={styles.input}
              mode="outlined"
            />
            <TextInput
              label="Unit"
              value={newProduct.unit}
              onChangeText={handleUnitChange}
              keyboardType="numeric"
              style={styles.input}
              mode="outlined"
            />
            <TextInput
              label="Discount (%)"
              value={newProduct.discount}
              onChangeText={(text) => setNewProduct({ ...newProduct, discount: text })}
              keyboardType="numeric"
              style={styles.input}
              mode="outlined"
            />
            <HelperText type="info" style={styles.helperText}>
              <MaterialCommunityIcons name="information" size={16} color="#2196F3" />
              {" "}PTS and PTR are automatically calculated
            </HelperText>
            
            <View style={styles.calculatedPrices}>
              <View style={styles.priceBox}>
                <Text style={styles.priceLabel}>GST Amount (₹)</Text>
                <Text style={styles.priceValue}>₹{newProduct.gstAmount || '0'}</Text>
              </View>
              <View style={styles.priceBox}>
                <Text style={styles.priceLabel}>Discount Amount (₹)</Text>
                <Text style={styles.priceValue}>₹{newProduct.discountAmount || '0'}</Text>
              </View>
              <View style={styles.priceBox}>
                <Text style={styles.priceLabel}>Price to Retailer (PTR)</Text>
                <Text style={styles.priceValue}>₹{newProduct.ptr || '0'}</Text>
              </View>
              <View style={styles.priceBox}>
                <Text style={styles.priceLabel}>Price to Stockist (PTS)</Text>
                <Text style={styles.priceValue}>₹{newProduct.pts || '0'}</Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <Button 
                mode="outlined"
                onPress={() => {
                  setEditingProduct(false);
                  setEditingProductId(null);
                  setNewProduct({ name: '', price: '', pts: '', ptr: '', gst: '', discount: '', strip: '', unit: '', imageUrl: null });
                }} 
                style={[styles.modalButton, styles.cancelButton]}
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={editingProductId ? handleUpdateProduct : handleAddProduct} 
                style={[styles.modalButton, styles.saveButton]}
              >
                {editingProductId ? 'Update' : 'Save'}
              </Button>
            </View>
          </Surface>
        </Modal>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    backgroundColor: '#fff',
    elevation: 4,
    marginBottom: 16,
  },
  headerContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  addButton: {
    backgroundColor: '#2196F3',
  },
  card: {
    margin: 16,
    elevation: 2,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  tableHeader: {
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  columnTitle: {
    fontWeight: 'bold',
    color: '#666',
  },
  tableRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  imageColumn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productNameColumn: {
    flex: 2,
  },
  priceColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  actionsColumn: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  productName: {
    fontSize: 15,
    color: '#1a1a1a',
  },
  priceText: {
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    margin: 0,
    padding: 0,
  },
  modalContainer: {
    padding: 20,
    backgroundColor: 'transparent',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  modalDivider: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  helperText: {
    marginBottom: 16,
    color: '#2196F3',
  },
  calculatedPrices: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  priceBox: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    minWidth: 100,
    marginLeft: 12,
  },
  cancelButton: {
    borderColor: '#666',
  },
  saveButton: {
    backgroundColor: '#2196F3',
  },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  placeholderImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageUploadContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  selectedImageContainer: {
    position: 'relative',
  },
  selectedImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  uploadButton: {
    marginVertical: 8,
  },
});

export default ProductManagement; 