import React, { useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';

interface CrossPlatformDateTimePickerProps {
  value: Date;
  mode: 'date' | 'time' | 'datetime';
  onChange: (event: any, selectedDate?: Date) => void;
  is24Hour?: boolean;
  display?: 'default' | 'spinner' | 'clock' | 'calendar';
}

export default function CrossPlatformDateTimePicker({
  value,
  mode,
  onChange,
  is24Hour = true,
  display = 'default'
}: CrossPlatformDateTimePickerProps) {

  if (Platform.OS === 'web') {
    const formatTime = (date: Date) => {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    const handleWebChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (mode === 'time') {
        const [hours, minutes] = event.target.value.split(':');
        const newDate = new Date(value);
        newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        onChange(null, newDate);
      } else if (mode === 'date') {
        const newDate = new Date(event.target.value);
        onChange(null, newDate);
      }
    };

    if (mode === 'time') {
      return (
        <input
          type="time"
          value={formatTime(value)}
          onChange={handleWebChange}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backgroundColor: 'white',
            width: '100%'
          }}
        />
      );
    }

    if (mode === 'date') {
      return (
        <input
          type="date"
          value={formatDate(value)}
          onChange={handleWebChange}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backgroundColor: 'white',
            width: '100%'
          }}
        />
      );
    }

    return <Text>DateTime mode not supported on web</Text>;
  }

  // For mobile platforms, use the native component
  const DateTimePicker = require('@react-native-community/datetimepicker').default;
  
  return (
    <DateTimePicker
      value={value}
      mode={mode}
      is24Hour={is24Hour}
      display={display}
      onChange={onChange}
    />
  );
}