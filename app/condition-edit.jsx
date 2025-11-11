import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  FlatList
} from 'react-native';
import CrossPlatformPicker from '@/components/CrossPlatformPicker';
import CrossPlatformDateTimePicker from '@/components/CrossPlatformDateTimePicker';
import { useLocalSearchParams, router } from 'expo-router';
import { useSession } from '@/context';
import { 
  getLocationConditions,
  createCondition,
  updateCondition,
  deleteCondition,
  getHuntLocations,
  getLocationById,
  getHuntById,
  convertLocalTimeToUTC,
  convertUTCTimeToLocal,
  getCurrentLocalTime
} from '@/lib/database-service';

export default function ConditionEdit() {
  const { huntId, locationId } = useLocalSearchParams();
  const { user } = useSession();
  const [hunt, setHunt] = useState(null);
  const [location, setLocation] = useState(null);
  const [conditions, setConditions] = useState([]);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  
  const [showForm, setShowForm] = useState(false);
  const [editingCondition, setEditingCondition] = useState(null);
  const [formData, setFormData] = useState({
    type: 'REQUIRED_LOCATION',
    requiredLocationId: '',
    startTime: getCurrentLocalTime(),
    endTime: getCurrentLocalTime()
  });

  // Time picker state
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    if (huntId && locationId && user) {
      loadConditionData();
    }
  }, [huntId, locationId, user]);

  const loadConditionData = async () => {
    try {
      setLoading(true);
      
      const huntData = await getHuntById(huntId);
      if (!huntData || huntData.userId !== user.uid) {
        Alert.alert('Error', 'Access denied');
        router.back();
        return;
      }
      setHunt(huntData);

      const locationData = await getLocationById(locationId);
      if (!locationData) {
        Alert.alert('Error', 'Location not found');
        router.back();
        return;
      }
      setLocation(locationData);

      const locationConditions = await getLocationConditions(locationId);
      setConditions(locationConditions);

      const huntLocations = await getHuntLocations(huntId);
      const otherLocations = huntLocations.filter(loc => loc.locationId !== locationId);
      setAvailableLocations(otherLocations);

    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'REQUIRED_LOCATION',
      requiredLocationId: availableLocations[0]?.locationId || '',
      startTime: getCurrentLocalTime(),
      endTime: getCurrentLocalTime()
    });
    setEditingCondition(null);
    setShowForm(false);
  };

  const handleAddCondition = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEditCondition = (condition) => {
    setEditingCondition(condition);
    setFormData({
      type: condition.type,
      requiredLocationId: condition.requiredLocationId || (availableLocations[0]?.locationId || ''),
      startTime: condition.startTime || getCurrentLocalTime(),
      endTime: condition.endTime || getCurrentLocalTime()
    });
    setShowForm(true);
  };

  const validateForm = () => {
    if (formData.type === 'REQUIRED_LOCATION' && !formData.requiredLocationId) {
      Alert.alert('Error', 'Please select a required location');
      return false;
    }
    if (formData.type === 'TIME_WINDOW' && (!formData.startTime || !formData.endTime)) {
      Alert.alert('Error', 'Please set start and end times');
      return false;
    }
    return true;
  };

  const handleSaveCondition = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const conditionData = {
        locationId: locationId,
        type: formData.type,
        requiredLocationId: formData.type === 'REQUIRED_LOCATION' ? formData.requiredLocationId : undefined,
        startTime: formData.type === 'TIME_WINDOW' ? formData.startTime : undefined,
        endTime: formData.type === 'TIME_WINDOW' ? formData.endTime : undefined
      };

      if (editingCondition) {
        await updateCondition(editingCondition.conditionId, conditionData);
        Alert.alert('Success', 'Condition updated!');
      } else {
        await createCondition(conditionData);
        Alert.alert('Success', 'Condition created!');
      }

      resetForm();
      await loadConditionData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save condition');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCondition = (condition) => {
    Alert.alert(
      'Delete Condition',
      `Are you sure you want to delete this ${condition.type === 'REQUIRED_LOCATION' ? 'required location' : 'time window'} condition?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => confirmDeleteCondition(condition.conditionId)
        }
      ]
    );
  };

  const confirmDeleteCondition = async (conditionId) => {
    try {
      setDeleting(conditionId);
      await deleteCondition(conditionId);
      await loadConditionData();
      Alert.alert('Success', 'Condition deleted!');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete condition');
    } finally {
      setDeleting(null);
    }
  };

  const formatTimeForPicker = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTimeFromPicker = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getLocationNameById = (locationId) => {
    const location = availableLocations.find(loc => loc.locationId === locationId);
    return location ? location.locationName : 'Unknown Location';
  };

  const renderConditionItem = ({ item }) => (
    <View className="bg-white p-4 mb-3 rounded-lg shadow-sm border border-gray-200">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          {item.type === 'REQUIRED_LOCATION' ? (
            <View>
              <Text className="text-lg font-semibold text-purple-700 mb-2">
                🔗 Required Location
              </Text>
              <Text className="text-gray-700">
                Must complete: <Text className="font-medium">{getLocationNameById(item.requiredLocationId)}</Text>
              </Text>
            </View>
          ) : (
            <View>
              <Text className="text-lg font-semibold text-blue-700 mb-2">
                ⏰ Time Window
              </Text>
              <Text className="text-gray-700">
                Available: <Text className="font-medium">{item.startTime} - {item.endTime}</Text>
              </Text>
            </View>
          )}
        </View>

        <View className="ml-3 flex-col space-y-2">
          <Pressable
            onPress={() => handleEditCondition(item)}
            className="bg-blue-500 px-3 py-2 rounded-md"
          >
            <Text className="text-white text-xs font-medium">Edit</Text>
          </Pressable>
          
          <Pressable
            onPress={() => handleDeleteCondition(item)}
            disabled={deleting === item.conditionId}
            className={`px-3 py-2 rounded-md ${
              deleting === item.conditionId ? 'bg-gray-300' : 'bg-red-500'
            }`}
          >
            {deleting === item.conditionId ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white text-xs font-medium">Delete</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-gray-600">Loading conditions...</Text>
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
              Manage Conditions
            </Text>
            <Text className="text-gray-600">
              📍 {location?.locationName}
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

      <ScrollView className="flex-1">
        <View className="p-4">
          <Pressable
            onPress={handleAddCondition}
            className="bg-green-500 p-4 rounded-lg shadow-sm"
          >
            <View className="flex-row items-center justify-center">
              <Text className="text-2xl mr-3">➕</Text>
              <Text className="text-white text-lg font-semibold">
                Add New Condition
              </Text>
            </View>
          </Pressable>
        </View>

        {showForm && (
          <View className="mx-4 mb-4 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              {editingCondition ? 'Edit Condition' : 'Create New Condition'}
            </Text>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Condition Type
              </Text>
              <View className="border border-gray-300 rounded-lg">
                <CrossPlatformPicker
                  selectedValue={formData.type}
                  onValueChange={(value) => setFormData({...formData, type: value})}
                >
                  <CrossPlatformPicker.Item label="Required Location" value="REQUIRED_LOCATION" />
                  <CrossPlatformPicker.Item label="Time Window" value="TIME_WINDOW" />
                </CrossPlatformPicker>
              </View>
            </View>

            {formData.type === 'REQUIRED_LOCATION' && (
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Required Location
                </Text>
                {availableLocations.length > 0 ? (
                  <View className="border border-gray-300 rounded-lg">
                    <CrossPlatformPicker
                      selectedValue={formData.requiredLocationId}
                      onValueChange={(value) => setFormData({...formData, requiredLocationId: value})}
                    >
                      {availableLocations.map((loc) => (
                        <CrossPlatformPicker.Item 
                          key={loc.locationId} 
                          label={loc.locationName} 
                          value={loc.locationId} 
                        />
                      ))}
                    </CrossPlatformPicker>
                  </View>
                ) : (
                  <View className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <Text className="text-yellow-800">
                      No other locations available in this hunt. Add more locations first.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Time Window Pickers */}
            {formData.type === 'TIME_WINDOW' && (
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Time Window (Local Time)
                </Text>
                
                <View className="flex-row space-x-2">
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500 mb-1">Start Time</Text>
                    <Pressable
                      onPress={() => setShowStartTimePicker(true)}
                      className="border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <Text className="text-gray-900">{formData.startTime}</Text>
                    </Pressable>
                  </View>
                  
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500 mb-1">End Time</Text>
                    <Pressable
                      onPress={() => setShowEndTimePicker(true)}
                      className="border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <Text className="text-gray-900">{formData.endTime}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            <View className="flex-row space-x-3">
              <Pressable
                onPress={handleSaveCondition}
                disabled={saving}
                className={`flex-1 py-3 px-4 rounded-lg ${
                  saving ? 'bg-gray-300' : 'bg-green-500'
                }`}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-medium text-center">
                    {editingCondition ? 'Update Condition' : 'Create Condition'}
                  </Text>
                )}
              </Pressable>
              
              <Pressable
                onPress={resetForm}
                disabled={saving}
                className="flex-1 py-3 px-4 rounded-lg bg-gray-500"
              >
                <Text className="text-white font-medium text-center">Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View className="px-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900">
              Current Conditions ({conditions.length})
            </Text>
          </View>

          {conditions.length > 0 ? (
            <FlatList
              data={conditions}
              renderItem={renderConditionItem}
              keyExtractor={(item) => item.conditionId}
              scrollEnabled={false}
            />
          ) : (
            <View className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <Text className="text-center text-gray-500 text-lg mb-2">
                🔓 No Conditions Set
              </Text>
              <Text className="text-center text-gray-400">
                Location is always accessible.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Time Pickers */}
      {showStartTimePicker && (
        <CrossPlatformDateTimePicker
          value={formatTimeForPicker(formData.startTime)}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(event, selectedTime) => {
            setShowStartTimePicker(false);
            if (selectedTime) {
              setFormData({...formData, startTime: formatTimeFromPicker(selectedTime)});
            }
          }}
        />
      )}

      {showEndTimePicker && (
        <CrossPlatformDateTimePicker
          value={formatTimeForPicker(formData.endTime)}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(event, selectedTime) => {
            setShowEndTimePicker(false);
            if (selectedTime) {
              setFormData({...formData, endTime: formatTimeFromPicker(selectedTime)});
            }
          }}
        />
      )}
    </View>
  );
}