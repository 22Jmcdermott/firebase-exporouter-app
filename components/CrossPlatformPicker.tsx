import React from 'react';
import { Platform, View } from 'react-native';

interface PickerItem {
  label: string;
  value: string;
}

interface CrossPlatformPickerProps {
  selectedValue: string;
  onValueChange: (value: string) => void;
  children: React.ReactElement<PickerItem>[];
  style?: any;
  enabled?: boolean;
}

interface CrossPlatformPickerItemProps {
  label: string;
  value: string;
}

export function CrossPlatformPickerItem({ label, value }: CrossPlatformPickerItemProps) {
  return null; // This is just for type inference
}

export default function CrossPlatformPicker({
  selectedValue,
  onValueChange,
  children,
  style,
  enabled = true
}: CrossPlatformPickerProps) {

  if (Platform.OS === 'web') {
    return (
      <select
        value={selectedValue}
        onChange={(e) => onValueChange(e.target.value)}
        disabled={!enabled}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '16px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: enabled ? 'white' : '#f3f4f6',
          color: enabled ? 'black' : '#6b7280',
          ...style
        }}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return (
              <option key={child.props.value} value={child.props.value}>
                {child.props.label}
              </option>
            );
          }
          return null;
        })}
      </select>
    );
  }

  // For mobile platforms, use the native component
  const { Picker } = require('@react-native-picker/picker');
  
  return (
    <Picker
      selectedValue={selectedValue}
      onValueChange={onValueChange}
      style={style}
      enabled={enabled}
    >
      {children}
    </Picker>
  );
}

// Create PickerItem component for mobile compatibility
CrossPlatformPicker.Item = function PickerItem({ label, value }: CrossPlatformPickerItemProps) {
  if (Platform.OS === 'web') {
    return null; // Handled in parent component for web
  }
  
  const { Picker } = require('@react-native-picker/picker');
  return <Picker.Item label={label} value={value} />;
};