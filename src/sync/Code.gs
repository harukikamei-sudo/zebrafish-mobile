/**
 * ゼブラフィッシュ水槽管理アプリ ― Google Sheets 同期バックエンド (Google Apps Script)
 *
 * ▼ セットアップ手順
 *  1. Google スプレッドシートを用意し、URL から ID を控える
 *     (https://docs.google.com/spreadsheets/d/【ここがID】/edit)
 *  2. Apps Script に本ファイルを貼り付けて保存
 *  3. プロジェクトの設定 → スクリプト プロパティ に SPREADSHEET_ID = 上記ID を追加
 *     (スプレッドシートに「拡張機能→Apps Script」で紐付いている場合は省略可)
 *     (任意) SECRET = 合言葉 も追加すると、アプリ側と一致した時だけ許可
 *  4. デプロイ → 新しいデプロイ → 種類「ウェブアプリ」
 *       - 実行ユーザー: 自分
 *       - アクセスできるユーザー: 全員
 *  5. 発行された /exec で終わる URL をアプリの 設定 → データ同期 に貼り付ける
 *
 * ▼ 更新(再デプロイ)手順 ― 本ファイルを変更したら必ず行う
 *  1. Apps Script エディタで本ファイルの内容を貼り替えて保存
 *  2. デプロイ → デプロイを管理 → 既存デプロイの編集(鉛筆) → バージョン「新バージョン」→ デプロイ
 *     ※「新しいデプロイ」を作ると URL が変わってしまうので注意。上記なら URL は不変。
 *
 * シートはテーブルごとに自動作成され、ヘッダ行も自動で用意されます。
 * レコードは主キーで突き合わせ、updated_at の新しい方を採用します(Last-Write-Wins)。
 * 末尾の srv_at 列はサーバーが書込時に押す時刻で、アプリの増分同期に使います(手編集しない)。
 *
 * ▼ 既存データの移行（CSV）
 *  各テーブル名と同名のシートタブを作り、File → インポート → アップロード で
 *  対応 CSV を「現在のシートを置換」で読み込む。
 *  ※「テキストを数値、日付、数式に変換」は【しない(いいえ)】を選ぶこと。
 */

var SCHEMA = {
  tanks: {
    pk: 'tank_id',
    cols: ['tank_id', 'rack', 'tier', 'col_no', 'health_status', 'memo',
           'male_count', 'female_count', 'unknown_count', 'lineage', 'set_date',
           'updated_at', 'deleted'],
  },
  feeding_logs: {
    pk: 'id',
    cols: ['id', 'fed_at', 'memo', 'updated_at', 'deleted'],
  },
  spawning_records: {
    pk: 'id',
    cols: ['id', 'spawning_date', 'male_parent_id', 'female_parent_id',
           'egg_count', 'fertilization_rate', 'updated_at', 'deleted'],
  },
  mating_trials: {
    pk: 'id',
    cols: ['id', 'trial_no', 'planned_date', 'male_id', 'female_id',
           'source_tank_male', 'source_tank_female', 'breeding_tank_id', 'status',
           'setup_at', 'divider_removed_at', 'egg_collected_at', 'returned_at',
           'spawning_history_id', 'notes', 'male_tag', 'female_tag',
           'updated_at', 'deleted'],
  },
  activity_logs: {
    pk: 'id',
    cols: ['id', 'occurred_at', 'category', 'actor', 'target', 'details',
           'updated_at', 'deleted'],
  },
  app_settings: {
    pk: 'key',
    cols: ['key', 'value', 'updated_at', 'deleted'],
  },
};

