/**
 * GWS note テーマ管理スプレッドシート 自動生成スクリプト
 *
 * 【実行手順】
 * 1. script.google.com → 新しいプロジェクト
 * 2. このコードを貼り付け
 * 3. createNoteThemeSheet() を実行
 * 4. 生成されたスプレッドシートのURLをログで確認
 */

function createNoteThemeSheet() {
  var ss = SpreadsheetApp.create('GWS note テーマ管理');
  var sheet = ss.getActiveSheet();
  sheet.setName('テーマ一覧');

  // =========================================
  // カラー定義
  // =========================================
  var C = {
    headerBg:    '#1a73e8',
    headerFont:  '#ffffff',
    catA:        '#e8f0fe', // 課題解決
    catB:        '#e6f4ea', // 事例
    catC:        '#fef3e2', // 比較
    catD:        '#f3e8fd', // How To
    catE:        '#fce8e6', // 導入前知識
    catF:        '#e0f7fa', // 業種特化
    catG:        '#fff8e1', // 季節・トレンド
    border:      '#dadce0',
    subHeader:   '#f8f9fa',
    subFont:     '#5f6368',
    done:        '#34a853',
    writing:     '#fa7b17',
    todo:        '#9e9e9e',
    doneRow:     '#f1f8f4',
  };

  // =========================================
  // ヘッダー設定
  // =========================================
  var headers = [
    'No.',
    'カテゴリ',
    'タイトル（テーマ）',
    'パターン',
    'ターゲット',
    'ステータス',
    '投稿予定日',
    '投稿日',
    'PV数',
    'スキ数',
    'メモ'
  ];

  var colWidths = [45, 120, 380, 90, 160, 90, 100, 100, 70, 70, 200];
  colWidths.forEach(function(w, i) {
    sheet.setColumnWidth(i + 1, w);
  });

  // ヘッダー行
  sheet.setRowHeight(1, 20); // タイトル行（空白スペーサー）
  sheet.setRowHeight(2, 40);

  var headerRange = sheet.getRange(2, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground(C.headerBg)
    .setFontColor(C.headerFont)
    .setFontWeight('bold')
    .setFontSize(11)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  sheet.setFrozenRows(2);

  // =========================================
  // テーマデータ
  // =========================================
  var themes = [
    // [カテゴリ, タイトル, パターン, ターゲット]
    ['課題解決', 'Excelがバラバラで困っている会社がGWSで解決した3つのこと',          'A', '中小企業経営者・総務'],
    ['課題解決', '「あのファイルどこ？」がなくなるGoogleドライブの整理術',            'A', '総務・情シス担当'],
    ['課題解決', 'メール返信に追われる担当者がGmailで1日30分を取り戻した方法',        'A', '営業・事務担当'],
    ['課題解決', '日程調整の往復メールをゼロにするGoogleカレンダー活用法',            'A', '営業・管理職'],
    ['課題解決', 'USBメモリを使わなくなった会社がやっていること',                    'A', '中小企業全般'],
    ['課題解決', '退職者のデータを失った会社が2度とやらかさなくなった話',            'A', '経営者・情シス'],
    ['事例',     '製造業5名がGWS導入で週5時間の業務削減に成功した話',               'B', '製造業経営者'],
    ['事例',     '飲食チェーンが本部→店舗の情報共有をGWSで一元化した事例',           'B', '飲食業経営者'],
    ['事例',     '士業事務所がペーパーレス化をGWSで実現するまでの3ヶ月',            'B', '士業・専門職'],
    ['事例',     '10名以下の会社がMicrosoft OfficeからGWSに乗り換えた理由',          'B', '小規模企業経営者'],
    ['比較',     'Google Workspace vs Microsoft 365 中小企業が選ぶべきはどっち？',  'A', 'GWS検討中の経営者'],
    ['比較',     'GmailとOutlookの違い｜乗り換え前に知っておくべきこと',             'C', '乗り換え検討者'],
    ['比較',     'ZoomとGoogle Meet どちらが中小企業に向いているか',                'A', 'テレワーク検討企業'],
    ['How To',   'Gmail共有ラベルの使い方｜チーム対応が激変する設定方法',            'C', 'チームでGmail活用'],
    ['How To',   'Googleドライブのフォルダ設計｜誰でも迷わない構成の作り方',         'C', '総務・情シス担当'],
    ['How To',   'Google Meetの使い方完全版｜初心者でも5分で会議を始められる',       'C', 'GWS初心者'],
    ['How To',   'Googleフォームで問い合わせ管理を自動化する方法',                   'C', '事務・管理担当'],
    ['How To',   'Googleスプレッドシートの共同編集｜ExcelユーザーへのQ&A',           'C', 'Excel経験者'],
    ['How To',   'スマホからGWSを使う方法｜外回り営業に役立つ活用法',               'C', '外勤営業担当'],
    ['How To',   'Googleカレンダーで会議室予約を自動管理する設定方法',              'C', '総務・施設管理'],
    ['導入前知識', 'GWS導入前に確認すべき5つのチェックリスト',                      'A', 'GWS検討中の経営者'],
    ['導入前知識', 'Google Workspaceの料金プランの違いをわかりやすく解説',           'C', 'GWS検討中の担当者'],
    ['導入前知識', 'GWS導入でよくある失敗3選と回避策',                             'A', 'GWS導入検討者'],
    ['導入前知識', '社員がGWSを使いこなすための研修設計の考え方',                   'A', '経営者・人事担当'],
    ['導入前知識', 'GWS導入の費用対効果はどう測る？ROI算出の考え方',               'A', '経営者・財務担当'],
    ['業種特化',  '建設業がGWSを導入すべき3つの理由',                              'A', '建設業経営者'],
    ['業種特化',  '医療・介護事業所向け：GWSのセキュリティ設定ガイド',              'C', '医療・介護の情シス'],
    ['業種特化',  '小売・EC事業者がGWSで在庫・発注管理を効率化する方法',            'C', '小売・EC担当者'],
    ['季節',     '年度末にやっておくべきGWSの整理・引き継ぎ設定',                   'C', '総務・人事担当'],
    ['季節',     'テレワーク導入をきっかけにGWSを検討すべき理由',                   'A', 'テレワーク検討企業'],
  ];

  // カテゴリ → 背景色マッピング
  var catColors = {
    '課題解決': C.catA,
    '事例':     C.catB,
    '比較':     C.catC,
    'How To':   C.catD,
    '導入前知識': C.catE,
    '業種特化': C.catF,
    '季節':     C.catG,
  };

  // =========================================
  // データ書き込み
  // =========================================
  var startRow = 3;

  themes.forEach(function(theme, i) {
    var row = startRow + i;
    var rowData = [
      i + 1,         // No.
      theme[0],      // カテゴリ
      theme[1],      // タイトル
      theme[2],      // パターン
      theme[3],      // ターゲット
      '未着手',      // ステータス
      '',            // 投稿予定日
      '',            // 投稿日
      '',            // PV数
      '',            // スキ数
      '',            // メモ
    ];

    sheet.setRowHeight(row, 36);
    var range = sheet.getRange(row, 1, 1, headers.length);
    range.setValues([rowData]);
    range.setVerticalAlignment('middle');
    range.setFontSize(10);

    // カテゴリ色
    var bg = catColors[theme[0]] || '#ffffff';
    sheet.getRange(row, 1, 1, 2).setBackground(bg);

    // No. 中央寄せ
    sheet.getRange(row, 1).setHorizontalAlignment('center');

    // パターン 中央寄せ
    sheet.getRange(row, 4).setHorizontalAlignment('center');

    // ステータス 中央寄せ・色
    var stCell = sheet.getRange(row, 6);
    stCell.setHorizontalAlignment('center').setFontWeight('bold').setFontColor(C.todo);

    // 枠線
    range.setBorder(false, false, true, false, false, false, C.border, SpreadsheetApp.BorderStyle.SOLID);
  });

  // タイトル列は左寄せ
  sheet.getRange(startRow, 3, themes.length, 1).setHorizontalAlignment('left');

  // =========================================
  // ステータス ドロップダウン
  // =========================================
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['未着手', '執筆中', '投稿済み', '保留'], true)
    .build();
  sheet.getRange(startRow, 6, themes.length, 1).setDataValidation(statusRule);

  // =========================================
  // パターン ドロップダウン
  // =========================================
  var patternRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['A', 'B', 'C'], true)
    .build();
  sheet.getRange(startRow, 4, themes.length, 1).setDataValidation(patternRule);

  // =========================================
  // 条件付き書式：ステータス色
  // =========================================
  var statusRange = sheet.getRange(startRow, 6, themes.length, 1);

  var rules = sheet.getConditionalFormatRules();

  // 投稿済み → 緑
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('投稿済み')
    .setFontColor(C.done)
    .setRanges([statusRange])
    .build());

  // 執筆中 → オレンジ
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('執筆中')
    .setFontColor(C.writing)
    .setRanges([statusRange])
    .build());

  // 行全体：投稿済みは薄緑背景
  var fullRange = sheet.getRange(startRow, 1, themes.length, headers.length);
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$F3="投稿済み"')
    .setBackground(C.doneRow)
    .setRanges([fullRange])
    .build());

  sheet.setConditionalFormatRules(rules);

  // =========================================
  // カテゴリ凡例シート
  // =========================================
  var legendSheet = ss.insertSheet('凡例・使い方');
  legendSheet.setColumnWidth(1, 160);
  legendSheet.setColumnWidth(2, 360);
  legendSheet.setColumnWidth(3, 200);

  var legendTitle = legendSheet.getRange(1, 1, 1, 3);
  legendTitle.merge().setValue('📖 GWS note テーマ管理 - 使い方ガイド')
    .setBackground(C.headerBg).setFontColor('#ffffff')
    .setFontSize(13).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  legendSheet.setRowHeight(1, 44);

  // カテゴリ凡例
  legendSheet.getRange(3, 1).setValue('カテゴリ').setFontWeight('bold').setFontSize(11);
  var catLegend = [
    ['課題解決', 'Before/Afterで読者の悩みを解決する記事', C.catA],
    ['事例',     '実際の導入ストーリーを紹介する記事',     C.catB],
    ['比較',     '他サービスとの比較・選び方記事',         C.catC],
    ['How To',   '具体的な操作手順・設定方法記事',         C.catD],
    ['導入前知識','GWS検討者向けの基礎知識記事',           C.catE],
    ['業種特化', '業種ごとの活用提案記事',                C.catF],
    ['季節',     '時期・トレンドに合わせた記事',           C.catG],
  ];
  catLegend.forEach(function(c, i) {
    var r = legendSheet.getRange(4 + i, 1, 1, 2);
    r.setValues([[c[0], c[1]]]);
    legendSheet.getRange(4 + i, 1).setBackground(c[2]);
    legendSheet.setRowHeight(4 + i, 30);
    r.setVerticalAlignment('middle').setFontSize(10);
  });

  // パターン説明
  legendSheet.getRange(12, 1).setValue('パターン').setFontWeight('bold').setFontSize(11);
  var patLegend = [
    ['A：課題解決型', '課題 → 原因 → GWSでの解決策の流れ。問い合わせ獲得に最も効果的。'],
    ['B：事例型',     '実際の導入事例を物語形式で紹介。信頼性と共感を生む。'],
    ['C：How To型',  '操作手順を丁寧に解説。Google検索からの流入に強い。'],
  ];
  patLegend.forEach(function(p, i) {
    var r = legendSheet.getRange(13 + i, 1, 1, 2);
    r.setValues([[p[0], p[1]]]);
    legendSheet.setRowHeight(13 + i, 30);
    r.setVerticalAlignment('middle').setFontSize(10);
    legendSheet.getRange(13 + i, 1).setFontWeight('bold');
  });

  // ステータス説明
  legendSheet.getRange(17, 1).setValue('ステータス').setFontWeight('bold').setFontSize(11);
  var stLegend = [
    ['未着手', '執筆前', C.todo],
    ['執筆中', '現在執筆中', C.writing],
    ['投稿済み', 'note投稿完了', C.done],
    ['保留', '一時保留・後回し', '#9e9e9e'],
  ];
  stLegend.forEach(function(s, i) {
    var r = legendSheet.getRange(18 + i, 1, 1, 2);
    r.setValues([[s[0], s[1]]]);
    legendSheet.getRange(18 + i, 1).setFontColor(s[2]).setFontWeight('bold');
    legendSheet.setRowHeight(18 + i, 28);
    r.setVerticalAlignment('middle').setFontSize(10);
  });

  // =========================================
  // シートをテーマ一覧に戻す
  // =========================================
  ss.setActiveSheet(sheet);

  // =========================================
  // 完了ログ
  // =========================================
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  Logger.log('✅ GWS note テーマ管理シート 生成完了');
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  Logger.log('URL: ' + ss.getUrl());
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    SpreadsheetApp.getUi().alert('✅ 生成完了！\n\n' + ss.getUrl());
  } catch(e) {}
}
