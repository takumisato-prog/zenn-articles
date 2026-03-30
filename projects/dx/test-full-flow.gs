/**
 * GWSストレスチェック 全フロー テストスクリプト
 *
 * 【このスクリプトでできること】
 * 1. Google Form を自動生成
 * 2. 回答スプレッドシートを自動作成・紐付け
 * 3. テストデータ（5名分）を自動投入
 * 4. 研修提案スライドを自動生成
 *
 * 【実行手順】
 * 1. script.google.com → 新しいプロジェクト
 * 2. このファイルの内容をすべて貼り付け
 * 3. COMPANY_NAME を変更（任意）
 * 4. runFullTest() を実行
 * 5. ログに表示された URL を確認
 */

var COMPANY_NAME = 'テスト株式会社';

// カラー定義
var BLUE   = '#1a73e8';
var GREEN  = '#34a853';
var ORANGE = '#fa7b17';
var RED    = '#ea4335';
var PURPLE = '#9c27b0';
var LIGHT  = { '#1a73e8':'#e8f0fe', '#34a853':'#e6f4ea', '#fa7b17':'#fef3e2', '#ea4335':'#fce8e6', '#9c27b0':'#f3e8fd' };
function lc(hex) { return LIGHT[hex] || '#f5f5f5'; }

var TOOLS = [
  { key:'Gmail',    label:'Gmail',    keyword:'Gmail'             },
  { key:'Drive',    label:'Drive',    keyword:'Googleドライブ'      },
  { key:'Docs',     label:'Docs',     keyword:'Googleドキュメント'   },
  { key:'Sheets',   label:'Sheets',   keyword:'Googleスプレッドシート'},
  { key:'Calendar', label:'Calendar', keyword:'Googleカレンダー'    },
  { key:'Meet',     label:'Meet',     keyword:'Google Meet'        },
  { key:'Chat',     label:'Chat',     keyword:'Google Chat'        }
];

// =========================================
// ① メイン：全フロー実行
// =========================================
function runFullTest() {
  try {
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.log('🚀 GWSストレスチェック 全フローテスト開始');
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Step1: フォーム生成
    Logger.log('\n[Step 1] Googleフォームを生成中...');
    var form = createStressCheckForm();
    Logger.log('✅ フォーム生成完了');
    Logger.log('  回答URL: ' + form.getPublishedUrl());

    // Step2: スプレッドシート作成・紐付け
    Logger.log('\n[Step 2] スプレッドシートを作成・紐付け中...');
    var ss = SpreadsheetApp.create(COMPANY_NAME + ' GWSストレスチェック 回答シート');
    form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

    // 少し待機（フォーム紐付けの反映を待つ）
    Utilities.sleep(3000);
    ss = SpreadsheetApp.openById(ss.getId());
    Logger.log('✅ スプレッドシート作成完了');
    Logger.log('  URL: ' + ss.getUrl());

    // Step3: テストデータ投入
    Logger.log('\n[Step 3] テストデータ（5名分）を投入中...');
    var sheet = ss.getSheets()[0];
    injectTestData(sheet);
    Logger.log('✅ テストデータ投入完了（5行）');

    // Step4: スライド生成
    Logger.log('\n[Step 4] 研修提案スライドを生成中...');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var rows = data.slice(1);
    var analysis = analyzeResponses(headers, rows);
    var deck = buildSlides(analysis, rows.length);
    Logger.log('✅ スライド生成完了');
    Logger.log('  URL: ' + deck.getUrl());

    // 完了ログ
    Logger.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.log('🎉 全フロー完了！');
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.log('📋 フォーム回答URL:');
    Logger.log('  ' + form.getPublishedUrl());
    Logger.log('📊 回答スプレッドシート:');
    Logger.log('  ' + ss.getUrl());
    Logger.log('🎞  研修提案スライド:');
    Logger.log('  ' + deck.getUrl());
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      SpreadsheetApp.getUi().alert(
        '🎉 全フロー完了！\n\n' +
        '📋 フォーム: ' + form.getPublishedUrl() + '\n\n' +
        '🎞  スライド: ' + deck.getUrl()
      );
    } catch(e) {}

  } catch(e) {
    Logger.log('❌ エラー: ' + e.message + '\n' + e.stack);
  }
}

