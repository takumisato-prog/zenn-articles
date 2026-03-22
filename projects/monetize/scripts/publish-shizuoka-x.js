/**
 * @altus_shizuoka 専用 X（Twitter）自動投稿スクリプト
 * ブラウザプロファイルを x-browser-profile とは分離して運用（セッション競合防止）
 *
 * 使い方:
 *   node publish-shizuoka-x.js "<投稿テキスト>"
 *   node publish-shizuoka-x.js --file <テキストファイルパス>
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCRIPTS_DIR = import.meta.dirname;
const PROFILE_DIR = path.join(SCRIPTS_DIR, 'shizuoka-browser-profile'); // @altus_ai_jp と分離
const ENV_PATH = path.join(SCRIPTS_DIR, '.env');

function loadEnv() {
  const env = fs.readFileSync(ENV_PATH, 'utf-8');
  return {
    username: env.match(/SHIZUOKA_X_USERNAME=(.+)/)?.[1]?.trim(),
    password: env.match(/SHIZUOKA_X_PASSWORD=(.+)/)?.[1]?.trim(),
  };
}

// ========================================
// Xにログイン
// ========================================
async function login(page, username, password) {
  console.log('🔐 @altus_shizuoka にログイン中...');
  await page.goto('https://x.com/login');
  await page.waitForTimeout(2000);

  // ユーザー名入力
  const usernameInput = await page.waitForSelector(
    'input[name="text"], input[autocomplete="username"]',
    { timeout: 15000 }
  );
  await usernameInput.fill(username);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  // パスワード入力（途中で電話番号確認が入る場合も対処）
  const passwordInput = await page.waitForSelector(
    'input[name="password"], input[type="password"]',
    { timeout: 10000 }
  ).catch(() => null);

  if (!passwordInput) {
    // 電話番号/メール確認画面の場合
    const confirmInput = await page.$('input[name="text"]');
    if (confirmInput) {
      await confirmInput.fill(username);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }
    const pwInput = await page.waitForSelector('input[name="password"]', { timeout: 10000 });
    await pwInput.fill(password);
  } else {
    await passwordInput.fill(password);
  }

  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  console.log('✅ ログイン完了');
}

// ========================================
// ツイートを投稿
// ========================================
async function postTweet(page, text) {
  console.log('📝 ツイートを投稿中...');

  await page.goto('https://x.com/compose/post');
  await page.waitForTimeout(3000);

  const tweetBox = page.locator('[data-testid="tweetTextarea_0"]').first();
  await tweetBox.waitFor({ timeout: 15000 });
  await tweetBox.click({ force: true });
  await page.waitForTimeout(500);

  await page.evaluate(async (t) => {
    await navigator.clipboard.writeText(t);
  }, text);
  const isMac = process.platform === 'darwin';
  await page.keyboard.press(isMac ? 'Meta+v' : 'Control+v');
  await page.waitForTimeout(1500);

  const postBtn = page.locator('[data-testid="tweetButton"]');
  await postBtn.waitFor({ timeout: 10000 });
  await postBtn.click({ force: true });
  await page.waitForTimeout(3000);
  console.log('✅ 投稿完了！');
}

// ========================================
// メイン処理
// ========================================
async function main() {
  const args = process.argv.slice(2);
  let tweetText = '';

  if (args[0] === '--file' && args[1]) {
    tweetText = fs.readFileSync(args[1], 'utf-8').trim();
  } else if (args[0]) {
    tweetText = args[0];
  } else {
    console.error('使い方:');
    console.error('  node publish-shizuoka-x.js "<テキスト>"');
    console.error('  node publish-shizuoka-x.js --file <ファイル>');
    process.exit(1);
  }

  console.log('========================================');
  console.log('  @altus_shizuoka X自動投稿');
  console.log('========================================');
  console.log('投稿内容:');
  console.log(tweetText);
  console.log('');

  const { username, password } = loadEnv();
  if (!username || !password) {
    throw new Error('SHIZUOKA_X_USERNAME / SHIZUOKA_X_PASSWORD が .env に見つかりません');
  }

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = await context.newPage();

  try {
    await page.goto('https://x.com/home');
    await page.waitForTimeout(3000);
    const isLoggedIn = await page.$('[data-testid="tweetTextarea_0"], [data-testid="SideNav_NewTweet_Button"]');

    if (!isLoggedIn) {
      await login(page, username, password);
    } else {
      console.log('✅ セッション有効（ログインスキップ）');
    }

    await postTweet(page, tweetText);
    console.log('\n🎉 @altus_shizuoka 投稿完了！');
  } catch (err) {
    console.error('\n❌ エラー:', err.message);
    await page.screenshot({ path: path.join(SCRIPTS_DIR, 'shizuoka-x-error.png') }).catch(() => {});
  } finally {
    await page.waitForTimeout(2000);
    await context.close();
  }
}

main().catch((err) => {
  console.error('エラー:', err.message);
  process.exit(1);
});
