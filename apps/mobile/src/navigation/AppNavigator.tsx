import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CowsScreen from '../screens/CowsScreen';
import CowFormScreen from '../screens/CowFormScreen';
import CowDetailScreen from '../screens/CowDetailScreen';
import HealthScreen from '../screens/HealthScreen';
import MilkFeedScreen from '../screens/MilkFeedScreen';
import HeatTrackingScreen from '../screens/HeatTrackingScreen';
import CalvesScreen from '../screens/CalvesScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Dashboard: 'dashboard',
  Cows: 'pets',
  Health: 'local-hospital',
  MilkFeed: 'local-drink',
  Settings: 'settings',
};

function MainTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#2E7D32' },
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#2E7D32',
        tabBarInactiveTintColor: '#999',
        tabBarIcon: ({ color, size }) =>
          route.name === 'Cows' ? (
            <MaterialCommunityIcons name="cow" size={size} color={color} />
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
        name="Cows"
        component={CowsScreen}
        options={{ title: t('cow.title'), tabBarLabel: t('cow.title') }}
      />
      <Tab.Screen
        name="Health"
        component={HealthScreen}
        options={{ title: t('health.title'), tabBarLabel: t('health.title') }}
      />
      <Tab.Screen
        name="MilkFeed"
        component={MilkFeedScreen}
        options={{ title: t('milk.title'), tabBarLabel: t('milk.title') }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('settings.title'), tabBarLabel: t('settings.title') }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#2E7D32' },
          headerTintColor: '#fff',
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
              name="HeatTracking"
              component={HeatTrackingScreen}
              options={{ title: 'Heat Tracking' }}
            />
            <Stack.Screen
              name="Calves"
              component={CalvesScreen}
              options={{ title: 'Calves & Bloodline' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
