import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { router } from 'expo-router';
import { useSession } from '@/context';
import { 
  getPlayerHunts,
  getHuntById,
  getHuntProgress
} from '@/lib/database-service';

export default function MyActiveHunts() {
  const { user } = useSession();
  const [activeHunts, setActiveHunts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadActiveHunts();
    }
  }, [user]);

  const loadActiveHunts = async () => {
    try {
      setIsLoading(true);
      
      // Get all player hunts for the current user
      const playerHunts = await getPlayerHunts(user.uid);
      
      // Filter for only started hunts
      const startedHunts = playerHunts.filter(ph => ph.status === 'STARTED');
      
      // Get hunt details and progress for each started hunt
      const huntsWithDetails = [];
      
      for (const playerHunt of startedHunts) {
        try {
          const huntDetails = await getHuntById(playerHunt.huntId);
          const progress = await getHuntProgress(user.uid, playerHunt.huntId);
          
          if (huntDetails) {
            huntsWithDetails.push({
              ...huntDetails,
              playerHuntId: playerHunt.playerHuntId,
              startTime: playerHunt.startTime,
              progress
            });
          }
        } catch (error) {
          console.error(`Error loading details for hunt ${playerHunt.huntId}:`, error);
        }
      }
      
      setActiveHunts(huntsWithDetails);
    } catch (error) {
      console.error('Error loading active hunts:', error);
      Alert.alert('Error', 'Failed to load active hunts');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActiveHunts();
    setRefreshing(false);
  };

  const handleHuntPress = (hunt) => {
    router.push(`/hunt-detail?huntId=${hunt.id}&mode=play`);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const renderActiveHuntItem = ({ item }) => {
    return (
      <Pressable
        className="bg-white dark:bg-gray-800 p-4 mx-4 mb-3 rounded-lg shadow-md border-l-4 border-blue-500"
        onPress={() => handleHuntPress(item)}
      >
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white flex-1 mr-2">
            {item.name}
          </Text>
          <View className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-full">
            <Text className="text-xs text-blue-800 dark:text-blue-200 font-medium">
              In Progress
            </Text>
          </View>
        </View>

        <Text className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Started: {formatDate(item.startTime)}
        </Text>

        <View className="mb-3">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-sm text-gray-700 dark:text-gray-300">
              Progress: {item.progress.completed}/{item.progress.total} locations
            </Text>
            <Text className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {item.progress.percentage}%
            </Text>
          </View>
          
          <View className="bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <View 
              className="bg-blue-500 h-3 rounded-full"
              style={{ width: `${item.progress.percentage}%` }}
            />
          </View>
        </View>

        <View className="flex-row justify-between items-center">
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            Tap to continue playing
          </Text>
          
          {item.progress.percentage > 0 && (
            <View className="flex-row items-center">
              <View className="w-2 h-2 bg-green-500 rounded-full mr-1" />
              <Text className="text-xs text-green-600 dark:text-green-400">
                {item.progress.completed} completed
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 dark:text-gray-400 mt-4">
          Loading your active hunts...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="p-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          My Active Hunts
        </Text>
        <Text className="text-gray-600 dark:text-gray-400 mb-4">
          Continue your adventures
        </Text>
      </View>

      {activeHunts.length === 0 ? (
        <View className="flex-1 justify-center items-center px-4">
          <View className="items-center">
            <Text className="text-6xl mb-4">🏃‍♂️</Text>
            <Text className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No Active Hunts
            </Text>
            <Text className="text-gray-500 dark:text-gray-400 text-center mb-6">
              Start a new hunt to begin your adventure!
            </Text>
            <Pressable
              className="bg-blue-500 px-6 py-3 rounded-lg"
              onPress={() => router.push('/HuntDiscovery')}
            >
              <Text className="text-white font-semibold">Discover Hunts</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <FlatList
          data={activeHunts}
          renderItem={renderActiveHuntItem}
          keyExtractor={(item) => item.playerHuntId}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3B82F6']}
              tintColor="#3B82F6"
            />
          }
        />
      )}
    </View>
  );
}