import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';

import { Screen } from './Screen';
import { Card, Btn, Notice, Muted } from './primitives';
import { Field, TextField } from './inputs';
import { useDataVersion, bumpData } from '../state/store';
import {
  getSheetUrl,
  setSheetUrl,
  getSheetToken,
  setSheetToken,
  testConnection,
} from '../sync/sheets';

/**
 * 同期先ゲート。
 * 通常は内蔵の既定 URL(配信時に注入)があるので素通りする。
 * 既定が無く、ローカルにも URL 未設定のとき "だけ" 初回設定画面を本体の上に重ねて、
 * 接続成功するまでアプリ本体を操作できないようにする(共有されないデータ事故の防止)。
 *
 * ルーター(Stack)は常に描画したまま、未設定時だけ不透明オーバーレイを被せる方式。
 * これにより expo-router のマウント前ナビゲーション警告を避けつつブロックできる。
 */
export function SyncGate({ children }: { children: React.ReactNode }) {
  useDataVersion(); // 設定保存(bumpData)後にゲートを再評価させるため購読する
  const configured = getSheetUrl().trim().length > 0;
  return (
    <>
      {children}
      {!configured ? (
        <View style={StyleSheet.absoluteFill}>
          <Onboarding />
        </View>
      ) : null}
    </>
  );
}

function Onboarding() {
  const [url, setUrl] = useState(() => getSheetUrl());
  const [token, setToken] = useState(() => getSheetToken());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);

  const onStart = async () => {
    if (!url.trim()) {
      setMsg({ kind: 'error', text: '同期先 URL を入力してください' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const ok = await testConnection(url.trim());
      if (!ok) {
        setMsg({ kind: 'error', text: '接続できませんでした。URL / 公開設定を確認してください。' });
        return;
      }
      // 接続OK → 保存してゲート解除
      setSheetUrl(url);
      setSheetToken(token);
      bumpData();
    } catch (e: any) {
      setMsg({ kind: 'error', text: `エラー: ${String(e?.message ?? e)}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title="はじめての設定"
      subtitle="データを研究室で共有するため、最初に同期先を設定します。">
      <Card>
        <Muted>
          このアプリは Google スプレッドシートでデータを共有します。同期先 URL を設定しないと、
          入力したデータがこの端末だけに残り、ほかの人と共有されません。配布された URL を貼り付けて
          「接続して始める」を押してください。
        </Muted>
        <Field label="同期先 URL（Apps Script の /exec）">
          <TextField
            value={url}
            onChangeText={setUrl}
            placeholder="https://script.google.com/.../exec"
            autoCapitalize="none"
          />
        </Field>
        <Field label="共有トークン（任意・サーバーで設定した場合）">
          <TextField value={token} onChangeText={setToken} placeholder="任意" autoCapitalize="none" />
        </Field>
        <Btn label="接続して始める" variant="primary" onPress={onStart} loading={busy} />
        {msg ? <Notice kind={msg.kind}>{msg.text}</Notice> : null}
        <Muted>セットアップ手順は配布されたガイド、または リポジトリ内 src/sync/Code.gs を参照。</Muted>
      </Card>
    </Screen>
  );
}
