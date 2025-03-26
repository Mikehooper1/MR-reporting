import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Image } from 'react-native';
import {
  Card,
  Title,
  Text,
  Button,
  TextInput,
  Portal,
  Modal,
  IconButton,
  ActivityIndicator,
  Searchbar,
  Chip,
  Surface,
  Divider
} from 'react-native-paper';
import { firestore, auth } from '../../services/firebase';
import { collection, query, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const OrderProductScreen = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderingProduct, setOrderingProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderDetails, setOrderDetails] = useState({
    type: '',
    priority: '',
    doctorName: '',
    remarks: '',
    strip: '',
    unit: '',
  });
  const [productQuantities, setProductQuantities] = useState({});
  const [cartItems, setCartItems] = useState([]);

  const ORDER_TYPES = ['Sample', 'Regular', 'Emergency'];
  const PRIORITY_TYPES = ['High', 'Medium', 'Low'];

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
        ...doc.data(),
        discountPercentage: doc.data().discountPercentage || 0
      }));
      setProducts(productsList);
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to fetch products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (productId, increment) => {
    setProductQuantities(prev => {
      const currentQty = parseInt(prev[productId] || '0');
      const newQty = increment ? currentQty + 1 : Math.max(0, currentQty - 1);
      return { ...prev, [productId]: newQty.toString() };
    });
  };

  const addToCart = (product) => {
    const quantity = parseInt(productQuantities[product.id] || '0');
    if (quantity <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    const existingItem = cartItems.find(item => item.id === product.id);
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.id === product.id
          ? { ...item, quantity: quantity }
          : item
      ));
    } else {
      setCartItems([...cartItems, {
        id: product.id,
        name: product.name,
        price: product.price,
        pts: product.pts,
        ptr: product.ptr,
        discountPercentage: product.discountPercentage || 0,
        imageUrl: product.imageUrl,
        quantity: quantity
      }]);
    }
    Alert.alert('Success', 'Product added to cart');
  };

  const removeFromCart = (productId) => {
    setCartItems(cartItems.filter(item => item.id !== productId));
  };

  const handleOrder = async () => {
    try {
      if (cartItems.length === 0) {
        Alert.alert('Error', 'Please add products to cart first');
        return;
      }

      if (!orderDetails.type || !orderDetails.priority) {
        Alert.alert('Error', 'Please select order type and priority');
        return;
      }

      if (!orderDetails.doctorName) {
        Alert.alert('Error', 'Please enter doctor details');
        return;
      }

      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Create orders for each cart item
      for (const item of cartItems) {
        const totalAmount = item.price * item.quantity;
        const discountAmount = (totalAmount * item.discountPercentage) / 100;
        const totalAfterDiscount = totalAmount - discountAmount;

        await addDoc(collection(firestore, 'h-orders'), {
          userId,
          productId: item.id,
          productName: item.name,
          price: item.price,
          pts: item.pts,
          ptr: item.ptr,
          imageUrl: item.imageUrl,
          quantity: item.quantity,
          type: orderDetails.type,
          priority: orderDetails.priority,
          doctorName: orderDetails.doctorName,
          remarks: orderDetails.remarks,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          totalAmount,
          totalAfterDiscount
        });
      }

      setOrderingProduct(false);
      setCartItems([]);
      setProductQuantities({});
      setOrderDetails({
        type: '',
        priority: '',
        doctorName: '',
        remarks: '',
        strip: '',
        unit: '',
      });
      Alert.alert('Success', 'Orders placed successfully');
    } catch (error) {
      console.error('Error placing orders:', error);
      Alert.alert('Error', 'Failed to place orders. Please try again.');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateDiscountPercentage = (strip, unit) => {
    const stripValue = parseFloat(strip) || 0;
    const unitValue = parseFloat(unit) || 0;
    if (stripValue + unitValue === 0) return 0; // Avoid division by zero
    return (unitValue / (stripValue + unitValue)) * 100; // Calculate discount percentage
  };

  const handleStripChange = (strip) => {
    const updatedStrip = strip;
    const discount = calculateDiscountPercentage(updatedStrip, orderDetails.unit);
    setOrderDetails({ ...orderDetails, strip: updatedStrip, discount: discount.toFixed(2) });
  };

  const handleUnitChange = (unit) => {
    const updatedUnit = unit;
    const discount = calculateDiscountPercentage(orderDetails.strip, updatedUnit);
    setOrderDetails({ ...orderDetails, unit: updatedUnit, discount: discount.toFixed(2) });
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
      <Searchbar
        placeholder="Search products"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      {cartItems.length > 0 && (
        <Card style={styles.cartCard}>
          <Card.Content>
            <Title>Cart Items</Title>
            {cartItems.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemQuantity}>Quantity: {item.quantity}</Text>
                </View>
                <IconButton
                  icon="delete"
                  onPress={() => removeFromCart(item.id)}
                  color="#FF0000"
                />
              </View>
            ))}
            <Button
              mode="contained"
              onPress={() => setOrderingProduct(true)}
              style={styles.checkoutButton}
            >
              Checkout ({cartItems.length} items)
            </Button>
          </Card.Content>
        </Card>
      )}

      {filteredProducts.map((product) => (
        <Card key={product.id} style={styles.productCard}>
          <View style={styles.productContent}>
            <View style={styles.imageContainer}>
              {product.imageUrl ? (
                <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
              ) : (
                <View style={styles.placeholderImage}>
                  <MaterialCommunityIcons name="image-off" size={40} color="#666" />
                </View>
              )}
            </View>
            
            <View style={styles.productDetails}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productDescription}>
                {product.description || 'No description available'}
              </Text>
              
              <View style={styles.priceContainer}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>MRP</Text>
                  <Text style={styles.priceValue}>₹{(product.price || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>PTS</Text>
                  <Text style={styles.priceValue}>₹{(product.pts || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>PTR</Text>
                  <Text style={styles.priceValue}>₹{(product.ptr || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Total Amount</Text>
                  <Text style={styles.priceValue}>₹{(product.price * productQuantities[product.id] || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Total PTS</Text>
                  <Text style={styles.priceValue}>₹{(product.pts * productQuantities[product.id] || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Total PTR</Text>
                  <Text style={styles.priceValue}>₹{(product.ptr * productQuantities[product.id] || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Total After Discount</Text>
                  <Text style={styles.priceValue}>
                    ₹{((product.price * productQuantities[product.id] || 0) * (1 - (product.discount / 100))).toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.orderControls}>
                <IconButton
                  icon="minus"
                  mode="contained"
                  size={20}
                  onPress={() => handleQuantityChange(product.id, false)}
                  style={styles.quantityButton}
                />
                <TextInput
                  value={productQuantities[product.id] || ''}
                  onChangeText={(text) => setProductQuantities(prev => ({ ...prev, [product.id]: text }))}
                  keyboardType="numeric"
                  style={styles.quantityInput}
                />
                <IconButton
                  icon="plus"
                  mode="contained"
                  size={20}
                  onPress={() => handleQuantityChange(product.id, true)}
                  style={styles.quantityButton}
                />
                {/* <Button
                  mode="contained"
                  onPress={() => addToCart(product)}
                  style={styles.orderButton}
                >
                  Add to Cart
                </Button> */}
              </View>
            </View>
          </View>
        </Card>
      ))}

      <Portal>
        <Modal
          visible={orderingProduct}
          onDismiss={() => {
            setOrderingProduct(false);
            setSelectedProduct(null);
            setOrderDetails({
              type: '',
              priority: '',
              doctorName: '',
              remarks: '',
              strip: '',
              unit: '',
            });
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalContent}>
            <Title>Place Order</Title>
            <Divider style={styles.modalDivider} />
            
            {selectedProduct && (
              <View style={styles.productInfo}>
                <View style={styles.productImageContainer}>
                  {selectedProduct.imageUrl ? (
                    <Image source={{ uri: selectedProduct.imageUrl }} style={styles.modalProductImage} />
                  ) : (
                    <View style={styles.modalPlaceholderImage}>
                      <MaterialCommunityIcons name="image-off" size={32} color="#666" />
                    </View>
                  )}
                </View>
                <Text style={styles.productName}>{selectedProduct.name}</Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceText}>Price: ₹{(selectedProduct.price || 0).toLocaleString()}</Text>
                  <Text style={styles.priceText}>PTS: ₹{(selectedProduct.pts || 0).toLocaleString()}</Text>
                  <Text style={styles.priceText}>PTR: ₹{(selectedProduct.ptr || 0).toLocaleString()}</Text>
                </View>
              </View>
            )}

            <View style={styles.chipContainer}>
              <Text style={styles.label}>Order Type:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {ORDER_TYPES.map((type) => (
                  <Chip
                    key={type}
                    selected={orderDetails.type === type}
                    onPress={() => setOrderDetails({ ...orderDetails, type })}
                    style={styles.chip}
                  >
                    {type}
                  </Chip>
                ))}
              </ScrollView>
            </View>

            <View style={styles.chipContainer}>
              <Text style={styles.label}>Priority:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {PRIORITY_TYPES.map((priority) => (
                  <Chip
                    key={priority}
                    selected={orderDetails.priority === priority}
                    onPress={() => setOrderDetails({ ...orderDetails, priority })}
                    style={styles.chip}
                  >
                    {priority}
                  </Chip>
                ))}
              </ScrollView>
            </View>

            <TextInput
              label="Hospital Name"
              value={orderDetails.hospitalName}
              onChangeText={(text) => setOrderDetails({ ...orderDetails, hospitalName: text })}
              style={styles.input}
              mode="outlined"
            />

            <TextInput
              label="Doctor Name"
              value={orderDetails.doctorName}
              onChangeText={(text) => setOrderDetails({ ...orderDetails, doctorName: text })}
              style={styles.input}
              mode="outlined"
            />

            <TextInput
              label="Remarks (Optional)"
              value={orderDetails.remarks}
              onChangeText={(text) => setOrderDetails({ ...orderDetails, remarks: text })}
              multiline
              numberOfLines={3}
              style={styles.input}
              mode="outlined"
            />

            <TextInput
              label="Strip"
              value={orderDetails.strip}
              onChangeText={handleStripChange}
              keyboardType="numeric"
              style={styles.input}
              mode="outlined"
            />

            <TextInput
              label="Unit"
              value={orderDetails.unit}
              onChangeText={handleUnitChange}
              keyboardType="numeric"
              style={styles.input}
              mode="outlined"
            />

            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => {
                  setOrderingProduct(false);
                  setSelectedProduct(null);
                  setOrderDetails({
                    type: '',
                    priority: '',
                    doctorName: '',
                    remarks: '',
                    strip: '',
                    unit: '',
                  });
                }}
                style={[styles.modalButton, styles.cancelButton]}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleOrder}
                style={[styles.modalButton, styles.placeOrderButton]}
              >
                Place Order
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
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    marginBottom: 16,
    elevation: 2,
  },
  productCard: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#fff',
  },
  productContent: {
    padding: 16,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  productImage: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
    borderRadius: 8,
  },
  placeholderImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  productDetails: {
    flex: 1,
    fontWeight: 'bold',
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1a1a1a',
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontWeight: 'bold',
  },
  priceContainer: {
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  orderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  quantityButton: {
    backgroundColor: '#f0f0f0',
    margin: 0,
  },
  quantityInput: {
    width: 50,
    height: 40,
    textAlign: 'center',
    backgroundColor: 'transparent',
    marginHorizontal: 8,
  },
  orderButton: {
    marginLeft: 16,
    backgroundColor: '#2196F3',
  },
  modalContainer: {
    padding: 20,
    backgroundColor: 'transparent',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 8,
  },
  modalDivider: {
    marginVertical: 16,
  },
  productInfo: {
    marginBottom: 24,
    alignItems: 'center',
  },
  productImageContainer: {
    marginBottom: 16,
  },
  modalProductImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  modalPlaceholderImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 16,
    color: '#666',
    marginHorizontal: 4,
  },
  chipContainer: {
    marginVertical: 8,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#666',
    fontWeight: 'bold',
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  input: {
    marginVertical: 8,
    backgroundColor: 'white',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalButton: {
    minWidth: 100,
    marginLeft: 12,
  },
  cancelButton: {
    borderColor: '#666',
  },
  placeOrderButton: {
    backgroundColor: '#2196F3',
  },
  cartCard: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cartItemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  checkoutButton: {
    marginTop: 16,
    backgroundColor: '#2196F3',
  },
});

export default OrderProductScreen; 