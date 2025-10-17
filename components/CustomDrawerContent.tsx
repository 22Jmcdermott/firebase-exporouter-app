import React from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { DrawerContentScrollView, DrawerItemList, DrawerContentComponentProps } from "@react-navigation/drawer";
import { useSession } from "@/context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

/**
 * Custom drawer content component that adds logout functionality
 * to the standard drawer menu
 */
export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { user, signOut } = useSession();

  /**
   * Handles user sign out with confirmation
   */
  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
              router.replace("/sign-in");
            } catch (error: any) {
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          },
        },
      ]
    );
  };

  /**
   * Gets the display name for the user
   */
  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      {/* User Info Section */}
      <View className="p-4 border-b border-gray-200 bg-blue-50">
        <View className="flex-row items-center">
          <View className="w-12 h-12 bg-blue-600 rounded-full items-center justify-center mr-3">
            <Text className="text-lg font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-800">
              {displayName}
            </Text>
            <Text className="text-sm text-gray-600">
              {user?.email}
            </Text>
          </View>
        </View>
      </View>

      {/* Standard Drawer Items */}
      <View className="flex-1">
        <DrawerItemList {...props} />
      </View>

      {/* Logout Section */}
      <View className="border-t border-gray-200 p-4">
        <Pressable
          onPress={handleSignOut}
          className="flex-row items-center p-3 rounded-lg active:bg-red-50"
        >
          <Ionicons name="log-out-outline" size={24} color="#dc2626" />
          <Text className="ml-3 text-base font-medium text-red-600">
            Sign Out
          </Text>
        </Pressable>
      </View>
    </DrawerContentScrollView>
  );
}