import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
// Fix the import to use the correct path
import { db as firestore } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthProvider';

interface TestFirestoreScreenProps {
  navigation: any;
}

export default function TestFirestoreScreen({ navigation }: TestFirestoreScreenProps) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { user } = useAuth();
  
  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
  try {
    setIsLoading(true);
    setError(null);
    
    console.log('[FIRESTORE_TEST] Fetching data from Firestore');
    console.log('[FIRESTORE_TEST] Current user:', user?.uid || 'No user');
    
    const testCollectionRef = collection(firestore, 'test');
    const snapshot = await getDocs(testCollectionRef);
    
    const itemsList = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('[FIRESTORE_TEST] Data fetched successfully, items:', itemsList.length);
    setItems(itemsList);
  } catch (err) {
    console.error('[FIRESTORE_TEST] Error fetching data from Firestore:', err);
    setError('Failed to load data');
  } finally {
    setIsLoading(false);
  }
};
  
  const addItem = async () => {
    try {
      setIsLoading(true);
      
      const newItem = {
        title: `Item ${Date.now()}`,
        createdAt: new Date(),
        createdBy: user?.uid || 'anonymous'
      };
      
      const newItemRef = doc(collection(firestore, 'test'));
      await setDoc(newItemRef, newItem);
      
      fetchData();
    } catch (err) {
      console.error('Error adding item to Firestore:', err);
      setError('Failed to add item');
      setIsLoading(false);
    }
  };
  
  const deleteItem = async (itemId) => {
    try {
      setIsLoading(true);
      await deleteDoc(doc(firestore, 'test', itemId));
      fetchData();
    } catch (err) {
      console.error('Error deleting item from Firestore:', err);
      setError('Failed to delete item');
      setIsLoading(false);
    }
  };
  
  if (isLoading && items.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }
  
  if (error && items.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Try Again" onPress={fetchData} />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firestore Test</Text>
      
      <Button title="Add New Item" onPress={addItem} />
      
      {isLoading && <ActivityIndicator style={styles.loadingIndicator} />}
      
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemDate}>
              {item.createdAt?.toDate?.() ? item.createdAt.toDate().toLocaleString() : 'No date'}
            </Text>
            <Button 
              title="Delete" 
              color="#DC2626" 
              onPress={() => deleteItem(item.id)} 
            />
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No items found. Add your first item!</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorText: {
    color: '#DC2626',
    marginBottom: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  item: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  itemDate: {
    color: '#666',
    marginBottom: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    color: '#666',
    fontStyle: 'italic',
  },
});