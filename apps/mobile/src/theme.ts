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

  // Neutrals — a warm, faintly green-tinted canvas ("pasture haze") reads far
  // less clinical than a flat cold grey, and ties the whole app to the brand green.
  bg: '#F1F5EE',           // app background (warm off-white with a green cast)
  surface: '#FFFFFF',
  surfaceAlt: '#F7FAF5',   // inset fields / subtle zebra rows
  border: '#E4E9DF',       // hairline (green-grey, softer than #E0E0E0)
  textPrimary: '#26302A',  // near-black with a warm green undertone
  textSecondary: '#5C6B60',
  textMuted: '#9BA89E',
  white: '#FFFFFF',
} as const;

// Soft, green-tinted elevation. Replaces harsh flat `elevation` with a diffuse
// shadow so cards feel lifted rather than stamped on. Spread onto a style object.
export const SHADOWS = {
  card: {
    shadowColor: '#1C3A22',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  soft: {
    shadowColor: '#1C3A22',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
} as const;

// 4-based spacing scale for consistent rhythm.
export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

// Poppins is the brand typeface (SemiBold for headings). Falls back to the
// system font until the font assets load. Family names match @expo-google-fonts/poppins.
export const FONTS = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

export const RADIUS = { sm: 10, md: 14, lg: 20, xl: 24, pill: 999 } as const;

export type Colors = typeof COLORS;
