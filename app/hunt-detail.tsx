import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getHuntById, Hunt } from '@/lib/database-service';

/**
 * Hunt Detail Screen
 * Displays details of a specific hunt
 */
export default function HuntDetailScreen() {
  const { huntId } = useLocalSearchParams();
  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHuntDetails();
  }, [huntId]);

  const loadHuntDetails = async () => {
    if (!huntId || typeof huntId !== 'string') return;

    try {
      const huntData = await getHuntById(huntId);
      setHunt(huntData);
    } catch (error) {
      console.error('Error loading hunt details:', error);
    } finally {
      setIsLoading(false);
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
      <Text className="text-2xl font-bold text-gray-800 mb-4">
        {hunt.name}
      </Text>
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