import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CowsScreen from '../screens/CowsScreen';
import CowFormScreen from '../screens/CowFormScreen';
import CowDetailScreen from '../screens/CowDetailScreen';
import HealthScreen from '../screens/HealthScreen';
import MilkFeedScreen from '../screens/MilkFeedScreen';
import ReproductionScreen from '../screens/ReproductionScreen';
import CalvesScreen from '../screens/CalvesScreen';
import InsuranceScreen from '../screens/InsuranceScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabIcon = ({ label, focused }: { label: string; focused: boolean }) => {
  const icons: any = {
    Dashboard: '📊',
    Cows: '🐄',
    Health: '💊',
    'Milk & Feed': '🥛',
    Settings: '⚙️',
  };
  return (
    <React.Fragment>
      {/* Using text emoji as simple icons */}
      <React.Fragment />
    </React.Fragment>
  );
};

function MainTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#2E7D32' },
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#2E7D32',
        tabBarInactiveTintColor: '#999',
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: t('dashboard.title'),
          tabBarLabel: t('dashboard.title'),
          tabBarIcon: ({ color }) => null,
        }}
      />
      <Tab.Screen
        name="Cows"
        component={CowsScreen}
        options={{
          title: t('cow.title'),
          tabBarLabel: t('cow.title'),
          tabBarIcon: ({ color }) => null,
        }}
      />
      <Tab.Screen
        name="Health"
        component={HealthScreen}
        options={{
          title: t('health.title'),
          tabBarLabel: t('health.title'),
          tabBarIcon: ({ color }) => null,
        }}
      />
      <Tab.Screen
        name="MilkFeed"
        component={MilkFeedScreen}
        options={{
          title: t('milk.title'),
          tabBarLabel: t('milk.title'),
          tabBarIcon: ({ color }) => null,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t('settings.title'),
          tabBarLabel: t('settings.title'),
          tabBarIcon: ({ color }) => null,
        }}
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
              name="Reproduction"
              component={ReproductionScreen}
              options={{ title: 'Reproduction' }}
            />
            <Stack.Screen
              name="Calves"
              component={CalvesScreen}
              options={{ title: 'Calves & Bloodline' }}
            />
            <Stack.Screen
              name="Insurance"
              component={InsuranceScreen}
              options={{ title: 'Insurance' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
