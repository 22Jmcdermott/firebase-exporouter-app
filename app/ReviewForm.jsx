import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context';
import { useTheme } from '@/context/ThemeContext';
import { submitReview, getUserReviewForHunt, getHuntById } from '@/lib/database-service';
import { Ionicons } from '@expo/vector-icons';

/**
 * ReviewForm Component - Hunt review submission interface
 * Allows users to rate and review completed hunts
 * Supports both creating new reviews and editing existing ones
 */
const ReviewForm = () => {
  // Authentication and navigation
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { huntId } = params;

  // Form state
  const [hunt, setHunt] = useState(null); // Hunt being reviewed
  const [rating, setRating] = useState(0); // Star rating (1-5)
  const [comment, setComment] = useState(''); // Optional review text
  const [loading, setLoading] = useState(true); // Loading state for initial data
  const [submitting, setSubmitting] = useState(false); // Loading state during submission
  const [existingReview, setExistingReview] = useState(null); // Existing review if editing

  const isDark = theme === 'dark';

  useEffect(() => {
    if (user && huntId) {
      loadData();
    }
  }, [user, huntId]);

  /**
   * Loads hunt data and checks for existing review
   * Pre-populates form if user has already reviewed this hunt
   */
  const loadData = async () => {
    try {
      setLoading(true);
      // Load hunt details
      const huntData = await getHuntById(huntId);
      setHunt(huntData);

      // Check if user has already reviewed this hunt
      const review = await getUserReviewForHunt(huntId, user.uid);
      if (review) {
        setExistingReview(review);
        setRating(review.rating);
        setComment(review.comment || '');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load review data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Submits or updates the review
   * Validates rating is provided before submission
   * Shows success message and navigates back on completion
   */
  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      await submitReview(huntId, user.uid, rating, comment.trim());
      Alert.alert(
        'Success',
        existingReview ? 'Review updated successfully!' : 'Review submitted successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Renders interactive star rating component
   * Shows 5 stars that can be tapped to set rating
   * @returns {JSX.Element[]} Array of star button components
   */
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setRating(i)}
          style={styles.starButton}
        >
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={40}
            color={i <= rating ? '#FFD700' : '#ccc'}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, isDark && styles.containerDark]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={[styles.header, isDark && styles.headerDark]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
            {existingReview ? 'Edit Review' : 'Write a Review'}
          </Text>
        </View>

        {/* Hunt Name */}
        {hunt && (
          <View style={[styles.huntInfo, isDark && styles.huntInfoDark]}>
            <Text style={[styles.huntLabel, isDark && styles.huntLabelDark]}>Hunt:</Text>
            <Text style={[styles.huntName, isDark && styles.huntNameDark]}>{hunt.name}</Text>
          </View>
        )}

        {/* Rating Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
            Your Rating <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.starsContainer}>
            {renderStars()}
          </View>
          {rating > 0 && (
            <Text style={[styles.ratingText, isDark && styles.ratingTextDark]}>
              {rating} {rating === 1 ? 'star' : 'stars'}
            </Text>
          )}
        </View>

        {/* Comment Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>
            Your Review (Optional)
          </Text>
          <TextInput
            style={[styles.textInput, isDark && styles.textInputDark]}
            value={comment}
            onChangeText={setComment}
            placeholder="Share your experience with this hunt..."
            placeholderTextColor={isDark ? '#666' : '#999'}
            multiline
            numberOfLines={6}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, isDark && styles.charCountDark]}>
            {comment.length}/500
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {existingReview ? 'Update Review' : 'Submit Review'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerDark: {
    borderBottomColor: '#333',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  headerTitleDark: {
    color: '#fff',
  },
  huntInfo: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  huntInfoDark: {
    backgroundColor: '#1c1c1c',
  },
  huntLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  huntLabelDark: {
    color: '#999',
  },
  huntName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  huntNameDark: {
    color: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  sectionTitleDark: {
    color: '#fff',
  },
  required: {
    color: '#ff0000',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
  },
  starButton: {
    padding: 8,
  },
  ratingText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  ratingTextDark: {
    color: '#999',
  },
  textInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textInputDark: {
    backgroundColor: '#1c1c1c',
    color: '#fff',
    borderColor: '#333',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  charCountDark: {
    color: '#999',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReviewForm;
