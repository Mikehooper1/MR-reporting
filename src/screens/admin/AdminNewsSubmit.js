import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { 
  Card, 
  Title, 
  Text, 
  Button, 
  TextInput,
  FAB,
  Portal,
  Dialog,
  List,
  Divider,
  ActivityIndicator,
  IconButton 
} from 'react-native-paper';
import { firestore, auth } from '../../services/firebase';
import { collection, addDoc, query, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';

const AdminNewsSubmit = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: ''
  });

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const q = query(
        collection(firestore, 'news'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedNews = [];
      querySnapshot.forEach((doc) => {
        fetchedNews.push({ id: doc.id, ...doc.data() });
      });
      
      setNews(fetchedNews);
    } catch (error) {
      console.error('Error fetching news:', error);
      alert('Error fetching news. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.title || !formData.content) {
        alert('Please fill in all required fields');
        return;
      }

      const userId = auth.currentUser?.uid;
      if (!userId) return;

      setLoading(true);
      await addDoc(collection(firestore, 'news'), {
        ...formData,
        authorId: userId,
        authorName: auth.currentUser?.displayName || 'Admin',
        createdAt: new Date(),
      });

      setFormData({
        title: '',
        content: '',
        category: ''
      });
      setShowForm(false);
      fetchNews();
    } catch (error) {
      console.error('Error submitting news:', error);
      alert('Error submitting news. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (newsId) => {
    try {
      setLoading(true);
      await deleteDoc(doc(firestore, 'news', newsId));
      fetchNews();
    } catch (error) {
      console.error('Error deleting news:', error);
      alert('Error deleting news. Please try again.');
    }
  };

  if (loading && !showForm) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading news...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showForm ? (
        <ScrollView>
          <Card style={styles.formCard}>
            <Card.Content>
              <Title>New Announcement</Title>
              
              <TextInput
                label="Title*"
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                style={styles.input}
              />

              <TextInput
                label="Category"
                value={formData.category}
                onChangeText={(text) => setFormData({ ...formData, category: text })}
                style={styles.input}
              />

              <TextInput
                label="Content*"
                value={formData.content}
                onChangeText={(text) => setFormData({ ...formData, content: text })}
                multiline
                numberOfLines={5}
                style={styles.input}
              />

              <View style={styles.formActions}>
                <Button 
                  mode="outlined" 
                  onPress={() => {
                    setShowForm(false);
                    setFormData({
                      title: '',
                      content: '',
                      category: ''
                    });
                  }}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
                <Button 
                  mode="contained" 
                  onPress={handleSubmit}
                  loading={loading}
                  style={styles.submitButton}
                >
                  Submit
                </Button>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      ) : (
        <ScrollView>
          {news.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No news items yet</Text>
              <Text style={styles.emptyStateSubText}>Click the + button to create a new announcement</Text>
            </View>
          ) : (
            <List.Section>
              {news.map((item) => (
                <Card key={item.id} style={styles.newsCard}>
                  <Card.Content>
                    <View style={styles.newsHeader}>
                      <Title style={styles.newsTitle}>{item.title}</Title>
                      <IconButton
                        icon="delete"
                        size={20}
                        onPress={() => handleDelete(item.id)}
                      />
                    </View>
                    {item.category && (
                      <Text style={styles.newsCategory}>{item.category}</Text>
                    )}
                    <Text style={styles.newsContent}>{item.content}</Text>
                    <Text style={styles.newsDate}>
                      Posted on: {item.createdAt.toDate().toLocaleDateString()}
                    </Text>
                  </Card.Content>
                </Card>
              ))}
            </List.Section>
          )}
        </ScrollView>
      )}

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
    backgroundColor: '#f5f5f5',
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
  formCard: {
    margin: 16,
  },
  input: {
    marginBottom: 16,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  cancelButton: {
    marginRight: 8,
  },
  submitButton: {
    minWidth: 100,
  },
  newsCard: {
    margin: 8,
    marginHorizontal: 16,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  newsCategory: {
    color: '#666',
    marginTop: 4,
    fontSize: 14,
  },
  newsContent: {
    marginTop: 8,
    color: '#333',
  },
  newsDate: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
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
});

export default AdminNewsSubmit; 