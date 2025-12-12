import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { useSession } from '@/context';
import { 
  getVisibleHunts,
  getPlayerHunt,
  getHuntProgress,
  getHuntRatingStats
} from '@/lib/database-service';

export default function HuntDiscovery() {
  const { user } = useSession();
  const [hunts, setHunts] = useState([]);
  const [filteredHunts, setFilteredHunts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [huntProgress, setHuntProgress] = useState({});
  const [huntRatings, setHuntRatings] = useState({});

  useEffect(() => {
    loadVisibleHunts();
  }, []);

  useEffect(() => {
    filterHunts();
  }, [searchQuery, hunts]);

  const loadVisibleHunts = async () => {
    try {
      setIsLoading(true);
      // Get all visible hunts
      const visibleHunts = await getVisibleHunts();
      
      setHunts(visibleHunts);
      
      // Load progress for each hunt if user has started it
      if (user?.uid) {
        await loadHuntProgress(visibleHunts);
      }
      
      // Load rating stats for all hunts
      await loadHuntRatings(visibleHunts);
    } catch (error) {
      console.error('Error loading hunts:', error);
      Alert.alert('Error', 'Failed to load hunts');
    } finally {
      setIsLoading(false);
    }
  };

  const loadHuntProgress = async (huntList) => {
    const progressData = {};
    
    for (const hunt of huntList) {
      try {
        const playerHunt = await getPlayerHunt(user.uid, hunt.id);
        if (playerHunt) {
          const progress = await getHuntProgress(user.uid, hunt.id);
          progressData[hunt.id] = {
            ...progress,
            status: playerHunt.status
          };
        }
      } catch (error) {
        console.error(`Error loading progress for hunt ${hunt.id}:`, error);
      }
    }
    
    setHuntProgress(progressData);
  };

  const loadHuntRatings = async (huntList) => {
    const ratingsData = {};
    
    for (const hunt of huntList) {
      try {
        const stats = await getHuntRatingStats(hunt.id);
        if (stats) {
          ratingsData[hunt.id] = stats;
        }
      } catch (error) {
        console.error(`Error loading ratings for hunt ${hunt.id}:`, error);
      }
    }
    
    setHuntRatings(ratingsData);
  };

  const filterHunts = () => {
    if (!searchQuery.trim()) {
      setFilteredHunts(hunts);
    } else {
      const filtered = hunts.filter(hunt => 
        hunt.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredHunts(filtered);
    }
  };

  const handleHuntPress = (hunt) => {
    router.push(`/hunt-detail?huntId=${hunt.id}&mode=play`);
  };

  const renderHuntItem = ({ item }) => {
    const progress = huntProgress[item.id];
    const rating = huntRatings[item.id];
    
    return (
      <Pressable
        className="bg-white dark:bg-gray-800 p-4 mx-4 mb-3 rounded-lg shadow-md"
        onPress={() => handleHuntPress(item)}
      >
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white flex-1">
            {item.name}
          </Text>
          
          {rating && rating.reviewCount > 0 && (
            <View className="flex-row items-center bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-full ml-2">
              <Text className="text-yellow-600 dark:text-yellow-400 text-xs mr-1">★</Text>
              <Text className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                {rating.averageRating}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                ({rating.reviewCount})
              </Text>
            </View>
          )}
        </View>
        
        {progress && (
          <View className="mt-2">
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              Progress: {progress.completed}/{progress.total} locations
            </Text>
            <View className="mt-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <View 
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${progress.percentage}%` }}
              />
            </View>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {progress.percentage}% complete
            </Text>
          </View>
        )}
        
        {!progress && (
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Not started
          </Text>
        )}
        
        <Text className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Tap to view details
        </Text>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 dark:text-gray-400 mt-4">Loading hunts...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="p-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Discover Hunts
        </Text>
        
        <TextInput
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
          placeholder="Search hunts by name..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {filteredHunts.length === 0 ? (
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-gray-500 dark:text-gray-400 text-center">
            {searchQuery ? 'No hunts found matching your search' : 'No visible hunts available'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredHunts}
          renderItem={renderHuntItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}