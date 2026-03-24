/**
 * ============================================================
 * Altus コンテンツ自動生成スクリプト
 * ============================================================
 *
 * 動作概要:
 *  - Googleワークスペース小ネタ記事 × 週5本
 *  - Amazon販売ノウハウ記事 × 週5本
 *  - 各記事をGoogleドキュメントとして指定フォルダに保存
 *
 * セットアップ手順:
 *  1. Apps Scriptエディタ → 歯車アイコン（プロジェクトの設定）→
 *     スクリプトプロパティに CLAUDE_API_KEY を追加
 *  2. setupWeeklyTrigger() を1回実行（毎週月曜9時に自動実行）
 *  3. generateWeeklyArticles() を手動実行してテスト確認
 */

// ============================================================
// 設定
// ============================================================

// ドライブフォルダID
const GWS_FOLDER_ID    = '1D2bYPRC2lZ_n9G6D8_zoknEVMP_6YMOW';
const AMAZON_FOLDER_ID = '1Omeg88bBO10he33_iiFXGl9I40TTUk0Z';

// Claude API
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL   = 'claude-sonnet-4-6';

// 1記事あたりの目標文字数
const ARTICLE_LENGTH = '600〜800文字';

// ============================================================
// GWSトピックリスト（20週分）
// ============================================================
const GWS_TOPICS = [
  'Gmailのフィルターとラベルで受信トレイを自動整理する方法',
  'Googleドライブの共有権限「閲覧者/コメント可/編集者」の正しい使い分け',
  'Google Meetで録画・文字起こし機能を使う方法',
  'Googleカレンダーで複数人の空き時間を一目で確認する方法',
  'Googleフォームで申し込みフォームを30分で作る方法',
  'Gmail「送信取り消し」機能の設定と活用テクニック',
  'Googleドライブの検索機能を使いこなす方法（ファイルタイプ・更新日・オーナー指定）',
  'Google スプレッドシートのVLOOKUP・IF・SUMIFを使いこなす',
  'Googleドキュメントで議事録テンプレートを作成・共有する方法',
  'Googleチャットで業務連絡を効率化する方法（スペース・メンション活用）',
  'Googleカレンダーの繰り返しイベントと会議室予約の設定方法',
  'Google スプレッドシートでピボットテーブルを使ったデータ分析',
  'Googleフォームの回答をスプレッドシートに自動記録・集計する方法',
  'Googleドキュメントの音声入力機能で議事録を瞬時に作成する方法',
  'Google Meetのブレイクアウトルームで研修・ワークショップを効率化',
  'Gmailのスヌーズ機能とToDoリストで仕事を管理する方法',
  'Googleドライブのオフラインモード設定とファイル同期の仕組み',
  'Googleサイトで社内ポータルを無料で作る方法',
  'Google スプレッドシートの条件付き書式で数値をビジュアル化する方法',
  'Gmail署名の設定と複数署名の切り替え術',
];

// ============================================================
// Amazonトピックリスト（20週分）
// ============================================================
const AMAZON_TOPICS = [
  'セラーセントラルへの初回ログインと基本設定の手順',
  'Amazonで商品を新規出品する手順（JANコードなしの場合も解説）',
  'FBAの始め方：納品プラン作成から在庫送付まで完全ガイド',
  'Amazonのスポンサープロダクト広告の設定方法と効果的な使い方',
  'セラーセントラルの注文管理：受注確認から発送完了までの流れ',
  'Amazon商品ページを最適化する方法（タイトル・箇条書き・商品説明）',
  'Amazonの商品写真規格と登録ルール（メイン画像・サブ画像の違い）',
  'FBAの手数料計算方法とコスト管理のポイント',
  'Amazonのキーワードリサーチ：検索されているワードを見つける方法',
  'セラーセントラルのレポート機能で売上・在庫を分析する方法',
  'Amazonのレビュー依頼機能の正しい使い方（規約に沿った方法）',
  'スポンサープロダクト広告のキーワードマッチタイプ（完全・フレーズ・部分）解説',
  'FBAと自己発送（MFN）の選び方と使い分けの基準',
  'Amazonの返品・返金対応の流れと処理方法',
  'セラーセントラルのQ&Aと購入者メッセージへの対応方法',
  'AmazonのACOS・ROASの見方と広告効果を改善する方法',
  'スポンサーブランド広告の設定と活用法（ブランド登録が必要）',
  'Amazonバリエーション商品（サイズ・カラー展開）の登録方法',
  'セラーセントラルのアカウントヘルス管理と評価維持のポイント',
  'Amazon価格設定戦略：競合に負けない価格競争力の作り方',
];

