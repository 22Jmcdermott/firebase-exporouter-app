import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { router } from 'expo-router';
import { useSession } from '@/context';
import { 
  getPlayerHunts,
  getHuntById,
  getHuntProgress,
  getUserReviewForHunt
} from '@/lib/database-service';
import { Ionicons } from '@expo/vector-icons';

export default function MyCompletedHunts() {
  const { user } = useSession();
  const [completedHunts, setCompletedHunts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewStatus, setReviewStatus] = useState({});

  useEffect(() => {
    if (user?.uid) {
      loadCompletedHunts();
    }
  }, [user]);

  const loadCompletedHunts = async () => {
    try {
      setIsLoading(true);
      
      // Get all player hunts for the current user
      const playerHunts = await getPlayerHunts(user.uid);
      
      // Filter for only completed hunts
      const completedPlayerHunts = playerHunts.filter(ph => ph.status === 'COMPLETED');
      
      // Get hunt details and final progress for each completed hunt
      const huntsWithDetails = [];
      
      for (const playerHunt of completedPlayerHunts) {
        try {
          const huntDetails = await getHuntById(playerHunt.huntId);
          const progress = await getHuntProgress(user.uid, playerHunt.huntId);
          
          if (huntDetails) {
            huntsWithDetails.push({
              ...huntDetails,
              playerHuntId: playerHunt.playerHuntId,
              startTime: playerHunt.startTime,
              completionTime: playerHunt.completionTime,
              progress
            });
          }
        } catch (error) {
          console.error(`Error loading details for hunt ${playerHunt.huntId}:`, error);
        }
      }
      
      // Sort by completion time (most recent first)
      huntsWithDetails.sort((a, b) => {
        const aTime = a.completionTime?.seconds || 0;
        const bTime = b.completionTime?.seconds || 0;
        return bTime - aTime;
      });
      
      setCompletedHunts(huntsWithDetails);
      
      // Load review status for each hunt
      await loadReviewStatus(huntsWithDetails);
    } catch (error) {
      console.error('Error loading completed hunts:', error);
      Alert.alert('Error', 'Failed to load completed hunts');
    } finally {
      setIsLoading(false);
    }
  };

  const loadReviewStatus = async (hunts) => {
    const status = {};
    for (const hunt of hunts) {
      try {
        const review = await getUserReviewForHunt(hunt.id, user.uid);
        status[hunt.id] = review !== null;
      } catch (error) {
        status[hunt.id] = false;
      }
    }
    setReviewStatus(status);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCompletedHunts();
    setRefreshing(false);
  };

  const handleHuntPress = (hunt) => {
    router.push(`/hunt-detail?huntId=${hunt.id}&mode=review`);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const calculateDuration = (startTime, completionTime) => {
    if (!startTime || !completionTime) return '';
    
    const start = startTime.toDate ? startTime.toDate() : new Date(startTime);
    const end = completionTime.toDate ? completionTime.toDate() : new Date(completionTime);
    
    const diffMs = end - start;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}, ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    }
  };

  const getCompletionEmoji = (index) => {
    const emojis = ['🏆', '🎉', '⭐', '🥇', '🎊', '💫', '🌟', '🏅'];
    return emojis[index % emojis.length];
  };

  const renderCompletedHuntItem = ({ item, index }) => {
    const duration = calculateDuration(item.startTime, item.completionTime);
    const hasReview = reviewStatus[item.id] || false;
    
    return (
      <Pressable
        className="bg-white dark:bg-gray-800 p-4 mx-4 mb-3 rounded-lg shadow-md border-l-4 border-green-500"
        onPress={() => handleHuntPress(item)}
      >
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-3">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {item.name}
            </Text>
            <Text className="text-sm text-green-600 dark:text-green-400 font-medium">
              {getCompletionEmoji(index)} Completed!
            </Text>
          </View>
          
          <View className="bg-green-100 dark:bg-green-900 px-3 py-1 rounded-full">
            <Text className="text-xs text-green-800 dark:text-green-200 font-medium">
              100%
            </Text>
          </View>
        </View>

        <View className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              All {item.progress.total} locations completed
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              Perfect score!
            </Text>
          </View>
          
          <View className="bg-green-500 h-2 rounded-full w-full" />
        </View>

        <View className="space-y-1">
          <View className="flex-row justify-between">
            <Text className="text-xs text-gray-500 dark:text-gray-400">Completed:</Text>
            <Text className="text-xs text-gray-700 dark:text-gray-300">
              {formatDate(item.completionTime)}
            </Text>
          </View>
          
          {duration && (
            <View className="flex-row justify-between">
              <Text className="text-xs text-gray-500 dark:text-gray-400">Duration:</Text>
              <Text className="text-xs text-gray-700 dark:text-gray-300">
                {duration}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            Tap to review
          </Text>
          
          <TouchableOpacity
            className={`flex-row items-center px-4 py-2 rounded-lg ${
              hasReview ? 'bg-blue-100 dark:bg-blue-900' : 'bg-yellow-100 dark:bg-yellow-900'
            }`}
            onPress={(e) => {
              e.stopPropagation();
              router.push(`/ReviewForm?huntId=${item.id}`);
            }}
          >
            <Ionicons
              name={hasReview ? 'checkmark-circle' : 'star-outline'}
              size={16}
              color={hasReview ? '#3B82F6' : '#EAB308'}
              style={{ marginRight: 4 }}
            />
            <Text className={`text-xs font-medium ${
              hasReview ? 'text-blue-700 dark:text-blue-300' : 'text-yellow-700 dark:text-yellow-300'
            }`}>
              {hasReview ? 'Edit Review' : 'Add Review'}
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    );
  };

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center px-4">
      <View className="items-center">
        <Text className="text-6xl mb-4">🎯</Text>
        <Text className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          No Completed Hunts Yet
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 text-center mb-6">
          Complete your first hunt to see your achievements here!
        </Text>
        <Pressable
          className="bg-green-500 px-6 py-3 rounded-lg"
          onPress={() => router.push('/MyActiveHunts')}
        >
          <Text className="text-white font-semibold">View Active Hunts</Text>
        </Pressable>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#10B981" />
        <Text className="text-gray-600 dark:text-gray-400 mt-4">
          Loading your achievements...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="p-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          My Completed Hunts
        </Text>
        <Text className="text-gray-600 dark:text-gray-400 mb-4">
          Celebrate your achievements! 🎉
        </Text>
        
        {completedHunts.length > 0 && (
          <View className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg mb-4">
            <Text className="text-green-800 dark:text-green-200 font-medium text-center">
              🏆 You've completed {completedHunts.length} hunt{completedHunts.length > 1 ? 's' : ''}! 
            </Text>
          </View>
        )}
      </View>

      {completedHunts.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={completedHunts}
          renderItem={renderCompletedHuntItem}
          keyExtractor={(item) => item.playerHuntId}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#10B981']}
              tintColor="#10B981"
            />
          }
        />
      )}
    </View>
  );
}