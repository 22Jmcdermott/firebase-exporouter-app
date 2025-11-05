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
    locationName: '',
    explanation: '',
    latitude: '',
    longitude: '',
    conditions: []
  });
  const [currentCondition, setCurrentCondition] = useState({
    type: 'REQUIRED_LOCATION',
    requiredLocationId: '',
    startTime: getCurrentLocalTime(),
    endTime: getCurrentLocalTime()
  });
  const [showTimePicker, setShowTimePicker] = useState({ start: false, end: false });

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

  // Simple hunt creation (old method)
  const handleCreateHunt = async () => {
    if (!newHuntName.trim()) {
      Alert.alert('Error', 'Please enter a hunt name');
      return;
    }

    if (newHuntName.length > 255) {
      Alert.alert('Error', 'Hunt name must be 255 characters or less');
      return;
    }

    try {
      setCreating(true);
      const huntExists = await huntExistsForUser(newHuntName.trim(), user.uid);
      
      if (huntExists) {
        Alert.alert('Error', 'A hunt with this name already exists. Please choose a unique name.');
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

  // Launch Hunt Creation Wizard
  const startHuntWizard = () => {
    setNewHunt({ name: '', isVisible: false });
    setLocations([]);
    setWizardStep(1);
    setShowWizard(true);
  };

  // Hunt Creation Wizard - Step Navigation
  const nextWizardStep = () => {
    if (wizardStep === 1) {
      if (!newHunt.name.trim()) {
        Alert.alert('Error', 'Please enter a hunt name');
        return;
      }
      if (newHunt.name.length > 255) {
        Alert.alert('Error', 'Hunt name must be 255 characters or less');
        return;
      }
    }
    setWizardStep(wizardStep + 1);
  };

  const previousWizardStep = () => {
    setWizardStep(wizardStep - 1);
  };

  // Add Location to Hunt
  const addLocationToHunt = () => {
    if (!currentLocation.locationName.trim()) {
      Alert.alert('Error', 'Please enter a location name');
      return;
    }
    if (!currentLocation.explanation.trim()) {
      Alert.alert('Error', 'Please enter a location explanation');
      return;
    }
    if (!currentLocation.latitude || !currentLocation.longitude) {
      Alert.alert('Error', 'Please enter valid GPS coordinates');
      return;
    }

    const newLocation = {
      ...currentLocation,
      id: Date.now().toString(), // Temporary ID
      latitude: parseFloat(currentLocation.latitude),
      longitude: parseFloat(currentLocation.longitude),
    };

    setLocations([...locations, newLocation]);
    setCurrentLocation({
      locationName: '',
      explanation: '',
      latitude: '',
      longitude: '',
      conditions: []
    });
  };

  // Remove Location from Hunt
  const removeLocationFromHunt = (locationId) => {
    setLocations(locations.filter(loc => loc.id !== locationId));
  };

  // Add Condition to Current Location
  const addConditionToLocation = () => {
    if (currentCondition.type === 'REQUIRED_LOCATION' && !currentCondition.requiredLocationId) {
      Alert.alert('Error', 'Please select a required location');
      return;
    }

    const newCondition = {
      ...currentCondition,
      id: Date.now().toString() // Temporary ID
    };

    setCurrentLocation({
      ...currentLocation,
      conditions: [...currentLocation.conditions, newCondition]
    });

    setCurrentCondition({
      type: 'REQUIRED_LOCATION',
      requiredLocationId: '',
      startTime: getCurrentLocalTime(),
      endTime: getCurrentLocalTime()
    });
  };

  // Complete Hunt Creation Wizard
  const completeHuntCreation = async () => {
    try {
      setCreating(true);

      // Check if hunt name exists
      const huntExists = await huntExistsForUser(newHunt.name.trim(), user.uid);
      if (huntExists) {
        Alert.alert('Error', 'A hunt with this name already exists. Please choose a unique name.');
        return;
      }

      // Step 1: Create the hunt
      const huntId = await createHunt(newHunt.name.trim(), user.uid);

      // Step 2: Create all locations
      for (const location of locations) {
        const locationData = {
          huntId: huntId,
          locationName: location.locationName,
          explanation: location.explanation,
          latitude: location.latitude,
          longitude: location.longitude
        };

        const locationId = await createLocation(locationData);

        // Step 3: Create conditions for each location
        for (const condition of location.conditions) {
          const conditionData = {
            locationId: locationId,
            type: condition.type,
            requiredLocationId: condition.type === 'REQUIRED_LOCATION' ? condition.requiredLocationId : undefined,
            startTime: condition.type === 'TIME_WINDOW' ? condition.startTime : undefined,
            endTime: condition.type === 'TIME_WINDOW' ? condition.endTime : undefined
          };

          await createCondition(conditionData);
        }
      }

      // Reset wizard and refresh hunt list
      setShowWizard(false);
      setWizardStep(1);
      await loadUserHunts();
      
      Alert.alert('Success', `Hunt "${newHunt.name}" created successfully with ${locations.length} locations!`);

    } catch (error) {

      Alert.alert('Error', 'Failed to create hunt. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // Helper functions for time formatting
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

  const handleHuntPress = (huntId) => {
    router.push(`/hunt-detail?huntId=${huntId}`);
  };

  // Toggle hunt selection for multiple deletion
  const toggleHuntSelection = (huntId) => {
    const newSelection = new Set(selectedHunts);
    if (newSelection.has(huntId)) {
      newSelection.delete(huntId);
    } else {
      newSelection.add(huntId);
    }
    setSelectedHunts(newSelection);
  };

  // Delete selected hunts with cascading deletion
  const handleDeleteSelected = async () => {
    if (selectedHunts.size === 0) return;

    const huntCount = selectedHunts.size;
    const confirmMessage = `Are you sure you want to delete ${huntCount} hunt${huntCount > 1 ? 's' : ''}? This will also delete all associated locations and conditions.`;
    
    Alert.alert(
      'Confirm Deletion',
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              
              // Delete each selected hunt (cascading deletion handled in deleteHunt function)
              for (const huntId of selectedHunts) {
                await deleteHunt(huntId, user.uid);
              }
              
              setSelectedHunts(new Set()); // Clear selection
              await loadUserHunts(); // Reload the list
              Alert.alert('Success', `${huntCount} hunt${huntCount > 1 ? 's' : ''} deleted successfully`);
            } catch (error) {

              Alert.alert('Error', 'Failed to delete some hunts');
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  // Toggle hunt visibility
  const handleVisibilityToggle = async (huntId, currentVisibility) => {
    try {
      await updateHuntVisibility(huntId, !currentVisibility, user.uid);
      await loadUserHunts(); // Refresh to show updated visibility
    } catch (error) {

      Alert.alert('Error', 'Failed to update hunt visibility');
    }
  };

  const renderHuntItem = ({ item }) => (
    <View className="bg-white p-4 mb-3 rounded-lg shadow-sm border border-gray-200">
      <View className="flex-row items-center justify-between">
        {/* Simple Checkbox */}
        <Pressable
          onPress={() => toggleHuntSelection(item.id)}
          className="mr-3"
        >
          <View className={`w-6 h-6 border-2 rounded ${
            selectedHunts.has(item.id) 
              ? 'bg-blue-500 border-blue-500' 
              : 'border-gray-400'
          } items-center justify-center`}>
            {selectedHunts.has(item.id) && (
              <Text className="text-white font-bold text-sm">✓</Text>
            )}
          </View>
        </Pressable>

        {/* Hunt content */}
        <Pressable
          onPress={() => handleHuntPress(item.id)}
          className="flex-1"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900 mb-1">
                {item.name}
              </Text>
              <Text className="text-sm text-gray-500">
                Created: {formatDate(item.createdAt)}
              </Text>
            </View>

            {/* Visibility toggle */}
            <View className="ml-4 items-center">
              <Switch
                value={item.isVisible || false}
                onValueChange={() => handleVisibilityToggle(item.id, item.isVisible)}
                trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                thumbColor={item.isVisible ? '#FFFFFF' : '#9CA3AF'}
              />
              <Text className="text-xs text-gray-500 mt-1">
                {item.isVisible ? 'Public' : 'Private'}
              </Text>
            </View>
          </View>
        </Pressable>
      </View>
    </View>
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      let date;
      if (timestamp.toDate) {
        date = timestamp.toDate();
      } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        date = new Date(timestamp);
      }
      return date.toLocaleDateString();
    } catch (error) {
      return 'Unknown date';
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-gray-600">Loading your hunts...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white p-4 border-b border-gray-200">
        <View className="flex-row justify-between items-center">
          <Text className="text-xl font-bold text-gray-900">
            My Hunts ({hunts.length})
          </Text>
          
          {/* Delete button appears when hunts are selected */}
          {selectedHunts.size > 0 && (
            <Pressable
              onPress={handleDeleteSelected}
              disabled={deleting}
              className={`px-4 py-2 rounded-lg ${
                deleting ? 'bg-gray-300' : 'bg-red-500'
              }`}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-medium">
                  Delete Selected ({selectedHunts.size})
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </View>

      {/* Create new hunt section */}
      {!showWizard ? (
        <View className="bg-white p-4 m-4 rounded-lg shadow-sm border border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Create New Hunt
          </Text>
          
          {/* Quick Create Option */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              🚀 Quick Create (Empty Hunt)
            </Text>
            <TextInput
              value={newHuntName}
              onChangeText={setNewHuntName}
              placeholder="Enter hunt name"
              maxLength={255}
              className="border border-gray-300 rounded-lg px-3 py-2 mb-2"
            />
            <Text className="text-sm text-gray-500 mb-3">
              {newHuntName.length}/255 characters
            </Text>
            <Pressable
              onPress={handleCreateHunt}
              disabled={creating || !newHuntName.trim()}
              className={`py-3 px-4 rounded-lg ${
                creating || !newHuntName.trim()
                  ? 'bg-gray-300'
                  : 'bg-blue-500'
              }`}
            >
              {creating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-medium text-center">
                  Create Empty Hunt
                </Text>
              )}
            </Pressable>
          </View>

          {/* Advanced Wizard Option */}
          <View className="border-t border-gray-200 pt-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              ⭐ Advanced Setup (With Locations & Conditions)
            </Text>
            <Text className="text-sm text-gray-500 mb-3">
              Set up your complete hunt with locations and conditions all at once
            </Text>
            <Pressable
              onPress={startHuntWizard}
              className="py-3 px-4 rounded-lg bg-green-500"
            >
              <Text className="text-white font-medium text-center">
                🧙‍♂️ Launch Hunt Setup Wizard
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        // Hunt Creation Wizard
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView className="flex-1">
            <View className="bg-white m-4 rounded-lg shadow-sm border border-gray-200">
              {/* Wizard Header */}
              <View className="bg-green-500 px-4 py-3 rounded-t-lg">
                <View className="flex-row items-center justify-between">
                  <Text className="text-white text-lg font-semibold">
                    🧙‍♂️ Hunt Setup Wizard
                  </Text>
                  <Pressable
                    onPress={() => setShowWizard(false)}
                    className="bg-white/20 px-3 py-1 rounded"
                  >
                    <Text className="text-white font-medium">✕ Cancel</Text>
                  </Pressable>
                </View>
                <Text className="text-white/90 mt-1">
                  Step {wizardStep} of 3
                </Text>
              </View>

              <View className="p-4">
                {/* Step 1: Hunt Details */}
                {wizardStep === 1 && (
                  <View>
                    <Text className="text-xl font-bold text-gray-900 mb-4">
                      📝 Hunt Information
                    </Text>
                    
                    <View className="mb-4">
                      <Text className="text-sm font-medium text-gray-700 mb-2">
                        Hunt Name *
                      </Text>
                      <TextInput
                        value={newHunt.name}
                        onChangeText={(text) => setNewHunt({...newHunt, name: text})}
                        placeholder="Enter your hunt name"
                        maxLength={255}
                        className="border border-gray-300 rounded-lg px-3 py-2"
                      />
                      <Text className="text-sm text-gray-500 mt-1">
                        {newHunt.name.length}/255 characters
                      </Text>
                    </View>

                    <View className="mb-6">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm font-medium text-gray-700">
                          Make hunt public
                        </Text>
                        <Switch
                          value={newHunt.isVisible}
                          onValueChange={(value) => setNewHunt({...newHunt, isVisible: value})}
                          trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                          thumbColor={newHunt.isVisible ? '#FFFFFF' : '#9CA3AF'}
                        />
                      </View>
                      <Text className="text-sm text-gray-500 mt-1">
                        {newHunt.isVisible ? 'Others can discover and play this hunt' : 'Only you can access this hunt'}
                      </Text>
                    </View>

                    <Pressable
                      onPress={nextWizardStep}
                      disabled={!newHunt.name.trim()}
                      className={`py-3 px-4 rounded-lg ${
                        !newHunt.name.trim() ? 'bg-gray-300' : 'bg-green-500'
                      }`}
                    >
                      <Text className="text-white font-medium text-center">
                        Next: Add Locations →
                      </Text>
                    </Pressable>
                  </View>
                )}

                {/* Step 2: Add Locations */}
                {wizardStep === 2 && (
                  <View>
                    <View className="flex-row items-center justify-between mb-4">
                      <Text className="text-xl font-bold text-gray-900">
                        📍 Add Locations
                      </Text>
                      <Text className="text-sm text-gray-500">
                        ({locations.length} added)
                      </Text>
                    </View>

                    {/* Current Location Form */}
                    <View className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <Text className="text-lg font-semibold text-gray-800 mb-3">
                        Add New Location
                      </Text>

                      <View className="mb-3">
                        <Text className="text-sm font-medium text-gray-700 mb-1">
                          Location Name *
                        </Text>
                        <TextInput
                          value={currentLocation.locationName}
                          onChangeText={(text) => setCurrentLocation({...currentLocation, locationName: text})}
                          placeholder="e.g., Main Library Entrance"
                          className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                        />
                      </View>

                      <View className="mb-3">
                        <Text className="text-sm font-medium text-gray-700 mb-1">
                          Description/Clue *
                        </Text>
                        <TextInput
                          value={currentLocation.explanation}
                          onChangeText={(text) => setCurrentLocation({...currentLocation, explanation: text})}
                          placeholder="Describe what players should look for..."
                          multiline={true}
                          numberOfLines={3}
                          className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                        />
                      </View>

                      <View className="flex-row space-x-2 mb-3">
                        <View className="flex-1">
                          <Text className="text-sm font-medium text-gray-700 mb-1">
                            Latitude *
                          </Text>
                          <TextInput
                            value={currentLocation.latitude}
                            onChangeText={(text) => setCurrentLocation({...currentLocation, latitude: text})}
                            placeholder="e.g., 40.7128"
                            keyboardType="numeric"
                            className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-medium text-gray-700 mb-1">
                            Longitude *
                          </Text>
                          <TextInput
                            value={currentLocation.longitude}
                            onChangeText={(text) => setCurrentLocation({...currentLocation, longitude: text})}
                            placeholder="e.g., -74.0060"
                            keyboardType="numeric"
                            className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                          />
                        </View>
                      </View>

                      {/* Add Condition Section */}
                      <View className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <Text className="text-sm font-semibold text-blue-800 mb-2">
                          🔒 Add Visibility Condition (Optional)
                        </Text>
                        
                        <View className="mb-2">
                          <Text className="text-xs font-medium text-gray-700 mb-1">
                            Condition Type
                          </Text>
                          <View className="border border-gray-300 rounded-lg bg-white">
                            <Picker
                              selectedValue={currentCondition.type}
                              onValueChange={(value) => setCurrentCondition({...currentCondition, type: value})}
                            >
                              <Picker.Item label="Required Location" value="REQUIRED_LOCATION" />
                              <Picker.Item label="Time Window" value="TIME_WINDOW" />
                            </Picker>
                          </View>
                        </View>

                        {currentCondition.type === 'REQUIRED_LOCATION' && locations.length > 0 && (
                          <View className="mb-2">
                            <Text className="text-xs font-medium text-gray-700 mb-1">
                              Must Complete First
                            </Text>
                            <View className="border border-gray-300 rounded-lg bg-white">
                              <Picker
                                selectedValue={currentCondition.requiredLocationId}
                                onValueChange={(value) => setCurrentCondition({...currentCondition, requiredLocationId: value})}
                              >
                                <Picker.Item label="Select location..." value="" />
                                {locations.map((loc) => (
                                  <Picker.Item key={loc.id} label={loc.locationName} value={loc.id} />
                                ))}
                              </Picker>
                            </View>
                          </View>
                        )}

                        {currentCondition.type === 'TIME_WINDOW' && (
                          <View className="flex-row space-x-2 mb-2">
                            <View className="flex-1">
                              <Text className="text-xs font-medium text-gray-700 mb-1">Start Time</Text>
                              <Pressable
                                onPress={() => setShowTimePicker({...showTimePicker, start: true})}
                                className="border border-gray-300 rounded-lg px-2 py-1 bg-white"
                              >
                                <Text className="text-gray-900">{currentCondition.startTime}</Text>
                              </Pressable>
                            </View>
                            <View className="flex-1">
                              <Text className="text-xs font-medium text-gray-700 mb-1">End Time</Text>
                              <Pressable
                                onPress={() => setShowTimePicker({...showTimePicker, end: true})}
                                className="border border-gray-300 rounded-lg px-2 py-1 bg-white"
                              >
                                <Text className="text-gray-900">{currentCondition.endTime}</Text>
                              </Pressable>
                            </View>
                          </View>
                        )}

                        <Pressable
                          onPress={addConditionToLocation}
                          className="bg-blue-500 py-2 px-3 rounded-md"
                        >
                          <Text className="text-white font-medium text-center text-sm">
                            Add Condition
                          </Text>
                        </Pressable>
                      </View>

                      {/* Show current conditions */}
                      {currentLocation.conditions.length > 0 && (
                        <View className="mb-3">
                          <Text className="text-sm font-medium text-gray-700 mb-2">
                            Conditions for this location:
                          </Text>
                          {currentLocation.conditions.map((condition, index) => (
                            <View key={index} className="bg-white p-2 rounded border border-gray-200 mb-1">
                              <Text className="text-sm text-gray-800">
                                {condition.type === 'REQUIRED_LOCATION' 
                                  ? `🔗 Must complete: ${locations.find(l => l.id === condition.requiredLocationId)?.locationName || 'Unknown'}`
                                  : `⏰ Available: ${condition.startTime} - ${condition.endTime}`
                                }
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      <Pressable
                        onPress={addLocationToHunt}
                        className="bg-green-500 py-3 px-4 rounded-lg"
                      >
                        <Text className="text-white font-medium text-center">
                          ➕ Add Location to Hunt
                        </Text>
                      </Pressable>
                    </View>

                    {/* Added Locations List */}
                    {locations.length > 0 && (
                      <View className="mb-6">
                        <Text className="text-lg font-semibold text-gray-800 mb-3">
                          Added Locations ({locations.length})
                        </Text>
                        {locations.map((location, index) => (
                          <View key={location.id} className="bg-white p-3 rounded-lg border border-gray-200 mb-2">
                            <View className="flex-row items-start justify-between">
                              <View className="flex-1">
                                <Text className="text-sm font-semibold text-gray-900">
                                  {index + 1}. {location.locationName}
                                </Text>
                                <Text className="text-xs text-gray-600 mt-1">
                                  {location.explanation}
                                </Text>
                                <Text className="text-xs text-gray-500 mt-1">
                                  📍 {location.latitude}, {location.longitude}
                                </Text>
                                {location.conditions.length > 0 && (
                                  <Text className="text-xs text-blue-600 mt-1">
                                    🔒 {location.conditions.length} condition(s)
                                  </Text>
                                )}
                              </View>
                              <Pressable
                                onPress={() => removeLocationFromHunt(location.id)}
                                className="bg-red-500 px-2 py-1 rounded"
                              >
                                <Text className="text-white text-xs">Remove</Text>
                              </Pressable>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Navigation */}
                    <View className="flex-row space-x-3">
                      <Pressable
                        onPress={previousWizardStep}
                        className="flex-1 py-3 px-4 rounded-lg bg-gray-500"
                      >
                        <Text className="text-white font-medium text-center">
                          ← Back
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={nextWizardStep}
                        className="flex-1 py-3 px-4 rounded-lg bg-green-500"
                      >
                        <Text className="text-white font-medium text-center">
                          Review & Create →
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* Step 3: Review & Create */}
                {wizardStep === 3 && (
                  <View>
                    <Text className="text-xl font-bold text-gray-900 mb-4">
                      ✅ Review Your Hunt
                    </Text>

                    <View className="mb-6">
                      <View className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                        <Text className="text-lg font-semibold text-blue-900 mb-2">
                          📋 {newHunt.name}
                        </Text>
                        <Text className="text-blue-700">
                          Visibility: {newHunt.isVisible ? '🌍 Public' : '🔒 Private'}
                        </Text>
                        <Text className="text-blue-700">
                          Locations: {locations.length}
                        </Text>
                        <Text className="text-blue-700">
                          Total Conditions: {locations.reduce((total, loc) => total + loc.conditions.length, 0)}
                        </Text>
                      </View>

                      {locations.map((location, index) => (
                        <View key={location.id} className="bg-white p-3 rounded-lg border border-gray-200 mb-3">
                          <Text className="text-base font-semibold text-gray-900 mb-1">
                            {index + 1}. {location.locationName}
                          </Text>
                          <Text className="text-sm text-gray-600 mb-2">
                            {location.explanation}
                          </Text>
                          <Text className="text-sm text-gray-500 mb-2">
                            📍 GPS: {location.latitude}, {location.longitude}
                          </Text>
                          {location.conditions.length > 0 && (
                            <View>
                              <Text className="text-sm font-medium text-gray-700 mb-1">
                                🔒 Conditions:
                              </Text>
                              {location.conditions.map((condition, cIndex) => (
                                <Text key={cIndex} className="text-xs text-blue-600 ml-2">
                                  • {condition.type === 'REQUIRED_LOCATION' 
                                      ? `Must complete: ${locations.find(l => l.id === condition.requiredLocationId)?.locationName}`
                                      : `Available: ${condition.startTime} - ${condition.endTime}`
                                    }
                                </Text>
                              ))}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>

                    <View className="flex-row space-x-3">
                      <Pressable
                        onPress={previousWizardStep}
                        className="flex-1 py-3 px-4 rounded-lg bg-gray-500"
                      >
                        <Text className="text-white font-medium text-center">
                          ← Back to Edit
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={completeHuntCreation}
                        disabled={creating}
                        className={`flex-1 py-3 px-4 rounded-lg ${
                          creating ? 'bg-gray-300' : 'bg-green-500'
                        }`}
                      >
                        {creating ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text className="text-white font-medium text-center">
                            🎉 Create Hunt!
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Hunts list */}
      {hunts.length > 0 ? (
        <FlatList
          data={hunts}
          renderItem={renderHuntItem}
          keyExtractor={(item) => item.id}
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View className="flex-1 justify-center items-center">
          <Text className="text-6xl mb-4">📍</Text>
          <Text className="text-lg text-gray-500 mt-4">No hunts yet</Text>
          <Text className="text-gray-400 text-center mt-2">
            Create your first scavenger hunt to get started!
          </Text>
        </View>
      )}

      {/* Time Pickers for Conditions */}
      {showTimePicker.start && (
        <DateTimePicker
          value={formatTimeForPicker(currentCondition.startTime)}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(event, selectedTime) => {
            setShowTimePicker({...showTimePicker, start: false});
            if (selectedTime) {
              setCurrentCondition({
                ...currentCondition, 
                startTime: formatTimeFromPicker(selectedTime)
              });
            }
          }}
        />
      )}

      {showTimePicker.end && (
        <DateTimePicker
          value={formatTimeForPicker(currentCondition.endTime)}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={(event, selectedTime) => {
            setShowTimePicker({...showTimePicker, end: false});
            if (selectedTime) {
              setCurrentCondition({
                ...currentCondition, 
                endTime: formatTimeFromPicker(selectedTime)
              });
            }
          }}
        />
      )}
    </View>
  );
}