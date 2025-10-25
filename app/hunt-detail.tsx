import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getHuntById, Hunt } from '@/lib/database-service';

/**
 * Hunt Detail Screen
 * Purpose: Display detailed information about a specific hunt
 * Receives huntId as a parameter
 */
export default function HuntDetail() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  
  const router = useRouter();
  const { id: huntId } = useLocalSearchParams();
  
  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Effects
  // ============================================================================
  
  useEffect(() => {
    if (huntId) {
      loadHuntDetails();
    }
  }, [huntId]);

  // ============================================================================
  // Data Fetching
  // ============================================================================
  
  /**
   * Load hunt details from Firestore
   */
  const loadHuntDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const huntData = await getHuntById(huntId as string);
      
      if (huntData) {
        setHunt(huntData);
        console.log('Hunt details loaded:', huntData.name);
      } else {
        setError('Hunt not found');
      }
    } catch (error) {
      console.error('Error loading hunt details:', error);
      setError('Failed to load hunt details');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // Event Handlers
  // ============================================================================
  
  /**
   * Navigate back to hunts list
   */
  const handleGoBack = () => {
    router.back();
  };

  /**
   * Handle edit hunt (placeholder for future implementation)
   */
  const handleEditHunt = () => {
    Alert.alert(
      'Edit Hunt', 
      'Hunt editing feature coming soon!',
      [{ text: 'OK' }]
    );
  };

  /**
   * Handle delete hunt (placeholder for future implementation)
   */
  const handleDeleteHunt = () => {
    Alert.alert(
      'Delete Hunt',
      `Are you sure you want to delete "${hunt?.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            // TODO: Implement delete functionality
            Alert.alert('Feature Coming Soon', 'Hunt deletion will be implemented in a future update.');
          }
        }
      ]
    );
  };

  // ============================================================================
  // Loading State
  // ============================================================================
  
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-gray-600 mt-4">Loading hunt details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================================================
  // Error State
  // ============================================================================
  
  if (error || !hunt) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-6xl mb-4">❌</Text>
          <Text className="text-xl font-semibold text-gray-800 mb-2 text-center">
            {error || 'Hunt Not Found'}
          </Text>
          <Text className="text-gray-600 text-center mb-6">
            The hunt you're looking for doesn't exist or couldn't be loaded.
          </Text>
          <TouchableOpacity
            className="bg-blue-600 px-6 py-3 rounded-lg"
            onPress={handleGoBack}
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================================================
  // Main Render
  // ============================================================================
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Simple Header */}
      <View style={{ 
        padding: 15, 
        borderBottomWidth: 1, 
        borderBottomColor: '#eee',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <TouchableOpacity
          onPress={handleGoBack}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Ionicons name="arrow-back" size={20} color="#333" />
          <Text style={{ marginLeft: 5, fontWeight: 'bold' }}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={handleEditHunt}
          style={{
            backgroundColor: '#007AFF',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 6
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Simple Content */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 15 }}>
          {/* Hunt Title */}
          <View style={{
            backgroundColor: 'white',
            padding: 20,
            marginBottom: 15,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#eee'
          }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>
              {hunt.name}
            </Text>
            
            {hunt.description && (
              <Text style={{ color: '#666', fontSize: 16, marginBottom: 15 }}>
                {hunt.description}
              </Text>
            )}
            
            {/* Simple Status */}
            <Text style={{ 
              color: hunt.isCompleted ? 'green' : 'orange',
              fontWeight: 'bold'
            }}>
              {hunt.isCompleted ? '✅ Completed' : '🎯 In Progress'}
            </Text>
          </View>

          {/* Simple Hunt Info */}
          <View style={{
            backgroundColor: 'white',
            padding: 20,
            marginBottom: 15,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#eee'
          }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Details</Text>
            
            <Text style={{ color: '#666', marginBottom: 5 }}>
              Created: {hunt.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
            </Text>
            
            <Text style={{ color: '#666', fontSize: 12 }}>
              ID: {hunt.id}
            </Text>
          </View>

          {/* Simple Action Buttons */}
          <View style={{ gap: 10 }}>
            <TouchableOpacity
              style={{
                backgroundColor: '#007AFF',
                padding: 15,
                borderRadius: 8,
                alignItems: 'center'
              }}
              onPress={handleEditHunt}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Edit Hunt</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                backgroundColor: '#666',
                padding: 15,
                borderRadius: 8,
                alignItems: 'center'
              }}
              onPress={() => Alert.alert('Coming Soon', 'Hunt items feature will be added soon.')}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Manage Items</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                backgroundColor: '#FF3B30',
                padding: 15,
                borderRadius: 8,
                alignItems: 'center'
              }}
              onPress={handleDeleteHunt}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Delete Hunt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}