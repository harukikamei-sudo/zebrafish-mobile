import { ExpoConfig, ConfigContext } from 'expo/config';

// =====================================================================
//  EAS アカウント設定（Expo Go / EAS Update の配信先）
//
//  ▼▼▼ 別の Expo アカウントへ移行するときは、この 2 つを書き換えるだけ ▼▼▼
//    EAS_OWNER      : 新しい Expo アカウント名(owner)
//    EAS_PROJECT_ID : 新アカウントで `eas init` すると発行される Project ID
//  ※ updates.url は EAS_PROJECT_ID から自動生成されるので個別修正は不要
//  ▲▲▲ 変更後の流れ: `eas login`(新アカウント) → `eas update --branch preview -m "..."`
//      → 新しい QR / リンクを配り直す。詳細は アカウント移行手順.md を参照 ▲▲▲
// =====================================================================
const EAS_OWNER = 'daichikusayama';
const EAS_PROJECT_ID = 'fcaa7ed9-76e2-446d-ac2d-344ae3710b4f';

// 基本設定は app.json に置き、ここでは EAS アカウント関連だけを上書きする。
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'zebrafish-mobile',
  slug: config.slug ?? 'zebrafish',
  owner: EAS_OWNER,
  extra: {
    ...config.extra,
    eas: { ...(config.extra?.eas ?? {}), projectId: EAS_PROJECT_ID },
  },
  updates: {
    ...config.updates,
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
  },
});
