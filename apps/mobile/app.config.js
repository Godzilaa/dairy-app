module.exports = {
  expo: {
    name: 'Dairy Manager',
    slug: 'dairy-management',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: { backgroundColor: '#2E7D32' },
    assetBundlePatterns: ['**/*'],
    android: {
      package: 'com.pratik1789.dairymanagement',
      adaptiveIcon: { backgroundColor: '#2E7D32' },
    },
    plugins: [
      ['expo-camera', { cameraPermission: 'Allow access to scan Pashu Aadhar tags.' }],
      ['expo-image-picker', {
        photosPermission: 'Allow access to add a photo for the cow profile.',
        cameraPermission: 'Allow access to take a photo of the cow.',
      }],
    ],
    extra: {
      eas: {
        projectId: '9e4be8c2-489c-4866-8b54-14136c374e20',
      },
    },
  },
};
