/**
 * 静岡・東海 消費者向けXアカウント 自動投稿スクリプト
 * ブラウザプロファイルを他アカウントとは分離して運用（セッション競合防止）
 *
 * 使い方:
 *   node publish-tokai-x.js "<投稿テキスト>"
 *   node publish-tokai-x.js --file <テキストファイルパス>
 */

import { chromium } from 'playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCRIPTS_DIR = import.meta.dirname;
const PROFILE_DIR = path.join(SCRIPTS_DIR, 'tokai-browser-profile'); // 他アカウントと分離
const ENV_PATH = path.join(SCRIPTS_DIR, '.env');

function loadEnv() {
  const env = fs.readFileSync(ENV_PATH, 'utf-8');
  return {
    username: env.match(/TOKAI_X_USERNAME=(.+)/)?.[1]?.trim(),
    password: env.match(/TOKAI_X_PASSWORD=(.+)/)?.[1]?.trim(),
  };
}

// ========================================
// Xにログイン
// ========================================
async function login(page, username, password) {
  console.log('🔐 東海アカウントにログイン中...');
  await page.goto('https://x.com/login');
  await page.waitForTimeout(2000);

  const usernameInput = await page.waitForSelector(
    'input[name="text"], input[autocomplete="username"]',
    { timeout: 15000 }
  );
  await usernameInput.fill(username);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);

  const passwordInput = await page.waitForSelector(
    'input[name="password"], input[type="password"]',
    { timeout: 10000 }
  ).catch(() => null);

  if (!passwordInput) {
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

  // テキストを1行ずつ入力（Shift+Enterで改行。XのDraft.jsエディタ対応）
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]) {
      await page.keyboard.type(lines[i], { delay: 15 });
    }
    if (i < lines.length - 1) {
      await page.keyboard.press('Shift+Enter');
    }
  }
  await page.waitForTimeout(1000);

  // 文字が入力されているか確認してから投稿
  const tweetBoxContent = await tweetBox.textContent();
  if (!tweetBoxContent || tweetBoxContent.trim().length === 0) {
    throw new Error('テキストが入力されませんでした');
  }

  const postBtn = page.locator('[data-testid="tweetButton"]');
  await postBtn.waitFor({ timeout: 10000 });
  await postBtn.click({ force: true });

  // 投稿後にモーダルが閉じるまで待機（投稿成功の確認）
  await page.waitForTimeout(4000);
  const stillOnCompose = await page.url().includes('compose');
  if (stillOnCompose) {
    throw new Error('投稿後もcompose画面のまま。投稿失敗の可能性があります');
  }
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
    console.error('  node publish-tokai-x.js "<テキスト>"');
    console.error('  node publish-tokai-x.js --file <ファイル>');
    process.exit(1);
  }

  console.log('========================================');
  console.log('  静岡・東海アカウント X自動投稿');
  console.log('========================================');
  console.log('投稿内容:');
  console.log(tweetText);
  console.log('');

  const { username, password } = loadEnv();
  if (!username || !password) {
    throw new Error('TOKAI_X_USERNAME / TOKAI_X_PASSWORD が .env に見つかりません');
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
    console.log('\n🎉 東海アカウント 投稿完了！');
  } catch (err) {
    console.error('\n❌ エラー:', err.message);
    await page.screenshot({ path: path.join(SCRIPTS_DIR, 'tokai-x-error.png') }).catch(() => {});
  } finally {
    await page.waitForTimeout(2000);
    await context.close();
  }
}

main().catch((err) => {
  console.error('エラー:', err.message);
  process.exit(1);
});
