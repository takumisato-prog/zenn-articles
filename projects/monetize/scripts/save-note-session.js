/**
 * noteのセッションを永続プロファイルに保存するスクリプト
 * 初回だけ実行してください。
 *
 * 使い方:
 *   node save-note-session.js
 */

import { chromium } from 'playwright';
import path from 'path';
import readline from 'readline';

const PROFILE_DIR = path.resolve(import.meta.dirname, 'browser-profile');

function waitEnter(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans); }));
}

async function main() {
  console.log('🌐 ブラウザを開きます...');
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = await context.newPage();
  await page.goto('https://note.com/login');

  console.log('\n✋ ブラウザでnoteにGoogleログインしてください。');
  await waitEnter('ログインできたらEnterを押してください...');

  // エディタページも開いてeditor.note.comのセッションを確立
  console.log('\n📝 エディタを開いています（そのまま待機してください）...');
  await page.goto('https://note.com/notes/new');
  await page.waitForURL(/editor\.note\.com/, { timeout: 15000 }).catch(() => {});
  console.log(`   URL: ${page.url()}`);

  // エディタが読み込まれるまで最大60秒待つ
  console.log('   エディタが開くまで待機中（最大60秒）...');
  const editorEl = await page.waitForSelector(
    '.ProseMirror, [contenteditable="true"]',
    { timeout: 60000 }
  ).catch(() => null);

  if (editorEl) {
    console.log('✅ エディタが開きました！');
  } else {
    console.log('⚠️  エディタが開きませんでした。');
    console.log('   ブラウザで手動でエディタを開いてください。');
    await waitEnter('エディタが開いたらEnterを押してください...');
  }

  console.log('\n✅ セッション保存完了！');
  await context.close();
}

main().catch((err) => {
  console.error('エラー:', err.message);
  process.exit(1);
});
