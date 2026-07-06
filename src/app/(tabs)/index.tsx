import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { Screen } from '@/ui/Screen';
import { Card, Btn, Notice, ProgressBar, Muted } from '@/ui/primitives';
import { NavTile, SectionHeader, LinkCard } from '@/ui/nav';
import { ShrimpIcon } from '@/ui/Icon';
import { Hero } from '@/ui/Hero';
import { Collapsible } from '@/ui/Collapsible';
import { LogLines } from '@/ui/LogLines';
import { Reveal } from '@/ui/Reveal';
import { useReload } from '@/hooks/useReload';
import { bumpData, showToast } from '@/state/store';
import { listTanks } from '@/db/tanks';
import { listSpawning } from '@/db/spawning';
import { activeTrials } from '@/db/trials';
import { recentLogs, logAction } from '@/db/logs';
import { addFeed, countToday, lastFedAt } from '@/db/feeding';
import { syncNow, getSheetUrl } from '@/sync/sheets';
import { hoursSince, timeHm, greetingParts } from '@/lib/time';
import { FEEDS_PER_DAY, FEED_WARN_HOURS, FEED_ALERT_HOURS } from '@/lib/constants';
import { fetchWeather, weatherVisual, WeatherVisual } from '@/lib/weather';
import { C, S, F } from '@/lib/theme';

