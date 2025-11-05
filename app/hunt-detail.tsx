import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSession } from '@/context';
import { getHuntById, Hunt, updateHuntName, deleteHunt, huntExistsForUser, getHuntLocations } from '@/lib/database-service';

export default function HuntDetailScreen() {
  const { huntId } = useLocalSearchParams();
  const { user } = useSession();
  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [locationCount, setLocationCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadHuntDetails();
  }, [huntId]);

  const loadHuntDetails = async () => {
    if (!huntId || typeof huntId !== 'string') return;

    try {
      const huntData = await getHuntById(huntId);
      setHunt(huntData);
      if (huntData) {
        setEditedName(huntData.name);
        const locations = await getHuntLocations(huntId);
        setLocationCount(locations.length);
      }
    } catch (error) {
      // Error loading hunt details
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditedName(hunt?.name || '');
  };

  /**
   * Handle canceling edit mode
   */
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedName(hunt?.name || '');
  };

  /**
   * Handle saving the edited hunt name
   */
  const handleSaveEdit = async () => {
    if (!hunt || !user || !huntId || typeof huntId !== 'string') return;

    // Validate input
    const newName = editedName.trim();
    if (!newName) {
      Alert.alert('Error', 'Hunt name cannot be empty.');
      return;
    }

    if (newName.length > 255) {
      Alert.alert('Error', 'Hunt name must be 255 characters or less.');
      return;
    }

    // Check if name is the same
    if (newName === hunt.name) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      // Check if hunt with same name already exists for this user
      const exists = await huntExistsForUser(newName, user.uid);
      if (exists) {
        Alert.alert(
          'Hunt Exists', 
          'A hunt with this name already exists. Please choose a unique name.'
        );
        setIsSaving(false);
        return;
      }

      // Update the hunt name
      await updateHuntName(huntId, newName, user.uid);
      
      // Update local state
      setHunt({ ...hunt, name: newName });
      setIsEditing(false);
      Alert.alert('Success', 'Hunt name updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', `Failed to update hunt name: ${error?.message || 'Please try again.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle deleting the hunt
   */
  const handleDeleteHunt = () => {
    // For web compatibility, use window.confirm as fallback
    if (typeof window !== 'undefined' && window.confirm) {
      const confirmed = window.confirm('Are you sure you want to delete this hunt?');
      if (confirmed) {
        confirmDeleteHunt();
      }
    } else {
      Alert.alert(
        'Delete Hunt',
        'Are you sure you want to delete this hunt?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              confirmDeleteHunt();
            }
          }
        ]
      );
    }
  };

  /**
   * Confirm and execute hunt deletion
   */
  const confirmDeleteHunt = async () => {
    if (!hunt || !user || !huntId || typeof huntId !== 'string') {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteHunt(huntId, user.uid);
      // Navigate to hunts list after successful deletion
      router.push('/(app)/(drawer)/(tabs)/hunts');
    } catch (error: any) {
      Alert.alert('Error', `Failed to delete hunt: ${error?.message || 'Please try again.'}`);
      setIsDeleting(false);
    }
  };

  /**
   * Navigate to location management screen
   */
  const handleManageLocations = () => {
    router.push(`/location-list?huntId=${huntId}`);
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-gray-500">Loading hunt details...</Text>
      </View>
    );
  }

  if (!hunt) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-gray-500">Hunt not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 p-4 bg-gray-50">
      {/* Hunt Name - Edit Mode or Display Mode */}
      {isEditing ? (
        <View className="mb-4">
          <TextInput
            value={editedName}
            onChangeText={setEditedName}
            placeholder="Hunt name..."
            style={{
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 8,
              padding: 12,
              fontSize: 18,
              fontWeight: 'bold',
              marginBottom: 12,
              backgroundColor: '#fff'
            }}
            maxLength={255}
            multiline={false}
            autoFocus
          />
          
          {/* Save/Cancel Buttons */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={handleSaveEdit}
              disabled={isSaving}
              style={{
                flex: 1,
                backgroundColor: isSaving ? '#ccc' : '#007AFF',
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 8,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </Pressable>
            
            <Pressable
              onPress={handleCancelEdit}
              disabled={isSaving}
              style={{
                flex: 1,
                backgroundColor: '#f0f0f0',
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#ccc'
              }}
            >
              <Text style={{ color: '#333', fontWeight: '600' }}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View className="mb-4">
          <Text className="text-2xl font-bold text-gray-800 mb-2">
            {hunt.name}
          </Text>
          
          {/* Edit and Delete Buttons */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
            <Pressable
              onPress={handleStartEdit}
              style={{
                backgroundColor: '#007AFF',
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 6,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                Edit Name
              </Text>
            </Pressable>
            
            <Pressable
              onPress={() => {

                handleDeleteHunt();
              }}
              disabled={isDeleting}
              style={{
                backgroundColor: isDeleting ? '#ffcccc' : '#FF3B30',
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 6,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                {isDeleting ? 'Deleting...' : 'Delete Hunt'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Location Summary Section */}
      <View className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
        <Text className="text-lg font-semibold text-blue-900 mb-2">
          Hunt Summary
        </Text>
        <View className="flex-row items-center mb-3">
          <Text className="text-2xl mr-2">📍</Text>
          <Text className="text-blue-800 font-medium">
            {locationCount} Location{locationCount !== 1 ? 's' : ''} in this hunt
          </Text>
        </View>
        <View className="flex-row items-center mb-3">
          <Text className="text-2xl mr-2">{hunt.isVisible ? '👁️' : '🔒'}</Text>
          <Text className="text-blue-800 font-medium">
            {hunt.isVisible ? 'Public Hunt' : 'Private Hunt'}
          </Text>
        </View>
      </View>

      {/* Location Management Section */}
      <View className="bg-white p-4 rounded-lg mb-4 border border-gray-200 shadow-sm">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-lg font-semibold text-gray-900 mb-1">
              Location Management
            </Text>
            <Text className="text-gray-600 text-sm">
              Add, edit, or remove checkpoints for this hunt
            </Text>
          </View>
          <Text className="text-3xl">🗺️</Text>
        </View>
        
        <Pressable
          onPress={handleManageLocations}
          style={{
            backgroundColor: '#10B981',
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 8,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center'
          }}
        >
          <Text className="text-2xl mr-2">⚙️</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
            Manage Locations
          </Text>
        </Pressable>
      </View>
      
      <Text className="text-gray-600">
        Hunt ID: {hunt.id}
      </Text>
      <Text className="text-gray-600">
        Created: {(() => {
          try {
            // Handle Firestore Timestamp
            if (hunt.createdAt && typeof hunt.createdAt.toDate === 'function') {
              return hunt.createdAt.toDate().toLocaleDateString();
            }
            // Handle regular Date
            if (hunt.createdAt instanceof Date) {
              return hunt.createdAt.toLocaleDateString();
            }
            // Handle timestamp seconds
            if (hunt.createdAt && hunt.createdAt.seconds) {
              return new Date(hunt.createdAt.seconds * 1000).toLocaleDateString();
            }
            // Fallback
            return new Date(hunt.createdAt).toLocaleDateString();
          } catch (error) {

            return 'Unknown date';
          }
        })()}
      </Text>
    </View>
  );
}