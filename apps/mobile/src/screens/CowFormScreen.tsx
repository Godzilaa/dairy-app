import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import { localCows } from '../services/database';
import { lookupPashuAadhar } from '../services/pashuAadharApi';
import PashuAadharScanner from '../components/PashuAadharScanner';

export default function CowFormScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const editCow = route.params?.cow;

  const [name, setName] = useState(editCow?.name || '');
  const [breed, setBreed] = useState(editCow?.breed || '');
  const [pashuAadhar, setPashuAadhar] = useState(editCow?.pashuAadhar || '');
  const [dob, setDob] = useState(editCow?.dob || '');
  const [mother, setMother] = useState(editCow?.mother || '');
  const [father, setFather] = useState(editCow?.father || '');
  const [method, setMethod] = useState(editCow?.registrationMethod || '');
  const [cowId, setCowId] = useState(editCow?.cowId || '');
  const [loading, setLoading] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  useEffect(() => {
    if (!editCow) {
      localCows.getNextId().then((id) => setCowId(id)).catch(() => {});
    }
  }, []);

  const handleScan = async (tagId: string) => {
    setScannerVisible(false);
    setPashuAadhar(tagId);
    setLookingUp(true);

    try {
      const data = await lookupPashuAadhar(tagId);
      if (data) {
        if (data.breed && !breed) setBreed(data.breed);
        if (data.name && !name) setName(data.name);
        if (data.dob && !dob) setDob(data.dob);
        if (data.species) {
          Alert.alert('Found', `${data.species} - ${data.breed || ''}\nOwner: ${data.ownerName || 'Unknown'}`);
        }
      }
    } catch {} finally {
      setLookingUp(false);
    }
  };

  const handleSave = async () => {
    if (!name || !breed) {
      Alert.alert('Error', 'Name and breed are required');
      return;
    }
    setLoading(true);
    try {
      const data = {
        cowId,
        name,
        breed,
        pashuAadhar: pashuAadhar || undefined,
        dob: dob || undefined,
        mother: mother || undefined,
        father: father || undefined,
        registrationMethod: method || undefined,
      };
      if (editCow) {
        await localCows.update(editCow.id, data);
      } else {
        await localCows.create(data);
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <MaterialIcons name="add-circle-outline" size={24} color="#2E7D32" />
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#333' }}>{editCow ? 'Edit Cow' : 'Register Cow'}</Text>
      </View>
      <Text style={styles.label}>{t('cow.cowId')}</Text>
      <TextInput style={styles.input} value={cowId} editable={false} />

      <Text style={styles.label}>{t('cow.name')} *</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>{t('cow.breed')} *</Text>
      <TextInput style={styles.input} value={breed} onChangeText={setBreed} placeholder="Gir, Malnadgidda, etc." />

      <Text style={styles.label}>{t('cow.pashuAadhar')}</Text>
      <View style={styles.tagRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={pashuAadhar}
          onChangeText={setPashuAadhar}
          placeholder="12-16 digit tag number"
          maxLength={16}
          keyboardType="numeric"
        />
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => setScannerVisible(true)}>
          <Text style={styles.scanBtnText}>{t('cow.scanTag')}</Text>
        </TouchableOpacity>
      </View>
      {lookingUp && <Text style={styles.hint}>Looking up tag in national database...</Text>}
      {pashuAadhar.length >= 12 && (
        <TouchableOpacity
          style={styles.lookupBtn}
          onPress={async () => {
            setLookingUp(true);
            try {
              const data = await lookupPashuAadhar(pashuAadhar);
              if (data) {
                if (data.breed && !breed) setBreed(data.breed);
                if (data.name && !name) setName(data.name);
              }
            } catch {} finally {
              setLookingUp(false);
            }
          }}>
          <Text style={styles.lookupBtnText}>{t('common.search') || 'Lookup'}</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.label}>{t('cow.dob')}</Text>
      <TextInput style={styles.input} value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" />

      <Text style={styles.label}>{t('cow.mother')}</Text>
      <TextInput style={styles.input} value={mother} onChangeText={setMother} />

      <Text style={styles.label}>{t('cow.father')}</Text>
      <TextInput style={styles.input} value={father} onChangeText={setFather} />

      <Text style={styles.label}>{t('cow.registrationMethod')}</Text>
      <TextInput style={styles.input} value={method} onChangeText={setMethod} placeholder="AI / NATURAL" />

      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('common.save')}</Text>}
      </TouchableOpacity>

      <PashuAadharScanner
        visible={scannerVisible}
        onScan={handleScan}
        onClose={() => setScannerVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#E0E0E0',
  },
  tagRow: { flexDirection: 'row', gap: 10 },
  scanBtn: {
    backgroundColor: '#1565C0', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center',
  },
  scanBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  hint: { fontSize: 12, color: '#1565C0', marginTop: 4 },
  lookupBtn: {
    backgroundColor: '#E3F2FD', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 8,
  },
  lookupBtnText: { color: '#1565C0', fontSize: 14, fontWeight: '600' },
  button: {
    backgroundColor: '#2E7D32', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 48,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
