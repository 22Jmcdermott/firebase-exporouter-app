import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSession } from '@/context';
import { getHuntById, Hunt, updateHuntName, deleteHunt, huntExistsForUser } from '@/lib/database-service';

/**
 * Hunt Detail Screen
 * Displays details of a specific hunt
 */
export default function HuntDetailScreen() {
  const { huntId } = useLocalSearchParams();
  const { user } = useSession();
  const [hunt, setHunt] = useState<Hunt | null>(null);
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
      }
    } catch (error) {
      console.error('Error loading hunt details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle starting edit mode
   */
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
      console.error('Error updating hunt name:', error);
      Alert.alert('Error', `Failed to update hunt name: ${error?.message || 'Please try again.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle deleting the hunt
   */
  const handleDeleteHunt = () => {
    console.log('🗑️ Delete button pressed!');
    console.log('Hunt:', hunt);
    console.log('User:', user);
    console.log('HuntId:', huntId);
    
    // For web compatibility, use window.confirm as fallback
    if (typeof window !== 'undefined' && window.confirm) {
      console.log('🌐 Using web confirm dialog');
      const confirmed = window.confirm('Are you sure you want to delete this hunt?');
      if (confirmed) {
        console.log('✅ Delete confirmed via web dialog, calling confirmDeleteHunt');
        confirmDeleteHunt();
      } else {
        console.log('❌ Delete cancelled via web dialog');
      }
    } else {
      console.log('📱 Using React Native Alert dialog');
      Alert.alert(
        'Delete Hunt',
        'Are you sure you want to delete this hunt?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => console.log('❌ Delete cancelled')
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              console.log('✅ Delete confirmed, calling confirmDeleteHunt');
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
    console.log('🚀 confirmDeleteHunt called');
    console.log('Hunt exists:', !!hunt);
    console.log('User exists:', !!user);
    console.log('HuntId:', huntId, 'Type:', typeof huntId);
    
    if (!hunt || !user || !huntId || typeof huntId !== 'string') {
      console.log('❌ Validation failed - missing required data');
      return;
    }

    console.log('✅ Validation passed, starting deletion process');
    setIsDeleting(true);
    try {
      console.log('🔥 Calling deleteHunt function...');
      await deleteHunt(huntId, user.uid);
      console.log('✅ deleteHunt completed successfully');
      // Navigate to hunts list after successful deletion
      console.log('🔄 Navigating to hunts list...');
      router.push('/(app)/(drawer)/(tabs)/hunts');
    } catch (error: any) {
      console.error('💥 Error deleting hunt:', error);
      Alert.alert('Error', `Failed to delete hunt: ${error?.message || 'Please try again.'}`);
      setIsDeleting(false);
    }
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
                console.log('🔴 DELETE BUTTON PHYSICALLY PRESSED!');
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
            console.log('Date parsing error in detail:', error, hunt.createdAt);
            return 'Unknown date';
          }
        })()}
      </Text>
    </View>
  );
}