// サーバー側の最終書込時刻列(増分 pull の透かし)。アプリへは返さず、シート内だけで使う。
// updated_at(端末時計)と違いサーバー時計で押すので、端末間の時計ズレで取りこぼさない。
var SRV_COL = 'srv_at';

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (!checkToken(p.token)) return json({ error: 'unauthorized' });
  if (p.action === 'ping') return json({ ok: true });
  if (p.action === 'pull') return json({ tables: pullAll() });
  return json({ error: 'unknown action' });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (!checkToken(body.token)) return json({ error: 'unauthorized' });
    if (body.action === 'push') {
      return json({ ok: true, applied: pushAll(body.tables || {}) });
    }
    if (body.action === 'sync') {
      return json(syncCombined(body));
    }
    return json({ error: 'unknown action' });
  } catch (err) {
    return json({ error: String(err) });
  }
}

/**
 * push と増分 pull を 1 リクエストで処理する(従来は pull GET + push POST の 2 往復)。
 * ロック内で「since より後にサーバーで書かれた行」を集めてから push を適用するので、
 * 自分が今 push した行は応答に混ざらず、他端末の書込は取りこぼさない。
 * 応答の serverNow を端末が保存し、次回の since に使う。
 */
function syncCombined(body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var since = body.since == null ? '' : String(body.since);
    var changes = {};
    Object.keys(SCHEMA).forEach(function (name) {
      var rows = readSheet(name, SCHEMA[name], since);
      if (rows.length) changes[name] = rows;
    });
    var applied = 0;
    var tables = body.tables || {};
    Object.keys(tables).forEach(function (name) {
      var def = SCHEMA[name];
      if (def) applied += upsertRows(name, def, tables[name]);
    });
    return {
      ok: true,
      tables: changes,
      applied: applied,
      serverNow: new Date().toISOString(),
    };
  } finally {
    lock.releaseLock();
  }
}

function checkToken(token) {
  var secret = PropertiesService.getScriptProperties().getProperty('SECRET');
  if (!secret) return true; // 未設定なら認証なし
  return token === secret;
}

function pullAll() {
  var out = {};
  Object.keys(SCHEMA).forEach(function (name) {
    out[name] = readSheet(name, SCHEMA[name]);
  });
  return out;
}

/**
 * シートを読み出して行オブジェクト配列にする。
 * since(UTC ISO)が指定された場合は srv_at がそれより後の行だけ返す(増分 pull)。
 * srv_at が空の行(手編集・旧データ)は増分では拾えないため、アプリ側が
 * 1 日 1 回行う全件 pull(since='')で回収する。
 */
function readSheet(name, def, since) {
  var sh = getSheet(name, def);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var header = values[0];
  var srvIdx = header.indexOf(SRV_COL);
  var sinceTs = since ? tsValue(since) : null;
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    if (sinceTs !== null) {
      var sv = srvIdx >= 0 ? tsValue(values[i][srvIdx]) : null;
      if (sv === null || sv <= sinceTs) continue;
    }
    var obj = {};
    for (var j = 0; j < header.length; j++) {
      if (header[j] === SRV_COL) continue;
      obj[header[j]] = cellOut(header[j], values[i][j]);
    }
    if (obj[def.pk] === '' || obj[def.pk] === null) continue;
    rows.push(obj);
  }
  return rows;
}

function pushAll(tables) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var applied = 0;
    Object.keys(tables).forEach(function (name) {
      var def = SCHEMA[name];
      if (def) applied += upsertRows(name, def, tables[name]);
    });
    return applied;
  } finally {
    lock.releaseLock();
  }
}

