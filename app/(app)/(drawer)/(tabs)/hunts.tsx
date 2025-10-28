import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Alert } from 'react-native';
import { useSession } from '@/context';
import { router } from 'expo-router';
import { createHunt, getUserHunts, huntExistsForUser, Hunt, testFirestoreConnection } from '@/lib/database-service';

/**
 * ScavengerHuntScreen component for managing user hunts
 * Displays user's hunts and allows creation of new ones
 */
export default function ScavengerHuntScreen() {
  // ============================================================================
  // State Management
  // ============================================================================
  
  const [hunts, setHunts] = useState<Hunt[]>([]);
  const [newHuntName, setNewHuntName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useSession();

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Load user's hunts when component mounts or user changes
   */
  useEffect(() => {
    if (user) {
      // Test Firestore connection first
      testFirestoreConnection().then(isConnected => {
        console.log('🔥 [HuntScreen] Firestore connection test result:', isConnected);
      });
      loadUserHunts();
    }
  }, [user]);

  // ============================================================================
  // Functions
  // ============================================================================

  /**
   * Fetch all hunts for the current user
   */
  const loadUserHunts = async () => {
    if (!user) {
      console.log('⚠️ [HuntScreen] No user found, skipping hunt load');
      return;
    }

    console.log('🔄 [HuntScreen] Loading hunts for user:', user.uid);
    setIsLoading(true);
    try {
      const userHunts = await getUserHunts(user.uid);
      console.log('📋 [HuntScreen] Received hunts from database:', userHunts);
      console.log('📊 [HuntScreen] Number of hunts:', userHunts.length);
      setHunts(userHunts);
      console.log('✅ [HuntScreen] Hunts state updated successfully');
    } catch (error: any) {
      console.error('💥 [HuntScreen] Error loading hunts:', error);
      Alert.alert('Error', `Failed to load hunts: ${error?.message || 'Please try again.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Create a new hunt with validation
   */
  const handleCreateHunt = async () => {
    if (!user) return;

    // Validate input
    const huntName = newHuntName.trim();
    if (!huntName) {
      Alert.alert('Error', 'Please enter a hunt name.');
      return;
    }

    if (huntName.length > 255) {
      Alert.alert('Error', 'Hunt name must be 255 characters or less.');
      return;
    }

    console.log('🎯 [HuntScreen] Starting hunt creation...', { huntName, userId: user.uid });
    setIsCreating(true);
    try {
      // Check if hunt with same name already exists for this user
      console.log('🔍 [HuntScreen] Checking if hunt exists...');
      const exists = await huntExistsForUser(huntName, user.uid);
      console.log('🔍 [HuntScreen] Hunt exists check result:', exists);
      
      if (exists) {
        Alert.alert(
          'Hunt Exists', 
          'A hunt with this name already exists. Please choose a unique name.'
        );
        setIsCreating(false);
        return;
      }

      // Create the hunt
      console.log('🚀 [HuntScreen] Creating hunt...');
      const huntId = await createHunt(huntName, user.uid);
      console.log('✅ [HuntScreen] Hunt created with ID:', huntId);
      
      setNewHuntName(''); // Clear input
      console.log('🔄 [HuntScreen] Reloading hunts list...');
      await loadUserHunts(); // Reload the list
      console.log('🎉 [HuntScreen] Hunt creation completed successfully!');
      Alert.alert('Success', 'Hunt created successfully!');
    } catch (error: any) {
      console.error('💥 [HuntScreen] Error creating hunt:', error);
      Alert.alert('Error', `Failed to create hunt: ${error?.message || 'Please try again.'}`);
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Navigate to hunt detail screen
   */
  const handleHuntPress = (huntId: string) => {
    router.push(`/hunt-detail?huntId=${huntId}`);
  };



  /**
   * Render individual hunt item
   */
  const renderHuntItem = ({ item }: { item: Hunt }) => (
    <Pressable
      onPress={() => handleHuntPress(item.id!)}
      className="bg-white p-4 mb-3 rounded-lg shadow-sm border border-gray-200"
    >
      <Text className="text-lg font-semibold text-gray-800 mb-1">
        {item.name}
      </Text>
      <Text className="text-sm text-gray-500">
        Created: {(() => {
          try {
            // Handle Firestore Timestamp
            if (item.createdAt && typeof item.createdAt.toDate === 'function') {
              return item.createdAt.toDate().toLocaleDateString();
            }
            // Handle regular Date
            if (item.createdAt instanceof Date) {
              return item.createdAt.toLocaleDateString();
            }
            // Handle timestamp seconds
            if (item.createdAt && item.createdAt.seconds) {
              return new Date(item.createdAt.seconds * 1000).toLocaleDateString();
            }
            // Fallback
            return new Date(item.createdAt).toLocaleDateString();
          } catch (error) {
            console.log('Date parsing error:', error, item.createdAt);
            return 'Unknown date';
          }
        })()}
      </Text>
    </Pressable>
  );

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <View className="flex-1 bg-gray-50 p-4">
      {/* Header */}
      <View className="mb-6">
        <Text className="text-2xl font-bold text-gray-800 mb-2">
          My Scavenger Hunts
        </Text>
        <Text className="text-sm text-gray-600">
          Create and manage your scavenger hunts
        </Text>
      </View>

      {/* Create Hunt Section */}
      <View className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <Text className="text-lg font-semibold text-gray-800 mb-3">
          Create New Hunt
        </Text>
        
        <TextInput
          placeholder="Enter hunt name (max 255 characters)"
          value={newHuntName}
          onChangeText={setNewHuntName}
          maxLength={255}
          className="border border-gray-300 rounded-lg p-3 mb-3 text-base"
          editable={!isCreating}
        />
        
        <Text className="text-xs text-gray-500 mb-3">
          {newHuntName.length}/255 characters
        </Text>

        <Pressable
          onPress={handleCreateHunt}
          disabled={isCreating || !newHuntName.trim()}
          className={`py-3 rounded-lg ${
            isCreating || !newHuntName.trim()
              ? 'bg-gray-300'
              : 'bg-blue-600 active:bg-blue-700'
          }`}
        >
          <Text className="text-white font-semibold text-center">
            {isCreating ? 'Creating...' : 'Create Hunt'}
          </Text>
        </Pressable>
      </View>

      {/* Hunts List */}
      <View className="flex-1">
        <Text className="text-lg font-semibold text-gray-800 mb-3">
          Your Hunts ({hunts.length})
        </Text>
        
        {isLoading ? (
          <Text className="text-center text-gray-500 mt-8">
            Loading hunts...
          </Text>
        ) : hunts.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-gray-500 text-center">
              No hunts yet.{'\n'}Create your first hunt above!
            </Text>
          </View>
        ) : (
          <FlatList
            data={hunts}
            renderItem={renderHuntItem}
            keyExtractor={(item) => item.id!}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}