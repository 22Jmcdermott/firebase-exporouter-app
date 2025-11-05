import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSession } from '@/context';
import { 
  getHuntLocations, 
  getHuntById,
  deleteLocation 
} from '@/lib/database-service';

export default function LocationList() {
  const { huntId } = useLocalSearchParams();
  const { user } = useSession();
  const [hunt, setHunt] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (huntId && user) {
      loadHuntAndLocations();
    }
  }, [huntId, user]);

  const loadHuntAndLocations = async () => {
    try {
      setLoading(true);
      const huntData = await getHuntById(huntId);
      if (!huntData) {
        Alert.alert('Error', 'Hunt not found');
        router.back();
        return;
      }

      if (huntData.userId !== user.uid) {
        Alert.alert('Error', 'You do not have permission to manage this hunt');
        router.back();
        return;
      }

      setHunt(huntData);

      // Load locations for this hunt
      const huntLocations = await getHuntLocations(huntId);
      setLocations(huntLocations);
    } catch (error) {
      Alert.alert('Error', 'Failed to load hunt locations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = () => {
    router.push(`/location-detail?huntId=${huntId}&mode=create`);
  };

  const handleLocationPress = (locationId) => {
    router.push(`/location-detail?huntId=${huntId}&locationId=${locationId}&mode=edit`);
  };

  const handleDeleteLocation = (location) => {
    Alert.alert(
      'Delete Location',
      `Are you sure you want to delete "${location.locationName}"? This will also delete all associated conditions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => confirmDeleteLocation(location.locationId)
        }
      ]
    );
  };

  const confirmDeleteLocation = async (locationId) => {
    try {
      setDeleting(locationId);
      await deleteLocation(locationId);
      await loadHuntAndLocations(); // Refresh the list
      Alert.alert('Success', 'Location deleted successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete location');
    } finally {
      setDeleting(null);
    }
  };

  const renderLocationItem = ({ item }) => (
    <View className="bg-white p-4 mb-3 rounded-lg shadow-sm border border-gray-200">
      <Pressable
        onPress={() => handleLocationPress(item.locationId)}
        className="flex-1"
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900 mb-2">
              📍 {item.locationName}
            </Text>
            
            {item.explanation && (
              <Text className="text-gray-600 mb-3 leading-5">
                {item.explanation.length > 100 
                  ? `${item.explanation.substring(0, 100)}...` 
                  : item.explanation
                }
              </Text>
            )}
            
            <View className="flex-row items-center space-x-4">
              <View className="flex-row items-center">
                <Text className="text-sm text-blue-600 font-medium">🌐</Text>
                <Text className="text-sm text-blue-600 ml-1">
                  {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                </Text>
              </View>
            </View>
          </View>

          {/* Action buttons */}
          <View className="ml-3 flex-col space-y-2">
            <Pressable
              onPress={() => handleLocationPress(item.locationId)}
              className="bg-blue-500 px-3 py-2 rounded-md"
            >
              <Text className="text-white text-xs font-medium">Edit</Text>
            </Pressable>
            
            <Pressable
              onPress={() => handleDeleteLocation(item)}
              disabled={deleting === item.locationId}
              className={`px-3 py-2 rounded-md ${
                deleting === item.locationId ? 'bg-gray-300' : 'bg-red-500'
              }`}
            >
              {deleting === item.locationId ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white text-xs font-medium">Delete</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-gray-600">Loading locations...</Text>
      </View>
    );
  }

  if (!hunt) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-lg text-gray-500">Hunt not found</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-4 bg-blue-500 px-4 py-2 rounded-lg"
        >
          <Text className="text-white font-medium">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white p-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900 mb-1">
              {hunt.name}
            </Text>
            <Text className="text-gray-600">
              📍 {locations.length} Location{locations.length !== 1 ? 's' : ''}
            </Text>
          </View>
          
          <Pressable
            onPress={() => router.back()}
            className="bg-gray-100 px-3 py-2 rounded-lg"
          >
            <Text className="text-gray-700 font-medium">← Back</Text>
          </Pressable>
        </View>
      </View>

      {/* Add New Location Button */}
      <View className="p-4">
        <Pressable
          onPress={handleAddLocation}
          className="bg-green-500 p-4 rounded-lg shadow-sm"
        >
          <View className="flex-row items-center justify-center">
            <Text className="text-2xl mr-3">➕</Text>
            <Text className="text-white text-lg font-semibold">
              Add New Location
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Locations List */}
      {locations.length > 0 ? (
        <FlatList
          data={locations}
          renderItem={renderLocationItem}
          keyExtractor={(item) => item.locationId}
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      ) : (
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-6xl mb-4">📍</Text>
          <Text className="text-xl font-semibold text-gray-700 mb-2">
            No Locations Yet
          </Text>
          <Text className="text-gray-500 text-center mb-6 leading-6">
            This hunt doesn't have any locations yet. Add your first checkpoint to get started!
          </Text>
          
          <Pressable
            onPress={handleAddLocation}
            className="bg-blue-500 px-6 py-3 rounded-lg"
          >
            <View className="flex-row items-center">
              <Text className="text-xl mr-2">➕</Text>
              <Text className="text-white font-semibold">Add First Location</Text>
            </View>
          </Pressable>
        </View>
      )}

      {/* Quick Stats Footer */}
      {locations.length > 0 && (
        <View className="bg-white p-4 border-t border-gray-200">
          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-2xl font-bold text-blue-600">
                {locations.length}
              </Text>
              <Text className="text-xs text-gray-500">Total Locations</Text>
            </View>
            
            <View className="items-center">
              <Text className="text-2xl font-bold text-green-600">
                {hunt.isVisible ? '👁️' : '🔒'}
              </Text>
              <Text className="text-xs text-gray-500">
                {hunt.isVisible ? 'Public Hunt' : 'Private Hunt'}
              </Text>
            </View>
            
            <View className="items-center">
              <Text className="text-2xl font-bold text-purple-600">⚙️</Text>
              <Text className="text-xs text-gray-500">Ready to Play</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}