// =========================================
// ② Googleフォーム生成
// =========================================
function createStressCheckForm() {
  var form = FormApp.create('【研修前アンケート】Google Workspace 困りごとチェック');
  form.setDescription(
    'このアンケートは匿名です。個人が特定されることはありません。\n' +
    '正直にお答えいただくことで、あなたに合った研修内容をご用意できます。\n' +
    '所要時間：約5分'
  );
  form.setCollectEmail(false);
  form.setAllowResponseEdits(true);

  // 基本属性
  form.addSectionHeaderItem().setTitle('あなたについて（匿名・属性のみ）');
  form.addMultipleChoiceItem().setTitle('所属部署（近いものを選んでください）')
    .setChoiceValues(['経営・管理部門','営業・販売','製造・現場','総務・人事','経理・財務','その他']);
  form.addMultipleChoiceItem().setTitle('勤続年数')
    .setChoiceValues(['1年未満','1〜3年','3〜10年','10年以上']);
  form.addMultipleChoiceItem().setTitle('年代')
    .setChoiceValues(['20代','30代','40代','50代以上']);

  // セクション①
  form.addPageBreakItem().setTitle('① パソコン・スマホの使い慣れ度');
  form.addMultipleChoiceItem().setTitle('パソコン操作の得意度（1〜5で選んでください）')
    .setChoiceValues([
      '1：ほぼ使えない・苦手意識がある',
      '2：メール・検索くらいはできる',
      '3：ExcelやWordを普通に使える',
      '4：関数・グラフ・フォルダ整理など一通りできる',
      '5：自分でトラブル解決・応用もできる'
    ]);
  form.addCheckboxItem().setTitle('現在、仕事でよく使うツールは？（あてはまるものすべて）')
    .setChoiceValues(['Excel / Word（Microsoft Office）','Googleスプレッドシート / ドキュメント',
      'LINE / LINE WORKS','Chatwork / Slack','Zoom','kintone / サイボウズ','紙・手書きが中心','その他']);

  // セクション②
  form.addPageBreakItem().setTitle('② Googleツール 習熟度チェック');
  var scale = ['1：使ったことがない','2：少し使える','3：普通に使える','4：応用できる','5：バリバリ使いこなせる'];
  form.addMultipleChoiceItem().setTitle('Gmail（メール）').setChoiceValues(scale);
  form.addMultipleChoiceItem().setTitle('Googleドライブ（ファイル保存・共有）').setChoiceValues(scale);
  form.addMultipleChoiceItem().setTitle('Googleドキュメント（文書作成）').setChoiceValues(scale);
  form.addMultipleChoiceItem().setTitle('Googleスプレッドシート（表計算）').setChoiceValues(scale);
  form.addMultipleChoiceItem().setTitle('Googleカレンダー（スケジュール管理）').setChoiceValues(scale);
  form.addMultipleChoiceItem().setTitle('Google Meet（ビデオ会議）').setChoiceValues(scale);
  form.addMultipleChoiceItem().setTitle('Google Chat（チャット・社内連絡）').setChoiceValues(scale);

  // セクション③
  form.addPageBreakItem().setTitle('③ 日常業務での困りごと・ストレスポイント');
  form.addCheckboxItem().setTitle('仕事でよく困ること・ストレスに感じることは？（あてはまるものすべて）')
    .setChoiceValues([
      'ファイルがどこにあるかわからなくなる',
      '他の人と同じファイルを同時に編集するのが怖い',
      'メールの整理・管理が追いついていない',
      '会議の日程調整に時間がかかる',
      'ビデオ会議の接続・操作が不安',
      'スマホからデータにアクセスできない',
      '退職した人のデータがどこにあるかわからない',
      '誤って大事なファイルを消してしまいそうで怖い',
      'チームのメンバーと情報共有がうまくできていない',
      'パスワードを忘れてログインできなくなる',
      '特に困っていることはない'
    ]);
  form.addParagraphTextItem()
    .setTitle('「これ、もっと楽にならないかな」と感じることがあれば教えてください')
    .setHelpText('どんな小さなことでも構いません');

  // セクション④
  form.addPageBreakItem().setTitle('④ 研修への期待・不安');
  form.addCheckboxItem().setTitle('研修で学びたいこと・知りたいことは？（あてはまるものすべて）')
    .setChoiceValues([
      'Gmailの使い方・整理術',
      'Googleドライブでのファイル共有・フォルダ整理',
      'Googleスプレッドシート（Excelとの違い・基本操作）',
      'Google Meet でのビデオ会議の使い方',
      'Googleカレンダーでの予定共有・会議設定',
      'スマホからGWSを使う方法',
      '複数人で同じファイルを編集する方法',
      '業務を自動化する方法（GAS・マクロ）',
      '特にない'
    ]);
  form.addCheckboxItem().setTitle('研修に対して不安・心配なことは？（あてはまるものすべて）')
    .setChoiceValues([
      '操作についていけるか不安',
      '覚えたことをすぐ忘れてしまいそう',
      '研修後に使う機会がなさそう',
      '今の仕事のやり方を変えたくない',
      '特に不安はない',
      'その他'
    ]);
  form.addCheckboxItem().setTitle('研修に希望するスタイルは？（あてはまるものすべて）')
    .setChoiceValues([
      'ゆっくり丁寧に教えてほしい',
      '基本だけ教えてもらえれば自分で応用できる',
      '実際の業務に近い例で教えてほしい',
      'テキスト・マニュアルを手元に残してほしい',
      '後から動画や資料で復習したい'
    ]);

  // セクション⑤
  form.addPageBreakItem().setTitle('⑤ 最後に');
  form.addParagraphTextItem()
    .setTitle('研修担当者へのメッセージ・要望があれば自由にお書きください')
    .setHelpText('「ここだけは絶対教えてほしい」「こういう進め方は苦手」など何でもOKです');

  form.setConfirmationMessage(
    'ご回答ありがとうございます！\nみなさんの声をもとに研修をご用意します。\n\n— Altus DX支援部門'
  );

  return form;
}

