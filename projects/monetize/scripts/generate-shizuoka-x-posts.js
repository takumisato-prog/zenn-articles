/**
 * 静岡特化Xアカウント（@shizuoka_altus）デイリーポスト生成
 * 静岡の士業・中小企業向けに「SNS集客・HP改善・DX化」の3本柱で5件/日自動生成
 *
 * 使い方:
 *   node generate-shizuoka-x-posts.js
 *
 * cronで毎日6:30に実行:
 *   30 6 * * * cd /Users/satoutakumi/AI/projects/monetize/scripts && /usr/local/bin/node generate-shizuoka-x-posts.js >> /tmp/shizuoka-x-generate.log 2>&1
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const SCRIPTS_DIR = import.meta.dirname;
const ENV_PATH = path.join(SCRIPTS_DIR, '.env');
const QUEUE_PATH = path.join(SCRIPTS_DIR, 'shizuoka-x-post-queue.json');

const SCHEDULED_TIMES = ['8:00', '12:00', '15:00', '19:00', '22:00'];

// 曜日別テーマ（3本柱：HP制作・HP改善・DX化を週でローテーション）
const WEEKDAY_THEMES = {
  0: { name: '日曜', pillar: '総合', theme: '今週の振り返り・来週の準備ヒント（HP・DXに関する週次総括）' },
  1: { name: '月曜', pillar: 'HP制作', theme: 'ホームページ制作・リニューアルの重要性・失敗しないポイント（静岡の事業者向け）' },
  2: { name: '火曜', pillar: 'HP改善', theme: '既存HPの改善・問い合わせを増やすWeb活用術・CTA設計（教育型・保存促進）' },
  3: { name: '水曜', pillar: 'DX化', theme: '業務効率化・DX推進・ツール活用で時間とコストを削減（中小企業・士業向け）' },
  4: { name: '木曜', pillar: '事例', theme: '実績・事例・ビフォーアフター（HP制作・改善・DXいずれかの改善事例）' },
  5: { name: '金曜', pillar: '問題提起', theme: '士業・中小企業が抱えるWeb・業務・集客の課題（問題提起型・リプライ誘発）' },
  6: { name: '土曜', pillar: '静岡ネタ', theme: '静岡ネタ × ビジネス（地域密着・親近感・フォロー動機の形成）' },
};

function loadEnv() {
  const env = fs.readFileSync(ENV_PATH, 'utf-8');
  const apiKey = env.match(/ANTHROPIC_API_KEY=(.+)/)?.[1]?.trim();
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY が .env に見つかりません');
  return { apiKey };
}

async function generatePosts(apiKey) {
  const client = new Anthropic({ apiKey });
  // 夜に実行するため翌日の曜日・日付を使用
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayInfo = WEEKDAY_THEMES[tomorrow.getDay()];
  const today = tomorrow.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });

  const prompt = `あなたはバイラルXコンテンツの専門家です。静岡の士業・中小企業向けアカウント（@shizuoka_altus）担当として、
ターゲットが「保存・RT・問い合わせ」したくなる投稿を5件作ります。

アカウント情報:
- 表示名: 「静岡の集客参謀 | Altus」
- コンセプト: 静岡の士業・中小企業の「HP制作・HP改善・業務DX化」を支援する伴走アカウント
- ターゲット: 静岡県内の税理士・社労士・司法書士・行政書士・中小企業経営者（35〜55歳）
  → 「Webに詳しくない」「HP作ったが成果が出ない」「時間がない」人たちが読んでいる

今日（${today}）のテーマ: 【${dayInfo.name}・${dayInfo.pillar}】${dayInfo.theme}

今日のX投稿を5件作成してください。

【投稿タイプ別指定】
- 投稿1（8:00）: 核心Tips ── 「今日から使える」具体的な手順・数字・比較を含む。読んで終わりではなく「やってみよう」と思わせる
- 投稿2（12:00）: あるある共感 ── ターゲットが「うちのことだ」と感じる失敗・悩みを描写し、解決の方向性を示す
- 投稿3（15:00）: 問いかけ ── 経営者がリプライしたくなる本音質問。「いつ？」「どっち？」「何が一番？」形式。必ず「？」で終わる
- 投稿4（19:00）: 実績・事例 ── 静岡の具体的なビフォーアフター（数字入り）または深掘り情報。「この人に頼みたい」と思わせる
- 投稿5（22:00）: 静岡ネタ × ビジネス ── 地域の話題・季節・地元民が知っていることを絡めて、最後にビジネスへ着地

【1行目（フック）の絶対ルール】
ターゲットは忙しい経営者。1行目で「これは自分ごとだ」と思わせること。

★良いフック例（参考にしてよい）:
「静岡の税理士事務所、HPから月5件問い合わせが来る事務所と0件の事務所の違いは1つ。」
「HP作って2年。問い合わせが来ない事務所に共通する3つのこと。」
「静岡の経営者に聞いた。一番時間を取られている業務は何ですか？」
「見積もり依頼、今でもFAXですか？」

✗ダメなフック（使用禁止）:
「〜の方法を紹介します」「〜について解説します」「〜のポイントを説明します」
「こんにちは〜です」「今日は〜」「実は〜なんです」

【文章フォーマットルール】
- 1文は20字以内が目安（詰め込み禁止）
- 改行で「間」を作る（一段落2〜3行が上限）
- 最後の1行は「行動を促す一言」か「余韻・問いかけ」
- 「です・ます」で締めても良いが、終わりが弱くならないよう注意

【品質チェック（出力前に必ず確認）】
□ 静岡の経営者・士業が「自分のことだ」と感じられるか？
□ 「保存しておきたい」情報か、「リプライしたい」内容か？
□ 「この人に相談したい」という信頼感につながるか？
□ 140文字以内か？

【禁止事項】
- 140文字超
- AI・Claude Code・テクノロジー系の話題（@altus_ai_jp の管轄）
- 「月収100万」「売上3倍」などの誇大表現
- 競合批判・政治・宗教への言及
- 静岡以外の地域を中心にした事例
- ハッシュタグ5個超
- 必ず #静岡 を含める（投稿5は #静岡市 #浜松 #沼津 #富士市 のうち1個も追加）

使用可能ハッシュタグ:
固定: #静岡 #静岡ビジネス #中小企業支援
HP・Web: #ホームページ制作 #ホームページ改善 #Web集客 #静岡ホームページ #静岡Web制作
DX: #DX推進 #業務効率化 #静岡DX #中小企業DX #業務改善
士業: #税理士 #社労士 #司法書士 #行政書士 #士業マーケティング
経営: #静岡製造業 #中小企業経営
地域（投稿5のみ）: #静岡市 #浜松 #沼津 #富士市

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

  console.log('Claude APIで5件の投稿を生成中...');
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
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
  console.log('  @altus_shizuoka デイリーポスト生成');
  console.log(`  ${new Date().toLocaleString('ja-JP')}`);
  console.log('========================================');

  // 夜に実行するため翌日基準
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayInfo = WEEKDAY_THEMES[tomorrow.getDay()];
  console.log(`\n明日のテーマ: 【${dayInfo.name}】${dayInfo.theme.slice(0, 30)}...`);

  const { apiKey } = loadEnv();
  const posts = await generatePosts(apiKey);

  if (posts.length === 0) {
    console.error('❌ ポストの生成に失敗しました');
    process.exit(1);
  }

  const queue = {
    date: tomorrow.toISOString().slice(0, 10),
    account: '@altus_shizuoka',
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
