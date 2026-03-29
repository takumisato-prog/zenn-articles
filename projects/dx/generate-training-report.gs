/**
 * GWSストレスチェック 回答分析 → Googleスライド自動生成
 *
 * 【実行手順】
 * 1. GWSストレスチェックフォームに回答を紐付けたスプレッドシートで開く
 *    （フォーム編集画面 → 回答タブ → スプレッドシートアイコン）
 * 2. このスクリプトをスプレッドシートの「拡張機能 → Apps Script」に貼り付ける
 * 3. COMPANY_NAME を変更する
 * 4. generateTrainingReport() を実行
 * 5. ログに表示されたURLからスライドを確認
 */

// =========================================
// ▼ ここだけ変更してください
// =========================================
var COMPANY_NAME = '〇〇株式会社'; // クライアント企業名
// =========================================

var BLUE   = '#1a73e8';
var GREEN  = '#34a853';
var ORANGE = '#fa7b17';
var RED    = '#ea4335';
var PURPLE = '#9c27b0';

// 各カラーの淡色バージョン（rgba不使用・GAS対応）
var LIGHT = {
  '#1a73e8': '#e8f0fe',
  '#34a853': '#e6f4ea',
  '#fa7b17': '#fef3e2',
  '#ea4335': '#fce8e6',
  '#9c27b0': '#f3e8fd'
};
function lc(hex) { return LIGHT[hex] || '#f5f5f5'; }

// Googleツール定義
var TOOLS = [
  { key: 'Gmail',    label: 'Gmail',       keyword: 'Gmail' },
  { key: 'Drive',    label: 'Drive',       keyword: 'Googleドライブ' },
  { key: 'Docs',     label: 'Docs',        keyword: 'Googleドキュメント' },
  { key: 'Sheets',   label: 'Sheets',      keyword: 'Googleスプレッドシート' },
  { key: 'Calendar', label: 'Calendar',    keyword: 'Googleカレンダー' },
  { key: 'Meet',     label: 'Meet',        keyword: 'Google Meet' },
  { key: 'Chat',     label: 'Chat',        keyword: 'Google Chat' }
];

// =========================================
// メイン関数
// =========================================
function generateTrainingReport() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      Logger.log('⚠️ 回答データがありません。フォームへの回答後に実行してください。');
      SpreadsheetApp.getUi().alert('⚠️ 回答データがありません。フォームへの回答後に実行してください。');
      return;
    }

    var headers = data[0];
    var rows = data.slice(1);

    Logger.log('回答数: ' + rows.length + ' 件');

    // データ解析
    var analysis = analyzeResponses(headers, rows);

    // スライド生成
    var deck = buildSlides(analysis, rows.length);
    var url = deck.getUrl();

    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.log('✅ 研修提案資料 生成完了！');
    Logger.log(url);
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      SpreadsheetApp.getUi().alert('✅ 資料を生成しました！\n\nURLをコピーして開いてください:\n' + url);
    } catch(uiErr) {
      // スクリプトエディタから実行した場合はログのみ
    }

  } catch(e) {
    Logger.log('❌ エラー: ' + e.message + '\n' + e.stack);
    try {
      SpreadsheetApp.getUi().alert('❌ エラーが発生しました:\n' + e.message);
    } catch(uiErr) {}
  }
}

