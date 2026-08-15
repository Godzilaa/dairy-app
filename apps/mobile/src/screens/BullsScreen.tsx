import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, Alert, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { localBulls } from '../services/database';
import { COLORS, SHADOWS, RADIUS } from '../theme';

export default function BullsScreen() {
  const { t } = useTranslation();
  const [bulls, setBulls] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [breed, setBreed] = useState('');
  const [father, setFather] = useState('');
  const [mother, setMother] = useState('');
  const [dob, setDob] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { setBulls((await localBulls.getAll()) || []); } catch {}
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setName(''); setPhoto(null); setBreed(''); setFather(''); setMother(''); setDob('');
  };

  const pickPhoto = async (fromCamera: boolean) => {
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission needed', `Please allow ${fromCamera ? 'camera' : 'photo'} access.`); return; }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 })
        : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
      if (!result.canceled && result.assets?.[0]?.uri) setPhoto(result.assets[0].uri);
    } catch (err: any) { Alert.alert('Error', err.message); }
  };

  const choosePhoto = () => {
    Alert.alert(t('cow.photo'), undefined, [
      { text: t('cow.takePhoto'), onPress: () => pickPhoto(true) },
      { text: t('cow.choosePhoto'), onPress: () => pickPhoto(false) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Bull name is required'); return; }
    setSaving(true);
    try {
      await localBulls.create({
        name: name.trim(),
        photo: photo || undefined,
        breed: breed || undefined,
        father: father || undefined,
        mother: mother || undefined,
        dob: dob || undefined,
      });
      setModalVisible(false);
      resetForm();
      await load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      {item.photo ? (
        <Image source={{ uri: item.photo }} style={styles.thumb} />
      ) : (
        <View style={styles.thumbPlaceholder}><MaterialCommunityIcons name="cow" size={28} color="#A5D6A7" /></View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        {item.breed ? <Text style={styles.detail}>{t('bulls.breed')}: {item.breed}</Text> : null}
        <Text style={styles.detail}>{t('bulls.father')}: {item.father || '-'}</Text>
        <Text style={styles.detail}>{t('bulls.mother')}: {item.mother || '-'}</Text>
        {item.dob ? <Text style={styles.detail}>{t('bulls.dob')}: {item.dob}</Text> : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={bulls}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 96, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons name="cow" size={64} color="#C8E6C9" />
            <Text style={styles.emptyTitle}>{t('bulls.emptyTitle')}</Text>
            <Text style={styles.emptySub}>{t('bulls.emptySub')}</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => { resetForm(); setModalVisible(true); }}>
              <MaterialIcons name="add" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>{t('bulls.addBull')}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setModalVisible(true); }}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('bulls.addBull')}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TouchableOpacity style={styles.photoPicker} onPress={choosePhoto}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.photo} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <MaterialIcons name="add-a-photo" size={32} color="#1B5E20" />
                    <Text style={styles.photoHint}>{t('cow.addPhoto')}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>{t('bulls.name')} *</Text>
              <TextInput style={styles.modalInput} value={name} onChangeText={setName} placeholder="Bull name" />

              <Text style={styles.label}>{t('bulls.breed')} ({t('common.optional')})</Text>
              <TextInput style={styles.modalInput} value={breed} onChangeText={setBreed} placeholder="Gir, Malnadgidda, etc." />

              <Text style={styles.label}>{t('bulls.father')} ({t('common.optional')})</Text>
              <TextInput style={styles.modalInput} value={father} onChangeText={setFather} placeholder="Sire / father" />

              <Text style={styles.label}>{t('bulls.mother')} ({t('common.optional')})</Text>
              <TextInput style={styles.modalInput} value={mother} onChangeText={setMother} placeholder="Dam / mother" />

              <Text style={styles.label}>{t('bulls.dob')} ({t('common.optional')})</Text>
              <TextInput style={styles.modalInput} value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  card: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card },
  thumb: { width: 60, height: 60, borderRadius: 30, borderWidth: 1, borderColor: '#1B5E20' },
  thumbPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 4 },
  detail: { fontSize: 14, color: '#555', marginTop: 2 },
  emptyWrap: { alignItems: 'center', marginTop: 64, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#555', marginTop: 12 },
  emptySub: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: 6 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, marginTop: 16, ...SHADOWS.soft },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...SHADOWS.soft,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%', ...SHADOWS.card },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12 },
  photoPicker: { alignSelf: 'center', marginBottom: 8 },
  photo: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#1B5E20' },
  photoPlaceholder: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#E8F5E9',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#A5D6A7', borderStyle: 'dashed',
  },
  photoHint: { fontSize: 11, color: '#1B5E20', marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4, marginTop: 10 },
  modalInput: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md, padding: 12, fontSize: 15, borderWidth: 1, borderColor: COLORS.border },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#EEEEEE', alignItems: 'center' },
  cancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', ...SHADOWS.soft },
  saveText: { color: '#fff', fontWeight: '600' },
});
