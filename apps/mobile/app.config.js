module.exports = {
  expo: {
    name: 'Dairy Manager',
    slug: 'dairy-manager',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: { backgroundColor: '#2E7D32' },
    assetBundlePatterns: ['**/*'],
    android: {
      package: 'com.dairy.manager',
      adaptiveIcon: { backgroundColor: '#2E7D32' },
    },
    plugins: [
      ['expo-camera', { cameraPermission: 'Allow access to scan Pashu Aadhar tags.' }],
      ['expo-sqlite'],
    ],
  },
};