// =========================================
// データ解析
// =========================================
function analyzeResponses(headers, rows) {
  var a = {
    departments:    {},
    pcSkills:       {},
    toolScores:     {},
    toolAverages:   {},
    painPoints:     {},
    learningWishes: {},
    anxieties:      {},
    preferredStyles:{}
  };

  TOOLS.forEach(function(t) { a.toolScores[t.key] = []; });

  // ヘッダーからカラム番号を特定
  var col = {};
  headers.forEach(function(h, i) {
    var s = h.toString();
    if (s.indexOf('所属部署')       >= 0) col.dept     = i;
    if (s.indexOf('パソコン操作')   >= 0) col.pcSkill  = i;
    if (s.indexOf('困ること')       >= 0 ||
        s.indexOf('ストレス')       >= 0) col.pain     = i;
    if (s.indexOf('学びたいこと')   >= 0) col.learning = i;
    if (s.indexOf('不安')           >= 0) col.anxiety  = i;
    if (s.indexOf('スタイル')       >= 0) col.style    = i;
    TOOLS.forEach(function(t) {
      if (s.indexOf(t.keyword) >= 0 && col['tool_' + t.key] === undefined) {
        col['tool_' + t.key] = i;
      }
    });
  });

  // 各行を解析
  rows.forEach(function(row) {
    // 部署
    if (col.dept !== undefined) {
      var d = row[col.dept] || '未回答';
      a.departments[d] = (a.departments[d] || 0) + 1;
    }
    // PCスキル
    if (col.pcSkill !== undefined) {
      var pc = parseScore(row[col.pcSkill]);
      if (pc > 0) a.pcSkills[pc] = (a.pcSkills[pc] || 0) + 1;
    }
    // Googleツールスコア
    TOOLS.forEach(function(t) {
      var ci = col['tool_' + t.key];
      if (ci !== undefined && row[ci]) {
        var sc = parseScore(row[ci]);
        if (sc > 0) a.toolScores[t.key].push(sc);
      }
    });
    // チェックボックス系
    if (col.pain     !== undefined) parseCheckbox(row[col.pain]).forEach(    function(v) { a.painPoints[v]      = (a.painPoints[v]      || 0) + 1; });
    if (col.learning !== undefined) parseCheckbox(row[col.learning]).forEach(function(v) { a.learningWishes[v]  = (a.learningWishes[v]  || 0) + 1; });
    if (col.anxiety  !== undefined) parseCheckbox(row[col.anxiety]).forEach( function(v) { a.anxieties[v]       = (a.anxieties[v]       || 0) + 1; });
    if (col.style    !== undefined) parseCheckbox(row[col.style]).forEach(   function(v) { a.preferredStyles[v] = (a.preferredStyles[v] || 0) + 1; });
  });

  // ツール平均スコア計算
  TOOLS.forEach(function(t) {
    var scores = a.toolScores[t.key];
    a.toolAverages[t.key] = scores.length > 0
      ? scores.reduce(function(s, v) { return s + v; }, 0) / scores.length
      : 0;
  });

  return a;
}

