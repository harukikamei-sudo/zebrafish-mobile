module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // reanimated v4: worklets を変換するプラグイン。必ず plugins の最後に置く。
    // これが無いと useAnimatedStyle 等のアニメが動かない(静止する)。
    plugins: ['react-native-worklets/plugin'],
  };
};
