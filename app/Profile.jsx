import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context';
import { useTheme } from '@/context/ThemeContext';
import { getUserProfile, updateUserProfile, getPlayerHunts } from '@/lib/database-service';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';

/**
 * Profile Component - User profile and settings screen
 * Displays user information, stats, theme controls, and completed hunts
 */
const Profile = () => {
  // Authentication and navigation
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  
  // Profile state
  const [profile, setProfile] = useState(null); // User profile data from database
  const [completedHunts, setCompletedHunts] = useState([]); // List of hunts user has completed
  const [loading, setLoading] = useState(true); // Loading state for data fetch
  const [selectedIcon, setSelectedIcon] = useState('default'); // Currently selected app icon

  // Available app icon options for customization
  const appIcons = [
    { id: 'default', name: 'Default', icon: 'apps', color: '#007AFF' },
    { id: 'dark', name: 'Dark', icon: 'moon', color: '#333' },
    { id: 'minimal', name: 'Minimal', icon: 'square-outline', color: '#888' },
  ];

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  /**
   * Loads user profile data and completed hunts from database
   * Fetches user profile information and filters for completed hunts
   */
  const loadProfile = async () => {
    try {
      const userProfile = await getUserProfile(user.uid);
      setProfile(userProfile);

      const hunts = await getPlayerHunts(user.uid);
      const completed = hunts.filter(h => h.status === 'COMPLETED');
      setCompletedHunts(completed);
    } catch (error) {
      console.log('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Changes the app icon (functionality placeholder)
   * Updates selected icon state and shows confirmation
   * @param {string} iconId - ID of the selected icon
   */
  const changeAppIcon = async (iconId) => {
    try {
      setSelectedIcon(iconId);
      Alert.alert('App Icon', `Icon changed to ${iconId}`);
    } catch (error) {
      Alert.alert('Error', 'Could not change app icon');
    }
  };

  const bgColor = theme === 'dark' ? '#000' : '#fff';
  const textColor = theme === 'dark' ? '#fff' : '#000';
  const cardBg = theme === 'dark' ? '#222' : '#f5f5f5';

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgColor }}>
        <Text style={{ color: textColor }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bgColor }}>
      <View style={{ padding: 20 }}>
        {/* Profile Header */}
        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <View style={{ 
            width: 100, 
            height: 100, 
            borderRadius: 50, 
            backgroundColor: cardBg,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 15
          }}>
            {profile?.profileImageUrl ? (
              <Image 
                source={{ uri: profile.profileImageUrl }} 
                style={{ width: 100, height: 100, borderRadius: 50 }}
              />
            ) : (
              <Ionicons name="person" size={50} color={textColor} />
            )}
          </View>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: textColor }}>
            {profile?.displayName || 'User'}
          </Text>
          <Text style={{ fontSize: 14, color: textColor, opacity: 0.7 }}>
            {user?.email}
          </Text>
        </View>

        {/* Stats */}
        <View style={{ 
          backgroundColor: cardBg, 
          padding: 20, 
          borderRadius: 12, 
          marginBottom: 20 
        }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: textColor, marginBottom: 10 }}>
            Stats
          </Text>
          <Text style={{ fontSize: 16, color: textColor }}>
            Completed Hunts: {completedHunts.length}
          </Text>
        </View>

        {/* Theme Toggle */}
        <View style={{ 
          backgroundColor: cardBg, 
          padding: 20, 
          borderRadius: 12, 
          marginBottom: 20,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: textColor }}>
              Dark Mode
            </Text>
            <Text style={{ fontSize: 14, color: textColor, opacity: 0.7 }}>
              Toggle dark/light theme
            </Text>
          </View>
          <Switch
            value={theme === 'dark'}
            onValueChange={toggleTheme}
          />
        </View>

        {/* App Icon Selector */}
        <View style={{ 
          backgroundColor: cardBg, 
          padding: 20, 
          borderRadius: 12, 
          marginBottom: 20 
        }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: textColor, marginBottom: 15 }}>
            App Icon
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            {appIcons.map((icon) => (
              <TouchableOpacity
                key={icon.id}
                onPress={() => changeAppIcon(icon.id)}
                style={{
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: selectedIcon === icon.id ? icon.color : cardBg,
                  borderWidth: 2,
                  borderColor: selectedIcon === icon.id ? icon.color : '#ccc',
                  width: 90
                }}
              >
                <Ionicons 
                  name={icon.icon} 
                  size={32} 
                  color={selectedIcon === icon.id ? '#fff' : textColor} 
                />
                <Text style={{ 
                  fontSize: 12, 
                  marginTop: 8, 
                  color: selectedIcon === icon.id ? '#fff' : textColor 
                }}>
                  {icon.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Scoreboard Button */}
        <TouchableOpacity
          onPress={() => router.push('/Scoreboard')}
          style={{
            backgroundColor: '#007AFF',
            padding: 16,
            borderRadius: 12,
            marginBottom: 20
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center', fontWeight: '600' }}>
            View Scoreboard
          </Text>
        </TouchableOpacity>

        {/* Completed Hunts */}
        <View style={{ marginBottom: 30 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: textColor, marginBottom: 15 }}>
            Completed Hunts
          </Text>
          {completedHunts.map((hunt, index) => (
            <View 
              key={hunt.playerHuntId || index}
              style={{ 
                backgroundColor: cardBg, 
                padding: 15, 
                borderRadius: 12, 
                marginBottom: 10 
              }}
            >
              <Text style={{ fontSize: 16, color: textColor }}>
                Hunt ID: {hunt.huntId}
              </Text>
              <Text style={{ fontSize: 14, color: textColor, opacity: 0.7 }}>
                Completed
              </Text>
            </View>
          ))}
          {completedHunts.length === 0 && (
            <Text style={{ color: textColor, opacity: 0.7, textAlign: 'center' }}>
              No completed hunts yet
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default Profile;
