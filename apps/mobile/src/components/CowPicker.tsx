import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, FlatList, Image, StyleProp, ViewStyle,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { localCows } from '../services/database';

type Props = {
  value: string;                     // selected cowId
  onChange: (cowId: string) => void;
  style?: StyleProp<ViewStyle>;
  placeholder?: string;
  disabled?: boolean;                // e.g. cow is fixed while editing a record
};

// Tap to pick a cow from a searchable list (ID + name + photo) instead of typing
// the Cow ID by hand — avoids typos that create orphaned records.
export default function CowPicker({ value, onChange, style, placeholder = 'Select a cow', disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [cows, setCows] = useState<any[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => { if (open) localCows.getAll().then(setCows).catch(() => {}); }, [open]);

  const term = q.trim().toLowerCase();
  const filtered = cows.filter((c) =>
    !term || c.cowId?.toLowerCase().includes(term) || c.name?.toLowerCase().includes(term));
  const selected = cows.find((c) => c.cowId === value);
  const label = value ? `${value}${selected?.name ? ` · ${selected.name}` : ''}` : placeholder;

  return (
    <>
      <TouchableOpacity
        style={[styles.field, style, disabled && styles.disabled]}
        activeOpacity={0.7}
        disabled={disabled}
        onPress={() => setOpen(true)}>
        <Text style={value ? styles.text : styles.placeholder} numberOfLines={1}>{label}</Text>
        {!disabled && <MaterialIcons name="arrow-drop-down" size={22} color="#1B5E20" />}
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select cow</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.search}
              placeholder="Search by ID or name"
              value={q}
              onChangeText={setQ}
              autoCapitalize="none"
            />
            <FlatList
              data={filtered}
              keyExtractor={(c) => c.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.empty}>No cows found. Add a cow first.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.row} onPress={() => { onChange(item.cowId); setQ(''); setOpen(false); }}>
                  {item.photo ? (
                    <Image source={{ uri: item.photo }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPh}><MaterialCommunityIcons name="cow" size={20} color="#A5D6A7" /></View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowId}>{item.cowId}</Text>
                    <Text style={styles.rowName} numberOfLines={1}>{item.name}{item.breed ? ` · ${item.breed}` : ''}</Text>
                  </View>
                  {value === item.cowId && <MaterialIcons name="check" size={20} color="#1B5E20" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E0E0E0',
  },
  disabled: { backgroundColor: '#F0F0F0' },
  text: { fontSize: 16, color: '#333', flex: 1 },
  placeholder: { fontSize: 16, color: '#999', flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '75%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  search: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#1B5E20' },
  avatarPh: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  rowId: { fontSize: 15, fontWeight: '700', color: '#1B5E20' },
  rowName: { fontSize: 13, color: '#666' },
  empty: { textAlign: 'center', color: '#999', marginTop: 30 },
});
