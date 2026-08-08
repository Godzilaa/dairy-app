import React, { useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, Platform, StyleProp, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDate, toISODate, parseISO } from '../utils/date';

type Props = {
  value: string;                       // ISO YYYY-MM-DD ('' when unset)
  onChange: (iso: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;        // lets each screen match its input styling
};

// A tap-to-open calendar date picker. Displays DD/MM/YYYY, emits ISO.
export default function DateField({ value, onChange, placeholder = 'DD/MM/YYYY', style }: Props) {
  const [show, setShow] = useState(false);

  return (
    <>
      <TouchableOpacity style={[styles.field, style]} activeOpacity={0.7} onPress={() => setShow(true)}>
        <Text style={value ? styles.text : styles.placeholder}>
          {value ? formatDate(value) : placeholder}
        </Text>
        <MaterialIcons name="event" size={20} color="#1B5E20" />
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={parseISO(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
          onChange={(event, date) => {
            // Android fires once and dismisses itself; iOS stays open until reselect.
            if (Platform.OS !== 'ios') setShow(false);
            if (event.type === 'set' && date) onChange(toISODate(date));
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
