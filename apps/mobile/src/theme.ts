// Gopala brand system — Smart Dairy & Cattle Management.
// Single source of truth for colour, typography and spacing.
// Palette taken directly from the brand sheet.

export const COLORS = {
  // Core greens
  primary: '#1B5E20',       // deep forest green — headers, primary actions
  primaryDark: '#0F3D14',   // pressed / splash
  green: '#43A047',         // secondary green
  greenLight: '#8BC34A',    // fresh / natural accent
  greenTint: '#E8F5E9',     // subtle backgrounds, "today" cells

  // Accents
  gold: '#F2C94C',          // milk / highlights
  brown: '#8D5E34',         // cattle / earthy accent
  blue: '#1565C0',          // treatment
  pink: '#C2185B',          // heat
  red: '#C62828',           // destructive

  // Neutrals
  bg: '#F6F6F6',            // app background
  surface: '#FFFFFF',
  border: '#E0E0E0',
  textPrimary: '#333333',
  textSecondary: '#666666',
  textMuted: '#999999',
  white: '#FFFFFF',
} as const;

// Poppins is the brand typeface (SemiBold for headings). Falls back to the
// system font until the font assets load. Family names match @expo-google-fonts/poppins.
export const FONTS = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

export const RADIUS = { sm: 8, md: 12, lg: 20 } as const;

export type Colors = typeof COLORS;
