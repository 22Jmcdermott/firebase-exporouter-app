export default {
  expo: {
    name: 'firebase-rn-lib-app',
    slug: 'firebase-rn-lib-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'scavengerhunt',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/images/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#232323',
    },
    ios: {
      bundleIdentifier: 'com.aks.appwrnlibapp',
      supportsTablet: true,
    },
    android: {
      package: 'com.aks.appwrnlibapp',
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
      ],
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-secure-store',
      'expo-web-browser',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow $(PRODUCT_NAME) to use your location to help you navigate to hunt locations.',
          isAndroidBackgroundLocationEnabled: false,
        },
      ],
      [
        'expo-quick-actions',
        {
          iosActions: [
            {
              id: 'active-hunts',
              title: 'Active Hunts',
              subtitle: 'View ongoing hunts',
              icon: 'symbol:map',
            },
            {
              id: 'completed-hunts',
              title: 'Completed Hunts',
              subtitle: 'View completed hunts',
              icon: 'symbol:checkmark',
            },
            {
              id: 'profile',
              title: 'Profile',
              subtitle: 'View your profile',
              icon: 'symbol:person',
            },
          ],
        },
      ],
      [
        'expo-splash-screen',
        {
          backgroundColor: '#232323',
          image: './assets/images/splash.png',
          dark: {
            image: './assets/images/splash.png',
            backgroundColor: '#000000',
          },
          imageWidth: 200,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: '2ab1385c-b172-4746-808a-9c343ceeebab',
      },
    },
    owner: 'jacobm1',
  },
};
