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
  Divider
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
      if (!formData.type || !formData.priority || !formData.productId || !formData.quantity) {
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
        type: 'order',
        orderType: formData.type,
        productName: selectedProduct.name,
        productPrice: selectedProduct.price,
        totalAmount: selectedProduct.price * parseInt(formData.quantity),
        title: `Order: ${selectedProduct.name}`,
        description: `Type: ${formData.type}\nQuantity: ${formData.quantity}\nPrice: ₹${selectedProduct.price}\nTotal: ₹${selectedProduct.price * parseInt(formData.quantity)}\nPriority: ${formData.priority}${formData.hospitalName ? '\nHospital: ' + formData.hospitalName : ''}${formData.doctorName ? '\nDoctor: ' + formData.doctorName : ''}${formData.remarks ? '\nRemarks: ' + formData.remarks : ''}`
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
              <DataTable.Header style={styles.dataTableHeader}>
                <DataTable.Title textStyle={{ fontWeight: 'bold' }}>Date</DataTable.Title>
                <DataTable.Title textStyle={{ fontWeight: 'bold' }}>Type</DataTable.Title>
                <DataTable.Title textStyle={{ fontWeight: 'bold' }}>Product</DataTable.Title>
                <DataTable.Title textStyle={{ fontWeight: 'bold' }} numeric>Price</DataTable.Title>
                <DataTable.Title textStyle={{ fontWeight: 'bold' }} numeric>Qty</DataTable.Title>
                <DataTable.Title textStyle={{ fontWeight: 'bold' }} numeric>Total</DataTable.Title>
                <DataTable.Title textStyle={{ fontWeight: 'bold' }}>Priority</DataTable.Title>
                <DataTable.Title textStyle={{ fontWeight: 'bold' }}>Status</DataTable.Title>
              </DataTable.Header>

              {orders.map((order) => (
                <DataTable.Row key={order.id}>
                  <DataTable.Cell>
                    {format(order.createdAt.toDate(), 'dd/MM/yyyy')}
                  </DataTable.Cell>
                  <DataTable.Cell>{order.orderType}</DataTable.Cell>
                  <DataTable.Cell>{order.productName}</DataTable.Cell>
                  <DataTable.Cell numeric>₹{order.productPrice}</DataTable.Cell>
                  <DataTable.Cell numeric>{order.quantity}</DataTable.Cell>
                  <DataTable.Cell numeric>₹{order.totalAmount}</DataTable.Cell>
                  <DataTable.Cell>
                    <Text style={getPriorityStyle(order.priority)}>
                      {order.priority}
                    </Text>
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <Text style={getStatusStyle(order.status)}>
                      {order.status.toUpperCase()}
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
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  productList: {
    maxHeight: 400,
  },
  modalButton: {
    marginTop: 16,
  },
});

export default HOrderScreen; 