import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme/colors';
import { initNotifications } from './src/services/notificationService';
import { SettingsProvider } from './src/state/SettingsContext';
import { HistoryProvider } from './src/state/HistoryContext';

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: 'transparent',
    primary: colors.primary,
    notification: colors.primary2,
  },
};

export default function App() {
  useEffect(() => {
    initNotifications().catch(() => {
      // Best-effort. App still works without permissions.
    });
  }, []);

  return (
    <SettingsProvider>
      <HistoryProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </HistoryProvider>
    </SettingsProvider>
  );
}
