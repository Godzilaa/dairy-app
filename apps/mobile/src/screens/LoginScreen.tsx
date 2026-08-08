import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSignIn, useSignUp, useSSO } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import { COLORS } from '../theme';

// Finishes any pending OAuth session when the app returns from the browser.
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { t } = useTranslation();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { startSSOFlow } = useSSO();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Warm up the browser for a faster OAuth flow on Android.
  useEffect(() => {
    if (Platform.OS !== 'web') WebBrowser.warmUpAsync();
    return () => { if (Platform.OS !== 'web') WebBrowser.coolDownAsync(); };
  }, []);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({ strategy: 'oauth_google' });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err: any) {
      Alert.alert('Google sign-in failed', err?.errors?.[0]?.longMessage || err?.message || 'Please try again');
    } finally {
      setGoogleLoading(false);
    }
  };

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
        <Image source={require('../../assets/logo-full.png')} style={styles.logo} resizeMode="contain" />
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

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>{t('auth.or')}</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity
              style={[styles.googleBtn, googleLoading && styles.buttonDisabled]}
              onPress={handleGoogle}
              disabled={googleLoading}>
              {googleLoading ? (
                <ActivityIndicator color="#1B5E20" />
              ) : (
                <>
                  <MaterialCommunityIcons name="google" size={20} color="#DB4437" />
                  <Text style={styles.googleText}>{t('auth.continueWithGoogle')}</Text>
                </>
              )}
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
  logo: { width: 260, height: 100 },
  tagline: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4 },
  form: { gap: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#333' },
  hint: { fontSize: 13, color: '#666', marginTop: -6 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  button: {
    backgroundColor: '#1B5E20', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  switchText: { color: '#1B5E20', textAlign: 'center', marginTop: 16, fontSize: 14 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  divider: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  dividerText: { color: '#999', fontSize: 13 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, padding: 15, marginTop: 16,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  googleText: { color: '#333', fontSize: 16, fontWeight: '600' },
});
