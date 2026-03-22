/**
 * 静岡特化Xアカウント（@altus_shizuoka）デイリーポスト生成
 * 静岡の士業・中小企業向けSNS集客ノウハウを曜日別テーマで5件/日自動生成
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

// 曜日別テーマ（x-shizuoka-profile.md の戦略に基づく）
const WEEKDAY_THEMES = {
  0: { name: '日曜', theme: '今週の振り返り・来週の準備ヒント（士業・中小企業向けの週次まとめ）' },
  1: { name: '月曜', theme: '静岡の事業者向けノウハウ（専門性・信頼構築を目的とした実践Tips）' },
  2: { name: '火曜', theme: 'SNS集客の基本・よくある失敗（教育型・共感・保存促進を狙う）' },
  3: { name: '水曜', theme: '週の折り返し・SNS運用チェックリスト（実践的な自己診断コンテンツ）' },
  4: { name: '木曜', theme: '実績・事例・ビフォーアフター（社会的証明・相談への動機付け）' },
  5: { name: '金曜', theme: '士業・中小企業の経営課題（問題提起型・リプライ誘発・週末思考促進）' },
  6: { name: '土曜', theme: '静岡ネタ × ビジネス（親近感・人間性の見せ方・フォロー動機の形成）' },
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

  const prompt = `あなたはAIスタートアップ「Altus」の静岡特化Xアカウント（@altus_shizuoka）担当です。

アカウント情報:
- 表示名: 「静岡のSNS集客 | Altus」
- コンセプト: 静岡の士業・中小企業が、SNS発信で新規客を獲得するための伴走アカウント
- ターゲット: 静岡県内の税理士・社労士・司法書士・行政書士・中小企業診断士・中小企業経営者（35〜55歳）
- 口調: 専門家・伴走者として信頼感を重視。過度なフランクネスは避ける

今日（${today}）のX投稿テーマ: 【${dayInfo.name}】${dayInfo.theme}

今日のX投稿を5件作成してください。

■ 投稿タイプ指定（必ずこの内容に沿って作成）:
- 投稿1（8:00用）: 本日テーマの核心Tips（具体的な数字・手順・事実を含む実践的な内容）
- 投稿2（12:00用）: ターゲットの「あるある失敗談」→ その解決策を提示（共感を呼ぶ構成）
- 投稿3（15:00用）: 問いかけ型（必ず「？」で終わる。静岡の経営者がリプライしたくなる質問）
- 投稿4（19:00用）: 実績・事例型 or 士業特化の深掘り情報（信頼性を高める内容）
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
固定: #静岡 #SNS集客 #士業マーケティング #中小企業支援 #静岡ビジネス
士業別: #税理士 #社労士 #司法書士 #行政書士 #中小企業診断士 #士業SNS #士業ブランディング
業種別: #静岡製造業 #静岡採用 #中小企業経営
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
