/**
 * Claude APIで次の記事を自動生成するスクリプト
 *
 * 使い方:
 *   node generate-article.js
 *
 * 動作:
 *   progress.json から次の記事番号を読み取り、
 *   article-lineup.md の内容を元に記事を自動生成する
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PROGRESS_FILE = path.join(ROOT, 'progress.json');
const LINEUP_FILE = path.join(ROOT, 'article-lineup.md');

// ========================================
// 記事ラインナップの定義
// ========================================
const ARTICLES = [
  null, // index 0 は未使用
  {
    index: 1,
    title: 'Claude Codeで「AIだけで動く会社」を作った話',
    brief: '5部門エージェントシステムの全体像を紹介。CLAUDE.mdで会社組織を定義するという発想の紹介。',
    price: '無料',
  },
  {
    index: 2,
    title: 'CLAUDE.mdとは何か？Claude Codeを100倍使いやすくする設定ファイルの書き方',
    brief: 'CLAUDE.mdの基本概念・書き方・使いどころを解説。サンプルコード付き。',
    price: '無料',
  },
  {
    index: 4,
    title: '【コピペOK】Claude Code スキルファイルの作り方と実践テンプレート5選',
    brief: 'スキルファイルの設計思想 + 実際に使えるテンプレート5種（PM / 開発 / SNS / EC / DX）',
    price: '980円',
  },
  {
    index: 5,
    title: 'Claude Codeで自動具体化システムを作った——曖昧な指示をAIが自動で深掘りする仕組み',
    brief: 'CLAUDE.mdに書いた「自動具体化ルール」の設計思想と実装方法。',
    price: '980円',
  },
  {
    index: 6,
    title: '【実録】AIだけで案件を受注〜納品するワークフローを設計した',
    brief: 'PM→専門部門→成果物という案件フローの実装。複数エージェントの連携設計。',
    price: '1,500円',
  },
  {
    index: 7,
    title: 'Claude Codeのmemoryシステムを使って「記憶するAI」を作る方法',
    brief: 'memory/ディレクトリの使い方と設計パターン。会話をまたいで記憶が継続する仕組みを実演。',
    price: '1,500円',
  },
  {
    index: 8,
    title: 'Claude Codeのhooksで「ありがとう」と言ったら自動git pushする仕組みを作った',
    brief: 'settings.jsonのhooks機能の解説。トリガーワードで自動実行する仕組み。',
    price: '1,500円',
  },
  {
    index: 9,
    title: 'Claude Codeで副業を始める人のロードマップ——ノウハウ販売で月10万円を目指す',
    brief: 'この記事自体がメタ的なコンテンツ。「このnoteを書いた戦略」を公開する。',
    price: '980円',
  },
];

// ========================================
// 記事を生成
// ========================================
async function generateArticle(articleDef) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY が設定されていません。.envに追加してください。');
  }

  const client = new Anthropic({ apiKey });

  const prompt = `あなたはClaude Codeの専門家です。以下の仕様で記事を書いてください。

## 記事情報
- タイトル: ${articleDef.title}
- 概要: ${articleDef.brief}
- 価格帯: ${articleDef.price}
- 対象読者: Claude Codeを使い始めた個人・フリーランス・小規模事業主

## 執筆ルール
1. 冒頭は読者が「あるある」と感じる共感フレーズで始める
2. 具体的なコードや設定ファイルのサンプルを必ず入れる
3. 「なぜそうするか」の理由を丁寧に説明する
4. 文体は一人称で話しかけるような親しみやすいトーン
5. 文字数は3,000〜4,000字
6. markdownで書く（H1タイトル、H2セクション、コードブロック使用）
7. 最初の行は「# ${articleDef.title}」で始める
8. 末尾に「次の記事では〜」という予告を入れる

記事本文のみを出力してください。前置きは不要です。`;

  console.log('🤖 Claude APIで記事を生成中...');
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].text;
}

// ========================================
// メイン処理
// ========================================
async function main() {
  // .envを読み込む
  const envPath = path.resolve(import.meta.dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...rest] = trimmed.split('=');
      process.env[key.trim()] = rest.join('=').trim();
    }
  }

  // 進捗を読み込む
  const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  const nextIndex = progress.next_article_index;

  // 次の記事を取得
  const articleDef = ARTICLES.find((a) => a && a.index === nextIndex);
  if (!articleDef) {
    console.log('✅ すべての記事を生成済みです！（10本完了）');
    return null;
  }

  console.log(`📋 次の記事: [${nextIndex}] ${articleDef.title}`);

  // 記事を生成
  const content = await generateArticle(articleDef);

  // ファイルに保存
  const filename = `article-${String(nextIndex).padStart(2, '0')}.md`;
  const filepath = path.join(ROOT, filename);
  fs.writeFileSync(filepath, content, 'utf-8');
  console.log(`✅ 記事を保存: ${filepath}`);

  // 進捗を更新
  progress.next_article_index = nextIndex + 1;
  progress.posted.push({
    index: nextIndex,
    title: articleDef.title,
    file: filename,
    zenn: false,
    note: false,
    date: new Date().toISOString().split('T')[0],
  });
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));

  return filepath;
}

main().then((filepath) => {
  if (filepath) process.stdout.write(filepath);
}).catch((err) => {
  console.error('エラー:', err.message);
  process.exit(1);
});