// =========================================
// スライド生成
// =========================================
function buildSlides(a, n) {
  var today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy年MM月dd日');
  var deck = SlidesApp.create(COMPANY_NAME + ' 様 GWS研修提案資料 ' + today);

  // ---- Slide 1: タイトル ----
  var s1 = deck.getSlides()[0];
  s1.getBackground().setSolidFill(BLUE);
  clearSlide(s1);
  tx(s1, COMPANY_NAME + ' 様',             50, 160, 820, 50,  22, '#c6d9fc', false);
  tx(s1, 'Google Workspace\n研修提案資料', 50, 205, 820, 150, 44, '#ffffff', true);
  tx(s1, '回答者数: ' + n + '名　|　' + today, 50, 370, 820, 36, 16, '#b0ccf8', false);
  tx(s1, 'Altus DX支援部門',              50, 480, 820, 28, 13, '#7baaf7', false);

  // ---- Slide 2: サマリー ----
  var s2 = addBlankSlide(deck, '#f8f9fa');
  accentBar(s2, BLUE);
  tx(s2, '調査結果 サマリー',    50, 30,  700, 46, 26, BLUE, true);
  tx(s2, '回答者数: ' + n + '名', 50, 76,  300, 28, 14, '#999', false);

  var avgPc   = calcAvgFromFreq(a.pcSkills);
  var topPain = topN(a.painPoints, 1)[0];
  var topWish = topN(a.learningWishes, 1)[0];
  var items = [
    { icon: '💻', label: '平均PCスキル',     value: avgPc.toFixed(1) + ' / 5.0',                         color: BLUE   },
    { icon: '⚠️', label: '最多の困りごと',   value: topPain ? shorten(topPain.label, 30) : 'データなし', color: ORANGE },
    { icon: '📚', label: '最も学びたいこと', value: topWish ? shorten(topWish.label, 30) : 'データなし', color: GREEN  }
  ];
  items.forEach(function(item, i) {
    var y = 120 + i * 120;
    roundRect(s2, 50, y, 820, 105, lc(item.color));
    tx(s2, item.icon + '  ' + item.label, 72, y + 12, 600, 28, 14, '#666', false);
    tx(s2, item.value,                    72, y + 46, 780, 44, 20, '#222', true);
  });

  // ---- Slide 3: ツール別習熟度 ----
  var s3 = addBlankSlide(deck, '#ffffff');
  accentBar(s3, BLUE);
  tx(s3, 'Googleツール 習熟度チェック',      50, 30, 700, 46, 26, BLUE,  true);
  tx(s3, '社員全体の平均スコア（5点満点）', 50, 76, 700, 28, 14, '#999', false);

  // スコアバー
  TOOLS.forEach(function(t, i) {
    var avg = a.toolAverages[t.key] || 0;
    var y   = 118 + i * 56;
    var bw  = Math.round((avg / 5) * 560);
    var bc  = avg < 2 ? RED : avg < 3.5 ? ORANGE : GREEN;
    tx(s3, t.label, 50, y + 8, 110, 26, 13, '#333', true);
    rect(s3, 172, y + 8, 560, 26, '#f0f0f0');
    if (bw > 0) rect(s3, 172, y + 8, bw, 26, bc);
    tx(s3, avg.toFixed(1), 742, y + 8, 60, 26, 13, '#333', true);
  });

  // 凡例
  tx(s3, '■ 要対応（〜2.0）', 50,  510, 200, 24, 11, RED,    false);
  tx(s3, '■ 要強化（〜3.5）', 260, 510, 200, 24, 11, ORANGE, false);
  tx(s3, '■ 良好（3.5〜）',   470, 510, 200, 24, 11, GREEN,  false);

  // ---- Slide 4: 困りごとTOP5 ----
  var s4 = addBlankSlide(deck, '#ffffff');
  accentBar(s4, ORANGE);
  tx(s4, '社員の困りごと・ストレス TOP5', 50, 30, 700, 46, 26, ORANGE, true);
  tx(s4, '複数選択可 / 回答者 ' + n + '名',  50, 76, 500, 28, 14, '#999',   false);

  var pains  = topN(a.painPoints, 5);
  var maxCnt = pains.length > 0 ? pains[0].count : 1;
  pains.forEach(function(item, i) {
    var y   = 118 + i * 78;
    var pct = Math.round((item.count / n) * 100);
    var bw  = Math.round((item.count / maxCnt) * 560);
    tx(s4, (i + 1) + '.', 50, y + 6, 36, 28, 16, ORANGE, true);
    tx(s4, shorten(item.label, 38), 88, y + 6, 680, 28, 13, '#333', true);
    rect(s4, 88, y + 42, 560, 18, '#fff3e0');
    if (bw > 0) rect(s4, 88, y + 42, bw, 18, ORANGE);
    tx(s4, pct + '%（' + item.count + '名）', 660, y + 40, 160, 22, 12, '#888', false);
  });

  // ---- Slide 5: 研修優先度マトリクス ----
  var s5 = addBlankSlide(deck, '#ffffff');
  accentBar(s5, GREEN);
  tx(s5, '研修 優先度マトリクス',                       50, 30, 700, 46, 26, GREEN, true);
  tx(s5, 'スキルが低く・学習意欲が高いツールを最優先', 50, 76, 820, 28, 14, '#999', false);

  var priorities = calcPriority(a.toolAverages, a.learningWishes);
  var rankDefs = [
    { label: '最優先', color: RED    },
    { label: '高優先', color: ORANGE },
    { label: '中優先', color: '#fbbc04' },
    { label: '通常',   color: GREEN  },
    { label: '通常',   color: BLUE   },
    { label: '低',     color: '#9e9e9e' },
    { label: '低',     color: '#9e9e9e' }
  ];
  priorities.forEach(function(item, i) {
    var col  = i % 2;
    var row_ = Math.floor(i / 2);
    var x    = 50 + col * 440;
    var y    = 118 + row_ * 100;
    var rd   = rankDefs[i] || rankDefs[rankDefs.length - 1];
    roundRect(s5, x, y, 420, 88, '#fafafa');
    rect(s5, x, y, 6, 88, rd.color);
    tx(s5, rd.label,                   x + 16, y + 8,  100, 24, 11, rd.color, true);
    tx(s5, item.tool,                  x + 16, y + 30, 240, 36, 20, '#222',   true);
    tx(s5, '平均: ' + item.avg.toFixed(1) + ' / 5', x + 280, y + 36, 130, 24, 12, '#888', false);
  });

  // ---- Slide 6: 研修ロードマップ ----
  var s6 = addBlankSlide(deck, '#ffffff');
  accentBar(s6, BLUE);
  tx(s6, '御社向け 研修ロードマップ',          50, 30, 700, 46, 26, BLUE,  true);
  tx(s6, '分析結果をもとに設計した最適プラン', 50, 76, 700, 28, 14, '#999', false);

  var top3 = priorities.slice(0, 3).map(function(p) { return p.tool; });
  var weeks = [
    { label: 'Week 1', title: '基礎定着',        content: 'Gmail・Drive\n基本操作・ファイル共有の統一',       color: BLUE   },
    { label: 'Week 2', title: '業務直結',        content: top3[0] + '・' + (top3[1] || 'Sheets') + '\n実務演習・共同編集体験',  color: GREEN  },
    { label: 'Week 3', title: 'コラボレーション', content: 'Meet・Calendar\n会議設定・スケジュール連携',        color: ORANGE },
    { label: 'Week 4', title: '定着・総合',       content: '総合演習・Q&A\nマニュアル配布・習熟度確認',         color: PURPLE }
  ];

  weeks.forEach(function(w, i) {
    var x = 50 + i * 215;
    // ヘッダーボックス
    rect(s6, x, 115, 200, 55, w.color);
    tx(s6, w.label,  x + 10, 118, 180, 24, 13, '#ffffff', true);
    tx(s6, w.title,  x + 10, 140, 180, 24, 13, '#f0f0f0', false);
    // 矢印
    if (i < 3) tx(s6, '▶', x + 205, 130, 20, 24, 14, '#ccc', false);
    // コンテンツボックス
    roundRect(s6, x, 180, 200, 300, lc(w.color));
    tx(s6, w.content, x + 10, 192, 182, 280, 13, '#333', false);
  });

  // 補足
  tx(s6, '※ 研修間隔・時間は別途ご相談。全4回 × 2〜3時間を推奨。', 50, 500, 820, 26, 12, '#aaa', false);

  // ---- Slide 7: 推奨アクション ----
  var s7 = addBlankSlide(deck, BLUE);
  clearSlide(s7);
  tx(s7, '推奨アクション・次のステップ', 60, 35, 800, 50, 26, '#ffffff', true);

  var topStyle   = topN(a.preferredStyles, 1)[0];
  var topAnxiety = topN(a.anxieties, 1)[0];
  var actions = [
    '① ' + (priorities[0] ? priorities[0].tool : 'Gmail') + ' の集中研修から開始（スキル最低・学習意欲最高）',
    '② 研修スタイル:「' + (topStyle ? shorten(topStyle.label, 25) : 'ゆっくり丁寧に') + '」を採用',
    '③ 不安TOP:「' + (topAnxiety ? shorten(topAnxiety.label, 22) : '操作についていけるか') + '」→ 事前資料配布で解消',
    '④ 全員にマニュアル・操作ガイドを配布（復習・定着支援）',
    '⑤ 研修3ヶ月後にフォローアップ調査を実施（定着率測定）'
  ];

  actions.forEach(function(act, i) {
    var y = 105 + i * 78;
    roundRect(s7, 60, y, 800, 65, '#2a5298');
    tx(s7, act, 80, y + 18, 760, 32, 15, '#ffffff', i === 0);
  });

  tx(s7, 'Altus DX支援部門', 60, 510, 820, 28, 13, '#8ab4f8', false);

  return deck;
}

