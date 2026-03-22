/**
 * 静岡・東海 消費者向けXアカウント デイリーポスト生成
 * グルメ・観光・生活情報を曜日別テーマで5件/日自動生成
 *
 * 使い方:
 *   node generate-tokai-x-posts.js
 *
 * cronで毎日7:00に実行:
 *   0 7 * * * cd /Users/satoutakumi/AI/projects/monetize/scripts && /usr/local/bin/node generate-tokai-x-posts.js >> /tmp/tokai-x-generate.log 2>&1
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const SCRIPTS_DIR = import.meta.dirname;
const ENV_PATH = path.join(SCRIPTS_DIR, '.env');
const QUEUE_PATH = path.join(SCRIPTS_DIR, 'tokai-x-post-queue.json');

const SCHEDULED_TIMES = ['9:00', '13:00', '16:00', '20:00', '22:00'];

// 曜日別テーマ（グルメ・観光・生活情報を週でローテーション）
const WEEKDAY_THEMES = {
  0: { name: '日曜', pillar: 'まとめ', theme: '今週のおすすめスポット・グルメのまとめ＆来週のおでかけ予告' },
  1: { name: '月曜', pillar: 'グルメ', theme: '静岡・東海のおすすめ飲食店・カフェ・B級グルメ（週明けに行きたくなるお店）' },
  2: { name: '火曜', pillar: '観光', theme: '週末おでかけスポット・穴場・映えスポット（静岡・東海エリア）' },
  3: { name: '水曜', pillar: '生活情報', theme: '地域イベント・季節のお知らせ・地元民が知っている便利情報' },
  4: { name: '木曜', pillar: 'グルメ深掘り', theme: 'ご当地グルメ・名物・食べ歩き・静岡・東海の食文化深掘り' },
  5: { name: '金曜', pillar: 'おでかけ計画', theme: '週末のドライブコース・おでかけ計画・今週末行くべきスポット' },
  6: { name: '土曜', pillar: '地域ネタ', theme: '静岡・東海の豆知識・文化・歴史・地元民が誇るローカルネタ' },
};

function loadEnv() {
  const env = fs.readFileSync(ENV_PATH, 'utf-8');
  const apiKey = env.match(/ANTHROPIC_API_KEY=(.+)/)?.[1]?.trim();
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY が .env に見つかりません');
  return { apiKey };
}

async function generatePosts(apiKey) {
  const client = new Anthropic({ apiKey });
  const now = new Date();
  const dayInfo = WEEKDAY_THEMES[now.getDay()];
  const today = now.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });

  const prompt = `あなたは静岡・東海地方の地域情報を発信するXアカウントの担当者です。

アカウント情報:
- コンセプト: 静岡・東海在住・訪問者向けにグルメ・観光・生活情報を毎日発信する地域メディアアカウント
- ターゲット: 静岡・愛知・岐阜・三重在住または旅行に来る20〜40代の一般消費者
- 対象エリア: 静岡県全域・愛知県・岐阜県・三重県（東海地方全体）
- 口調: 地元好きな友人が教えてくれるような、親しみやすくカジュアルなトーン
- 絵文字: 1投稿1〜2個まで（使いすぎない）

今日（${today}）のX投稿テーマ: 【${dayInfo.name}・${dayInfo.pillar}】${dayInfo.theme}

今日のX投稿を5件作成してください。

■ 文体の絶対ルール（最重要）:
- 1行目は必ず「続きが読みたくなるフック」で始める
  良い例:「静岡県民だけが知っている事実がある」「これ知らずに静岡旅行するの？」「さわやかに2時間並ぶ人の気持ちがやっとわかった」
  ダメな例:「静岡のグルメを紹介します」「今日のおすすめは〜」
- テンポよく短い文を積み重ねる（1文15字以内が理想）
- 最後の1行で「オチ」か「余韻」を残す
- 読んだ人が「わかるわかる」「え、知らなかった」「誰かに言いたい」と思う内容にする
- 真面目な情報でも、ちょっとクスッとくる言い回しを入れる

■ 投稿タイプ指定:
- 投稿1（9:00用）: 衝撃の事実・地元民常識・県外民びっくり系（「え、これ全国区じゃないの？」感）
- 投稿2（13:00用）: 地元民あるある・共感爆発系（静岡・東海育ちなら絶対わかるやつ）
- 投稿3（16:00用）: 二択・議論系（「あなたはどっち派？」で必ず終わる。派閥争いを生む内容）
- 投稿4（20:00用）: 「知ってると自慢できる」豆知識・トリビア（誰かに話したくなる系）
- 投稿5（22:00用）: 締めの一言系（短く・余韻があって・明日も見たくなる）

■ 絶対ルール:
- 各投稿は140文字以内（日本語）
- 改行は1〜2行ごと（読みやすくテンポよく）
- 必ず #静岡 または #東海 を含める
- ハッシュタグは1投稿最大4個まで（多すぎると野暮ったい）
- 投稿3は必ず「どっち派？」か「あなたは？」で終わること
- 実在しない店名・スポット名は使わない
- ビジネス・仕事・AI・DXの話題禁止
- 政治・社会問題・宗教への言及禁止
- 「〜です」「〜ます」調禁止（フランクな断言調で書く）

■ 使用可能なハッシュタグ（この中から選ぶ）:
地域固定: #静岡 #東海 #静岡グルメ #東海グルメ
観光: #静岡観光 #東海観光 #おでかけ #週末おでかけ #ドライブ
地域: #浜松 #静岡市 #沼津 #富士市 #名古屋 #愛知 #岐阜 #三重 #伊勢
グルメ: #カフェ巡り #グルメ #ランチ #ディナー #ご当地グルメ #食べ歩き
季節: #春のおでかけ #夏のおでかけ #秋のおでかけ #冬のおでかけ

■ 出力形式（この形式を厳守）:
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

  console.log('Claude APIで5件の投稿を生成中...');
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = response.content[0].text;
  const posts = [];
  const sections = rawText.split(/---投稿\d+---/).map(s => s.trim()).filter(Boolean);
  for (const section of sections) {
    if (section.length > 5) posts.push(section);
  }
  return posts.slice(0, 5);
}

async function main() {
  console.log('========================================');
  console.log('  静岡・東海アカウント デイリーポスト生成');
  console.log(`  ${new Date().toLocaleString('ja-JP')}`);
  console.log('========================================');

  const now = new Date();
  const dayInfo = WEEKDAY_THEMES[now.getDay()];
  console.log(`\n本日のテーマ: 【${dayInfo.name}・${dayInfo.pillar}】`);

  const { apiKey } = loadEnv();
  const posts = await generatePosts(apiKey);

  if (posts.length === 0) {
    console.error('❌ ポストの生成に失敗しました');
    process.exit(1);
  }

  const queue = {
    date: new Date().toISOString().slice(0, 10),
    account: '静岡・東海消費者向けアカウント',
    theme: dayInfo.theme,
    posts: posts.map((text, i) => ({
      index: i + 1,
      text,
      posted: false,
      scheduled_time: SCHEDULED_TIMES[i],
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
