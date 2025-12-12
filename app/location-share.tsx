/**
 * LocationDetailDeepLink Component - Deep link handler for location sharing
 * 
 * This component handles incoming deep links that direct users to specific hunt locations.
 * It acts as a routing intermediary that validates parameters and redirects to the appropriate screen.
 * 
 * Deep Link Format:
 * - URL: [app-scheme]://location-share?huntId=[id]&locationId=[id]
 * - Example: myapp://location-share?huntId=abc123&locationId=xyz789
 * 
 * Flow:
 * 1. User clicks a deep link (e.g., from a shared message or external source)
 * 2. App opens to this component
 * 3. Component extracts huntId and locationId from URL parameters
 * 4. Redirects to location-detail screen with those parameters
 * 5. If parameters are missing, redirects to home screen
 * 
 * Use Cases:
 * - Sharing specific hunt locations between users
 * - External links to hunt content from notifications or web pages
 * - Direct navigation to hunt locations from QR codes or NFC tags
 */

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

const LocationDetailDeepLink = () => {
  const router = useRouter();
  const params = useLocalSearchParams(); // Extract URL parameters from deep link

  /**
   * Effect hook that handles the deep link routing logic
   * Runs when component mounts or when URL parameters change
   */
  useEffect(() => {
    // Validate that both required parameters are present
    if (params.huntId && params.locationId) {
      // Redirect to the location detail screen with the extracted parameters
      router.replace(`/location-detail?locationId=${params.locationId}&huntId=${params.huntId}`);
    } else {
      // Fallback: redirect to home if parameters are missing or invalid
      router.replace('/');
    }
  }, [params]);

  // Display a loading screen while the redirect is processing
  // This is shown briefly before navigation completes
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Loading location...</Text>
    </View>
  );
};

export default LocationDetailDeepLink;
