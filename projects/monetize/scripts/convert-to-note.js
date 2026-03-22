#!/usr/bin/env node
// MarkdownをnoteエディタにペーストできるHTMLに変換してクリップボードにコピー

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';
import matter from 'gray-matter';
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

  // Mermaidダイアグラム（将来対応: 現在はPNG変換手順を表示）
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

// 引数チェック
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

// フロントマター（最初の---区切りまでの管理情報）を除去
// article-XX.md は YAML frontmatter 形式ではなくカスタム形式のため手動処理
const lines = rawContent.split('\n');
let bodyStart = 0;
let separatorCount = 0;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === '---') {
    separatorCount++;
    if (separatorCount === 1) {
      bodyStart = i + 1;
      break;
    }
  }
}

const bodyContent = lines.slice(bodyStart).join('\n')
  .replace(/^\*\*公開先\*\*.*$/gm, '')
  .replace(/^\*\*価格\*\*.*$/gm, '')
  .replace(/^\*\*想定字数\*\*.*$/gm, '')
  .trim();

// HTML変換
const bodyHtml = md.render(bodyContent);

// クリップボード用HTML（スタイルなし、テキストとして渡す）
const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body>${bodyHtml}</body>
</html>`;

// 一時ファイルに書き出し
const tmpFile = '/tmp/note-article.html';
writeFileSync(tmpFile, fullHtml, 'utf8');

// macOS: osascriptでHTMLとしてクリップボードにコピー + ブラウザを開く
try {
  execSync(`osascript -e 'set the clipboard to (read (POSIX file "${tmpFile}") as «class HTML»)'`);

  // note.com/notes/new をブラウザで自動起動
  execSync('open https://note.com/notes/new');

  const fileName = args[0].split('/').pop();
  console.log(`✅ ${fileName} の準備完了`);
  console.log('');
  console.log('ブラウザが開きました。あとは:');
  console.log('  1. タイトルを入力');
  console.log('  2. 本文欄をクリック → Cmd+V で貼り付け');
  console.log('  3. 右上「公開設定」→「公開する」');
  console.log('');
  console.log('投稿後: Claude Codeに「投稿した」と伝えてください');
} catch (e) {
  console.error('エラーが発生しました:', e.message);
  console.log('');
  console.log('手動で https://note.com/notes/new を開き、以下のHTMLを貼り付けてください:');
  console.log(bodyHtml);
}
