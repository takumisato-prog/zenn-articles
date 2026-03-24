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
  // GitHub Actions 環境では process.env から読む
  if (process.env.ANTHROPIC_API_KEY) {
    return { apiKey: process.env.ANTHROPIC_API_KEY };
  }
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error('ANTHROPIC_API_KEY が環境変数にも .env にも見つかりません');
  }
  const env = fs.readFileSync(ENV_PATH, 'utf-8');
  const apiKey = env.match(/ANTHROPIC_API_KEY=(.+)/)?.[1]?.trim();
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY が .env に見つかりません');
  return { apiKey };
}

function getPostedArticles() {
  try {
    const progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'));
    return progress.posted.filter(a => a.zenn).map(a => a.title);
  } catch {
    return []; // GitHub Actions 環境など progress.json がない場合はスキップ
  }
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

  const prompt = `あなたはバイラルXコンテンツの専門家です。AIスタートアップ「Altus」の@altus_ai_jp担当として、
フォロワーが「保存・RT・いいね」したくなる投稿を5件作ります。

アカウント: @altus_ai_jp「Altus | AI副業実験中」
コンセプト: Claude Codeで47名のAIエージェント会社を作り、本当に稼げるか全記録公開中。
フォロワー像: AIや副業に興味があるが「自分には難しそう」と感じているサラリーマン・フリーランス。

今日（${today}）のX投稿を5件作成してください。

■ 公開済み記事:
${articlesText}

■ 今日の最新AIニュース（RSSより取得）:
${newsText}

【投稿タイプ別指定】
- 投稿1（7時）: Claude Code Tips ── コピペして明日すぐ使える具体的な技。「これ知らなかった」と思わせる
- 投稿2（11時）: 実験の進捗・失敗談 ── リアルな数字と感情を含む。成功より失敗の方が読まれる
- 投稿3（14時）: 問いかけ ── 「どっちか？」「あなたは？」の二択 or 本音が引き出せる質問。必ず「？」で終わる
- 投稿4（18時）: 最新AIニュースへの独自コメント ── 「だから自分はこうする」という一人称の視点が必須。URLは不要
- 投稿5（21時）: 今日の学び・本音 ── 短く・鋭く・余韻を残す。翌朝も見たくなる終わり方

【1行目（フック）の絶対ルール】
1行目が読まれるかどうかを決める。次のいずれかの感情を起こすこと:
「え？」「わかる」「知らなかった」「自分も同じだ」「なんで？」

★良いフック例（参考にしてよい）:
「AIエージェント47体、稼働率65%だった。」
「昨日、3時間の作業が30秒になった。」
「正直に言う。全然うまくいってない。」
「Claude Codeに怒られた話をします。」
「副業で稼ぐより、指示文を書く力の方が大事だと気づいた。」

✗ダメなフック（絶対使用禁止）:
「〜の方法を紹介します」「今日は〜について」「実は〜なんです」
「〜ですが〜です」「〜について解説します」

【文章フォーマットルール】
- 1文は15字以内（テンポを生む。詰め込み禁止）
- 改行で「間」を作る（詰まった文章は読まれない）
- 最後の1行は「オチ」か「余韻」か「問いかけ」で締める
- 「です・ます」で終わらない（断言 or 問いかけ調にする）

【品質チェック（出力前に必ず確認）】
□ 1行目を読んで「続きが気になる」か？
□ 「保存したい」情報が入っているか、または「共感で保存したい」か？
□ 「RTしてフォロワーに教えたい」内容か？
□ 140文字以内か？

【禁止事項】
- 140文字超
- ハッシュタグ3個超（#ClaudeCode #AI副業 #AIエージェント から最大2個）
- URLの記載
- 大げさな誇大表現（「圧倒的」「最強」「人生変わる」等）

出力形式（本文のみ。前置き・説明・コメント一切不要）:
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
    model: 'claude-opus-4-6',
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
