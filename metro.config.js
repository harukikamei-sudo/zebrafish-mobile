// Expo 標準の Metro 設定を継承する。
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// expo-sqlite の web 実装が wasm を import するため、解決できるようにしておく
// (本アプリは iOS/Android ネイティブのみ対象。web ビルドの解決エラー回避用)
config.resolver.assetExts.push('wasm');

module.exports = config;
