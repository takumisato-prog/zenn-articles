/**
 * 毎日のXポスト5件を自動生成してキューに保存
 * 最新AIニュース（RSS）を取得して投稿内容に反映
 *
 * 使い方:
 *   node generate-daily-x-posts.js
 *
 * cronで毎日6時に実行:
 *   0 6 * * * cd /Users/satoutakumi/AI/projects/monetize/scripts && /usr/local/bin/node generate-daily-x-posts.js >> /tmp/x-generate.log 2>&1
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const SCRIPTS_DIR = import.meta.dirname;
const MONETIZE_DIR = path.resolve(SCRIPTS_DIR, '..');
const ENV_PATH = path.join(SCRIPTS_DIR, '.env');
const QUEUE_PATH = path.join(SCRIPTS_DIR, 'x-post-queue.json');
const PROGRESS_PATH = path.join(MONETIZE_DIR, 'progress.json');

// 最新AIニュースを取得するRSSソース（日本語優先）
const RSS_SOURCES = [
  { name: 'ITmedia AI+', url: 'https://www.itmedia.co.jp/news/subtop/aiplus/rss.xml' },
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { name: 'Zenn トレンド', url: 'https://zenn.dev/feed' },
];

function loadEnv() {
  const env = fs.readFileSync(ENV_PATH, 'utf-8');
  const apiKey = env.match(/ANTHROPIC_API_KEY=(.+)/)?.[1]?.trim();
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY が .env に見つかりません');
  return { apiKey };
}

function getPostedArticles() {
  const progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'));
  return progress.posted.filter(a => a.zenn).map(a => a.title);
}

// RSSから最新ニュースタイトルを取得
async function fetchLatestAINews() {
  const headlines = [];

  for (const source of RSS_SOURCES) {
    try {
      const res = await fetch(source.url, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSS reader)' },
      });
      if (!res.ok) continue;

      const xml = await res.text();
      // タイトルをシンプルな正規表現で抽出（<item>内の<title>）
      const itemPattern = /<item[\s\S]*?<\/item>/gi;
      const titlePattern = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/i;

      const items = xml.match(itemPattern) || [];
      let count = 0;
      for (const item of items) {
        if (count >= 3) break;
        const titleMatch = item.match(titlePattern);
        const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : '';
        if (title && title.length > 5 && !title.toLowerCase().includes('rss')) {
          headlines.push(`[${source.name}] ${title}`);
          count++;
        }
      }
    } catch {
      // RSSが取れなくてもスキップ
    }
  }

  return headlines.slice(0, 8); // 最大8件
}

async function generatePosts(apiKey, articles, newsHeadlines) {
  const client = new Anthropic({ apiKey });
  const today = new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
  const articlesText = articles.length > 0
    ? articles.map((t, i) => `${i + 1}. ${t}`).join('\n')
    : '（まだ記事なし）';
  const newsText = newsHeadlines.length > 0
    ? newsHeadlines.join('\n')
    : '（取得できませんでした）';

  const prompt = `あなたはAIスタートアップ「Altus」のX（Twitter）担当です。
アカウント名: @altus_ai_jp「Altus | AI副業実験中」
コンセプト: Claude Codeで47名のAIエージェント会社を作り、本当に稼げるか実験中。全記録を公開。

今日（${today}）のX投稿を5件作成してください。

■ 公開済み記事:
${articlesText}

■ 今日の最新AIニュース（RSSより取得）:
${newsText}

【投稿の黄金比率】
- 投稿1（7時用）: Claude Code Tips（具体的・すぐ使える知識）
- 投稿2（11時用）: 実験の進捗報告（数字・リアルな出来事・失敗も含む）
- 投稿3（14時用）: フォロワーへの問いかけ（RT・いいねを誘発する質問）
- 投稿4（18時用）: 上記の最新AIニュースから1つ選んでコメント付きで紹介（自分の視点必須）
- 投稿5（21時用）: 記事告知 or 本音・今日の振り返り

ルール:
- 各投稿は140文字以内（日本語。短いほど読まれる）
- 改行を効果的に使う（3〜5行が理想）
- ハッシュタグは最大2個まで（#ClaudeCode #AI副業 #AIエージェント から選ぶ）
- 「等身大のリアルな発信」が基本。過度な宣伝・大げさな表現NG
- 投稿3は必ず「？」で終わる問いかけにする
- 投稿4はニュースのURLを含めず、内容を要約して自分のコメントを添える
- 投稿番号と本文のみ出力（説明不要）

出力形式:
---投稿1---
（本文）

---投稿2---
（本文）

---投稿3---
（本文）

---投稿4---
（本文）

---投稿5---
（本文）`;

  console.log('Claude APIで5件のXポストを生成中...');
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = response.content[0].text;

  // 投稿を分割して抽出
  const posts = [];
  const sections = rawText.split(/---投稿\d+---/).map(s => s.trim()).filter(Boolean);
  for (const section of sections) {
    if (section.length > 5) posts.push(section);
  }

  return posts.slice(0, 5);
}

async function main() {
  console.log('========================================');
  console.log('  Xデイリーポスト生成（最新AIニュース対応）');
  console.log(`  ${new Date().toLocaleString('ja-JP')}`);
  console.log('========================================');

  const { apiKey } = loadEnv();
  const articles = getPostedArticles();

  // 最新AIニュースを取得
  console.log('\n最新AIニュースを取得中...');
  const newsHeadlines = await fetchLatestAINews();
  if (newsHeadlines.length > 0) {
    console.log(`✅ ${newsHeadlines.length}件のニュースを取得`);
    newsHeadlines.forEach(h => console.log(`  - ${h.slice(0, 60)}`));
  } else {
    console.log('⚠️  ニュース取得に失敗（ニュースなしで生成します）');
  }

  const posts = await generatePosts(apiKey, articles, newsHeadlines);

  if (posts.length === 0) {
    console.error('❌ ポストの生成に失敗しました');
    process.exit(1);
  }

  // キューに保存（夜に実行するため翌日の日付を使用）
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const queue = {
    date: tomorrow.toISOString().slice(0, 10),
    news_fetched: newsHeadlines.length,
    posts: posts.map((text, i) => ({
      index: i + 1,
      text,
      posted: false,
      scheduled_time: ['7:00', '11:00', '14:00', '18:00', '21:00'][i],
    })),
  };

  fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2), 'utf-8');
  console.log(`\n✅ ${posts.length}件のポストをキューに保存しました`);
  console.log(`保存先: ${QUEUE_PATH}`);
  console.log('\n【生成内容プレビュー】');
  posts.forEach((p, i) => {
    const time = queue.posts[i].scheduled_time;
    console.log(`\n[${i + 1}] ${time} 予定`);
    console.log(p.slice(0, 80) + (p.length > 80 ? '...' : ''));
  });
}

main().catch(err => {
  console.error('エラー:', err.message);
  process.exit(1);
});
