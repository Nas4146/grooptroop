import 'dotenv/config';

export default ({ config }) => {
  return {
    ...config,
    expo: {
      ...config.expo,
      plugins: [
        ...(config.expo?.plugins || []),
        "expo-secure-store"
      ],
      jsEngine: "hermes", // Explicitly set jsEngine to hermes
      extra: {
        ...config.extra,
        firebaseApiKey: process.env.FIREBASE_API_KEY,
        firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
        firebaseProjectId: process.env.FIREBASE_PROJECT_ID, 
        firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        firebaseAppId: process.env.FIREBASE_APP_ID,
        eas: {
          projectId: "aa4a7513-c314-4aae-9caf-4287b478b827"
        }
      }
    }
  };
};