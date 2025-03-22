import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { 
  Card, 
  Title, 
  Text, 
  ActivityIndicator,
  Searchbar,
  Chip,
  Divider
} from 'react-native-paper';
import { firestore } from '../../services/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

const NewsScreen = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
      const newsItems = [];
      querySnapshot.forEach((doc) => {
        newsItems.push({ id: doc.id, ...doc.data() });
      });
      
      setNews(newsItems);
    } catch (error) {
      console.error('Error fetching news:', error);
      alert('Error fetching news. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredNews = news.filter(item => 
    item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>No news available</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading news...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search news..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      <ScrollView>
        {filteredNews.length === 0 ? renderEmptyState() : (
          filteredNews.map((item) => (
            <Card key={item.id} style={styles.newsCard}>
              <Card.Content>
                <View style={styles.newsHeader}>
                  <Title style={styles.newsTitle}>{item.title}</Title>
                  {item.category && (
                    <Chip style={styles.categoryChip}>{item.category}</Chip>
                  )}
                </View>
                <Text style={styles.newsDate}>
                  {item.createdAt.toDate().toLocaleDateString()}
                </Text>
                <Divider style={styles.divider} />
                <Text style={styles.newsContent}>{item.content}</Text>
                {item.author && (
                  <Text style={styles.newsAuthor}>Posted by: {item.author}</Text>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
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
  searchBar: {
    margin: 16,
    elevation: 2,
  },
  newsCard: {
    margin: 8,
    marginHorizontal: 16,
    elevation: 2,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  newsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  categoryChip: {
    backgroundColor: '#E3F2FD',
  },
  newsDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  divider: {
    marginVertical: 12,
  },
  newsContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  newsAuthor: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
    fontStyle: 'italic',
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
  },
});

export default NewsScreen; 