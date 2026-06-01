import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';

import { Screen } from '@/ui/Screen';
import { Card, SectionLabel, Btn, Notice, Muted, Pill, Divider, H3, KV } from '@/ui/primitives';
import { Field, TextField, Select } from '@/ui/inputs';
import { useReload } from '@/hooks/useReload';
import { bumpData } from '@/state/store';
import {
  getLocal,
  setLocal,
  loadRacks,
  loadTiers,
  addRack,
  removeRack,
  addTier,
  removeTier,
} from '@/db/settings';
import { logAction } from '@/db/logs';
import { toJstWall } from '@/lib/time';
import {
  getSheetUrl,
  setSheetUrl,
  getSheetToken,
  setSheetToken,
  getLastSync,
  testConnection,
  syncNow,
} from '@/sync/sheets';
import { C, S, F } from '@/lib/theme';

export default function SettingsScreen() {
  const tick = useReload();
  const racks = useMemo(() => loadRacks(), [tick]);
  const tiers = useMemo(() => loadTiers(), [tick]);

  // --- 担当者 ---
  const [actor, setActor] = useState(() => getLocal('actor_name', '') ?? '');
  const onActorBlur = () => setLocal('actor_name', actor.trim() || null);

  // --- 同期設定 ---
  const [url, setUrl] = useState(() => getSheetUrl());
  const [token, setToken] = useState(() => getSheetToken());
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);
  const lastSync = useMemo(() => getLastSync(), [tick, syncing]);

  const saveSync = () => {
    setSheetUrl(url);
    setSheetToken(token);
    setSyncMsg({ kind: 'info', text: '同期設定を保存しました' });
  };

  const onTest = async () => {
    setSheetUrl(url);
    setSheetToken(token);
    if (!url.trim()) {
      setSyncMsg({ kind: 'error', text: 'URL を入力してください' });
      return;
    }
    setSyncing(true);
    setSyncMsg(null);
    try {
      const ok = await testConnection(url.trim());
      setSyncMsg(ok ? { kind: 'success', text: '✅ 接続できました' } : { kind: 'error', text: '接続できませんでした（URL/公開設定を確認）' });
    } catch (e: any) {
      setSyncMsg({ kind: 'error', text: `エラー: ${String(e?.message ?? e)}` });
    } finally {
      setSyncing(false);
    }
  };

  const onSync = async () => {
    setSheetUrl(url);
    setSheetToken(token);
    if (!url.trim()) {
      setSyncMsg({ kind: 'error', text: 'URL を入力してください' });
      return;
    }
    setSyncing(true);
    setSyncMsg(null);
    try {
      const r = await syncNow();
      logAction('同期', null, `取込${r.pulled} / 送信${r.pushed}`);
      setSyncMsg({ kind: 'success', text: `✅ 同期完了（取込 ${r.pulled} 件 / 送信 ${r.pushed} 件）` });
    } catch (e: any) {
      setSyncMsg({ kind: 'error', text: `同期失敗: ${String(e?.message ?? e)}` });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Screen>
      {/* 担当者 */}
      <SectionLabel>👤 担当者</SectionLabel>
      <Card>
        <Field label="名前（任意）" hint="入力するとログに残ります。空でもOK。この設定はこの端末のみ。">
          <TextField value={actor} onChangeText={setActor} placeholder="例: 草谷" />
        </Field>
        <Btn label="保存" small variant="primary" onPress={onActorBlur} style={{ alignSelf: 'flex-start' }} />
      </Card>

      {/* データ同期 */}
      <SectionLabel>🔄 データ同期（Google スプレッドシート）</SectionLabel>
      <Card>
        <Muted>
          オフラインでも端末内のデータで動作します。オンライン時にこのボタンで Google スプレッドシートと
          双方向に同期します（同じレコードは更新時刻の新しい方を採用）。
        </Muted>
        <Field label="同期先 URL（Apps Script の /exec）">
          <TextField value={url} onChangeText={setUrl} placeholder="https://script.google.com/.../exec" autoCapitalize="none" />
        </Field>
        <Field label="共有トークン（任意・サーバーで SECRET を設定した場合）">
          <TextField value={token} onChangeText={setToken} placeholder="任意" autoCapitalize="none" />
        </Field>
        <View style={styles.btnRow}>
          <Btn label="保存" small style={{ flex: 1 }} onPress={saveSync} />
          <Btn label="接続テスト" small style={{ flex: 1 }} onPress={onTest} loading={syncing} />
        </View>
        <Btn label="🔄 今すぐ同期" variant="primary" onPress={onSync} loading={syncing} />
        {lastSync ? <KV k="最終同期" v={formatSync(lastSync)} /> : <Muted>まだ同期していません</Muted>}
        {syncMsg ? <Notice kind={syncMsg.kind}>{syncMsg.text}</Notice> : null}
        <Muted>セットアップ手順はプロジェクトの README とリポジトリ内 src/sync/Code.gs を参照。</Muted>
      </Card>

      {/* ラック管理 */}
      <SectionLabel>🗄️ ラックの管理</SectionLabel>
      <AddRemoveCard
        items={racks}
        addPlaceholder="追加するラック名（1〜16文字）"
        onAdd={(v) => addRack(v)}
        onRemove={(v) => removeRack(v)}
      />

      {/* 段管理 */}
      <SectionLabel>📐 段の管理</SectionLabel>
      <AddRemoveCard
        items={tiers}
        addPlaceholder="追加する段（1〜2文字）"
        autoCapitalize="characters"
        onAdd={(v) => addTier(v)}
        onRemove={(v) => removeTier(v)}
      />

      <View style={{ alignItems: 'center', gap: 2, marginTop: S.three }}>
        <Text style={{ color: C.text, fontSize: F.small, fontWeight: '700' }}>
          Powered by Haruki Kamei · Kusayama Daichi
        </Text>
        <Text style={{ color: C.textMute, fontSize: F.tiny }}>ゼブラフィッシュ水槽管理 v1.0</Text>
      </View>
    </Screen>
  );
}

