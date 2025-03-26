import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { 
  TextInput, 
  Button, 
  Title, 
  Card, 
  Text, 
  DataTable, 
  FAB,
  Portal,
  Modal,
  List,
  Divider,
  Surface
} from 'react-native-paper';
import { format } from 'date-fns';
import { firestore, auth } from '../../services/firebase';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import TypeSelector, { ORDER_TYPES, PRIORITY_TYPES } from '../../components/TypeSelector';

const HOrderScreen = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    type: '',
    priority: '',
    productId: '',
    quantity: '',
    hospitalName: '',
    doctorName: '',
    remarks: ''
  });
  const [showProductModal, setShowProductModal] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.log('No user ID found');
        return;
      }

      console.log('Fetching orders for user:', userId);
      const q = query(
        collection(firestore, 'h-orders'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      console.log('Orders found:', querySnapshot.size);
      
      const fetchedOrders = [];
      querySnapshot.forEach((doc) => {
        const orderData = { id: doc.id, ...doc.data() };
        console.log('Order data:', orderData);
        fetchedOrders.push(orderData);
      });
      
      console.log('Total orders fetched:', fetchedOrders.length);
      setOrders(fetchedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      alert('Error fetching orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const productsQuery = query(collection(firestore, 'products'));
      const productsSnapshot = await getDocs(productsQuery);
      const productsList = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsList);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleTypeSelect = (type) => {
    setFormData({ ...formData, type });
    setShowTypeMenu(false);
  };

  const handlePrioritySelect = (priority) => {
    setFormData({ ...formData, priority });
    setShowPriorityMenu(false);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.type  || !formData.productId || !formData.quantity) {
        alert('Please fill in all required fields (Type, Priority, Product, and Quantity)');
        return;
      }

      if (isNaN(formData.quantity) || parseInt(formData.quantity) <= 0) {
        alert('Please enter a valid quantity');
        return;
      }

      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.log('No user ID found during submission');
        return;
      }

      const selectedProduct = products.find(p => p.id === formData.productId);
      if (!selectedProduct) {
        alert('Selected product not found');
        return;
      }

      const orderData = {
        ...formData,
        quantity: parseInt(formData.quantity),
        userId,
        status: 'pending',
        createdAt: new Date(),
        userName: auth.currentUser?.displayName || '',
        userEmail: auth.currentUser?.email || '',
        type: formData.type,
        productName: selectedProduct.name,
        price: selectedProduct.price || 0,
        pts: selectedProduct.pts || 0,
        ptr: selectedProduct.ptr || 0,
        totalAmount: selectedProduct.price * parseInt(formData.quantity),
        imageUrl: selectedProduct.imageUrl,
        description: `Type: ${formData.type}
Quantity: ${formData.quantity}
Base Price: ₹${selectedProduct.price || 0}
PTS: ₹${selectedProduct.pts || 0}
PTR: ₹${selectedProduct.ptr || 0}
Total: ₹${(selectedProduct.price || 0) * parseInt(formData.quantity)}
Priority: ${formData.priority}${formData.hospitalName ? '\nHospital: ' + formData.hospitalName : ''}${formData.doctorName ? '\nDoctor: ' + formData.doctorName : ''}${formData.remarks ? '\nRemarks: ' + formData.remarks : ''}`
      };

      console.log('Submitting order with data:', orderData);

      const docRef = await addDoc(collection(firestore, 'h-orders'), orderData);
      console.log('Order submitted successfully with ID:', docRef.id);

      setFormData({
        type: '',
        priority: '',
        productId: '',
        quantity: '',
        hospitalName: '',
        doctorName: '',
        remarks: ''
      });
      setShowForm(false);
      fetchOrders();
      alert('Order submitted successfully for approval');
    } catch (error) {
      console.error('Error submitting order:', error);
      alert('Error submitting order. Please try again.');
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

  const getPriorityStyle = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return { color: 'red' };
      case 'medium':
        return { color: 'orange' };
      case 'low':
        return { color: 'green' };
      default:
        return {};
    }
  };

  return (
    <View style={styles.container}>
      {showForm ? (
        <ScrollView>
          <Card style={styles.formCard}>
            <Card.Content>
              <Title>New Order</Title>
              
              <TypeSelector
                visible={showTypeMenu}
                onDismiss={() => setShowTypeMenu(!showTypeMenu)}
                onSelect={handleTypeSelect}
                types={ORDER_TYPES}
                selectedType={formData.type}
                label="Select Order Type"
              />

              <TypeSelector
                visible={showPriorityMenu}
                onDismiss={() => setShowPriorityMenu(!showPriorityMenu)}
                onSelect={handlePrioritySelect}
                types={PRIORITY_TYPES}
                selectedType={formData.priority}
                label="Select Priority"
              />

              <TextInput
                label="Product"
                value={products.find(p => p.id === formData.productId)?.name || ''}
                onPressIn={() => setShowProductModal(true)}
                style={styles.input}
                editable={false}
                right={<TextInput.Icon icon="chevron-down" onPress={() => setShowProductModal(true)} />}
              />

              <TextInput
                label="Quantity"
                value={formData.quantity}
                onChangeText={(text) => setFormData({ ...formData, quantity: text })}
                keyboardType="numeric"
                style={styles.input}
              />

              <TextInput
                label="Hospital Name"
                value={formData.hospitalName}
                onChangeText={(text) => setFormData({ ...formData, hospitalName: text })}
                style={styles.input}
              />

              <TextInput
                label="Doctor Name"
                value={formData.doctorName}
                onChangeText={(text) => setFormData({ ...formData, doctorName: text })}
                style={styles.input}
              />
              
              <TextInput
                label="Remarks"
                value={formData.remarks}
                onChangeText={(text) => setFormData({ ...formData, remarks: text })}
                multiline
                style={styles.input}
              />

              <Button 
                mode="contained" 
                onPress={handleSubmit}
                loading={loading}
                style={styles.submitButton}
              >
                Submit Order
              </Button>
            </Card.Content>
          </Card>
        </ScrollView>
      ) : (
        <ScrollView>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>Loading orders...</Text>
            </View>
          ) : orders.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No orders found</Text>
              <Text style={styles.emptyStateSubText}>Click the + button to create a new order</Text>
            </View>
          ) : (
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Date</DataTable.Title>
                <DataTable.Title>Product</DataTable.Title>
                <DataTable.Title numeric>Price</DataTable.Title>
                <DataTable.Title numeric>Qty</DataTable.Title>
                <DataTable.Title numeric>Total</DataTable.Title>
                <DataTable.Title>Priority</DataTable.Title>
                <DataTable.Title>Status</DataTable.Title>
              </DataTable.Header>

              {orders.map((order) => (
                <DataTable.Row 
                  key={order.id}
                  onPress={() => {
                    setSelectedOrder(order);
                    setShowOrderDetails(true);
                  }}
                  style={styles.tableRow}
                >
                  <DataTable.Cell>
                    {format(order.createdAt.toDate(), 'dd/MM')}
                  </DataTable.Cell>
                  <DataTable.Cell>{order.productName}</DataTable.Cell>
                  <DataTable.Cell numeric>₹{(order.price || 0).toLocaleString()}</DataTable.Cell>
                  <DataTable.Cell numeric>{order.quantity}</DataTable.Cell>
                  <DataTable.Cell numeric>₹{((order.price || 0) * order.quantity).toLocaleString()}</DataTable.Cell>
                  <DataTable.Cell>
                    <Text style={getPriorityStyle(order.priority)}>{order.priority}</Text>
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <Text style={getStatusStyle(order.status)}>
                      {order.status?.toUpperCase() || 'PENDING'}
                    </Text>
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          )}
        </ScrollView>
      )}

      <Portal>
        <Modal
          visible={showProductModal}
          onDismiss={() => setShowProductModal(false)}
          contentContainerStyle={styles.modalContainer}>
          <Card>
            <Card.Content>
              <Title>Select Product</Title>
              <ScrollView style={styles.productList}>
                {products.map((product) => (
                  <React.Fragment key={product.id}>
                    <List.Item
                      title={product.name}
                      description={`₹${product.price.toLocaleString()}`}
                      onPress={() => {
                        setFormData({ ...formData, productId: product.id });
                        setShowProductModal(false);
                      }}
                      right={props => (
                        <List.Icon {...props} icon="chevron-right" />
                      )}
                    />
                    <Divider />
                  </React.Fragment>
                ))}
              </ScrollView>
              <Button
                mode="outlined"
                onPress={() => setShowProductModal(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      <Portal>
        <Modal
          visible={showOrderDetails}
          onDismiss={() => setShowOrderDetails(false)}
          contentContainerStyle={styles.modalContainer}
        >
          {selectedOrder && (
            <Surface style={styles.modalContent}>
              <Title>Order Details</Title>
              <Divider style={styles.modalDivider} />
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Product:</Text>
                <Text style={styles.detailValue}>{selectedOrder.productName}</Text>
              </View>

              <View style={styles.priceContainer}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Base Price:</Text>
                  <Text style={styles.priceValue}>₹{(selectedOrder.price || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>PTS:</Text>
                  <Text style={styles.priceValue}>₹{(selectedOrder.pts || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>PTR:</Text>
                  <Text style={styles.priceValue}>₹{(selectedOrder.ptr || 0).toLocaleString()}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Quantity:</Text>
                <Text style={styles.detailValue}>{selectedOrder.quantity}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Amount:</Text>
                <Text style={styles.detailValue}>₹{(selectedOrder.price * selectedOrder.quantity || 0).toLocaleString()}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type:</Text>
                <Text style={styles.detailValue}>{selectedOrder.type}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Priority:</Text>
                <Text style={[styles.detailValue, getPriorityStyle(selectedOrder.priority)]}>
                  {selectedOrder.priority}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={[styles.detailValue, getStatusStyle(selectedOrder.status)]}>
                  {selectedOrder.status?.toUpperCase() || 'PENDING'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Hospital:</Text>
                <Text style={styles.detailValue}>{selectedOrder.hospitalName}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Doctor:</Text>
                <Text style={styles.detailValue}>{selectedOrder.doctorName}</Text>
              </View>

              {selectedOrder.remarks && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Remarks:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.remarks}</Text>
                </View>
              )}

              <Button
                mode="outlined"
                onPress={() => setShowOrderDetails(false)}
                style={styles.closeButton}
              >
                Close
              </Button>
            </Surface>
          )}
        </Modal>
      </Portal>

      <FAB
        style={styles.fab}
        icon={showForm ? 'close' : 'plus'}
        onPress={() => setShowForm(!showForm)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#999',
  },
  formCard: {
    margin: 16,
    backgroundColor: '#fff',
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
  dataTableHeader: {
    backgroundColor: '#CCCCFF',
  },
  modalContainer: {
    padding: 20,
    backgroundColor: 'transparent',
  },
  productList: {
    maxHeight: 400,
  },
  modalButton: {
    marginTop: 16,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 8,
  },
  modalDivider: {
    marginVertical: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 2,
    textAlign: 'right',
  },
  priceContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  closeButton: {
    marginTop: 24,
  },
  tableRow: {
    cursor: 'pointer',
  },
});

export default HOrderScreen; 