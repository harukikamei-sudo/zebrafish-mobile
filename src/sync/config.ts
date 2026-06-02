/**
 * 既定の同期先(URL / トークン)。
 * 値は app.config.ts の extra 経由で、配信時に GitHub Secrets から注入される。
 * 公開ソースには値が載らないため、リポジトリが public でも漏れない。
 * ローカル設定が空のときのフォールバックとして src/sync/sheets.ts が使う。
 */
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  sheetUrl?: string;
  sheetToken?: string;
};

export const DEFAULT_SHEET_URL = String(extra.sheetUrl ?? '').trim();
export const DEFAULT_SHEET_TOKEN = String(extra.sheetToken ?? '').trim();
