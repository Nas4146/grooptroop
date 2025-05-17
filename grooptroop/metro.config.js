// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Customize the config if needed
module.exports = {
  ...config,
  // Enable Hermes Inspector for debugging
  server: {
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        if (req.url.indexOf('/hermes-inspector') !== -1) {
          return next();
        }
        return middleware(req, res, next);
      };
    },
  },
};