// =========================================
// ユーティリティ関数
// =========================================

function addBlankSlide(deck, bgColor) {
  var s = deck.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  if (bgColor) s.getBackground().setSolidFill(bgColor);
  return s;
}

function clearSlide(s) {
  s.getPageElements().forEach(function(el) { try { el.remove(); } catch(e) {} });
}

function accentBar(s, color) {
  rect(s, 0, 0, 8, 540, color);
}

function tx(s, text, x, y, w, h, size, color, bold) {
  var tb = s.insertTextBox(text, x, y, w, h);
  var style = tb.getText().getTextStyle();
  style.setFontSize(size || 14).setBold(bold || false);
  try { style.setForegroundColor(color || '#333333'); } catch(e) {}
  try { style.setFontFamily('Noto Sans JP'); } catch(e) { try { style.setFontFamily('Arial'); } catch(e2) {} }
  tb.getBorder().setTransparent();
  tb.getFill().setTransparent();
  return tb;
}

function rect(s, x, y, w, h, color) {
  var shape = s.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  try { shape.getFill().setSolidFill(color || '#eeeeee'); } catch(e) {}
  shape.getBorder().setTransparent();
  return shape;
}

function roundRect(s, x, y, w, h, fillColor) {
  var shape = s.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE, x, y, w, h);
  try { shape.getFill().setSolidFill(fillColor || '#f5f5f5'); } catch(e) {}
  shape.getBorder().setTransparent();
  return shape;
}