function AddRemoveCard({
  items,
  addPlaceholder,
  autoCapitalize,
  onAdd,
  onRemove,
}: {
  items: string[];
  addPlaceholder: string;
  autoCapitalize?: 'none' | 'characters';
  onAdd: (v: string) => { ok: boolean; msg: string };
  onRemove: (v: string) => { ok: boolean; msg: string };
}) {
  const [input, setInput] = useState('');
  const [sel, setSel] = useState<string | null>(null);

  const doAdd = () => {
    if (!input.trim()) return;
    const r = onAdd(input.trim());
    if (r.ok) {
      setInput('');
      bumpData();
    } else {
      Alert.alert('追加できません', r.msg);
    }
  };
  const doRemove = () => {
    if (!sel) return;
    const r = onRemove(sel);
    if (r.ok) {
      setSel(null);
      bumpData();
    } else {
      Alert.alert('削除できません', r.msg);
    }
  };

  return (
    <Card>
      <View style={styles.pills}>
        {items.map((it) => (
          <Pill key={it} text={it} bg={C.surface} fg={C.text} />
        ))}
      </View>
      <Divider />
      <Field label="追加">
        <View style={styles.btnRow}>
          <View style={{ flex: 1 }}>
            <TextField value={input} onChangeText={setInput} placeholder={addPlaceholder} autoCapitalize={autoCapitalize} />
          </View>
          <Btn label="追加" small variant="primary" onPress={doAdd} />
        </View>
      </Field>
      {items.length > 1 ? (
        <Field label="削除">
          <View style={styles.btnRow}>
            <View style={{ flex: 1 }}>
              <Select value={sel} options={items.map((i) => ({ label: i, value: i }))} onSelect={setSel} placeholder="削除する項目" />
            </View>
            <Btn label="削除" small variant="danger" onPress={doRemove} />
          </View>
        </Field>
      ) : null}
    </Card>
  );
}

function formatSync(iso: string): string {
  // UTC ISO → JST 壁時計(秒まで)。表示を全画面でJSTに統一する。
  return toJstWall(iso) ?? iso;
}

const styles = StyleSheet.create({
  btnRow: { flexDirection: 'row', gap: S.two, alignItems: 'center' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: S.two },
});
