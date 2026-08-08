// Makes Poppins the global typeface while preserving the app's existing
// fontWeight hierarchy. React Native ignores fontWeight when a custom
// fontFamily is set, so we translate each weight to the matching Poppins cut.
import { Text, TextInput, StyleSheet } from 'react-native';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

export const poppinsFonts = {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
};

export const usePoppins = () => {
  const [loaded] = useFonts(poppinsFonts);
  return loaded;
};

const familyForWeight = (weight?: string | number): string => {
  switch (String(weight)) {
    case 'bold':
    case '700':
    case '800':
    case '900':
      return 'Poppins_700Bold';
    case '600':
      return 'Poppins_600SemiBold';
    case '500':
      return 'Poppins_500Medium';
    default:
      return 'Poppins_400Regular';
  }
};

let patched = false;

// Patch Text/TextInput once so every label renders in the correct Poppins weight
// without touching each screen's StyleSheet.
export const applyGlobalPoppins = () => {
  if (patched) return;
  patched = true;

  for (const Component of [Text, TextInput] as any[]) {
    const original = Component.render;
    if (typeof original !== 'function') continue;
    Component.render = function (...args: any[]) {
      const element = original.apply(this, args);
      const flat = StyleSheet.flatten(element.props.style) || {};
      // Respect an explicitly-set custom fontFamily; otherwise inject Poppins.
      const family = flat.fontFamily || familyForWeight(flat.fontWeight);
      return {
        ...element,
        props: {
          ...element.props,
          style: [{ fontFamily: family }, element.props.style, { fontWeight: undefined as any }],
        },
      };
    };
  }
};
