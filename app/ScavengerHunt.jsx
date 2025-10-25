import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSession } from '@/context';
import { 
  getUserHunts, 
  createHunt, 
  generateHuntNameSuggestions,
  Hunt
} from '@/lib/database-service';


export default function ScavengerHunt() {
  
  const router = useRouter();
  const { user } = useSession();
  
  const [hunts, setHunts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [huntName, setHuntName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

 
  useEffect(() => {
    if (user) {
      loadUserHunts();
    }
  }, [user]);

  
  const loadUserHunts = async () => {
    try {
      setIsLoading(true);
      const userHunts = await getUserHunts();
      setHunts(userHunts);
      console.log('📋 Loaded hunts:', userHunts.length);
    } catch (error) {
      console.error('❌ Error loading hunts:', error);
      Alert.alert('Error', 'Failed to load your hunts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh hunts list (pull-to-refresh)
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadUserHunts();
    setIsRefreshing(false);
  };

  // ============================================================================
  // Hunt Creation Functions
  // ============================================================================
  
  /**
   * Handle creating a new hunt
   */
  const handleCreateHunt = async () => {
    if (!huntName.trim()) {
      Alert.alert('Invalid Input', 'Please enter a hunt name.');
      return;
    }

    if (huntName.length > 255) {
      Alert.alert('Invalid Input', 'Hunt name must be 255 characters or less.');
      return;
    }

    try {
      setIsCreating(true);
      
      // Create the hunt
      const huntId = await createHunt(huntName.trim());
      
      // Success feedback
      Alert.alert(
        'Success!', 
        `Hunt "${huntName.trim()}" has been created!`,
        [{ text: 'OK', onPress: () => {
          setHuntName('');
          setShowCreateForm(false);
          loadUserHunts(); // Refresh the list
        }}]
      );

    } catch (error) {
      console.error('❌ Error creating hunt:', error);
      
      // Handle duplicate name error with suggestions
      if (error.message.includes('already exists')) {
        showDuplicateNameAlert(huntName.trim());
      } else {
        Alert.alert('Error', error.message || 'Failed to create hunt. Please try again.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Show alert with suggested hunt names when duplicate is found
   */
  const showDuplicateNameAlert = async (originalName) => {
    try {
      const suggestions = await generateHuntNameSuggestions(originalName, user.uid);
      
      let alertMessage = `A hunt with the name "${originalName}" already exists.\n\n`;
      
      if (suggestions.length > 0) {
        alertMessage += 'Here are some available alternatives:\n';
        suggestions.forEach((suggestion, index) => {
          alertMessage += `• ${suggestion}\n`;
        });
      } else {
        alertMessage += 'Please try a different name.';
      }

      Alert.alert('Hunt Name Already Exists', alertMessage, [
        { text: 'Try Again', style: 'default' },
        ...(suggestions.length > 0 ? [{
          text: 'Use First Suggestion',
          onPress: () => setHuntName(suggestions[0])
        }] : [])
      ]);
    } catch (error) {
      Alert.alert('Hunt Name Already Exists', 'Please choose a different name.');
    }
  };

  // ============================================================================
  // Navigation Functions
  // ============================================================================
  
  /**
   * Navigate to hunt detail screen
   */
  const handleHuntPress = (hunt) => {
    console.log('Navigating to hunt:', hunt.name, 'ID:', hunt.id);
    
    // Navigate to hunt detail screen with huntId parameter
    router.push(`/hunt-detail?id=${hunt.id}`);
  };

  // ============================================================================
  // Render Functions
  // ============================================================================
  
  /**
   * Render individual hunt item - Simplified
   */
  const renderHuntItem = ({ item: hunt }) => (
    <TouchableOpacity
      style={{
        backgroundColor: 'white',
        padding: 15,
        marginBottom: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e5e5'
      }}
      onPress={() => handleHuntPress(hunt)}
    >
      <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 5 }}>
        {hunt.name}
      </Text>
      <Text style={{ fontSize: 12, color: '#666' }}>
        {hunt.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
      </Text>
    </TouchableOpacity>
  );

  /**
   * Render empty state when no hunts exist - Simplified
   */
  const renderEmptyState = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 10, textAlign: 'center' }}>
        No hunts yet
      </Text>
      <TouchableOpacity
        style={{
          backgroundColor: '#007AFF',
          padding: 12,
          borderRadius: 6,
          marginTop: 10
        }}
        onPress={() => setShowCreateForm(true)}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Create Hunt</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render create hunt form - Simplified
   */
  const renderCreateForm = () => (
    <View style={{ padding: 15, backgroundColor: '#f8f8f8', marginBottom: 10, borderRadius: 8 }}>
      <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
        New Hunt
      </Text>
      
      <TextInput
        style={{
          backgroundColor: 'white',
          borderWidth: 1,
          borderColor: '#ddd',
          borderRadius: 6,
          padding: 10,
          marginBottom: 10
        }}
        placeholder="Hunt name"
        value={huntName}
        onChangeText={setHuntName}
        maxLength={255}
        autoFocus={true}
        returnKeyType="done"
        onSubmitEditing={handleCreateHunt}
      />
      
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: '#007AFF',
            padding: 10,
            borderRadius: 6,
            alignItems: 'center',
            opacity: (!huntName.trim() || isCreating) ? 0.5 : 1
          }}
          onPress={handleCreateHunt}
          disabled={isCreating || !huntName.trim()}
        >
          {isCreating ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Create</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: '#ccc',
            padding: 10,
            borderRadius: 6,
            alignItems: 'center'
          }}
          onPress={() => {
            setShowCreateForm(false);
            setHuntName('');
          }}
          disabled={isCreating}
        >
          <Text style={{ color: '#333', fontWeight: 'bold' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ============================================================================
  // Loading State - Simplified
  // ============================================================================
  
  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 10, color: '#666' }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================================================
  // Main Render - Simplified
  // ============================================================================
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Simple Header */}
        <View style={{ 
          padding: 15, 
          borderBottomWidth: 1, 
          borderBottomColor: '#eee',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
            My Hunts ({hunts.length})
          </Text>
          
          {!showCreateForm && (
            <TouchableOpacity
              style={{
                backgroundColor: '#007AFF',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6
              }}
              onPress={() => setShowCreateForm(true)}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>+ Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Simple Content */}
        <View style={{ flex: 1, padding: 15 }}>
          {/* Create Hunt Form */}
          {showCreateForm && renderCreateForm()}
          
          {/* Hunts List */}
          {hunts.length === 0 && !showCreateForm ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={hunts}
              renderItem={renderHuntItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  colors={['#007AFF']}
                  tintColor="#007AFF"
                />
              }
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}