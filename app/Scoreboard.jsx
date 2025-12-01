import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
import { getScoreboard } from '@/lib/database-service';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const Scoreboard = () => {
  const { theme } = useTheme();
  const [scoreboard, setScoreboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScoreboard();
  }, []);

  const loadScoreboard = async () => {
    try {
      const data = await getScoreboard();
      setScoreboard(data);
    } catch (error) {
      console.log('Error loading scoreboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const bgColor = theme === 'dark' ? '#000' : '#fff';
  const textColor = theme === 'dark' ? '#fff' : '#000';
  const cardBg = theme === 'dark' ? '#222' : '#f5f5f5';

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgColor }}>
        <Text style={{ color: textColor }}>Loading scoreboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bgColor }}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: textColor, marginBottom: 20 }}>
          Scoreboard
        </Text>

        {scoreboard.map((entry, index) => (
          <View
            key={entry.userId}
            style={{
              backgroundColor: cardBg,
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            {/* Rank */}
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : textColor,
              width: 40
            }}>
              {index + 1}
            </Text>

            {/* Profile Image */}
            <View style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: theme === 'dark' ? '#333' : '#ddd',
              marginRight: 15,
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              {entry.profileImageUrl ? (
                <Image
                  source={{ uri: entry.profileImageUrl }}
                  style={{ width: 50, height: 50, borderRadius: 25 }}
                />
              ) : (
                <Ionicons name="person" size={30} color={textColor} />
              )}
            </View>

            {/* Name and Score */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: textColor }}>
                {entry.displayName}
              </Text>
              <Text style={{ fontSize: 14, color: textColor, opacity: 0.7 }}>
                {entry.completedCount} hunts completed
              </Text>
            </View>

            {/* Trophy for top 3 */}
            {index < 3 && (
              <Ionicons
                name="trophy"
                size={24}
                color={index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'}
              />
            )}
          </View>
        ))}

        {scoreboard.length === 0 && (
          <Text style={{ color: textColor, textAlign: 'center', marginTop: 50 }}>
            No completed hunts yet
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

export default Scoreboard;
