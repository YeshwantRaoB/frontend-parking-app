module.exports = function(api) {
  api.cache(true);
  
  // Enable Reanimated plugin
  const plugins = [
    'react-native-reanimated/plugin',
  ];

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
