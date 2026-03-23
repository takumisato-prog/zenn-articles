/**
 * 記事自動生成 + Zenn投稿スクリプト
 *
 * 使い方:
 *   node auto-publish.js          # 次の記事を自動生成してZennに投稿
 *   node auto-publish.js --dry-run # ファイル生成のみ（投稿しない）
 *
 * cronで毎日9時に実行:
 *   0 9 * * * cd /Users/satoutakumi/AI/projects/monetize/scripts && /usr/local/bin/node auto-publish.js >> /tmp/auto-publish.log 2>&1
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SCRIPTS_DIR = import.meta.dirname;
const MONETIZE_DIR = path.resolve(SCRIPTS_DIR, '..');
const ENV_PATH = path.join(SCRIPTS_DIR, '.env');
const PROGRESS_PATH = path.join(MONETIZE_DIR, 'progress.json');
const LINEUP_PATH = path.join(MONETIZE_DIR, 'article-lineup.md');

// ========================================
// .envを読み込む
// ========================================
function loadEnv() {
  const env = fs.readFileSync(ENV_PATH, 'utf-8');
  const apiKey = env.match(/ANTHROPIC_API_KEY=(.+)/)?.[1]?.trim();
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY が .env に見つかりません');
  return { apiKey };
}

// ========================================
// 投稿済みタイトル一覧を取得
// ========================================
function getPostedTitles(progress) {
  return progress.posted.map((p) => p.title).filter(Boolean);
}

// ========================================
// 既存記事のサンプルを読み込む（スタイル参考用）
// ========================================
function loadExistingArticles() {
  const samples = [];
  for (let i = 1; i <= 3; i++) {
    const p = path.join(MONETIZE_DIR, `article-0${i}.md`);
    if (fs.existsSync(p)) {
      // 各記事の冒頭2,000字をサンプルとして渡す
      samples.push(fs.readFileSync(p, 'utf-8').substring(0, 2000));
    }
  }
  return samples.join('\n\n---\n\n');
}

// ========================================
// article-lineup.mdから指定番号の記事仕様を取得
// ========================================
function getArticleSpec(lineupContent, index) {
  const pattern = new RegExp(
    `### 記事${index}【.+?】[\\s\\S]+?(?=### 記事${index + 1}|## フェーズ|### マガジン|$)`,
    'g'
  );
  const match = lineupContent.match(pattern);
  if (!match) return null;
  return match[0].trim();
}

// ========================================
// 記事5〜10消化後: 派生テーマをAIが自動生成
// ========================================
async function generateNewTheme(client, postedTitles) {
  console.log('🧠 既存記事から派生テーマを自動生成中...');

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `あなたはZennで人気のClaude Code・AI活用・副業ブロガーです。

## 投稿済み記事タイトル（これと被らないこと）
${postedTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}

## 条件
- Claude Code・AI活用・副業・自動化・プロンプトエンジニアリングのテーマ
- 上記の投稿済み記事の「派生・深掘り・応用」となるテーマ
- Zennで検索されやすく、バズりやすいテーマ
- 3,000〜5,000字で書ける具体的なテーマ

## 出力形式
以下のJSON形式のみで出力（説明不要）：
{
  "title": "記事タイトル（バズりやすい表現で）",
  "theme": "テーマの一行説明",
  "key_points": ["ポイント1", "ポイント2", "ポイント3"],
  "target_reader": "想定読者"
}`,
      },
    ],
  });

  const raw = msg.content[0].text;
  // JSONを抽出
  const jsonMatch = raw.match(/\{[\s\S]+\}/);
  if (!jsonMatch) throw new Error('派生テーマのJSON生成に失敗しました');
  return JSON.parse(jsonMatch[0]);
}

// ========================================
// Claude APIで高品質な記事を生成
// ========================================
async function generateArticle(client, articleSpec, existingArticlesSample, postedTitles) {
  console.log('📝 Claude APIで高品質記事を生成中（3,000〜5,000字）...');

  const systemPrompt = `あなたはClaude Code・AI活用・副業分野で実体験を持つプロブロガーです。
Zennで月間数万PVを獲得する、読者を引き込む技術記事を執筆します。

## 記事の絶対条件
- 文字数: 3,000〜5,000字（これより少ない記事は失格）
- 冒頭3行: 読者の「あるある」な悩みか、驚きの事実から始める
- 具体性: 「できます」ではなく「自分がこうやったら○○になった」という体験ベース
- コードブロック: 必ず2〜4箇所含める（コピペで動く実際のコード）
- 見出し構成: ## が5〜8個、各セクション300字以上で充実させる
- 末尾: フォロー誘導（「次回は○○を書きます」「いいねをもらえると励みになります」）

## 文体のルール
- 一人称は「自分」（「私」「僕」「俺」は使わない）
- 断言調を使う（「〜だと思います」より「〜だ」「〜である」）
- 読者への問いかけを各章に1つ入れる（「あなたはどうだろうか？」など）
- 数字・固有名詞・具体的なツール名を積極的に使う

## バズるタイトルの条件（以下のいずれかを含める）
- 数字（「3つの方法」「5分で」「10倍」）
- 驚き・逆説（「○○は間違っていた」「実は○○」「〜していなかったことに気づいた」）
- 実体験（「○○したら△△になった」「○○してみた」）

## 出力形式
マークダウン形式で最初の行を「# タイトル」で始めること。
フロントマター（---）は不要。`;

  const postedList = postedTitles.length > 0
    ? `\n## 投稿済み記事（内容が被らないよう注意）\n${postedTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`
    : '';

  const userPrompt = `以下の仕様に基づいて、読者を引き込む高品質な記事を執筆してください。
${postedList}
## 記事仕様
${articleSpec}

## 参考（既存記事のスタイル・文体）
${existingArticlesSample || 'なし'}

必ず3,000字以上の充実した記事を書いてください。`;

  const msg = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 8192,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  });

  return msg.content[0].text;
}

// ========================================
// メイン処理
// ========================================
async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const now = new Date().toISOString();
  console.log(`\n========================================`);
  console.log(`  Altus 自動記事生成 + Zenn投稿`);
  console.log(`  ${now}`);
  console.log(`========================================\n`);

  // 環境読み込み
  const { apiKey } = loadEnv();
  const client = new Anthropic({ apiKey });

  // progress.json 読み込み
  const progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'));
  const nextIndex = progress.next_article_index;
  const postedTitles = getPostedTitles(progress);
  console.log(`📌 次の記事インデックス: ${nextIndex}`);
  console.log(`📚 投稿済み記事数: ${postedTitles.length}本\n`);

  // 既存記事のサンプル読み込み（スタイル参考）
  const existingArticlesSample = loadExistingArticles();

  // article-lineup.mdから仕様を取得（なければ派生テーマを自動生成）
  const lineupContent = fs.readFileSync(LINEUP_PATH, 'utf-8');
  const articleSpecFromLineup = getArticleSpec(lineupContent, nextIndex);

  let articleSpec;
  let articleFileName;
  let isAutoTheme = false;

  if (articleSpecFromLineup) {
    // ラインナップに仕様あり → そのまま使用
    articleSpec = articleSpecFromLineup;
    articleFileName = `article-${String(nextIndex).padStart(2, '0')}.md`;
    console.log(`📋 ラインナップから記事仕様を取得しました (記事${nextIndex})\n`);
  } else {
    // ラインナップ終了 → AIが派生テーマを自動生成
    console.log(`📋 ラインナップを使い切りました。AIが派生テーマを自動生成します...\n`);
    isAutoTheme = true;
    const theme = await generateNewTheme(client, postedTitles);
    console.log(`💡 生成テーマ: ${theme.title}`);
    articleSpec = `タイトル: ${theme.title}
テーマ: ${theme.theme}
キーポイント:
${theme.key_points.map((p) => `- ${p}`).join('\n')}
想定読者: ${theme.target_reader}`;
    // auto-generatedは連番で管理
    const autoIndex = nextIndex;
    articleFileName = `article-auto-${autoIndex}.md`;
  }

  // 記事生成
  const articleContent = await generateArticle(client, articleSpec, existingArticlesSample, postedTitles);

  // 文字数を計算して表示
  const charCount = articleContent.length;
  console.log(`\n✅ 記事生成完了: ${charCount.toLocaleString()}字`);

  // ファイルに保存
  const articlePath = path.join(MONETIZE_DIR, articleFileName);
  fs.writeFileSync(articlePath, articleContent, 'utf-8');
  console.log(`✅ 記事を保存しました: ${articleFileName}`);

  // タイトル表示
  const titleMatch = articleContent.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : `記事${nextIndex}`;
  console.log(`   タイトル: ${title}`);

  if (dryRun) {
    console.log('\n⏭️  --dry-run モード: Zenn投稿をスキップしました');
    console.log(`   ファイルを確認: ${articlePath}`);
    return;
  }

  // Zennに投稿
  console.log('\n🚀 Zennに投稿します...');
  const publishScript = path.join(SCRIPTS_DIR, 'publish-zenn.js');
  execSync(`node "${publishScript}" "${articlePath}"`, { stdio: 'inherit' });

  // progress.json を更新
  const today = new Date().toISOString().split('T')[0];
  progress.posted.push({
    index: nextIndex,
    title,
    file: articleFileName,
    zenn: true,
    note: false,
    date: today,
    status: isAutoTheme ? 'auto-theme-generated' : 'auto-generated',
  });
  progress.next_article_index = nextIndex + 1;
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2), 'utf-8');
  console.log(`✅ progress.json を更新しました (次: ${nextIndex + 1})`);

  console.log('\n🎉 完了！');
  console.log(`   「${title}」をZennに公開しました`);
}

main().catch((err) => {
  console.error('\n❌ エラー:', err.message);
  process.exit(1);
});
