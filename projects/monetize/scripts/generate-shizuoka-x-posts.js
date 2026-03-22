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
  const now = new Date();
  const dayInfo = WEEKDAY_THEMES[now.getDay()];
  const today = now.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });

  const prompt = `あなたはAIスタートアップ「Altus」の静岡特化Xアカウント（@shizuoka_altus）担当です。

アカウント情報:
- 表示名: 「静岡の集客参謀 | Altus」
- コンセプト: 静岡の士業・中小企業の「HP制作・HP改善・業務DX化」を一気通貫で支援する伴走アカウント
- ターゲット: 静岡県内の税理士・社労士・司法書士・行政書士・中小企業診断士・中小企業経営者（35〜55歳）
- 口調: 専門家・伴走者として信頼感を重視。過度なフランクネスは避ける

【3本柱】
1. HP制作・リニューアル: 問い合わせが来るホームページをゼロから作る
2. HP改善: 既存HPを改善して「見られるだけ」から「問い合わせが来る」状態へ
3. DX化・業務効率: 手作業・アナログ業務をツールで自動化・効率化

今日（${today}）のX投稿テーマ: 【${dayInfo.name}・${dayInfo.pillar}】${dayInfo.theme}

今日のX投稿を5件作成してください。

■ 投稿タイプ指定（必ずこの内容に沿って作成）:
- 投稿1（8:00用）: 本日テーマの核心Tips（具体的な数字・手順・事実を含む実践的な内容）
- 投稿2（12:00用）: ターゲットの「あるある失敗談」→ その解決策を提示（共感を呼ぶ構成）
- 投稿3（15:00用）: 問いかけ型（必ず「？」で終わる。静岡の経営者がリプライしたくなる質問）
- 投稿4（19:00用）: 実績・事例型 or 深掘り情報（3本柱いずれかに関連した信頼性を高める内容）
- 投稿5（22:00用）: 静岡地元ネタ × ビジネス視点（親しみやすさと専門性を両立）

■ 絶対ルール:
- 各投稿は140文字以内（日本語）
- 改行を効果的に使う（3〜5行が理想。詰め込みすぎない）
- 必ず #静岡 を含める
- ハッシュタグは1投稿最大5個まで
- 投稿3は必ず「？」で終わること
- 投稿5は #静岡市 #浜松 #沼津 #富士市 のうち1個を使用すること
- AI技術・Claude Codeの話題は完全禁止（@altus_ai_jp の管轄）
- 「月収100万」「3ヶ月で人生変わる」などの誇大表現は絶対禁止
- 競合批判・政治・社会問題への言及禁止
- 静岡以外の地域事例禁止

■ 使用可能なハッシュタグ（この中から選ぶ）:
固定: #静岡 #静岡ビジネス #中小企業支援
HP・Web関連: #ホームページ制作 #ホームページ改善 #Web集客 #静岡ホームページ #静岡Web制作
DX・業務効率関連: #DX推進 #業務効率化 #静岡DX #中小企業DX #業務改善
士業別: #税理士 #社労士 #司法書士 #行政書士 #中小企業診断士 #士業マーケティング
業種別: #静岡製造業 #中小企業経営
地域別（投稿5のみ）: #静岡市 #浜松 #沼津 #富士市

■ 出力形式（この形式を厳守。説明文・前置き・コメントは不要）:
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
  console.log('  @altus_shizuoka デイリーポスト生成');
  console.log(`  ${new Date().toLocaleString('ja-JP')}`);
  console.log('========================================');

  const now = new Date();
  const dayInfo = WEEKDAY_THEMES[now.getDay()];
  console.log(`\n本日のテーマ: 【${dayInfo.name}】${dayInfo.theme.slice(0, 30)}...`);

  const { apiKey } = loadEnv();
  const posts = await generatePosts(apiKey);

  if (posts.length === 0) {
    console.error('❌ ポストの生成に失敗しました');
    process.exit(1);
  }

  const queue = {
    date: new Date().toISOString().slice(0, 10),
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