export default function DashboardScreen() {
  const tick = useReload();
  const [weather, setWeather] = useState<{ vis: WeatherVisual; temp: number | null } | null>(null);
  const [hello] = useState(() => greetingParts());
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    fetchWeather().then((w) => {
      if (!alive || !w) return;
      const vis = weatherVisual(w.code);
      if (vis) setWeather({ vis, temp: w.temp });
    });
    return () => {
      alive = false;
    };
  }, []);

  const d = useMemo(() => {
    const tanks = listTanks();
    const totalFish = tanks.reduce(
      (s, t) => s + (t.male_count || 0) + (t.female_count || 0) + (t.unknown_count || 0),
      0,
    );
    return {
      tanksN: tanks.length,
      totalFish,
      isolated: tanks.filter((t) => t.health_status === '隔離中').length,
      spawnN: listSpawning().length,
      trials: activeTrials(),
      count: countToday(),
      last: lastFedAt(),
      logs: recentLogs(4),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const hrs = hoursSince(d.last);
  const done = d.count >= FEEDS_PER_DAY;
  const feedColor = done
    ? C.success
    : (hrs ?? 0) >= FEED_ALERT_HOURS
      ? C.danger
      : (hrs ?? 0) >= FEED_WARN_HOURS
        ? C.warn
        : C.accentDeep;

  const onFeed = () => {
    addFeed(null);
    logAction('餌やり', null, 'ダッシュボードから');
    bumpData();
    showToast('🦐 餌やりを記録しました');
  };

  const onSync = async () => {
    if (!getSheetUrl()) {
      setSyncMsg({ kind: 'info', text: '設定 → データ同期 で同期先URLを設定してください' });
      return;
    }
    setSyncing(true);
    setSyncMsg(null);
    try {
      const r = await syncNow();
      logAction('同期', null, `手動 取込${r.pulled}/送信${r.pushed}`);
      setSyncMsg({ kind: 'success', text: `✅ 同期完了（取込 ${r.pulled} / 送信 ${r.pushed}）` });
    } catch (e: any) {
      setSyncMsg({ kind: 'error', text: `同期失敗: ${String(e?.message ?? e)}` });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Screen>
      {/* ヒーロー: オーロラ(暖色・漂う光)で固定 */}
      <Reveal>
        <Hero
          styleName="aurora"
          greeting={hello.greeting}
          sub={hello.sub}
          weather={weather}
        />
      </Reveal>

      {/* 最近のアクティビティ(餌やりの上・折りたたみ可) */}
      <Reveal delay={70}>
        <Collapsible title="最近のアクティビティ" defaultOpen>
          <LogLines bare rows={d.logs} />
          <Btn
            label="すべてのログを見る"
            small
            variant="ghost"
            onPress={() => router.navigate('/logs')}
            style={{ alignSelf: 'flex-start' }}
          />
        </Collapsible>
      </Reveal>

      {/* 本日の餌やり */}
      <Reveal delay={140}>
        <Card>
          <View style={styles.feedHead}>
            <View style={styles.feedTitleRow}>
              <ShrimpIcon size={18} color={C.accentDeep} />
              <Text style={styles.feedTitle}>本日の餌やり</Text>
            </View>
            <Text style={styles.detailLink} onPress={() => router.navigate('/feeding')}>
              詳細 ›
            </Text>
          </View>
          <Text style={[styles.feedCount, { color: feedColor }]}>
            {d.count} <Text style={styles.feedDen}>/ {FEEDS_PER_DAY} 回</Text>
          </Text>
          <Muted>
            前回 <Text style={{ color: C.text, fontWeight: '700' }}>{timeHm(d.last)}</Text>
            {hrs !== null ? `　／　${hrs.toFixed(1)} 時間前` : '　／　未記録'}
          </Muted>
          <ProgressBar value={d.count / FEEDS_PER_DAY} color={feedColor} />
          <Btn
            label={done ? '追加で記録' : '餌をあげた'}
            iconNode={<ShrimpIcon size={17} color={C.onPrimary} />}
            variant="primary"
            onPress={onFeed}
          />
        </Card>
      </Reveal>

      {/* オーバービュー */}
      <Reveal delay={210}>
        <View style={{ gap: S.three }}>
          <SectionHeader title="オーバービュー" />
          <View style={styles.tilesRow}>
            <NavTile icon="water-outline" value={d.tanksN} label="水槽数" onPress={() => router.navigate('/tanks')} />
            <NavTile icon="fish-outline" value={d.totalFish} label="総匹数" onPress={() => router.navigate('/rack')} />
            <NavTile icon="egg-outline" value={d.spawnN} label="産卵記録" onPress={() => router.navigate('/analysis')} />
          </View>
          <View style={styles.tilesRow}>
            <NavTile
              icon="alert-circle-outline"
              value={d.isolated}
              label="隔離中"
              color={d.isolated ? C.danger : C.text}
              onPress={() => router.navigate('/tanks')}
            />
            <NavTile icon="flask-outline" value={d.trials.length} label="進行中" onPress={() => router.navigate('/trials')} />
            <View style={{ flex: 1 }} />
          </View>
        </View>
      </Reveal>

      {/* 要注意 */}
      {d.isolated > 0 ? (
        <Reveal delay={270}>
          <LinkCard
            icon="alert-circle-outline"
            iconColor={C.danger}
            title="隔離中の水槽があります"
            subtitle="タップして水槽管理で対応"
            badge={String(d.isolated)}
            onPress={() => router.navigate('/tanks')}
          />
        </Reveal>
      ) : null}

      {/* 進行中トライアル */}
      <Reveal delay={320}>
        <View style={{ gap: S.three }}>
          <SectionHeader title="進行中の交配" actionLabel="すべて見る" onAction={() => router.navigate('/trials')} />
          {d.trials.length === 0 ? (
            <Notice kind="info">進行中のトライアルはありません</Notice>
          ) : (
            d.trials.slice(0, 3).map((t) => (
              <LinkCard
                key={t.id}
                icon="flask-outline"
                title={`Trial #${t.trial_no} — ${t.status}`}
                subtitle={`予定 ${t.planned_date}　♂${t.source_tank_male ?? '-'} × ♀${t.source_tank_female ?? '-'}`}
                onPress={() => router.navigate('/trials')}
              />
            ))
          )}
        </View>
      </Reveal>

      {/* 手動同期(自動同期が効かない時の保険) */}
      <Reveal delay={360}>
        <View style={{ gap: S.two }}>
          <Btn label="今すぐ同期" icon="sync-outline" variant="default" loading={syncing} onPress={onSync} />
          {syncMsg ? <Notice kind={syncMsg.kind}>{syncMsg.text}</Notice> : null}
          <Muted style={{ textAlign: 'center' }}>記録の直後・起動時・復帰時に自動で同期します</Muted>
        </View>
      </Reveal>

      <Text style={styles.credit}>Powered by Haruki Kamei · Kusayama Daichi</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  feedHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feedTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  feedTitle: { fontSize: F.h3, fontWeight: '700', color: C.text },
  detailLink: { fontSize: F.small, color: C.accentDeep, fontWeight: '700' },
  feedCount: { fontSize: 44, fontWeight: '800', letterSpacing: -1.5 },
  feedDen: { fontSize: F.h3, fontWeight: '700', color: C.textSoft, letterSpacing: 0 },
  tilesRow: { flexDirection: 'row', gap: S.two },
  credit: {
    textAlign: 'center',
    color: C.textMute,
    fontSize: F.tiny,
    letterSpacing: 0.5,
    marginTop: S.five,
  },
});
