/**
 * metro.config.js – GroopTroop
 * Compatible with Expo SDK 50 + and NativeWind v4.
 */
const { getDefaultConfig } = require('expo/metro-config');          // ← use expo/metro-config, not @expo/…
const { withNativeWind }   = require('nativewind/metro');            // ← wrapper that runs Tailwind

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

/* Optional: let RN load custom fonts or other non-JS assets */
config.resolver.assetExts.push('ttf', 'otf');

/* Wrap the config so NativeWind can compile your Tailwind CSS once per build */
module.exports = withNativeWind(config, {
  /** REQUIRED — relative path to the file that contains
      @tailwind base; @tailwind components; @tailwind utilities;  */
  input: './src/styles/commonStyles.css',

  /** OPTIONAL — where to write the generated CSS. This speeds up CI. */
  output: './.nativewind/generated.css'
});