// =========================================
// ③ テストデータ投入
// =========================================
function injectTestData(sheet) {
  // フォームと連携したシートのヘッダーを再現
  var headers = [
    'タイムスタンプ',
    '所属部署（近いものを選んでください）',
    '勤続年数',
    '年代',
    'パソコン操作の得意度（1〜5で選んでください）',
    '現在、仕事でよく使うツールは？（あてはまるものすべて）',
    'Gmail（メール）',
    'Googleドライブ（ファイル保存・共有）',
    'Googleドキュメント（文書作成）',
    'Googleスプレッドシート（表計算）',
    'Googleカレンダー（スケジュール管理）',
    'Google Meet（ビデオ会議）',
    'Google Chat（チャット・社内連絡）',
    '仕事でよく困ること・ストレスに感じることは？（あてはまるものすべて）',
    '「これ、もっと楽にならないかな」と感じることがあれば教えてください',
    '研修で学びたいこと・知りたいことは？（あてはまるものすべて）',
    '研修に対して不安・心配なことは？（あてはまるものすべて）',
    '研修に希望するスタイルは？（あてはまるものすべて）',
    '研修担当者へのメッセージ・要望があれば自由にお書きください'
  ];

  var testData = [
    // 回答1: 営業・30代・PCやや苦手
    ['2026/03/30 10:00:00', '営業・販売', '1〜3年', '30代',
     '2：メール・検索くらいはできる', 'Excel / Word（Microsoft Office）',
     '2：少し使える', '1：使ったことがない', '1：使ったことがない',
     '2：少し使える', '3：普通に使える', '1：使ったことがない', '1：使ったことがない',
     'ファイルがどこにあるかわからなくなる, メールの整理・管理が追いついていない', '',
     'Gmailの使い方・整理術, Googleドライブでのファイル共有・フォルダ整理',
     '操作についていけるか不安', 'ゆっくり丁寧に教えてほしい', ''],

    // 回答2: 総務・40代・PC普通
    ['2026/03/30 10:05:00', '総務・人事', '3〜10年', '40代',
     '3：ExcelやWordを普通に使える', 'Excel / Word（Microsoft Office）',
     '3：普通に使える', '2：少し使える', '1：使ったことがない',
     '3：普通に使える', '2：少し使える', '1：使ったことがない', '1：使ったことがない',
     'ファイルがどこにあるかわからなくなる, 他の人と同じファイルを同時に編集するのが怖い', '',
     'Googleドライブでのファイル共有・フォルダ整理, 複数人で同じファイルを編集する方法',
     '覚えたことをすぐ忘れてしまいそう', 'テキスト・マニュアルを手元に残してほしい', ''],

    // 回答3: 経理・50代・PC苦手
    ['2026/03/30 10:10:00', '経理・財務', '10年以上', '50代以上',
     '1：ほぼ使えない・苦手意識がある', '紙・手書きが中心',
     '1：使ったことがない', '1：使ったことがない', '1：使ったことがない',
     '1：使ったことがない', '1：使ったことがない', '1：使ったことがない', '1：使ったことがない',
     'ビデオ会議の接続・操作が不安, パスワードを忘れてログインできなくなる, メールの整理・管理が追いついていない', '',
     'Gmailの使い方・整理術, Google Meet でのビデオ会議の使い方',
     '操作についていけるか不安, 今の仕事のやり方を変えたくない',
     'ゆっくり丁寧に教えてほしい, 後から動画や資料で復習したい', ''],

    // 回答4: 営業・20代・PC得意
    ['2026/03/30 10:15:00', '営業・販売', '1年未満', '20代',
     '4：関数・グラフ・フォルダ整理など一通りできる', 'Googleスプレッドシート / ドキュメント',
     '4：応用できる', '3：普通に使える', '3：普通に使える',
     '4：応用できる', '3：普通に使える', '2：少し使える', '2：少し使える',
     'チームのメンバーと情報共有がうまくできていない', '',
     'Google Meet でのビデオ会議の使い方, Googleカレンダーでの予定共有・会議設定',
     '特に不安はない', '基本だけ教えてもらえれば自分で応用できる', ''],

    // 回答5: 製造・40代・PCやや苦手
    ['2026/03/30 10:20:00', '製造・現場', '3〜10年', '40代',
     '2：メール・検索くらいはできる', 'LINE / LINE WORKS',
     '2：少し使える', '1：使ったことがない', '1：使ったことがない',
     '2：少し使える', '2：少し使える', '1：使ったことがない', '1：使ったことがない',
     'ファイルがどこにあるかわからなくなる, スマホからデータにアクセスできない', '',
     'Gmailの使い方・整理術, Googleドライブでのファイル共有・フォルダ整理',
     '操作についていけるか不安', 'ゆっくり丁寧に教えてほしい, 実際の業務に近い例で教えてほしい', '']
  ];

  // 既存データをクリアして書き込み
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, testData.length, headers.length).setValues(testData);

  // ヘッダー行を見やすく装飾
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#1a73e8').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