// ============================================================
// メイン関数：週次で10本の記事を生成
// ============================================================
function generateWeeklyArticles() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  if (!apiKey) {
    Logger.log('❌ CLAUDE_API_KEY が設定されていません。プロジェクトの設定 → スクリプトプロパティに追加してください。');
    return;
  }

  // 今週のトピックインデックスを取得（週番号ベースで循環）
  const weekNumber = getWeekNumber(new Date());
  const topicIndex = weekNumber % GWS_TOPICS.length;

  Logger.log(`📅 今週の記事生成を開始します（週番号: ${weekNumber}、トピックインデックス: ${topicIndex}〜）`);

  let successCount = 0;
  let errorCount   = 0;

  // GWS記事を5本生成
  for (let i = 0; i < 5; i++) {
    const idx   = (topicIndex + i) % GWS_TOPICS.length;
    const topic = GWS_TOPICS[idx];
    try {
      const { title, content } = generateGwsArticle(topic, apiKey);
      saveToDrive(title, content, GWS_FOLDER_ID);
      Logger.log(`✅ GWS記事 ${i + 1}/5: 「${title}」を保存しました`);
      successCount++;
      Utilities.sleep(2000); // API制限対策
    } catch (e) {
      Logger.log(`❌ GWS記事 ${i + 1}/5 エラー: ${e.message}`);
      errorCount++;
    }
  }

  // Amazon記事を5本生成
  for (let i = 0; i < 5; i++) {
    const idx   = (topicIndex + i) % AMAZON_TOPICS.length;
    const topic = AMAZON_TOPICS[idx];
    try {
      const { title, content } = generateAmazonArticle(topic, apiKey);
      saveToDrive(title, content, AMAZON_FOLDER_ID);
      Logger.log(`✅ Amazon記事 ${i + 1}/5: 「${title}」を保存しました`);
      successCount++;
      Utilities.sleep(2000); // API制限対策
    } catch (e) {
      Logger.log(`❌ Amazon記事 ${i + 1}/5 エラー: ${e.message}`);
      errorCount++;
    }
  }

  Logger.log(`\n📊 生成完了: 成功 ${successCount}本 / エラー ${errorCount}本`);
}

// ============================================================
// GWS記事を生成
// ============================================================
function generateGwsArticle(topic, apiKey) {
  const prompt = `あなたはGoogleワークスペース（Google Workspace）の専門家です。
中小企業の経営者・担当者向けに、以下のトピックについてHP掲載用の記事を書いてください。

トピック：${topic}

【記事の方針】
- ターゲット: Googleワークスペースをなんとなく使っているが、使いこなせていない中小企業の担当者
- トーン: わかりやすく親しみやすい。専門用語は使うが必ず解説を入れる
- 文字数: ${ARTICLE_LENGTH}
- 冒頭に記事タイトルを「## タイトル：」の形式で書く
- 「実は知らない人が多い」「意外と知られていない」などの表現で読者の興味を引く

【必須の構成・フォーマット】
1. 冒頭: 「こんな悩みありませんか？」で読者の共感を引き出す（箇条書きで3つ）
2. 「この記事でわかること」を箇条書きで3点
3. 本文: 手順や方法を ## 見出し で区切って説明
4. 手順がある場合は「STEP 1 / STEP 2 / STEP 3」の形式で番号付きで書く
5. 重要ポイントは「✅ ポイント：〜」の形式で強調
6. 比較・一覧がある場合はMarkdownの表（| 列1 | 列2 |）で整理する
7. まとめ: 「まとめ」の見出しで3行以内にまとめる

記事本文のみを出力してください（余計な前置きは不要）。`;

  return callClaudeApi(prompt, apiKey);
}

