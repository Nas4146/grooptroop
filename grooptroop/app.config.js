import 'dotenv/config';

export default ({ config }) => {
  return {
    ...config,
    name: "groopTroop",
    slug: "grooptroop",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/GTlogo.png",
    splash: {
      image: "./assets/GTlogo.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    updates: {
      fallbackToCacheTimeout: 0
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.nas4146.grooptroop",
      buildNumber: "1.0.0"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      package: "com.nas4146.grooptroop",
      versionCode: 1
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    expo: {
      ...config.expo,
      plugins: [
        ...(config.expo?.plugins || []),
        "expo-secure-store",
        "expo-web-browser" // Add this line for web browser support
      ],
      jsEngine: "hermes",
      extra: {
        ...config.extra,
        firebaseApiKey: process.env.FIREBASE_API_KEY,
        firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
        firebaseProjectId: process.env.FIREBASE_PROJECT_ID, 
        firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        firebaseAppId: process.env.FIREBASE_APP_ID,
        // Add OAuth client IDs for Google authentication
        googleClientId: process.env.GOOGLE_CLIENT_ID,
        googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID,
        googleAndroidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID,
        eas: {
          projectId: "aa4a7513-c314-4aae-9caf-4287b478b827"
        }
      }
    }
  };
};