import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

const LocationDetailDeepLink = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    if (params.huntId && params.locationId) {
      router.replace(`/location-detail?locationId=${params.locationId}&huntId=${params.huntId}`);
    } else {
      router.replace('/');
    }
  }, [params]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Loading location...</Text>
    </View>
  );
};

export default LocationDetailDeepLink;
