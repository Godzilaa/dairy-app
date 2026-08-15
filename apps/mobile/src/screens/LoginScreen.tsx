import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useSignIn, useSignUp, useSSO } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import { COLORS, FONTS, RADIUS } from '../theme';

// Finishes any pending OAuth session when the app returns from the browser.
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
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
  const [focused, setFocused] = useState<string | null>(null);

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

  // Headline copy adapts to the moment the farmer is in.
  const heading = pendingVerification
    ? 'Check your email'
    : mode === 'signin'
      ? 'Welcome back'
      : 'Create your account';
  const subheading = pendingVerification
    ? `We sent a 6-digit code to ${email}`
    : mode === 'signin'
      ? 'Sign in to manage your herd.'
      : 'Start managing your dairy in minutes.';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      {/* Ambient pasture glow behind the card. */}
      <View pointerEvents="none" style={styles.glow} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {/* The banner's white background melts into the white card — framed, not floating. */}
          <Image source={require('../../assets/logo-full.png')} style={styles.logo} resizeMode="contain" />
          <View style={styles.goldRule} />

          <Text style={styles.heading}>{heading}</Text>
          <Text style={styles.subheading}>{subheading}</Text>

          <View style={styles.form}>
            {pendingVerification ? (
              <>
                <Text style={styles.label}>Verification code</Text>
                <TextInput
                  style={[styles.input, styles.codeInput, focused === 'code' && styles.inputFocused]}
                  value={code}
                  onChangeText={setCode}
                  onFocus={() => setFocused('code')}
                  onBlur={() => setFocused(null)}
                  placeholder="123456"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}>
                  {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Verify email</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, focused === 'email' && styles.inputFocused]}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={[styles.input, focused === 'password' && styles.inputFocused]}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry
                />
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.buttonText}>{mode === 'signin' ? 'Sign in' : 'Create account'}</Text>
                  )}
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
                    <ActivityIndicator color={COLORS.primary} />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="google" size={20} color="#DB4437" />
                      <Text style={styles.googleText}>{t('auth.continueWithGoogle')}</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={switchMode} style={styles.switchWrap}>
                  <Text style={styles.switchText}>
                    {mode === 'signin' ? "New to Gopala? " : 'Already have an account? '}
                    <Text style={styles.switchLink}>{mode === 'signin' ? 'Create one' : 'Sign in'}</Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {/* Required for sign-up flows on Expo web. Clerk skips the browser CAPTCHA on iOS and Android */}
            <View nativeID="clerk-captcha" />
          </View>
        </View>

        <Text style={styles.footnote}>{t('app.tagline')}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryDark },
  glow: {
    position: 'absolute', top: -120, alignSelf: 'center',
    width: 460, height: 460, borderRadius: 230,
    backgroundColor: COLORS.primary, opacity: 0.55,
  },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    // Lifted off the green canvas.
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  logo: { width: '100%', height: 84, alignSelf: 'center' },
  // Milk-gold hairline — the one accent, referencing milk against pasture.
  goldRule: {
    width: 44, height: 3, borderRadius: 2, alignSelf: 'center',
    backgroundColor: COLORS.gold, marginTop: 18, marginBottom: 20,
  },
  heading: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.primaryDark, textAlign: 'center' },
  subheading: {
    fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textSecondary,
    textAlign: 'center', marginTop: 6, marginBottom: 22,
  },
  form: { gap: 8 },
  label: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textPrimary, marginTop: 6 },
  input: {
    backgroundColor: COLORS.bg, borderRadius: RADIUS.md, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, fontFamily: FONTS.regular, color: COLORS.textPrimary,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  inputFocused: { borderColor: COLORS.primary, backgroundColor: COLORS.greenTint },
  codeInput: { textAlign: 'center', letterSpacing: 8, fontSize: 20 },
  button: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 16,
    alignItems: 'center', marginTop: 16,
    shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: COLORS.white, fontSize: 16, fontFamily: FONTS.semibold, letterSpacing: 0.3 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
  divider: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textMuted, fontSize: 12, fontFamily: FONTS.medium, textTransform: 'uppercase', letterSpacing: 1 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, paddingVertical: 14,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  googleText: { color: COLORS.textPrimary, fontSize: 15, fontFamily: FONTS.semibold },
  switchWrap: { marginTop: 22, alignItems: 'center' },
  switchText: { color: COLORS.textSecondary, fontSize: 14, fontFamily: FONTS.regular },
  switchLink: { color: COLORS.primary, fontFamily: FONTS.semibold },
  footnote: {
    color: COLORS.greenLight, opacity: 0.85, fontSize: 12, fontFamily: FONTS.medium,
    textAlign: 'center', marginTop: 24, letterSpacing: 0.5,
  },
});
