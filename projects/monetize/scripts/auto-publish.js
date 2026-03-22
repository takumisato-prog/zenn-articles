/**
 * 記事自動生成 + Zenn投稿スクリプト
 *
 * 使い方:
 *   node auto-publish.js          # 次の記事を自動生成してZennに投稿
 *   node auto-publish.js --dry-run # ファイル生成のみ（投稿しない）
 *
 * cronで毎日実行する例:
 *   0 7 * * * cd /Users/satoutakumi/AI/projects/monetize/scripts && node auto-publish.js >> /tmp/auto-publish.log 2>&1
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
// progress.jsonから次の記事番号を取得
// ========================================
function getNextArticle(progress) {
  return progress.next_article_index;
}

// ========================================
// article-lineup.mdから指定番号の記事情報を取得
// ========================================
function getArticleSpec(lineupContent, index) {
  // 「### 記事N」のセクションを抽出
  const pattern = new RegExp(
    `### 記事${index}【.+?】[\\s\\S]+?(?=### 記事${index + 1}|## フェーズ|### マガジン|$)`,
    'g'
  );
  const match = lineupContent.match(pattern);
  if (!match) throw new Error(`記事${index}の仕様が article-lineup.md に見つかりません`);
  return match[0].trim();
}

// ========================================
// Claude APIで記事を生成
// ========================================
async function generateArticle(client, articleSpec, existingArticle) {
  console.log('📝 Claude APIで記事を生成中...');

  const systemPrompt = `あなたはClaude Codeの専門家として、Zenn向けの技術記事を執筆します。

## 執筆ルール
- 文体: 一人称・体験談ベース（「自分は」「実際にやってみた」）
- トーン: 親しみやすく、でも具体的
- 構成: H2で章立て、コードブロックを必ず含める
- 文字数: 2,500〜4,000字
- 冒頭: 読者の悩みや疑問から入る
- 末尾: 次の記事への予告とフォロー誘導
- コード例: 実際に動くものを必ず含める

## 出力形式
マークダウン形式で、最初の行を「# タイトル」で始めること。
フロントマター（---）は不要。`;

  const userPrompt = `以下の仕様に基づいて記事を執筆してください。

## 記事仕様
${articleSpec}

## 参考（既存記事のスタイル）
${existingArticle ? existingArticle.substring(0, 500) + '...' : 'なし'}

記事を執筆してください。`;

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
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
  const nextIndex = getNextArticle(progress);
  console.log(`📌 次の記事: 記事${nextIndex}`);

  // article-lineup.md 読み込み
  const lineupContent = fs.readFileSync(LINEUP_PATH, 'utf-8');
  let articleSpec;
  try {
    articleSpec = getArticleSpec(lineupContent, nextIndex);
  } catch {
    console.log('✅ 全記事が完了しています。article-lineup.md に新しい記事を追加してください。');
    process.exit(0);
  }
  console.log(`📋 記事仕様を取得しました\n`);

  // 既存記事1をスタイル参考に読み込む
  const article01Path = path.join(MONETIZE_DIR, 'article-01.md');
  const existingArticle = fs.existsSync(article01Path)
    ? fs.readFileSync(article01Path, 'utf-8')
    : null;

  // 記事生成
  const articleContent = await generateArticle(client, articleSpec, existingArticle);

  // ファイルに保存
  const articleFileName = `article-${String(nextIndex).padStart(2, '0')}.md`;
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
    status: 'auto-generated',
  });
  progress.next_article_index = nextIndex + 1;
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2), 'utf-8');
  console.log(`✅ progress.json を更新しました (次: 記事${nextIndex + 1})`);

  console.log('\n🎉 完了！');
  console.log(`   記事${nextIndex}「${title}」をZennに公開しました`);
}

main().catch((err) => {
  console.error('\n❌ エラー:', err.message);
  process.exit(1);
});
