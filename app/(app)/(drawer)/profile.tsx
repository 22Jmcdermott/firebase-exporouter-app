import { useSession } from "@/context";
import React from "react";
import { View, Text } from "react-native";

const ProfileScreen = () => {
  // ============================================================================
  // Hooks
  // ============================================================================
  const { user } = useSession();

  // ============================================================================
  // Computed Values
  // ============================================================================

  /**
   * Gets the display name for the welcome message
   * Prioritizes user's name, falls back to email, then default greeting
   */
  const displayName =
    user?.displayName || user?.email?.split("@")[0] || "Guest";

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <View className="flex-1 p-4 bg-gray-50">
      {/* Header */}
      <View className="items-center mb-8 mt-4">
        <View className="w-20 h-20 bg-blue-600 rounded-full items-center justify-center mb-4">
          <Text className="text-2xl font-bold text-white">
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text className="text-2xl font-bold text-gray-800">
          Welcome, {displayName}!
        </Text>
      </View>

      {/* User Info Card */}
      <View className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <Text className="text-lg font-semibold text-gray-800 mb-4">
          Account Information
        </Text>
        
        <View className="space-y-3">
          <View>
            <Text className="text-sm font-medium text-gray-500">Name</Text>
            <Text className="text-base text-gray-800 mt-1">
              {user?.displayName || "Not set"}
            </Text>
          </View>
          
          <View>
            <Text className="text-sm font-medium text-gray-500">Email</Text>
            <Text className="text-base text-gray-800 mt-1">
              {user?.email}
            </Text>
          </View>
          
          <View>
            <Text className="text-sm font-medium text-gray-500">User ID</Text>
            <Text className="text-base text-gray-800 mt-1 font-mono text-xs">
              {user?.uid}
            </Text>
          </View>
          
          <View>
            <Text className="text-sm font-medium text-gray-500">Last Sign In</Text>
            <Text className="text-base text-gray-800 mt-1">
              {user?.metadata?.lastSignInTime ? 
                new Date(user.metadata.lastSignInTime).toLocaleString() : 
                "Unknown"}
            </Text>
          </View>
          
          <View>
            <Text className="text-sm font-medium text-gray-500">Account Created</Text>
            <Text className="text-base text-gray-800 mt-1">
              {user?.metadata?.creationTime ? 
                new Date(user.metadata.creationTime).toLocaleString() : 
                "Unknown"}
            </Text>
          </View>
        </View>
      </View>

      {/* Note about logout */}
      <View className="bg-blue-50 p-4 rounded-lg">
        <Text className="text-blue-800 text-center text-sm">
          💡 To sign out, use the logout option in the drawer menu (☰)
        </Text>
      </View>
    </View>
  );
};

export default ProfileScreen;