// =========================================
// ④ データ解析
// =========================================
function analyzeResponses(headers, rows) {
  var a = {
    departments:{}, pcSkills:{}, toolScores:{}, toolAverages:{},
    painPoints:{}, learningWishes:{}, anxieties:{}, preferredStyles:{}
  };
  TOOLS.forEach(function(t) { a.toolScores[t.key] = []; });

  var col = {};
  headers.forEach(function(h, i) {
    var s = h.toString();
    if (s.indexOf('所属部署')     >= 0) col.dept     = i;
    if (s.indexOf('パソコン操作') >= 0) col.pcSkill  = i;
    if (s.indexOf('困ること')     >= 0 || s.indexOf('ストレス') >= 0) col.pain = i;
    if (s.indexOf('学びたいこと') >= 0) col.learning = i;
    if (s.indexOf('不安')         >= 0) col.anxiety  = i;
    if (s.indexOf('スタイル')     >= 0) col.style    = i;
    TOOLS.forEach(function(t) {
      if (s.indexOf(t.keyword) >= 0 && col['tool_'+t.key] === undefined) col['tool_'+t.key] = i;
    });
  });

  rows.forEach(function(row) {
    if (col.dept !== undefined) { var d = row[col.dept]||'未回答'; a.departments[d]=(a.departments[d]||0)+1; }
    if (col.pcSkill !== undefined) { var pc=parseScore(row[col.pcSkill]); if(pc>0) a.pcSkills[pc]=(a.pcSkills[pc]||0)+1; }
    TOOLS.forEach(function(t) {
      var ci=col['tool_'+t.key];
      if(ci!==undefined && row[ci]) { var sc=parseScore(row[ci]); if(sc>0) a.toolScores[t.key].push(sc); }
    });
    if(col.pain!==undefined)     parseCheckbox(row[col.pain]).forEach(    function(v){a.painPoints[v]=(a.painPoints[v]||0)+1;});
    if(col.learning!==undefined) parseCheckbox(row[col.learning]).forEach(function(v){a.learningWishes[v]=(a.learningWishes[v]||0)+1;});
    if(col.anxiety!==undefined)  parseCheckbox(row[col.anxiety]).forEach( function(v){a.anxieties[v]=(a.anxieties[v]||0)+1;});
    if(col.style!==undefined)    parseCheckbox(row[col.style]).forEach(   function(v){a.preferredStyles[v]=(a.preferredStyles[v]||0)+1;});
  });

  TOOLS.forEach(function(t) {
    var sc=a.toolScores[t.key];
    a.toolAverages[t.key]=sc.length>0?sc.reduce(function(s,v){return s+v;},0)/sc.length:0;
  });
  return a;
}

