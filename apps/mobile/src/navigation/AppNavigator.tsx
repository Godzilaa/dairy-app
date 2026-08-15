import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme';

import SyncChip from '../components/SyncChip';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CowsScreen from '../screens/CowsScreen';
import CowFormScreen from '../screens/CowFormScreen';
import CowDetailScreen from '../screens/CowDetailScreen';
import HealthScreen from '../screens/HealthScreen';
import MilkScreen from '../screens/MilkScreen';
import FeedScreen from '../screens/FeedScreen';
import HeatTrackingScreen from '../screens/HeatTrackingScreen';
import CalvesScreen from '../screens/CalvesScreen';
import BullsScreen from '../screens/BullsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import RemindersScreen from '../screens/RemindersScreen';
import MilkChartScreen from '../screens/MilkChartScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Dashboard: 'dashboard',
  HeatTracking: 'favorite',
  Health: 'local-hospital',
  MilkFeed: 'local-drink',
  Reminders: 'notifications-active',
  Settings: 'settings',
};

function MainTabs() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [milkFeedChooser, setMilkFeedChooser] = useState(false);

  // The Milk & Feed tab doesn't navigate — it pops a chooser so the farmer picks
  // whether to log Milk or Feed, each of which is its own screen.
  const chooseLog = (target: 'Milk' | 'Feed') => {
    setMilkFeedChooser(false);
    navigation.navigate(target);
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: COLORS.white,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          headerRight: () => <SyncChip />,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarStyle: { backgroundColor: COLORS.surface, borderTopColor: COLORS.border, paddingTop: 4 },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          tabBarIcon: ({ color, size }) =>
            route.name === 'MilkFeed' ? (
              // Milk in a cup with a drop — closest built-in to "udder dropping milk".
              <MaterialCommunityIcons name="cup-water" size={size} color={color} />
            ) : (
              <MaterialIcons name={TAB_ICONS[route.name]} size={size} color={color} />
            ),
        })}>
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: t('dashboard.title'), tabBarLabel: t('dashboard.title') }}
        />
        <Tab.Screen
          name="HeatTracking"
          component={HeatTrackingScreen}
          options={{ title: t('heat.title'), tabBarLabel: t('heat.title') }}
        />
        <Tab.Screen
          name="Health"
          component={HealthScreen}
          options={{ title: t('health.title'), tabBarLabel: t('health.title') }}
        />
        <Tab.Screen
          name="MilkFeed"
          component={MilkScreen}
          options={{ title: t('milk.title'), tabBarLabel: t('milk.title') }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setMilkFeedChooser(true);
            },
          }}
        />
        <Tab.Screen
          name="Reminders"
          component={RemindersScreen}
          options={{ title: t('reminders.title'), tabBarLabel: t('reminders.title') }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: t('settings.title'), tabBarLabel: t('settings.title') }}
        />
      </Tab.Navigator>

      {/* Milk / Feed chooser opened from the Milk & Feed tab. */}
      <Modal visible={milkFeedChooser} animationType="slide" transparent onRequestClose={() => setMilkFeedChooser(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setMilkFeedChooser(false)}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>{t('milk.chooseLog')}</Text>
            {([
              { key: 'Milk', label: t('milk.milkOnly'), icon: 'cup-water' as const, color: '#E08A00' },
              { key: 'Feed', label: t('feed.title'), icon: 'grain' as const, color: '#8D5E34' },
            ] as const).map((opt) => (
              <TouchableOpacity key={opt.key} style={styles.pickerRow} onPress={() => chooseLog(opt.key)}>
                <View style={[styles.pickerIcon, { backgroundColor: opt.color }]}>
                  <MaterialCommunityIcons name={opt.icon} size={22} color="#fff" />
                </View>
                <Text style={styles.pickerLabel}>{opt.label}</Text>
                <MaterialIcons name="chevron-right" size={24} color="#BDBDBD" />
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: COLORS.white,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
        }}>
        {!isAuthenticated ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Cows"
              component={CowsScreen}
              options={{ title: 'Cows' }}
            />
            <Stack.Screen
              name="CowForm"
              component={CowFormScreen}
              options={{ title: 'Add / Edit Cow' }}
            />
            <Stack.Screen
              name="CowDetail"
              component={CowDetailScreen}
              options={{ title: 'Cow Details' }}
            />
            <Stack.Screen
              name="Milk"
              component={MilkScreen}
              options={{ title: 'Milk' }}
            />
            <Stack.Screen
              name="Feed"
              component={FeedScreen}
              options={{ title: 'Feed' }}
            />
            <Stack.Screen
              name="Calves"
              component={CalvesScreen}
              options={{ title: 'Calves & Bloodline' }}
            />
            <Stack.Screen
              name="Bulls"
              component={BullsScreen}
              options={{ title: 'Bulls' }}
            />
            <Stack.Screen
              name="MilkChart"
              component={MilkChartScreen}
              options={{ title: 'Milk Line Graph' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  pickerHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', marginBottom: 14 },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  pickerIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pickerLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#333' },
});
