import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { AuthProvider } from './context/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import { initDatabase } from './services/database';
import { usePoppins, applyGlobalPoppins } from './fonts';
import './i18n';

// Route every Text/TextInput through the Poppins family (weight-aware).
applyGlobalPoppins();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error('Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to apps/mobile/.env');
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fontsLoaded = usePoppins();

  const tryInit = useCallback(() => {
    setError(null);
    initDatabase()
      .then(() => setDbReady(true))
      .catch((err) => {
        console.error('DB init failed:', err);
        setError(err?.message || String(err));
      });
  }, []);

  useEffect(() => { tryInit(); }, [tryInit]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Couldn't open the local database.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={tryInit}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!dbReady || !fontsLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppNavigator />
          <StatusBar style="light" />
        </AuthProvider>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1B5E20' },
  loadingText: { color: '#fff', fontSize: 20, fontWeight: '600', marginTop: 16 },
  errorText: { color: '#fff', fontSize: 16, textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: { marginTop: 20, backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 32, paddingVertical: 12 },
  retryText: { color: '#1B5E20', fontSize: 16, fontWeight: '700' },
});