// =========================================
// ⑤ スライド生成
// =========================================
function buildSlides(a, n) {
  var today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy年MM月dd日');
  var deck = SlidesApp.create(COMPANY_NAME + ' 様 GWS研修提案資料 ' + today);

  // Slide 1: タイトル
  var s1 = deck.getSlides()[0];
  s1.getBackground().setSolidFill(BLUE);
  clearSlide(s1);
  tx(s1, COMPANY_NAME + ' 様',            50,160,820, 50,22,'#c6d9fc',false);
  tx(s1,'Google Workspace\n研修提案資料', 50,205,820,150,44,'#ffffff',true);
  tx(s1,'回答者数: '+n+'名　|　'+today,  50,370,820, 36,16,'#b0ccf8',false);
  tx(s1,'Altus DX支援部門',              50,480,820, 28,13,'#7baaf7',false);

  // Slide 2: サマリー
  var s2 = addBlank(deck,'#f8f9fa');
  bar(s2,BLUE);
  tx(s2,'調査結果 サマリー',    50, 30,700,46,26,BLUE,true);
  tx(s2,'回答者数: '+n+'名',    50, 76,300,28,14,'#999',false);
  var avgPc  = calcAvg(a.pcSkills);
  var tPain  = topN(a.painPoints,1)[0];
  var tWish  = topN(a.learningWishes,1)[0];
  [{icon:'💻',label:'平均PCスキル',    value:avgPc.toFixed(1)+' / 5.0',                       color:BLUE  },
   {icon:'⚠️',label:'最多の困りごと', value:tPain?shorten(tPain.label,30):'データなし',       color:ORANGE},
   {icon:'📚',label:'最も学びたいこと',value:tWish?shorten(tWish.label,30):'データなし',       color:GREEN }
  ].forEach(function(item,i) {
    var y=120+i*120;
    rr(s2,50,y,820,105,lc(item.color));
    tx(s2,item.icon+'  '+item.label,72,y+12,600,28,14,'#666',false);
    tx(s2,item.value,               72,y+46,780,44,20,'#222',true);
  });

  // Slide 3: ツール習熟度バー
  var s3 = addBlank(deck,'#ffffff');
  bar(s3,BLUE);
  tx(s3,'Googleツール 習熟度チェック',   50,30,700,46,26,BLUE, true);
  tx(s3,'社員全体の平均スコア（5点満点）',50,76,700,28,14,'#999',false);
  TOOLS.forEach(function(t,i) {
    var avg=a.toolAverages[t.key]||0;
    var y=118+i*56, bw=Math.round((avg/5)*560);
    var bc=avg<2?RED:avg<3.5?ORANGE:GREEN;
    tx(s3,t.label,50,y+8,110,26,13,'#333',true);
    rc(s3,172,y+8,560,26,'#f0f0f0');
    if(bw>0) rc(s3,172,y+8,bw,26,bc);
    tx(s3,avg.toFixed(1),742,y+8,60,26,13,'#333',true);
  });
  tx(s3,'■ 要対応（〜2.0）', 50, 510,200,24,11,RED,   false);
  tx(s3,'■ 要強化（〜3.5）',260, 510,200,24,11,ORANGE,false);
  tx(s3,'■ 良好（3.5〜）',  470, 510,200,24,11,GREEN, false);

  // Slide 4: 困りごとTOP5
  var s4 = addBlank(deck,'#ffffff');
  bar(s4,ORANGE);
  tx(s4,'社員の困りごと・ストレス TOP5',  50,30,700,46,26,ORANGE,true);
  tx(s4,'複数選択可 / 回答者 '+n+'名',    50,76,500,28,14,'#999',  false);
  var pains=topN(a.painPoints,5), maxC=pains.length>0?pains[0].count:1;
  pains.forEach(function(item,i) {
    var y=118+i*78, pct=Math.round((item.count/n)*100), bw=Math.round((item.count/maxC)*560);
    tx(s4,(i+1)+'.',50,y+6,36,28,16,ORANGE,true);
    tx(s4,shorten(item.label,38),88,y+6,680,28,13,'#333',true);
    rc(s4,88,y+42,560,18,'#fff3e0');
    if(bw>0) rc(s4,88,y+42,bw,18,ORANGE);
    tx(s4,pct+'%（'+item.count+'名）',660,y+40,160,22,12,'#888',false);
  });

  // Slide 5: 研修優先度
  var s5 = addBlank(deck,'#ffffff');
  bar(s5,GREEN);
  tx(s5,'研修 優先度マトリクス',                      50,30,700,46,26,GREEN,true);
  tx(s5,'スキルが低く・学習意欲が高いツールを最優先',50,76,820,28,14,'#999',false);
  var prios=calcPrio(a.toolAverages,a.learningWishes);
  var ranks=[{l:'最優先',c:RED},{l:'高優先',c:ORANGE},{l:'中優先',c:'#fbbc04'},
             {l:'通常',c:GREEN},{l:'通常',c:BLUE},{l:'低',c:'#9e9e9e'},{l:'低',c:'#9e9e9e'}];
  prios.forEach(function(item,i) {
    var cx=i%2, ry=Math.floor(i/2), x=50+cx*440, y=118+ry*100, rd=ranks[i]||ranks[ranks.length-1];
    rr(s5,x,y,420,88,'#fafafa');
    rc(s5,x,y,6,88,rd.c);
    tx(s5,rd.l,       x+16,y+8, 100,24,11,rd.c, true);
    tx(s5,item.tool,  x+16,y+30,240,36,20,'#222',true);
    tx(s5,'平均: '+item.avg.toFixed(1)+' / 5',x+280,y+36,130,24,12,'#888',false);
  });

  // Slide 6: ロードマップ
  var s6 = addBlank(deck,'#ffffff');
  bar(s6,BLUE);
  tx(s6,'御社向け 研修ロードマップ',          50,30,700,46,26,BLUE, true);
  tx(s6,'分析結果をもとに設計した最適プラン',50,76,700,28,14,'#999',false);
  var top3=prios.slice(0,3).map(function(p){return p.tool;});
  [{l:'Week 1',t:'基礎定着',       c:'Gmail・Drive\n基本操作・ファイル共有の統一',                              col:BLUE  },
   {l:'Week 2',t:'業務直結',       c:top3[0]+'・'+(top3[1]||'Sheets')+'\n実務演習・共同編集体験',              col:GREEN },
   {l:'Week 3',t:'コラボレーション',c:'Meet・Calendar\n会議設定・スケジュール連携',                             col:ORANGE},
   {l:'Week 4',t:'定着・総合',     c:'総合演習・Q&A\nマニュアル配布・習熟度確認',                              col:PURPLE}
  ].forEach(function(w,i) {
    var x=50+i*215;
    rc(s6,x,115,200,55,w.col);
    tx(s6,w.l,x+10,118,180,24,13,'#ffffff',true);
    tx(s6,w.t,x+10,140,180,24,13,'#f0f0f0',false);
    if(i<3) tx(s6,'▶',x+205,130,20,24,14,'#ccc',false);
    rr(s6,x,180,200,300,lc(w.col));
    tx(s6,w.c,x+10,192,182,280,13,'#333',false);
  });
  tx(s6,'※ 研修間隔・時間は別途ご相談。全4回 × 2〜3時間を推奨。',50,500,820,26,12,'#aaa',false);

  // Slide 7: 推奨アクション
  var s7 = addBlank(deck,BLUE);
  clearSlide(s7);
  tx(s7,'推奨アクション・次のステップ',60,35,800,50,26,'#ffffff',true);
  var tStyle=topN(a.preferredStyles,1)[0], tAnx=topN(a.anxieties,1)[0];
  ['① '+(prios[0]?prios[0].tool:'Gmail')+' の集中研修から開始（スキル最低・学習意欲最高）',
   '② 研修スタイル:「'+(tStyle?shorten(tStyle.label,25):'ゆっくり丁寧に')+'」を採用',
   '③ 不安TOP:「'+(tAnx?shorten(tAnx.label,22):'操作についていけるか')+'」→ 事前資料配布で解消',
   '④ 全員にマニュアル・操作ガイドを配布（復習・定着支援）',
   '⑤ 研修3ヶ月後にフォローアップ調査を実施（定着率測定）'
  ].forEach(function(act,i) {
    var y=105+i*78;
    rr(s7,60,y,800,65,'#2a5298');
    tx(s7,act,80,y+18,760,32,15,'#ffffff',i===0);
  });
  tx(s7,'Altus DX支援部門',60,510,820,28,13,'#8ab4f8',false);

  return deck;
}