function upsertRows(name, def, rows) {
  if (!rows || !rows.length) return 0;
  var sh = getSheet(name, def);
  var allCols = def.cols.concat([SRV_COL]);
  var width = allCols.length;
  var lastRow = Math.max(sh.getLastRow(), 1);
  var values = sh.getRange(1, 1, lastRow, width).getValues();
  var header = values[0];
  var pkIdx = header.indexOf(def.pk);
  var tsIdx = header.indexOf('updated_at');
  // 採用した行にはサーバー時計の書込時刻を押す(増分 pull の透かし)
  var srvNow = new Date().toISOString();

  // pk -> values 配列内のインデックス
  var index = {};
  for (var i = 1; i < values.length; i++) {
    var pk = values[i][pkIdx];
    if (pk !== '' && pk !== null) index[String(pk)] = i;
  }

  var applied = 0;
  var dirty = false;
  rows.forEach(function (r) {
    var pk = String(r[def.pk] == null ? '' : r[def.pk]);
    if (pk === '') return;
    var rowArr = allCols.map(function (c) {
      if (c === SRV_COL) return srvNow;
      return r[c] === undefined || r[c] === null ? '' : r[c];
    });
    var i = index[pk];
    if (i === undefined) {
      values.push(rowArr);
      index[pk] = values.length - 1;
      applied++; dirty = true;
    } else if (tsCompare(r.updated_at, values[i][tsIdx]) > 0) {
      // Last-Write-Wins: 受信側が新しいときだけ上書き
      values[i] = rowArr;
      applied++; dirty = true;
    }
  });

  // 変更があれば 1 回だけまとめて書き込む（行ごとの setValues 連打を回避）
  if (dirty) {
    sh.getRange(1, 1, values.length, width).setValues(values);
  }
  return applied;
}

/**
 * updated_at を「型に依存せず」比較する。
 *  - Date 型（シートが日付に自動変換した場合）→ getTime()
 *  - 数値（epoch等）→ そのまま
 *  - 文字列（ISO "2026-05-29T10:45:42Z" / "2026-05-29 10:45:42" 等）→ Date.parse
 * いずれも数値に正規化して比較するため、元の文字列比較で起きていた
 * 「形式違いで更新が一生反映されない」事故を防ぐ。
 * 両方とも数値化できない場合のみ文字列比較にフォールバック。
 * 戻り値: a>b で +1 / a<b で -1 / 同じで 0
 */
function tsCompare(a, b) {
  var na = tsValue(a), nb = tsValue(b);
  if (na === null && nb === null) {
    var sa = a == null ? '' : String(a);
    var sb = b == null ? '' : String(b);
    return sa < sb ? -1 : (sa > sb ? 1 : 0);
  }
  if (na === null) return -1; // 比較不能な側は「古い」扱い
  if (nb === null) return 1;
  return na < nb ? -1 : (na > nb ? 1 : 0);
}

function tsValue(v) {
  if (v === '' || v === null || v === undefined) return null;
  if (Object.prototype.toString.call(v) === '[object Date]') return v.getTime();
  if (typeof v === 'number') return v;
  var t = Date.parse(v);
  return isNaN(t) ? null : t;
}

// 日付のみ("yyyy-MM-dd")で保持する列。時刻を付けるとアプリ側の表示・日付比較が崩れる。
var DATE_ONLY_COLS = { planned_date: true, spawning_date: true };

/**
 * 読み出し時、セルが Date 型(シートが日付に自動変換)だった場合の整形。列の役割で変換先を分ける。
 *  - updated_at(同期用タイムスタンプ): アプリ規約に合わせ UTC ISO で返す。
 *  - 日付のみの列(planned_date / spawning_date): "yyyy-MM-dd" に戻す。
 *  - それ以外のドメイン時刻(fed_at / occurred_at / set_date 等): JST 壁時計のまま保持すべき値。
 *    UTC へ変換すると 9 時間ズレる(例: 18:48→09:48Z)ため、シートのロケールに依らず
 *    Asia/Tokyo の壁時計表記 "yyyy-MM-dd HH:mm:ss" へ戻す。
 * 文字列・数値はそのまま返す。
 */
function cellOut(col, v) {
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (col === 'updated_at') {
      return Utilities.formatDate(v, 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'");
    }
    if (DATE_ONLY_COLS[col]) {
      return Utilities.formatDate(v, 'Asia/Tokyo', 'yyyy-MM-dd');
    }
    return Utilities.formatDate(v, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');
  }
  return v;
}

// スプレッドシート取得: スクリプトプロパティ SPREADSHEET_ID があればそれを開く。
// 無ければ(スプレッドシートにバインドされたスクリプトなら)アクティブなものを使う。
function getSpreadsheet() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error(
    'スプレッドシートが見つかりません。スクリプトプロパティ SPREADSHEET_ID に対象シートのIDを設定してください。',
  );
}

