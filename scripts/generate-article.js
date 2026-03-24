const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

// 既存記事のタイトル一覧（重複防止用）
const EXISTING_TITLES = [
  'Claude Codeで「AIだけで動く会社」を作った話',
  'CLAUDE.mdとは何か？Claude Codeを100倍使いやすくする設定ファイルの書き方',
  'Claude Codeのスキル機能で専門家AIを10体作った方法（スレッド）',
  '【コピペOK】Claude Code スキルファイルの作り方と実践テンプレート5選',
];

// 記事生成プロンプト
const SYSTEM_PROMPT = `あなたはZenn向けの技術記事を書く専門家ライターです。
Claude Codeで47名のAIエージェント会社「Altus」を運営している人として書いてください。

## 執筆スタイル
- 日本語・断定調（「だ」「である」体）
- 具体的な実例・コード例を必ず含める
- 「実際にやってみた」「気づいたこと」という体験談ベース
- 読者: Claude Code / AI活用に興味があるエンジニア・ビジネス担当者
- 文字数: 2,000〜3,500字

## 禁止事項
- 「〜しましょう」「〜ください」など丁寧語での呼びかけ
- 根拠のない主張
- 既存記事との重複内容`;

async function generateArticle() {
  const client = new Anthropic();

  // トピックキューを読み込む
  const topicsPath = path.join(__dirname, 'article-topics.json');
  const topicsData = JSON.parse(fs.readFileSync(topicsPath, 'utf-8'));

  if (topicsData.queue.length === 0) {
    console.log('トピックキューが空です。記事を生成しません。');
    process.exit(0);
  }

  const topic = topicsData.queue[0];
  console.log(`生成するトピック: ${topic}`);

  // Claude APIで記事生成
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 5000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `以下のテーマでZenn記事を作成してください。

テーマ: ${topic}

既存記事との重複を避けてください:
${EXISTING_TITLES.map((t, i) => `${i + 1}. ${t}`).join('\n')}

以下のフォーマットで出力してください（必ずこのYAMLフロントマターから始める）:

---
title: "記事タイトル（魅力的で検索されやすいもの）"
emoji: "適切な絵文字1文字"
type: "tech"
topics: ["claudecode", "ai", "タグ3", "タグ4"]
published: true
---

## 見出し1

本文...`,
      },
    ],
  });

  const content = message.content[0].text;

  // YAMLフロントマターが正しく含まれているか確認
  if (!content.startsWith('---')) {
    console.error('フロントマターが見つかりません。記事の生成をスキップします。');
    process.exit(1);
  }

  // ファイル名生成（日付 + ランダム5文字）
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000); // UTC→JST
  const dateStr = jst.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).slice(2, 7);
  const filename = `${dateStr}-${randomStr}.md`;

  // articles/ に保存
  const articlesDir = path.join(__dirname, '..', 'articles');
  const filepath = path.join(articlesDir, filename);
  fs.writeFileSync(filepath, content, 'utf-8');

  console.log(`✅ 記事を生成しました: ${filename}`);
  console.log(`トピック: ${topic}`);

  // 使用済みトピックをキューから削除
  topicsData.queue.shift();
  topicsData.used = topicsData.used || [];
  topicsData.used.push(topic);
  fs.writeFileSync(topicsPath, JSON.stringify(topicsData, null, 2) + '\n', 'utf-8');

  console.log(`残りトピック数: ${topicsData.queue.length}`);
}

generateArticle().catch((err) => {
  console.error('記事生成エラー:', err.message);
  process.exit(1);
});