function parseScore(val) {
  if (!val) return 0;
  var m = val.toString().match(/^(\d)/);
  return m ? parseInt(m[1]) : 0;
}

function parseCheckbox(val) {
  if (!val) return [];
  return val.toString().split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0 && s !== '特に困っていることはない' && s !== '特にない' && s !== '特に不安はない'; });
}

function topN(obj, n) {
  return Object.keys(obj)
    .map(function(k) { return { label: k, count: obj[k] }; })
    .sort(function(a, b) { return b.count - a.count; })
    .slice(0, n);
}

function calcAvgFromFreq(freqMap) {
  var total = 0, cnt = 0;
  Object.keys(freqMap).forEach(function(k) {
    total += parseInt(k) * (freqMap[k] || 0);
    cnt   += (freqMap[k] || 0);
  });
  return cnt > 0 ? total / cnt : 0;
}

function calcPriority(toolAverages, learningWishes) {
  var wishMap = {
    'Gmail':    'Gmailの使い方・整理術',
    'Drive':    'Googleドライブでのファイル共有・フォルダ整理',
    'Docs':     'Googleスプレッドシート（Excelとの違い・基本操作）',
    'Sheets':   'Googleスプレッドシート（Excelとの違い・基本操作）',
    'Calendar': 'Googleカレンダーでの予定共有・会議設定',
    'Meet':     'Google Meet でのビデオ会議の使い方',
    'Chat':     '複数人で同じファイルを編集する方法'
  };
  var totalWishes = Object.values(learningWishes).reduce(function(s, v) { return s + v; }, 1);

  return TOOLS.map(function(t) {
    var avg     = toolAverages[t.key] || 0;
    var wish    = learningWishes[wishMap[t.key]] || 0;
    var wishPct = wish / totalWishes;
    var score   = ((5 - avg) / 4) * 0.6 + wishPct * 0.4;
    return { tool: t.label, key: t.key, avg: avg, wishPct: wishPct, score: score };
  }).sort(function(a, b) { return b.score - a.score; });
}

function shorten(str, len) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '…' : str;
}
