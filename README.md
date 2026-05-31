# ゼブラフィッシュ水槽管理（モバイル / Expo）

Streamlit 版（`../app.py`）を **React Native + Expo** に移植したスマホアプリ。
**Expo Go で動作**し、**オフラインでもローカル SQLite で全機能が使えます**。オンライン時には
**Google スプレッドシートと双方向同期**して、複数端末・複数人でデータを共有できます。

## 主な機能

- 📊 **ホーム**：本日の給餌、概況タイル（タップで各ページへ）、要注意・進行中トライアル、最近のログ
- 🍚 **餌やり**：1日4回目標・経過時間アラート・本日ログ・取り消し・履歴 CSV
- 💕 **交配トライアル**：ラック内で一括計画、状態遷移（計画中→前日セット→採卵→戻し / 中止）、採卵結果入力、受精率の推移グラフ
- 📈 **成績分析**：♂/♀/ペア別の成功率ランキング、次回おすすめペア Top5
- 📐 **棚ビュー**：ラック×段×列のグリッドを健康状態の色で可視化（セルをタップで詳細）
- 🪣 **水槽管理**：登録/更新、2水槽のスワップ、フィルタ、CSV 入出力、削除
- 📔 **ログ**：種別/期間/キーワード絞り込み、CSV 出力、古いログの削除
- ⚙️ **設定**：担当者名、ラック/段の追加・削除、Google Sheets 同期

## 必要なもの

- Node.js（LTS 推奨。`node -v`）
- スマホに **Expo Go** アプリ（App Store / Google Play）
- PC とスマホが同じ Wi-Fi にあること（開発時）

## 起動方法（Expo Go）

```bash
cd zebrafish-mobile
npm install        # 初回のみ
npx expo start
```

ターミナルに QR コードが出ます。

- **iOS**：標準カメラで QR を読み取り → Expo Go で開く
- **Android**：Expo Go アプリ内の「Scan QR code」で読み取り

うまく繋がらない場合は `npx expo start --tunnel`（同一 Wi-Fi でなくても可）。

> データは端末内の SQLite (`zebrafish.db`) に保存され、オフラインでも動作します。

## Google スプレッドシート同期のセットアップ

「双方向同期（共有マスター）」を使う手順です。**スプレッドシート側の準備はご自身の Google アカウントで実施**してください。

1. Google スプレッドシートを新規作成
2. **拡張機能 → Apps Script** を開く
3. [`src/sync/Code.gs`](src/sync/Code.gs) の内容を全部貼り付けて保存
4. （任意）アクセス制限をかけたい場合：**プロジェクトの設定 → スクリプト プロパティ** に
   `SECRET` = 任意の文字列 を追加
5. **デプロイ → 新しいデプロイ → 種類「ウェブアプリ」**
   - 実行ユーザー：**自分**
   - アクセスできるユーザー：**全員**
6. 発行された **`/exec` で終わる URL** をコピー
7. アプリの **設定 → データ同期** に URL（と、設定したなら SECRET）を入力 → **接続テスト** →
   **今すぐ同期**

- シート（`tanks`, `feeding_logs`, `spawning_records`, `mating_trials`, `activity_logs`,
  `app_settings`）は初回同期時に自動作成されます。
- 同期は**レコード単位の Last-Write-Wins**（`updated_at` の新しい方を採用）。削除は `deleted=1`
  の論理削除として伝播します。
- スプレッドシートを直接編集しても、次回同期でアプリに反映されます（`updated_at` 列も更新してください）。

## 技術構成

- Expo SDK 56 / expo-router（ファイルベースのタブ＋スタック）/ TypeScript
- expo-sqlite（同期 API）でローカル永続化
- react-native-svg（受精率グラフ）
- expo-file-system + expo-sharing + expo-document-picker（CSV 入出力）
- Google Apps Script Web アプリ（`src/sync/Code.gs`）を JSON API として `fetch`

### ディレクトリ

```
src/
  app/                 画面（expo-router ルート）
    (tabs)/            下タブ: ホーム/餌やり/交配/水槽/その他
    rack, analysis, logs, settings   スタック画面
  db/                  SQLite スキーマ・接続・各テーブルのCRUD
  lib/                 定数・時刻・フォーマット・天気・分析・CSV・テーマ
  ui/                  共通コンポーネント
  sync/                Google Sheets 同期（sheets.ts / Code.gs）
  state/               グローバル変更通知
  hooks/               useReload
```

## メモ

- データの持ち方や同期方針は元 Streamlit 版と異なります（端末ローカル＋Sheets同期）。
- 元アプリの `individuals` テーブルは現行UIで未使用のため移植していません。