// =========================================
// ユーティリティ
// =========================================
function addBlank(deck,bg) { var s=deck.appendSlide(SlidesApp.PredefinedLayout.BLANK); if(bg) s.getBackground().setSolidFill(bg); return s; }
function clearSlide(s)      { s.getPageElements().forEach(function(el){try{el.remove();}catch(e){}}); }
function bar(s,c)            { rc(s,0,0,8,540,c); }
function tx(s,text,x,y,w,h,size,color,bold) {
  var tb=s.insertTextBox(text,x,y,w,h);
  var st=tb.getText().getTextStyle();
  st.setFontSize(size||14).setBold(bold||false);
  try{st.setForegroundColor(color||'#333333');}catch(e){}
  try{st.setFontFamily('Noto Sans JP');}catch(e){try{st.setFontFamily('Arial');}catch(e2){}}
  tb.getBorder().setTransparent(); tb.getFill().setTransparent(); return tb;
}
function rc(s,x,y,w,h,color) {
  var sh=s.insertShape(SlidesApp.ShapeType.RECTANGLE,x,y,w,h);
  try{sh.getFill().setSolidFill(color||'#eeeeee');}catch(e){}
  sh.getBorder().setTransparent(); return sh;
}
function rr(s,x,y,w,h,fill) {
  var sh=s.insertShape(SlidesApp.ShapeType.ROUND_RECTANGLE,x,y,w,h);
  try{sh.getFill().setSolidFill(fill||'#f5f5f5');}catch(e){}
  sh.getBorder().setTransparent(); return sh;
}
function parseScore(val)    { if(!val) return 0; var m=val.toString().match(/^(\d)/); return m?parseInt(m[1]):0; }
function parseCheckbox(val) {
  if(!val) return [];
  var ex={'特に困っていることはない':1,'特にない':1,'特に不安はない':1};
  return val.toString().split(',').map(function(s){return s.trim();}).filter(function(s){return s.length>0&&!ex[s];});
}
function topN(obj,n) { return Object.keys(obj).map(function(k){return{label:k,count:obj[k]};}).sort(function(a,b){return b.count-a.count;}).slice(0,n); }
function calcAvg(freq) { var t=0,c=0; Object.keys(freq).forEach(function(k){t+=parseInt(k)*(freq[k]||0);c+=(freq[k]||0);}); return c>0?t/c:0; }
function calcPrio(avgs,wishes) {
  var wm={'Gmail':'Gmailの使い方・整理術','Drive':'Googleドライブでのファイル共有・フォルダ整理',
          'Docs':'Googleスプレッドシート（Excelとの違い・基本操作）','Sheets':'Googleスプレッドシート（Excelとの違い・基本操作）',
          'Calendar':'Googleカレンダーでの予定共有・会議設定','Meet':'Google Meet でのビデオ会議の使い方',
          'Chat':'複数人で同じファイルを編集する方法'};
  var tw=Object.values(wishes).reduce(function(s,v){return s+v;},1);
  return TOOLS.map(function(t){
    var avg=avgs[t.key]||0, wish=wishes[wm[t.key]]||0, wp=wish/tw;
    return{tool:t.label,key:t.key,avg:avg,score:((5-avg)/4)*0.6+wp*0.4};
  }).sort(function(a,b){return b.score-a.score;});
}
function shorten(str,len) { if(!str) return ''; return str.length>len?str.substring(0,len)+'…':str; }