function getSheet(name, def) {
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var cols = def.cols.concat([SRV_COL]);
  var width = cols.length;
  var firstRow = sh.getRange(1, 1, 1, width).getValues()[0];
  // 先頭列だけでなく全列を検証して、欠け・ズレがあればヘッダを張り直す
  var needs = false;
  for (var i = 0; i < width; i++) {
    if (String(firstRow[i]) !== cols[i]) { needs = true; break; }
  }
  if (needs) sh.getRange(1, 1, 1, width).setValues([cols]);
  return sh;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

// ============================================================================
// 【ワンショット保守】過去のバグで焼き付いた UTC ISO 文字列を JST 壁時計へ一括変換
//  使い方: Apps Script エディタ上部の関数ドロップダウンで fixWallClockColumns を
//          選び「実行」。Web アプリの再デプロイは不要(エディタ実行のみ)。
//  何度実行しても安全(既に壁時計の値は対象外)。updated_at は UTC のまま残す。
// ============================================================================

// JST 壁時計で保持すべきドメイン時刻列(updated_at は同期判定用 UTC なので含めない)
var WALL_CLOCK_COLUMNS = {
  tanks: ['set_date'],
  feeding_logs: ['fed_at'],
  spawning_records: ['spawning_date'],
  mating_trials: ['planned_date', 'setup_at', 'divider_removed_at', 'egg_collected_at', 'returned_at'],
  activity_logs: ['occurred_at'],
};

/**
 * 値を JST 壁時計 "yyyy-MM-dd HH:mm:ss" に正規化する。変換不要なら null を返す。
 *  - Date 型セル(シートが日付に自動変換) → Asia/Tokyo の壁時計
 *  - "…T…Z" / 末尾オフセット付きの UTC ISO 文字列 → 実時刻に直し Asia/Tokyo 壁時計
 *  - 既に壁時計 / その他 → null(触らない)
 */
function toJstWallGs(v) {
  if (v === '' || v === null || v === undefined) return null;
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return Utilities.formatDate(v, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');
  }
  if (typeof v !== 'string') return null;
  var s = v.trim();
  var isAbsolute = s.indexOf('T') >= 0 && /(Z|[+-]\d{2}:?\d{2})$/.test(s);
  if (isAbsolute) {
    var t = Date.parse(s);
    if (!isNaN(t)) return Utilities.formatDate(new Date(t), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');
  }
  return null;
}

/** 全シートのドメイン時刻列をスキャンし、UTC ISO 等を JST 壁時計へ書き換える。 */
function fixWallClockColumns() {
  var ss = getSpreadsheet();
  var report = [];
  Object.keys(WALL_CLOCK_COLUMNS).forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) return;
    var rng = sh.getDataRange();
    var values = rng.getValues();
    if (values.length < 2) return;
    var header = values[0];
    var changed = 0;
    WALL_CLOCK_COLUMNS[name].forEach(function (col) {
      var ci = header.indexOf(col);
      if (ci < 0) return;
      for (var i = 1; i < values.length; i++) {
        var fixed = toJstWallGs(values[i][ci]);
        if (fixed !== null && DATE_ONLY_COLS[col]) fixed = fixed.slice(0, 10);
        if (fixed !== null && fixed !== values[i][ci]) {
          values[i][ci] = fixed;
          changed++;
        }
      }
    });
    if (changed > 0) rng.setValues(values);
    report.push(name + ': ' + changed + ' 件修正');
  });
  var msg = report.join('\n') || '対象シートなし';
  Logger.log(msg);
  return msg;
}
