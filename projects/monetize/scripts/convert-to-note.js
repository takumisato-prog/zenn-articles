#!/usr/bin/env node
// MarkdownをnoteエディタにペーストできるHTMLに変換してクリップボードにコピー

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: false,
  breaks: false,
  linkify: true,
});

// コードブロックのカスタムレンダリング
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx];
  const lang = token.info.trim() || 'text';
  const code = token.content;

  if (lang === 'mermaid') {
    const preview = code.trim().split('\n')[0];
    return `<p><em>[図: ${preview}... ← Mermaid図はPNG変換後に手動アップロード]</em></p>\n`;
  }

  return `<pre><code class="language-${lang}">${escapeHtml(code)}</code></pre>\n`;
};

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ========================================
// ハッシュタグ自動生成
// ========================================

// 常に含める基本タグ
const BASE_TAGS = ['#ClaudeCode', '#AI活用'];

// キーワード → タグのマッピング（優先度順）
const HASHTAG_RULES = [
  { keywords: ['CLAUDE.md', 'claudemd', 'claude.md'],        tags: ['#プロンプトエンジニアリング'] },
  { keywords: ['スキルファイル', 'スキル機能', 'skills/'],     tags: ['#AIエージェント'] },
  { keywords: ['エージェント', 'agent', 'Agent'],             tags: ['#AIエージェント'] },
  { keywords: ['副業', '収益化', '稼ぐ', 'マネタイズ'],       tags: ['#AI副業'] },
  { keywords: ['プロンプト', 'prompt', 'Prompt'],             tags: ['#プロンプトエンジニアリング'] },
  { keywords: ['生産性', '効率化', '時短', '自動化'],         tags: ['#生産性向上'] },
  { keywords: ['自動化', 'automation', 'GAS', 'Python'],      tags: ['#業務自動化'] },
  { keywords: ['DX', 'デジタルトランスフォーメーション'],      tags: ['#DX推進'] },
  { keywords: ['開発', 'プログラミング', 'コーディング'],      tags: ['#エンジニア'] },
  { keywords: ['SEO', 'キーワード', '検索流入'],               tags: ['#SEO'] },
  { keywords: ['SNS', 'X投稿', 'Instagram', 'マーケ'],        tags: ['#SNSマーケティング'] },
  { keywords: ['中小企業', '経営者', 'B2B', '静岡'],          tags: ['#中小企業DX'] },
  { keywords: ['note', 'Zenn', 'ブログ', '記事'],             tags: ['#技術ブログ'] },
  { keywords: ['ChatGPT', 'OpenAI', 'LLM', 'GPT'],           tags: ['#生成AI'] },
  { keywords: ['スタートアップ', '起業', '独立'],              tags: ['#起業'] },
];

// 最大タグ数（noteは多すぎると逆効果）
const MAX_TAGS = 8;

function generateHashtags(content) {
  // 記事内にすでに #タグ が含まれている場合はそちらを優先
  const existingTags = content.match(/#[^\s#、。！？\n]+/g);
  if (existingTags && existingTags.length >= 3) {
    return existingTags.join(' ');
  }

  const tags = new Set(BASE_TAGS);

  for (const rule of HASHTAG_RULES) {
    if (tags.size >= MAX_TAGS) break;
    const matched = rule.keywords.some(kw =>
      content.toLowerCase().includes(kw.toLowerCase())
    );
    if (matched) {
      rule.tags.forEach(tag => tags.add(tag));
    }
  }

  return [...tags].slice(0, MAX_TAGS).join(' ');
}

// ========================================
// メイン処理
// ========================================

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('使い方: node convert-to-note.js <markdownファイル>');
  console.error('例:   node convert-to-note.js ../article-02.md');
  process.exit(1);
}

const filePath = resolve(process.cwd(), args[0]);

let rawContent;
try {
  rawContent = readFileSync(filePath, 'utf8');
} catch {
  console.error(`ファイルが見つかりません: ${filePath}`);
  process.exit(1);
}

// 管理情報ヘッダー（---区切り前）を除去
const allLines = rawContent.split('\n');
let bodyStart = 0;
for (let i = 0; i < allLines.length; i++) {
  if (allLines[i].trim() === '---') {
    bodyStart = i + 1;
    break;
  }
}

const bodyContent = allLines.slice(bodyStart).join('\n')
  .replace(/^\*\*公開先\*\*.*$/gm, '')
  .replace(/^\*\*価格\*\*.*$/gm, '')
  .replace(/^\*\*想定字数\*\*.*$/gm, '')
  .trim();

// ハッシュタグ生成（本文末尾にまだなければ追加）
const hashtags = generateHashtags(bodyContent);
const hasTrailingTags = /#+\S+\s*$/.test(bodyContent.trimEnd());
const finalContent = hasTrailingTags
  ? bodyContent
  : `${bodyContent}\n\n${hashtags}`;

// HTML変換
const bodyHtml = md.render(finalContent);

const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body>${bodyHtml}</body>
</html>`;

// 一時ファイルに書き出し
const tmpFile = '/tmp/note-article.html';
writeFileSync(tmpFile, fullHtml, 'utf8');

// macOS: クリップボードにHTMLコピー + ブラウザ起動
try {
  execSync(`osascript -e 'set the clipboard to (read (POSIX file "${tmpFile}") as «class HTML»)'`);
  execSync('open https://note.com/notes/new');

  const fileName = args[0].split('/').pop();
  console.log(`✅ ${fileName} の準備完了`);
  console.log(`📌 タグ: ${hashtags}`);
  console.log('');
  console.log('ブラウザが開きました。あとは:');
  console.log('  1. タイトルを入力');
  console.log('  2. 本文欄をクリック → Cmd+V で貼り付け');
  console.log('  3. 右上「公開設定」→「公開する」');
  console.log('');
  console.log('投稿後: Claude Codeに「投稿した」と伝えてください');
} catch (e) {
  console.error('エラーが発生しました:', e.message);
  console.log(bodyHtml);
}
