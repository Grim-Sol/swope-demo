// src/theme/ThemeProvider.js
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { palette, type, radius, touch } from './tokens';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [pref, setPref] = useState('system'); // 'system' | 'light' | 'dark'

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('theme_pref');
      if (saved) setPref(saved);
    })();
  }, []);

  const setThemePref = async (p) => {
    setPref(p);
    await AsyncStorage.setItem('theme_pref', p);
    // TODO (après Auth): synchroniser dans Supabase (profiles.theme_pref)
  };

  const effective = pref === 'system' ? (systemScheme || 'light') : pref;
  const colors = effective === 'dark' ? palette.dark : palette.light;

  const value = useMemo(
    () => ({ pref, setThemePref, theme: effective, colors, type, radius, touch }),
    [pref, effective, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