// ============================================================
// Amazon販売記事を生成
// ============================================================
function generateAmazonArticle(topic, apiKey) {
  const prompt = `あなたはAmazon販売の専門家です。
Amazon出品を始めたばかり、または出品に興味がある事業者向けに、以下のトピックについてHP掲載用の記事を書いてください。

トピック：${topic}

【記事の方針】
- ターゲット: Amazon販売を始めたい・始めたばかりの中小企業・個人事業主
- トーン: わかりやすく丁寧。初心者でも迷わないよう具体的に解説
- 文字数: ${ARTICLE_LENGTH}
- 冒頭に記事タイトルを「## タイトル：」の形式で書く

【必須の構成・フォーマット】
1. 冒頭: 「こんな疑問ありませんか？」で読者の共感を引き出す（箇条書きで3つ）
2. 「この記事でわかること」を箇条書きで3点
3. 本文: 手順や方法を ## 見出し で区切って説明
4. 手順がある場合は「STEP 1 / STEP 2 / STEP 3」の形式で番号付きで書く
5. 重要ポイントは「✅ ポイント：〜」の形式で強調
6. 比較・一覧がある場合はMarkdownの表（| 列1 | 列2 |）で整理する
7. まとめ: 「まとめ」の見出しで3行以内にまとめる
8. 記事の末尾に必ず以下のCTAセクションを追加する：

---
## Amazonで販売を始めたいけど、何から手をつければいいかわからない方へ

「セラーセントラルの設定が複雑でわからない」「広告の費用対効果をどう改善すればいいの？」
そんなお悩みは、ぜひ**株式会社ふじサンバ**にご相談ください。

Amazon販売の立ち上げから、商品ページ最適化・広告運用まで、ワンストップで支援しています。
初回相談は無料です。お気軽にお問い合わせください。
---

記事本文のみを出力してください（余計な前置きは不要）。`;

  return callClaudeApi(prompt, apiKey);
}

// ============================================================
// Claude APIを呼び出す
// ============================================================
function callClaudeApi(prompt, apiKey) {
  const payload = {
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(CLAUDE_API_URL, options);
  const statusCode = response.getResponseCode();

  if (statusCode !== 200) {
    throw new Error(`Claude API エラー (${statusCode}): ${response.getContentText()}`);
  }

  const json    = JSON.parse(response.getContentText());
  const rawText = json.content[0].text;

  // タイトルと本文を分離
  const titleMatch = rawText.match(/##\s*タイトル[：:]\s*(.+)/);
  const title      = titleMatch ? titleMatch[1].trim() : `記事_${Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd_HHmmss')}`;
  const body       = rawText.replace(/##\s*タイトル[：:]\s*.+\n?/, '').trim();

  return { title, content: body };
}

// ============================================================
// GoogleドライブにGoogleドキュメントを保存
// ============================================================
function saveToDrive(title, content, folderId) {
  // Googleドキュメントを新規作成
  const doc  = DocumentApp.create(title);
  const body = doc.getBody();

  // タイトルスタイル
  body.clear();
  body.appendParagraph(title).setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(''); // 空行

  // 本文（改行ごとに段落を追加）
  const lines = content.split('\n');
  lines.forEach(line => {
    if (line.startsWith('## ')) {
      body.appendParagraph(line.replace('## ', '')).setHeading(DocumentApp.ParagraphHeading.HEADING2);
    } else if (line.startsWith('### ')) {
      body.appendParagraph(line.replace('### ', '')).setHeading(DocumentApp.ParagraphHeading.HEADING3);
    } else if (line.trim() === '---') {
      body.appendHorizontalRule();
    } else if (line.trim() !== '') {
      body.appendParagraph(line);
    }
  });

  // 生成日時をフッターに追加
  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy年MM月dd日 生成');
  body.appendParagraph('').appendText('\n' + today).setFontSize(9).setForegroundColor('#999999');

  doc.saveAndClose();

  // 指定フォルダに移動
  const file   = DriveApp.getFileById(doc.getId());
  const folder = DriveApp.getFolderById(folderId);
  folder.addFile(file);
  DriveApp.getRootFolder().removeFile(file); // マイドライブのルートから削除

  return doc.getId();
}

// ============================================================
// 週番号を取得（年初からの週数）
// ============================================================
function getWeekNumber(date) {
  const d       = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum  = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ============================================================
// 週次トリガーのセットアップ（初回1回だけ実行）
// ============================================================
function setupWeeklyTrigger() {
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'generateWeeklyArticles') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // 毎週月曜日 9:00 に実行
  ScriptApp.newTrigger('generateWeeklyArticles')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(9)
    .create();

  Logger.log('✅ 週次トリガーをセットアップしました（毎週月曜 9:00 実行）');
}

// ============================================================
// トリガーを全削除（リセット用）
// ============================================================
function deleteAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log(`✅ ${triggers.length}件のトリガーを削除しました`);
}

// ============================================================
// 動作確認用：1本だけテスト生成
// ============================================================
function testGenerateSingleArticle() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  if (!apiKey) {
    Logger.log('❌ CLAUDE_API_KEY が設定されていません');
    return;
  }

  Logger.log('🧪 テスト: GWS記事1本を生成します...');
  const { title, content } = generateGwsArticle(GWS_TOPICS[0], apiKey);
  Logger.log(`\n【タイトル】\n${title}\n\n【本文プレビュー（先頭200文字）】\n${content.slice(0, 200)}...`);
  Logger.log('\n✅ テスト完了（ドライブへの保存はスキップ）');
}
