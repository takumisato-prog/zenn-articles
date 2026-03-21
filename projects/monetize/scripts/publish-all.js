/**
 * Zenn + note 一括投稿スクリプト
 *
 * 使い方:
 *   node publish-all.js <記事ファイルパス> [--draft]
 *   例: node publish-all.js ../article-01.md          # Zenn公開 + note公開
 *   例: node publish-all.js ../article-01.md --draft  # Zenn公開 + note下書き
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const articlePath = process.argv[2];
const draftFlag = process.argv.includes('--draft') ? '--draft' : '';

if (!articlePath) {
  console.error('使い方: node publish-all.js <記事ファイルパス> [--draft]');
  process.exit(1);
}

const resolvedPath = path.resolve(articlePath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`ファイルが見つかりません: ${resolvedPath}`);
  process.exit(1);
}

const scriptDir = import.meta.dirname;

console.log('========================================');
console.log('  Zenn + note 一括投稿');
console.log('========================================\n');

// --- Zenn に投稿 ---
console.log('【1/2】Zenn に投稿します...\n');
try {
  execSync(`node "${path.join(scriptDir, 'publish-zenn.js')}" "${resolvedPath}"`, {
    stdio: 'inherit',
  });
  console.log('\n✅ Zenn 投稿完了\n');
} catch {
  console.error('\n❌ Zenn 投稿に失敗しました。続けてnoteを処理します。\n');
}

// --- note に投稿 ---
console.log('【2/2】note に投稿します...\n');
try {
  execSync(
    `node "${path.join(scriptDir, 'publish-note.js')}" "${resolvedPath}" ${draftFlag}`,
    { stdio: 'inherit' }
  );
  console.log('\n✅ note 投稿完了\n');
} catch {
  console.error('\n❌ note 投稿に失敗しました。\n');
}

console.log('========================================');
console.log('  完了！');
console.log('========================================');
