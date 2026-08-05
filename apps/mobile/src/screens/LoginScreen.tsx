import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSignIn, useSignUp } from '@clerk/expo';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sign in with email + password, then convert it into an active session.
  const handleSignIn = async () => {
    const { error } = await signIn.password({ identifier: email, password });
    if (error) throw error;
    const { error: finalizeError } = await signIn.finalize();
    if (finalizeError) throw finalizeError;
  };

  // Start sign up → Clerk emails a verification code.
  const handleSignUp = async () => {
    const { error } = await signUp.password({ emailAddress: email, password });
    if (error) throw error;
    const { error: sendError } = await signUp.verifications.sendEmailCode();
    if (sendError) throw sendError;
    setPendingVerification(true);
  };

  // Confirm the emailed code → convert the sign-up into an active session.
  const handleVerify = async () => {
    const { error } = await signUp.verifications.verifyEmailCode({ code });
    if (error) throw error;
    const { error: finalizeError } = await signUp.finalize();
    if (finalizeError) throw finalizeError;
  };

  const runStep = async (fn: () => Promise<void>, fallback: string) => {
    setLoading(true);
    try {
      await fn();
    } catch (err: any) {
      Alert.alert('Error', err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || fallback);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (pendingVerification) {
      if (!code) return Alert.alert('Error', 'Enter the verification code');
      return runStep(handleVerify, 'Verification failed');
    }
    if (!email || !password) return Alert.alert('Error', 'Email and password are required');
    return runStep(mode === 'signin' ? handleSignIn : handleSignUp, 'Authentication failed');
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setPendingVerification(false);
    setCode('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.appName}>{t('app.name')}</Text>
        <Text style={styles.tagline}>{t('app.tagline')}</Text>
      </View>
      <View style={styles.form}>
        {pendingVerification ? (
          <>
            <Text style={styles.label}>Verification code</Text>
            <Text style={styles.hint}>We emailed a code to {email}</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              keyboardType="numeric"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={switchMode}>
              <Text style={styles.switchText}>
                {mode === 'signin'
                  ? "Don't have an account? Sign Up"
                  : 'Already have an account? Sign In'}
              </Text>
            </TouchableOpacity>
          </>
        )}
        {/* Required for sign-up flows on Expo web. Clerk skips the browser CAPTCHA on iOS and Android */}
        <View nativeID="clerk-captcha" />
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  appName: { fontSize: 32, fontWeight: 'bold', color: '#2E7D32' },
  tagline: { fontSize: 16, color: '#666', marginTop: 8 },
  form: { gap: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#333' },
  hint: { fontSize: 13, color: '#666', marginTop: -6 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  button: {
    backgroundColor: '#2E7D32', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  switchText: { color: '#2E7D32', textAlign: 'center', marginTop: 16, fontSize: 14 },
});
