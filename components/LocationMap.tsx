import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  Dimensions,
  Platform
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface LocationMapProps {
  locations: Array<{
    locationId: string;
    locationName: string;
    latitude: number;
    longitude: number;
    explanation: string;
  }>;
  availableLocationIds: string[];
  completedLocationIds: string[];
  userLocation: {
    latitude: number;
    longitude: number;
  } | null;
  onLocationPress: (location: any) => void;
  showUserLocation?: boolean;
}

export default function LocationMap({
  locations,
  availableLocationIds,
  completedLocationIds,
  userLocation,
  onLocationPress,
  showUserLocation = true
}: LocationMapProps) {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);

  useEffect(() => {
    if (userLocation && locations.length > 0) {
      calculateRegion();
    }
  }, [userLocation, locations]);

  const calculateRegion = () => {
    if (!userLocation || locations.length === 0) return;

    // Include user location and all hunt locations
    const allLatitudes = [userLocation.latitude, ...locations.map(loc => loc.latitude)];
    const allLongitudes = [userLocation.longitude, ...locations.map(loc => loc.longitude)];

    const minLat = Math.min(...allLatitudes);
    const maxLat = Math.max(...allLatitudes);
    const minLng = Math.min(...allLongitudes);
    const maxLng = Math.max(...allLongitudes);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    const latDelta = Math.max(maxLat - minLat, 0.01) * 1.5; // Add padding
    const lngDelta = Math.max(maxLng - minLng, 0.01) * 1.5;

    const newRegion = {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };

    setRegion(newRegion);
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  };

  const getMarkerColor = (locationId: string) => {
    if (completedLocationIds.includes(locationId)) {
      return '#10B981'; // Green for completed
    }
    if (availableLocationIds.includes(locationId)) {
      return '#3B82F6'; // Blue for available
    }
    return '#6B7280'; // Gray for locked
  };

  const getMarkerIcon = (locationId: string) => {
    if (completedLocationIds.includes(locationId)) {
      return 'checkmark-circle';
    }
    if (availableLocationIds.includes(locationId)) {
      return 'location';
    }
    return 'lock-closed';
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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

  const formatDistance = (distance: number) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  };

  const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(y, x);
    const bearing = (θ * 180 / Math.PI + 360) % 360;

    return bearing;
  };

  const getDirectionText = (bearing: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  };

  if (!region) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <Text className="text-gray-600">Loading map...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={false}
        followsUserLocation={trackingEnabled}
        showsCompass={true}
        showsScale={true}
      >
        {locations.map((location) => {
          const distance = userLocation
            ? calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                location.latitude,
                location.longitude
              )
            : 0;

          const isNearby = distance <= 500; // Show details if within 500m
          const isAvailable = availableLocationIds.includes(location.locationId);
          const isCompleted = completedLocationIds.includes(location.locationId);

          return (
            <Marker
              key={location.locationId}
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              onPress={() => onLocationPress(location)}
              pinColor={getMarkerColor(location.locationId)}
              title={location.locationName}
              description={
                isCompleted
                  ? 'Completed ✅'
                  : isAvailable
                  ? `Available ${isNearby ? `• ${formatDistance(distance)} away` : ''}`
                  : 'Locked 🔒'
              }
            />
          );
        })}
      </MapView>

      {/* Map Controls */}
      <View className="absolute top-4 right-4 space-y-2">
        <Pressable
          className="bg-white p-3 rounded-full shadow-lg"
          onPress={centerOnUser}
        >
          <Ionicons name="locate" size={24} color="#3B82F6" />
        </Pressable>

        <Pressable
          className={`p-3 rounded-full shadow-lg ${
            trackingEnabled ? 'bg-blue-500' : 'bg-white'
          }`}
          onPress={() => setTrackingEnabled(!trackingEnabled)}
        >
          <Ionicons
            name="navigate"
            size={24}
            color={trackingEnabled ? 'white' : '#3B82F6'}
          />
        </Pressable>
      </View>

      {/* Navigation Guidance for Available Locations */}
      {userLocation && availableLocationIds.length > 0 && (
        <View className="absolute bottom-4 left-4 right-4">
          <View className="bg-white p-4 rounded-lg shadow-lg">
            <Text className="font-semibold text-gray-800 mb-2">
              📍 Available Locations:
            </Text>
            {locations
              .filter(loc => availableLocationIds.includes(loc.locationId))
              .map(location => {
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

                return (
                  <View key={location.locationId} className="flex-row items-center justify-between py-1">
                    <View className="flex-1">
                      <Text className="text-gray-800 font-medium">
                        {location.locationName}
                      </Text>
                      {distance <= 500 && (
                        <Text className="text-sm text-gray-600">
                          {formatDistance(distance)} • {direction}
                        </Text>
                      )}
                    </View>
                    {distance <= 100 && (
                      <View className="bg-green-100 px-2 py-1 rounded">
                        <Text className="text-green-800 text-xs font-medium">
                          Nearly there! 🎯
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
          </View>
        </View>
      )}
    </View>
  );
}