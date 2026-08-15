module.exports = {
  expo: {
    name: 'Gopala',
    slug: 'dairy-management',
    scheme: 'gopala',
    version: '1.0.1',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#1B5E20',
    },
    assetBundlePatterns: ['**/*'],
    android: {
      package: 'com.pratik1789.dairymanagement',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#1B5E20',
      },
    },
    web: { favicon: './assets/favicon.png' },
    plugins: [
      ['expo-camera', { cameraPermission: 'Allow access to scan Pashu Aadhar tags.' }],
      ['expo-image-picker', {
        photosPermission: 'Allow access to add a photo for the cow profile.',
        cameraPermission: 'Allow access to take a photo of the cow.',
      }],
      // Resolve duplicate META-INF resources between transitive JARs
      // (okhttp logging-interceptor vs jspecify) during release packaging.
      'expo-notifications',
      'expo-web-browser',
      ['expo-build-properties', {
        android: {
          packagingOptions: {
            exclude: [
              'META-INF/versions/9/OSGI-INF/MANIFEST.MF',
            ],
          },
        },
      }],
    ],
    extra: {
      eas: {
        projectId: '9e4be8c2-489c-4866-8b54-14136c374e20',
      },
    },
  },
};
