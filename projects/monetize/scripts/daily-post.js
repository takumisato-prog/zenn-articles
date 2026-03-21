/**
 * 毎日の自動投稿スクリプト
 * generate-article.js → publish-zenn.js を順番に実行する
 *
 * 使い方（手動）:
 *   node daily-post.js
 *
 * cronからの実行:
 *   crontab -e で設定済み
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const SCRIPT_DIR = import.meta.dirname;
const LOG_FILE = path.join(SCRIPT_DIR, 'daily-post.log');

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

async function main() {
  log('=== 毎日投稿 開始 ===');

  try {
    // Step 1: 記事を生成
    log('1. 記事を生成中...');
    const result = execSync(`node "${path.join(SCRIPT_DIR, 'generate-article.js')}"`, {
      cwd: SCRIPT_DIR,
      encoding: 'utf-8',
    });

    // 生成されたファイルパスを取得（最後の行）
    const lines = result.trim().split('\n');
    const filepath = lines[lines.length - 1];

    if (!filepath || !fs.existsSync(filepath)) {
      log('✅ 投稿すべき記事がありません（全記事完了）');
      return;
    }

    log(`   生成ファイル: ${filepath}`);

    // Step 2: Zennに投稿
    log('2. Zennに投稿中...');
    execSync(`node "${path.join(SCRIPT_DIR, 'publish-zenn.js')}" "${filepath}"`, {
      cwd: SCRIPT_DIR,
      stdio: 'inherit',
    });

    log('✅ Zenn投稿完了！');
    log('=== 毎日投稿 完了 ===');
  } catch (err) {
    log(`❌ エラー: ${err.message}`);
    process.exit(1);
  }
}

main();
