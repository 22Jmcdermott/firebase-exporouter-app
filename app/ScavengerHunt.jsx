import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Alert,
  ActivityIndicator,
  Switch
} from 'react-native';
import { useSession } from '@/context';
import { 
  getUserHunts, 
  createHunt, 
  huntExistsForUser, 
  deleteHunt,
  updateHuntVisibility
} from '@/lib/database-service';
import { router } from 'expo-router';

export default function ScavengerHunt() {
  const { user } = useSession();
  const [hunts, setHunts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newHuntName, setNewHuntName] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedHunts, setSelectedHunts] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserHunts();
    }
  }, [user]);

  const loadUserHunts = async () => {
    try {
      setLoading(true);
      const userHunts = await getUserHunts(user.uid);
      setHunts(userHunts);
    } catch (error) {
      Alert.alert('Error', 'Failed to load hunts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHunt = async () => {
    if (!newHuntName.trim()) {
      Alert.alert('Error', 'Please enter a hunt name');
      return;
    }

    try {
      setCreating(true);
      const huntExists = await huntExistsForUser(newHuntName.trim(), user.uid);
      
      if (huntExists) {
        Alert.alert('Error', 'A hunt with this name already exists');
        return;
      }

      await createHunt(newHuntName.trim(), user.uid);
      setNewHuntName('');
      await loadUserHunts();
      Alert.alert('Success', 'Hunt created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create hunt');
    } finally {
      setCreating(false);
    }
  };

  const toggleHuntSelection = (huntId) => {
    const newSelected = new Set(selectedHunts);
    if (newSelected.has(huntId)) {
      newSelected.delete(huntId);
    } else {
      newSelected.add(huntId);
    }
    setSelectedHunts(newSelected);
  };

  const handleDeleteSelected = () => {
    if (selectedHunts.size === 0) return;

    Alert.alert(
      'Delete Hunts',
      `Are you sure you want to delete ${selectedHunts.size} hunt(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDeleteSelected }
      ]
    );
  };

  const confirmDeleteSelected = async () => {
    try {
      setDeleting(true);
      const deletePromises = Array.from(selectedHunts).map(huntId => 
        deleteHunt(huntId, user.uid)
      );
      await Promise.all(deletePromises);
      setSelectedHunts(new Set());
      await loadUserHunts();
      Alert.alert('Success', 'Hunts deleted successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete hunts');
    } finally {
      setDeleting(false);
    }
  };

  const handleVisibilityToggle = async (huntId, currentVisibility) => {
    try {
      await updateHuntVisibility(huntId, !currentVisibility, user.uid);
      await loadUserHunts();
    } catch (error) {
      Alert.alert('Error', 'Failed to update visibility');
    }
  };

  const renderHuntItem = ({ item }) => (
    <View className="bg-white p-4 mb-3 rounded-lg shadow-sm border border-gray-200">
      <View className="flex-row justify-between items-start mb-2">
        <Pressable
          onPress={() => router.push(`/hunt-detail?huntId=${item.id}`)}
          className="flex-1 mr-3"
        >
          <Text className="text-lg font-semibold text-gray-800">{item.name}</Text>
          <Text className="text-sm text-gray-600 mt-1">
            {(() => {
              try {
                if (item.createdAt && item.createdAt.seconds) {
                  return new Date(item.createdAt.seconds * 1000).toLocaleDateString();
                }
                return new Date(item.createdAt).toLocaleDateString();
              } catch (error) {
                return 'Unknown date';
              }
            })()}
          </Text>
        </Pressable>
        
        <View className="flex-row items-center">
          <Pressable
            onPress={() => toggleHuntSelection(item.id)}
            className={`w-6 h-6 rounded border-2 mr-3 items-center justify-center ${
              selectedHunts.has(item.id) 
                ? 'bg-blue-500 border-blue-500' 
                : 'border-gray-300'
            }`}
          >
            {selectedHunts.has(item.id) && (
              <Text className="text-white text-xs">✓</Text>
            )}
          </Pressable>
          
          <View className="items-center">
            <Switch
              value={item.isVisible}
              onValueChange={(value) => handleVisibilityToggle(item.id, item.isVisible)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={item.isVisible ? '#f5dd4b' : '#f4f3f4'}
            />
            <Text className="text-xs text-gray-500 mt-1">
              {item.isVisible ? 'Public' : 'Private'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#0000ff" />
        <Text className="text-gray-500 mt-2">Loading hunts...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 p-4">
      <View className="bg-white p-4 rounded-lg shadow-sm mb-4">
        <Text className="text-lg font-semibold text-gray-800 mb-3">
          Create New Hunt
        </Text>
        
        <TextInput
          value={newHuntName}
          onChangeText={setNewHuntName}
          placeholder="Enter hunt name"
          className="border border-gray-300 rounded-lg p-3 mb-3"
        />
        
        <Pressable
          onPress={handleCreateHunt}
          disabled={creating || !newHuntName.trim()}
          className={`p-3 rounded-lg ${
            creating || !newHuntName.trim() 
              ? 'bg-gray-300' 
              : 'bg-blue-500'
          }`}
        >
          <Text className={`text-center font-semibold ${
            creating || !newHuntName.trim() 
              ? 'text-gray-500' 
              : 'text-white'
          }`}>
            {creating ? 'Creating...' : 'Create Hunt'}
          </Text>
        </Pressable>
      </View>

      {selectedHunts.size > 0 && (
        <View className="bg-red-50 p-4 rounded-lg mb-4 border border-red-200">
          <Text className="text-red-800 font-semibold mb-2">
            {selectedHunts.size} hunt(s) selected
          </Text>
          <Pressable
            onPress={handleDeleteSelected}
            disabled={deleting}
            className={`p-2 rounded-lg ${deleting ? 'bg-gray-300' : 'bg-red-500'}`}
          >
            <Text className={`text-center font-semibold ${
              deleting ? 'text-gray-500' : 'text-white'
            }`}>
              {deleting ? 'Deleting...' : 'Delete Selected'}
            </Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={hunts}
        keyExtractor={(item) => item.id}
        renderItem={renderHuntItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="bg-white p-8 rounded-lg shadow-sm">
            <Text className="text-gray-500 text-center">
              No hunts created yet. Create your first hunt above!
            </Text>
          </View>
        }
      />
    </View>
  );
}