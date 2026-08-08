import React, { useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, Platform, StyleProp, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

type Props = {
  value: string;                       // 'HH:MM' or ''
  onChange: (time: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
};

const pad = (n: number) => String(n).padStart(2, '0');

// Tap-to-pick a clock time, stored/displayed as 24h HH:MM.
export default function TimeField({ value, onChange, placeholder = 'HH:MM (optional)', style }: Props) {
  const [show, setShow] = useState(false);

  const base = new Date();
  if (value) {
    const [h, m] = value.split(':').map(Number);
    if (!isNaN(h)) base.setHours(h, m || 0, 0, 0);
  }

  return (
    <>
      <TouchableOpacity style={[styles.field, style]} activeOpacity={0.7} onPress={() => setShow(true)}>
        <Text style={value ? styles.text : styles.placeholder}>{value || placeholder}</Text>
        <MaterialIcons name="schedule" size={20} color="#1B5E20" />
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={base}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
          onChange={(event, date) => {
            if (Platform.OS !== 'ios') setShow(false);
            if (event.type === 'set' && date) onChange(`${pad(date.getHours())}:${pad(date.getMinutes())}`);
            else if (event.type === 'dismissed') setShow(false);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E0E0E0',
  },
  text: { fontSize: 16, color: '#333' },
  placeholder: { fontSize: 16, color: '#999' },
});
