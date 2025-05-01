// babel.config.js
module.exports = function(api) {
    api.cache(true);
    return {
      presets: [
        'babel-preset-expo',
        'nativewind/babel'
      ],
      plugins: [
        '@babel/plugin-transform-flow-strip-types',
        ['@babel/plugin-transform-runtime', {
          helpers: true,
          regenerator: true
        }],
      ]
    };
  };