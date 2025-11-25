import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSession } from '@/context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import LocationMap from '@/components/LocationMap';
import { 
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  getLocationConditions,
  getHuntById
} from '@/lib/database-service';

export default function LocationDetail() {
  const { huntId, locationId, mode } = useLocalSearchParams();
  const { user } = useSession();
  const [hunt, setHunt] = useState(null);
  const [location, setLocation] = useState(null);
  const [conditions, setConditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [viewMode, setViewMode] = useState(mode === 'play' || mode === 'review' ? 'map' : 'edit');
  
  const [isEditing, setIsEditing] = useState(mode === 'create');
  const [formData, setFormData] = useState({
    locationName: '',
    explanation: '',
    latitude: '',
    longitude: ''
  });

  useEffect(() => {
    if (huntId && user) {
      loadLocationData();
      if (mode === 'play' || mode === 'review') {
        requestLocationPermission();
      }
    }
  }, [huntId, locationId, user]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location.coords);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const loadLocationData = async () => {
    try {
      setLoading(true);
      
      const huntData = await getHuntById(huntId);
      if (!huntData || huntData.userId !== user.uid) {
        Alert.alert('Error', 'Hunt not found or access denied');
        router.back();
        return;
      }

      setHunt(huntData);

      if (mode === 'create') {
        setFormData({
          locationName: '',
          explanation: '',
          latitude: '',
          longitude: ''
        });
        setConditions([]);
      } else if (locationId) {
        const locationData = await getLocationById(locationId);
        if (!locationData) {
          Alert.alert('Error', 'Location not found');
          router.back();
          return;
        }

        setLocation(locationData);
        setFormData({
          locationName: locationData.locationName,
          explanation: locationData.explanation,
          latitude: locationData.latitude.toString(),
          longitude: locationData.longitude.toString()
        });

        const locationConditions = await getLocationConditions(locationId);
        setConditions(locationConditions);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load location data');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const { locationName, explanation, latitude, longitude } = formData;

    if (!locationName.trim() || !explanation.trim()) {
      Alert.alert('Error', 'Name and explanation are required');
      return false;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      Alert.alert('Error', 'Invalid coordinates');
      return false;
    }

    return true;
  };

  // Helper functions for distance and navigation
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const formatDistance = (distance) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  };

  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);
    const bearing = (θ * 180 / Math.PI + 360) % 360;

    return bearing;
  };

  const getDirectionText = (bearing) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const locationData = {
        huntId: huntId,
        locationName: formData.locationName.trim(),
        explanation: formData.explanation.trim(),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude)
      };

      if (mode === 'create') {
        await createLocation(locationData);
        Alert.alert('Success', 'Location created!', [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]);
      } else {
        await updateLocation(locationId, locationData);
        setLocation({ ...location, ...locationData });
        setIsEditing(false);
        Alert.alert('Success', 'Location updated!');
        await loadLocationData();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (mode === 'create') {
      router.back();
    } else {
      // Reset form to original values
      setFormData({
        locationName: location.locationName,
        explanation: location.explanation,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString()
      });
      setIsEditing(false);
    }
  };

  const checkDependencies = async () => {
    Alert.alert(
      'Delete Location',
      `Delete "${location.locationName}"? This will also delete all conditions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: confirmDelete
        }
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      await deleteLocation(locationId);
      Alert.alert('Success', 'Location deleted!', [
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete location');
    } finally {
      setDeleting(false);
    }
  };

  const handleManageConditions = () => {
    router.push(`/condition-edit?huntId=${huntId}&locationId=${locationId}`);
  };

  const getConditionSummary = () => {
    if (conditions.length === 0) {
      return "No conditions set.";
    }

    return `${conditions.length} condition${conditions.length !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-gray-600">Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-white p-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900 mb-1">
              {mode === 'create' ? 'Add Location' : (isEditing ? 'Edit Location' : 'Location Details')}
            </Text>
            <Text className="text-gray-600">
              📍 {hunt?.name}
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

      <View className="p-4">
        {mode !== 'create' && location && (
          <View className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
            <Text className="text-lg font-semibold text-blue-900 mb-2">
              Conditions
            </Text>
            <Text className="text-blue-800 mb-3">
              {getConditionSummary()}
            </Text>
            
            <Pressable
              onPress={handleManageConditions}
              className="bg-blue-500 py-2 px-4 rounded-lg"
            >
                <View className="flex-row items-center justify-center">
                  <Text className="text-lg mr-2">⚙️</Text>
                  <Text className="text-white font-medium">Manage Conditions</Text>
                </View>
              </Pressable>
            </View>
          )}

          {/* Location Form */}
          <View className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-4">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Location Information
            </Text>

            {/* Location Name */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Location Name *
              </Text>
              <TextInput
                value={formData.locationName}
                onChangeText={(text) => setFormData({...formData, locationName: text})}
                placeholder="Enter location name"
                editable={isEditing}
                className={`border rounded-lg px-3 py-2 ${
                  isEditing ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'
                }`}
              />
            </View>

            {/* Explanation */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Explanation *
              </Text>
              <TextInput
                value={formData.explanation}
                onChangeText={(text) => setFormData({...formData, explanation: text})}
                placeholder="Describe what users should find or do here"
                multiline={true}
                numberOfLines={3}
                editable={isEditing}
                className={`border rounded-lg px-3 py-2 ${
                  isEditing ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'
                }`}
              />
            </View>

            {/* Coordinates */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                GPS Coordinates *
              </Text>
              
              <View className="flex-row space-x-2">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">Latitude</Text>
                  <TextInput
                    value={formData.latitude}
                    onChangeText={(text) => setFormData({...formData, latitude: text})}
                    placeholder="0.0000"
                    keyboardType="numeric"
                    editable={isEditing}
                    className={`border rounded-lg px-3 py-2 ${
                      isEditing ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                </View>
                
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">Longitude</Text>
                  <TextInput
                    value={formData.longitude}
                    onChangeText={(text) => setFormData({...formData, longitude: text})}
                    placeholder="0.0000"
                    keyboardType="numeric"
                    editable={isEditing}
                    className={`border rounded-lg px-3 py-2 ${
                      isEditing ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                </View>
              </View>
              
              <Text className="text-xs text-gray-500 mt-1">
                Latitude: -90 to 90, Longitude: -180 to 180
              </Text>
            </View>

            {/* Action Buttons */}
            {isEditing ? (
              <View className="flex-row space-x-3">
                <Pressable
                  onPress={handleSave}
                  disabled={saving}
                  className={`flex-1 py-3 px-4 rounded-lg ${
                    saving ? 'bg-gray-300' : 'bg-green-500'
                  }`}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-white font-medium text-center">
                      {mode === 'create' ? 'Create Location' : 'Save Changes'}
                    </Text>
                  )}
                </Pressable>
                
                <Pressable
                  onPress={handleCancel}
                  disabled={saving}
                  className="flex-1 py-3 px-4 rounded-lg bg-gray-500"
                >
                  <Text className="text-white font-medium text-center">Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <View className="flex-row space-x-3">
                <Pressable
                  onPress={() => setIsEditing(true)}
                  className="flex-1 py-3 px-4 rounded-lg bg-blue-500"
                >
                  <Text className="text-white font-medium text-center">Edit Location</Text>
                </Pressable>
                
                <Pressable
                  onPress={checkDependencies}
                  disabled={deleting}
                  className={`py-3 px-4 rounded-lg ${
                    deleting ? 'bg-gray-300' : 'bg-red-500'
                  }`}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-white font-medium">Delete</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>

          {/* Location Preview (for existing locations) */}
          {mode !== 'create' && location && !isEditing && (
            <View className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <Text className="text-lg font-semibold text-gray-900 mb-4">
                Location Preview
              </Text>
              
              <View className="space-y-3">
                <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                  <Text className="text-gray-600">Name</Text>
                  <Text className="text-gray-900 font-medium">{location.locationName}</Text>
                </View>
                
                <View className="flex-row justify-between items-start py-2 border-b border-gray-100">
                  <Text className="text-gray-600">Explanation</Text>
                  <Text className="text-gray-900 text-right flex-1 ml-4">
                    {location.explanation}
                  </Text>
                </View>
                
                <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                  <Text className="text-gray-600">Coordinates</Text>
                  <Text className="text-gray-900 font-mono text-sm">
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </Text>
                </View>
                
                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-gray-600">Conditions</Text>
                  <Text className="text-gray-900 font-medium">{conditions.length}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Player Mode - Map View and Navigation */}
          {(mode === 'play' || mode === 'review') && location && (
            <View className="mt-4">
              {/* View Mode Toggle */}
              <View className="mb-4">
                <View className="flex-row justify-center space-x-4">
                  <Pressable
                    className={`flex-row items-center px-4 py-2 rounded-lg ${
                      viewMode === 'info' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    onPress={() => setViewMode('info')}
                  >
                    <Ionicons
                      name="information-circle"
                      size={20}
                      color={viewMode === 'info' ? 'white' : '#6B7280'}
                    />
                    <Text className={`ml-2 font-medium ${
                      viewMode === 'info' ? 'text-white' : 'text-gray-600'
                    }`}>
                      Info
                    </Text>
                  </Pressable>
                  
                  <Pressable
                    className={`flex-row items-center px-4 py-2 rounded-lg ${
                      viewMode === 'map' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    onPress={() => setViewMode('map')}
                  >
                    <Ionicons
                      name="map"
                      size={20}
                      color={viewMode === 'map' ? 'white' : '#6B7280'}
                    />
                    <Text className={`ml-2 font-medium ${
                      viewMode === 'map' ? 'text-white' : 'text-gray-600'
                    }`}>
                      Navigate
                    </Text>
                  </Pressable>
                </View>
              </View>

              {viewMode === 'info' ? (
                /* Location Information */
                <View className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <Text className="text-lg font-semibold text-gray-900 mb-4">
                    📍 {location.locationName}
                  </Text>
                  
                  <View className="space-y-3">
                    <View className="py-2">
                      <Text className="text-gray-600 font-medium mb-1">Description</Text>
                      <Text className="text-gray-900">
                        {location.explanation}
                      </Text>
                    </View>
                    
                    <View className="flex-row justify-between items-center py-2 border-t border-gray-100">
                      <Text className="text-gray-600">Coordinates</Text>
                      <Text className="text-gray-900 font-mono text-sm">
                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </Text>
                    </View>

                    {userLocation && (
                      <View className="py-2 border-t border-gray-100">
                        <Text className="text-gray-600 font-medium mb-1">Distance & Direction</Text>
                        <Text className="text-gray-900">
                          {(() => {
                            const distance = calculateDistance(
                              userLocation.latitude,
                              userLocation.longitude,
                              location.latitude,
                              location.longitude
                            );
                            const bearing = calculateBearing(
                              userLocation.latitude,
                              userLocation.longitude,
                              location.latitude,
                              location.longitude
                            );
                            const direction = getDirectionText(bearing);
                            return `${formatDistance(distance)} ${direction}`;
                          })()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                /* Map View with Navigation */
                <View className="h-96 rounded-lg overflow-hidden border border-gray-200">
                  <LocationMap
                    locations={[location]}
                    availableLocationIds={[location.locationId]}
                    completedLocationIds={[]}
                    userLocation={userLocation}
                    onLocationPress={() => {}}
                    showUserLocation={true}
                  />
                </View>
              )}
            </View>
          )}
        </View>
    </ScrollView>
  );
}