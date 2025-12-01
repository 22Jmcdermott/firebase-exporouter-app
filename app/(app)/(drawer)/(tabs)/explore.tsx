import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";

export default function TabTwoScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 8, color: '#1f2937' }}>
          Explore Hunts
        </Text>
        <Text style={{ fontSize: 16, color: '#6b7280', marginBottom: 24 }}>
          Discover and play scavenger hunts
        </Text>

        {/* Browse Hunts Card */}
        <Pressable
          onPress={() => router.push('/HuntDiscovery')}
          style={({ pressed }) => [
            styles.card,
            { opacity: pressed ? 0.7 : 1 }
          ]}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="search" size={32} color="#3b82f6" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Browse Hunts</Text>
            <Text style={styles.cardDescription}>
              Discover and start new scavenger hunts
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
        </Pressable>

        {/* My Active Hunts Card */}
        <Pressable
          onPress={() => router.push('/MyActiveHunts')}
          style={({ pressed }) => [
            styles.card,
            { opacity: pressed ? 0.7 : 1 }
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#dbeafe' }]}>
            <Ionicons name="play-circle" size={32} color="#2563eb" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>My Active Hunts</Text>
            <Text style={styles.cardDescription}>
              Continue your in-progress adventures
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
        </Pressable>

        {/* Completed Hunts Card */}
        <Pressable
          onPress={() => router.push('/MyCompletedHunts')}
          style={({ pressed }) => [
            styles.card,
            { opacity: pressed ? 0.7 : 1 }
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#d1fae5' }]}>
            <Ionicons name="checkmark-circle" size={32} color="#059669" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Completed Hunts</Text>
            <Text style={styles.cardDescription}>
              View your finished adventures
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
        </Pressable>

        {/* Info Section */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#3b82f6" />
          <Text style={styles.infoText}>
            Scavenger hunts use your location to guide you to exciting places. Make sure location permissions are enabled!
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    marginLeft: 12,
    lineHeight: 20,
  },
});
