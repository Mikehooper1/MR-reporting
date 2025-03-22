import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
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
  ActivityIndicator
} from 'react-native-paper';
import { firestore } from '../../services/firebase';
import { collection, query, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '' });
  const [editingProductId, setEditingProductId] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

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

  const handleAddProduct = async () => {
    try {
      const price = parseFloat(newProduct.price);
      if (!newProduct.name || isNaN(price) || price < 0) {
        Alert.alert('Validation Error', 'Please enter valid product details');
        return;
      }

      await addDoc(collection(firestore, 'products'), {
        name: newProduct.name,
        price: price,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      setEditingProduct(false);
      setNewProduct({ name: '', price: '' });
      fetchProducts();
      Alert.alert('Success', 'Product added successfully');
    } catch (error) {
      console.error('Error adding product:', error);
      Alert.alert('Error', 'Failed to add product. Please try again.');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProductId(product.id);
    setNewProduct({ name: product.name, price: product.price.toString() });
    setEditingProduct(true);
  };

  const handleUpdateProduct = async () => {
    try {
      const price = parseFloat(newProduct.price);
      if (!newProduct.name || isNaN(price) || price < 0) {
        Alert.alert('Validation Error', 'Please enter valid product details');
        return;
      }

      await updateDoc(doc(firestore, 'products', editingProductId), {
        name: newProduct.name,
        price: price,
        updatedAt: new Date()
      });

      setEditingProduct(false);
      setEditingProductId(null);
      setNewProduct({ name: '', price: '' });
      fetchProducts();
      Alert.alert('Success', 'Product updated successfully');
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('Error', 'Failed to update product. Please try again.');
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
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
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Product Management</Title>
          <Button
            mode="contained"
            onPress={() => {
              setEditingProductId(null);
              setNewProduct({ name: '', price: '' });
              setEditingProduct(true);
            }}
            style={styles.addButton}
          >
            Add New Product
          </Button>
          
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Product Name</DataTable.Title>
              <DataTable.Title numeric>Price (₹)</DataTable.Title>
              <DataTable.Title>Actions</DataTable.Title>
            </DataTable.Header>

            {products.map((product) => (
              <DataTable.Row key={product.id}>
                <DataTable.Cell>{product.name}</DataTable.Cell>
                <DataTable.Cell numeric>₹{product.price.toLocaleString()}</DataTable.Cell>
                <DataTable.Cell>
                  <IconButton
                    icon="pencil"
                    onPress={() => handleEditProduct(product)}
                    style={styles.actionButton}
                  />
                  <IconButton
                    icon="delete"
                    onPress={() => handleDeleteProduct(product.id)}
                    style={styles.actionButton}
                  />
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
            setNewProduct({ name: '', price: '' });
          }}
          contentContainerStyle={styles.modalContainer}>
          <Card>
            <Card.Content>
              <Title>{editingProductId ? 'Edit Product' : 'Add New Product'}</Title>
              <TextInput
                label="Product Name"
                value={newProduct.name}
                onChangeText={(text) => setNewProduct({ ...newProduct, name: text })}
                style={styles.input}
              />
              <TextInput
                label="Price (₹)"
                value={newProduct.price}
                onChangeText={(text) => setNewProduct({ ...newProduct, price: text })}
                keyboardType="numeric"
                style={styles.input}
              />
              <View style={styles.modalButtons}>
                <Button 
                  onPress={() => {
                    setEditingProduct(false);
                    setEditingProductId(null);
                    setNewProduct({ name: '', price: '' });
                  }} 
                  style={styles.modalButton}
                >
                  Cancel
                </Button>
                <Button 
                  mode="contained" 
                  onPress={editingProductId ? handleUpdateProduct : handleAddProduct} 
                  style={styles.modalButton}
                >
                  {editingProductId ? 'Update' : 'Save'}
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>
    </View>
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
  card: {
    margin: 16,
    elevation: 2,
  },
  addButton: {
    marginBottom: 16,
  },
  modalContainer: {
    padding: 20,
    backgroundColor: 'transparent',
  },
  input: {
    marginVertical: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalButton: {
    marginLeft: 8,
  },
  actionButton: {
    margin: 0,
    padding: 0,
  },
});

export default ProductManagement; 