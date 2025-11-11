import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

interface CrossPlatformCheckBoxProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  color?: string;
}

export default function CrossPlatformCheckBox({ 
  value, 
  onValueChange, 
  disabled = false,
  color = '#007AFF'
}: CrossPlatformCheckBoxProps) {
  
  if (Platform.OS === 'web') {
    return (
      <Pressable
        onPress={() => !disabled && onValueChange(!value)}
        className={`w-5 h-5 rounded border-2 items-center justify-center ${
          value 
            ? 'bg-blue-500 border-blue-500' 
            : 'border-gray-400'
        } ${disabled ? 'opacity-50' : ''}`}
        style={{ opacity: disabled ? 0.5 : 1 }}
      >
        {value && (
          <Text className="text-white text-xs font-bold">✓</Text>
        )}
      </Pressable>
    );
  }

  // For mobile platforms, use the native component
  const CheckBox = require('@react-native-community/checkbox').default;
  
  return (
    <CheckBox
      disabled={disabled}
      value={value}
      onValueChange={onValueChange}
      tintColor={color}
      onCheckColor={color}
      onTintColor={color}
    />
  );
}