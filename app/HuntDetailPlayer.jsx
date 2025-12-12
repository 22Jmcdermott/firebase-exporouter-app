import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  Dimensions
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSession } from '@/context';
import * as Location from 'expo-location';
import MapView, { Marker, Circle } from 'react-native-maps';
import { 
  getHuntById,
  getPlayerHunt,
  getHuntLocations,
  getLocationConditions,
  getHuntCheckIns,
  getLocationById,
  startPlayerHunt,
  updatePlayerHuntStatus,
  createCheckIn,
  getCheckIn,
  getHuntProgress,
  convertUTCTimeToLocal
} from '@/lib/database-service';

export default function HuntDetailPlayer() {
  const { huntId, mode = 'play' } = useLocalSearchParams();
  const { user } = useSession();
  
  // State
  const [hunt, setHunt] = useState(null);
  const [playerHunt, setPlayerHunt] = useState(null);
  const [locations, setLocations] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [locationConditions, setLocationConditions] = useState({});
  const [progress, setProgress] = useState({ completed: 0, total: 0, percentage: 0 });
  const [userLocation, setUserLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [checkingInLocationId, setCheckingInLocationId] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [selectedLocationForMap, setSelectedLocationForMap] = useState(null);

  useEffect(() => {
    if (huntId && user?.uid) {
      loadHuntData();
      requestLocationPermission();
    }
  }, [huntId, user]);

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

  const loadHuntData = async () => {
    try {
      setIsLoading(true);
      
      // Load hunt details
      const huntData = await getHuntById(huntId);
      setHunt(huntData);
      
      // Load player hunt status
      const playerHuntData = await getPlayerHunt(user.uid, huntId);
      setPlayerHunt(playerHuntData);
      
      // Load locations
      const locationsData = await getHuntLocations(huntId);
      setLocations(locationsData);
      
      // Load check-ins if player has started
      if (playerHuntData) {
        const checkInsData = await getHuntCheckIns(user.uid, huntId);
        setCheckIns(checkInsData);
        
        const progressData = await getHuntProgress(user.uid, huntId);
        setProgress(progressData);
        
        // Load conditions for each location
        await loadLocationConditions(locationsData);
      }
      
    } catch (error) {
      console.error('Error loading hunt data:', error);
      Alert.alert('Error', 'Failed to load hunt details');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLocationConditions = async (locationsData) => {
    const conditions = {};
    for (const location of locationsData) {
      try {
        const locationConditions = await getLocationConditions(location.locationId);
        conditions[location.locationId] = locationConditions;
      } catch (error) {
        console.error(`Error loading conditions for location ${location.locationId}:`, error);
      }
    }
    setLocationConditions(conditions);
  };

  const handleStartHunt = async () => {
    try {
      setIsStarting(true);
      const playerHuntId = await startPlayerHunt(user.uid, huntId);
      
      // Reload data
      await loadHuntData();
      
      Alert.alert('Success', 'Hunt started! Good luck!');
    } catch (error) {
      console.error('Error starting hunt:', error);
      Alert.alert('Error', 'Failed to start hunt. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleAbandonHunt = () => {
    Alert.alert(
      'Abandon Hunt',
      'Are you sure? All progress will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Abandon', 
          style: 'destructive',
          onPress: confirmAbandonHunt 
        }
      ]
    );
  };

  const confirmAbandonHunt = async () => {
    try {
      if (playerHunt?.playerHuntId) {
        await updatePlayerHuntStatus(playerHunt.playerHuntId, 'ABANDONED');
        router.back();
      }
    } catch (error) {
      console.error('Error abandoning hunt:', error);
      Alert.alert('Error', 'Failed to abandon hunt');
    }
  };

  const isLocationAvailable = (location) => {
    const conditions = locationConditions[location.locationId] || [];
    
    for (const condition of conditions) {
      if (condition.type === 'REQUIRED_LOCATION') {
        // Check if required location is completed
        const requiredCheckIn = checkIns.find(ci => ci.locationId === condition.requiredLocationId);
        if (!requiredCheckIn) {
          return false;
        }
      }
      
      if (condition.type === 'TIME_WINDOW') {
        // Check if current time is within window
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        const startTime = convertUTCTimeToLocal(condition.startTime);
        const endTime = convertUTCTimeToLocal(condition.endTime);
        
        if (currentTime < startTime || currentTime > endTime) {
          return false;
        }
      }
    }
    
    return true;
  };

  const isLocationCompleted = (locationId) => {
    return checkIns.some(ci => ci.locationId === locationId);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δλ = (lon2 - lon1) * Math.PI/180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    const bearing = (θ * 180/Math.PI + 360) % 360; // in degrees

    return bearing;
  };

  const getDirectionText = (bearing) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  };

  const getDirectionArrow = (bearing) => {
    const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
    const index = Math.round(bearing / 45) % 8;
    return arrows[index];
  };

  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getProximityGuidance = (location) => {
    if (!userLocation) return null;
    console.log('Target location:', location.latitude, location.longitude);
    console.log('User location:', userLocation.latitude, userLocation.longitude);

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
    const arrow = getDirectionArrow(bearing);

    // Only show detailed guidance if within 500 meters
    const showDetailedGuidance = distance <= 500;

    return {
      distance,
      bearing,
      direction,
      arrow,
      showDetailedGuidance,
      formattedDistance: formatDistance(distance)
    };
  };

  const isUserNearLocation = (location) => {
    if (!userLocation) return false;
    
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      location.latitude,
      location.longitude
    );
    // Check if user is within 50 meters of the location
    return distance <= 50;
  };

  const handleCheckIn = async (location) => {
    if (!isUserNearLocation(location)) {
      Alert.alert('Too Far', 'You are not close enough to the location.');
      return;
    }

    try {
      setCheckingInLocationId(location.locationId);
      await createCheckIn(user.uid, huntId, location.locationId);
      
      // Reload data to update progress
      await loadHuntData();
      
      // Check if hunt is now complete
      const newProgress = await getHuntProgress(user.uid, huntId);
      if (newProgress.percentage === 100 && playerHunt?.playerHuntId) {
        await updatePlayerHuntStatus(playerHunt.playerHuntId, 'COMPLETED', true);
        Alert.alert('Congratulations!', '🎉 You have completed the hunt! 🎉');
      } else {
        Alert.alert('Success!', 'Location completed! 🎯');
      }
      
    } catch (error) {
      console.error('Error checking in:', error);
      Alert.alert('Error', 'Failed to check in. Please try again.');
    } finally {
      setCheckingInLocationId(null);
    }
  };

  const getLocationStatusColor = (location) => {
    if (isLocationCompleted(location.locationId)) return 'border-green-500';
    if (isLocationAvailable(location)) return 'border-blue-500';
    return 'border-gray-300';
  };

  const getLocationStatusText = (location) => {
    if (isLocationCompleted(location.locationId)) return 'Completed ✅';
    if (isLocationAvailable(location)) return 'Available';
    return 'Locked 🔒';
  };

  const handleShowMap = (location) => {
    setSelectedLocationForMap(location);
    setShowMap(true);
  };

  const handleCloseMap = () => {
    setShowMap(false);
    setSelectedLocationForMap(null);
  };

  const renderLocationItem = ({ item }) => {
    const completed = isLocationCompleted(item.locationId);
    const available = isLocationAvailable(item);
    const nearLocation = isUserNearLocation(item);
    const canCheckIn = available && !completed && nearLocation && playerHunt;
    const guidance = getProximityGuidance(item);

    return (
      <View className={`bg-white dark:bg-gray-800 p-4 mx-4 mb-3 rounded-lg shadow-md border-l-4 ${getLocationStatusColor(item)}`}>
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white flex-1 mr-2">
            {item.locationName}
          </Text>
          <View className={`px-2 py-1 rounded-full ${completed ? 'bg-green-100 dark:bg-green-900' : available ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}`}>
            <Text className={`text-xs font-medium ${completed ? 'text-green-800 dark:text-green-200' : available ? 'text-blue-800 dark:text-blue-200' : 'text-gray-600 dark:text-gray-400'}`}>
              {getLocationStatusText(item)}
            </Text>
          </View>
        </View>

        {/* Proximity Guidance */}
        {available && !completed && guidance && playerHunt && (
          <View className="mt-2 mb-3">
            {guidance.showDetailedGuidance ? (
              <View className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <View className="flex-row justify-between items-center mb-2">
                  <View className="flex-row items-center">
                    <Text className="text-3xl mr-2">{guidance.arrow}</Text>
                    <View>
                      <Text className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                        {guidance.direction} - {guidance.formattedDistance}
                      </Text>
                      <Text className="text-xs text-blue-600 dark:text-blue-300">
                        Head {guidance.direction} to reach location
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    className="bg-blue-500 px-3 py-2 rounded-lg"
                    onPress={() => handleShowMap(item)}
                  >
                    <Text className="text-white text-xs font-medium">View Map</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View className="bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg">
                <Text className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  📍 Distance: {guidance.formattedDistance}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-500 text-center mt-1">
                  Get closer to see detailed directions
                </Text>
              </View>
            )}
          </View>
        )}

        {completed && mode === 'play' && (
          <View className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <Text className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">
              Location Details:
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              {item.explanation}
            </Text>
          </View>
        )}

        {mode === 'review' && (
          <View className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/20 rounded-lg">
            <Text className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">
              Location Details:
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              {item.explanation}
            </Text>
          </View>
        )}

        {canCheckIn && (
          <Pressable
            className="mt-3 bg-blue-500 py-2 px-4 rounded-lg"
            onPress={() => handleCheckIn(item)}
            disabled={checkingInLocationId === item.locationId}
          >
            {checkingInLocationId === item.locationId ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-semibold text-center">
                Check In 📍
              </Text>
            )}
          </Pressable>
        )}

        {available && !completed && !nearLocation && playerHunt && (
          <View className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
            <Text className="text-xs text-orange-700 dark:text-orange-300 text-center">
              Get closer to this location to check in
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 dark:text-gray-400 mt-4">Loading hunt...</Text>
      </View>
    );
  }

  if (!hunt) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <Text className="text-gray-600 dark:text-gray-400">Hunt not found</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {hunt.name}
        </Text>
        
        {playerHunt ? (
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                Progress: {progress.completed}/{progress.total} locations
              </Text>
              <View className="mt-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 w-48">
                <View 
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${progress.percentage}%` }}
                />
              </View>
            </View>
            
            {playerHunt.status === 'STARTED' && mode === 'play' && (
              <Pressable
                className="bg-red-500 px-4 py-2 rounded-lg"
                onPress={handleAbandonHunt}
              >
                <Text className="text-white text-sm font-medium">Abandon</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View className="items-center py-4">
            <Text className="text-gray-600 dark:text-gray-400 text-center mb-4">
              Ready to start your adventure?
            </Text>
            <Pressable
              className="bg-blue-500 px-8 py-3 rounded-lg"
              onPress={handleStartHunt}
              disabled={isStarting}
            >
              {isStarting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">
                  🚀 Start Playing Hunt
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </View>

      {/* Locations List */}
      <View className="py-4">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3 px-4">
          Locations ({locations.length})
        </Text>
        
        <FlatList
          data={locations}
          renderItem={renderLocationItem}
          keyExtractor={(item) => item.locationId}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        />
      </View>

      {/* Map Modal */}
      {showMap && selectedLocationForMap && userLocation && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'white'
        }}>
          <View className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
            <View className="flex-row justify-between items-center">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                Navigate to Location
              </Text>
              <Pressable
                className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg"
                onPress={handleCloseMap}
              >
                <Text className="text-gray-900 dark:text-white font-medium">Close</Text>
              </Pressable>
            </View>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {selectedLocationForMap.locationName}
            </Text>
          </View>

          {userLocation ? (
            <MapView
              style={{ flex: 1 }}
              initialRegion={{
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              showsUserLocation={true}
              showsMyLocationButton={true}
              showsCompass={true}
            >
              {/* User Location Marker */}
              <Marker
                coordinate={{
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                }}
                title="Your Location"
                pinColor="blue"
              />

            {/* Target Location Marker */}
            <Marker
              coordinate={{
                latitude: selectedLocationForMap.latitude,
                longitude: selectedLocationForMap.longitude,
              }}
              title={selectedLocationForMap.locationName}
              description="Target Location"
              pinColor="red"
            />

            {/* Circle showing check-in range */}
            <Circle
              center={{
                latitude: selectedLocationForMap.latitude,
                longitude: selectedLocationForMap.longitude,
              }}
              radius={11} // Approximately 4 decimal places (0.0001 degrees)
              fillColor="rgba(59, 130, 246, 0.2)"
              strokeColor="rgba(59, 130, 246, 0.5)"
              strokeWidth={2}
            />
          </MapView>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' }}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={{ marginTop: 16, color: '#6b7280' }}>Loading map...</Text>
            </View>
          )}

          {/* Distance Info Overlay */}
          <View className="absolute bottom-4 left-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-sm text-gray-600 dark:text-gray-400">Distance</Text>
                <Text className="text-xl font-bold text-gray-900 dark:text-white">
                  {getProximityGuidance(selectedLocationForMap)?.formattedDistance}
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-sm text-gray-600 dark:text-gray-400">Direction</Text>
                <View className="flex-row items-center">
                  <Text className="text-2xl mr-2">
                    {getProximityGuidance(selectedLocationForMap)?.arrow}
                  </Text>
                  <Text className="text-xl font-bold text-gray-900 dark:text-white">
                    {getProximityGuidance(selectedLocationForMap)?.direction}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
