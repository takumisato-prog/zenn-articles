/**
 * Note.com 全自動投稿スクリプト（サムネイル対応版）
 *
 * 使い方:
 *   node publish-note.js <記事ファイルパス> <サムネイルパス> [--draft]
 *   例: node publish-note.js ../articles/article-01.md ../thumbnails/thumbnail-01.png
 *   例: node publish-note.js ../articles/article-01.md ../thumbnails/thumbnail-01.png --draft
 *
 * 事前準備:
 *   monetize/scripts/save-note-session.js を一度実行してログイン状態を保存する
 *   （browser-profile/ がすでにコピー済みであれば不要）
 */

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const SCRIPT_DIR = import.meta.dirname;
const PROFILE_DIR = path.join(SCRIPT_DIR, 'browser-profile');

// ========================================
// markdownの本文をnote用テキストに変換
// ========================================
function convertToNoteText(raw) {
  let text = raw;
  // H1タイトル行を除去（noteはタイトルを別フィールドで入力）
  text = text.replace(/^#\s+.+\n\n?/, '');
  // フロントマター的なメタ情報を除去
  text = text.replace(/^\*\*公開先\*\*.*\n/m, '');
  text = text.replace(/^\*\*価格\*\*.*\n/m, '');
  text = text.replace(/^\*\*想定字数\*\*.*\n/m, '');
  text = text.replace(/^---\n\n/, '');
  return text.trim();
}

function extractTitle(raw) {
  const h1Match = raw.match(/^#\s+(.+)$/m);
  if (!h1Match) throw new Error('記事のタイトル（# H1）が見つかりません');
  return h1Match[1].trim();
}

// ========================================
// サムネイル画像をアップロード
// ========================================
async function uploadThumbnail(page, thumbnailPath) {
  if (!thumbnailPath || !fs.existsSync(thumbnailPath)) {
    console.error('   サムネイルファイルが見つかりません。スキップします。');
    return false;
  }

  console.error('   サムネイルアップロード中...');

  // noteのヘッダー画像アップロードエリアを探す
  // 複数のセレクタを試みる
  const uploadSelectors = [
    'input[type="file"][accept*="image"]',
    'input[type="file"]',
  ];

  let fileInput = null;
  for (const sel of uploadSelectors) {
    fileInput = await page.$(sel);
    if (fileInput) break;
  }

  if (!fileInput) {
    // クリックでアップロードダイアログを開くパターンも試みる
    const uploadButtonSelectors = [
      '[data-testid*="thumbnail"]',
      'button:has-text("サムネイル")',
      'button:has-text("ヘッダー")',
      '[aria-label*="画像"]',
      '[aria-label*="サムネイル"]',
    ];

    for (const sel of uploadButtonSelectors) {
      const btn = await page.$(sel);
      if (btn) {
        await btn.click();
        await page.waitForTimeout(1000);
        fileInput = await page.$('input[type="file"]');
        if (fileInput) break;
      }
    }
  }

  if (!fileInput) {
    console.error('   ⚠️  サムネイルアップロード入力欄が見つかりませんでした。本文のみ投稿します。');
    return false;
  }

  await fileInput.setInputFiles(thumbnailPath);
  await page.waitForTimeout(3000); // アップロード完了待機

  // アップロード完了確認（画像プレビューの出現）
  const previewSelectors = [
    'img[src*="blob:"]',
    'img[src*="note.com"]',
    '[class*="thumbnail"] img',
    '[class*="preview"] img',
  ];

  for (const sel of previewSelectors) {
    const preview = await page.$(sel);
    if (preview) {
      console.error('   ✅ サムネイルアップロード完了');
      return true;
    }
  }

  console.error('   ⚠️  サムネイルプレビューが確認できませんでしたが続行します。');
  return true;
}

// ========================================
// 記事を投稿
// ========================================
async function postArticle(page, title, body, thumbnailPath, draftOnly) {
  console.error('\n📝 記事作成画面を開いています...');
  await page.goto('https://note.com/notes/new');

  // editor.note.com へのリダイレクトを待つ
  await page.waitForURL(/editor\.note\.com/, { timeout: 15000 }).catch(() => {});
  console.error(`   URL: ${page.url()}`);

  // エディタが表示されるまで待つ（最大20秒）
  console.error('   エディタ読み込み待機中...');
  const titleEl = await page.waitForSelector(
    '.ProseMirror, [contenteditable="true"], h1[contenteditable]',
    { timeout: 20000 }
  ).catch(() => null);

  if (!titleEl) throw new Error('エディタが開きませんでした。セッションが切れた可能性があります。');

  // タイトル入力
  const titleInput =
    await page.$('[placeholder="タイトル"], h1[contenteditable="true"], [data-placeholder*="タイトル"]') ||
    (await page.$$('[contenteditable="true"]'))[0];

  if (!titleInput) throw new Error('タイトル入力欄が見つかりません');
  await titleInput.click();
  await titleInput.fill(title);
  console.error(`✅ タイトル入力: ${title}`);

  // 本文入力
  await page.keyboard.press('Tab');
  await page.waitForTimeout(500);

  const bodyInput =
    await page.$('.ProseMirror') ||
    (await page.$$('[contenteditable="true"]'))[1];

  if (!bodyInput) throw new Error('本文入力欄が見つかりません');
  await bodyInput.click();

  // クリップボード経由で貼り付け
  await page.evaluate(async (text) => {
    await navigator.clipboard.writeText(text);
  }, body);
  const isMac = process.platform === 'darwin';
  await page.keyboard.press(isMac ? 'Meta+v' : 'Control+v');
  await page.waitForTimeout(2000);
  console.error('✅ 本文入力完了');

  if (draftOnly) {
    await page.keyboard.press(isMac ? 'Meta+s' : 'Control+s');
    await page.waitForTimeout(1500);
    console.error('✅ 下書き保存しました。');
    return null;
  }

  // 公開設定ダイアログを開く
  console.error('\n🚀 公開処理を開始します...');
  for (const sel of ['button:has-text("公開設定")', 'button:has-text("投稿")', 'button:has-text("公開")']) {
    const btn = await page.$(sel);
    if (btn) {
      await btn.click();
      break;
    }
  }
  await page.waitForTimeout(2000);

  // 公開設定ダイアログ内でサムネイルをアップロード
  if (thumbnailPath) {
    await uploadThumbnail(page, thumbnailPath);
  }

  // 最終公開ボタン
  for (const sel of ['button:has-text("公開する")', 'button:has-text("投稿する")']) {
    const btn = await page.$(sel);
    if (btn) {
      await btn.click();
      await page.waitForTimeout(3000);
      console.error('✅ 公開しました！');

      // 公開後のURLを取得
      const currentUrl = page.url();
      return currentUrl.includes('note.com') ? currentUrl : null;
    }
  }

  console.error('⚠️  公開ボタンが見つかりませんでした。手動で公開してください。');
  return null;
}

// ========================================
// メイン処理
// ========================================
async function main() {
  const articlePath = process.argv[2];
  const thumbnailPath = process.argv[3];
  const draftOnly = process.argv.includes('--draft');

  if (!articlePath) {
    console.error('使い方: node publish-note.js <記事ファイルパス> <サムネイルパス> [--draft]');
    process.exit(1);
  }

  const resolvedArticlePath = path.resolve(articlePath);
  if (!fs.existsSync(resolvedArticlePath)) {
    console.error(`記事ファイルが見つかりません: ${resolvedArticlePath}`);
    process.exit(1);
  }

  if (!fs.existsSync(PROFILE_DIR)) {
    console.error('ブラウザプロファイルが見つかりません。');
    console.error('先に monetize/scripts/save-note-session.js を実行してください。');
    process.exit(1);
  }

  const resolvedThumbnailPath = thumbnailPath ? path.resolve(thumbnailPath) : null;

  const raw = fs.readFileSync(resolvedArticlePath, 'utf-8');
  const title = extractTitle(raw);
  const body = convertToNoteText(raw);

  console.error(`📄 記事を読み込みました: ${title}`);
  console.error(`   モード: ${draftOnly ? '下書き保存' : '公開'}`);
  if (resolvedThumbnailPath) console.error(`   サムネイル: ${resolvedThumbnailPath}`);

  // headless: true（cron実行対応）
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = await context.newPage();

  let noteUrl = null;
  try {
    noteUrl = await postArticle(page, title, body, resolvedThumbnailPath, draftOnly);
    console.error('\n🎉 note投稿完了！');
    if (noteUrl) {
      console.error(`   URL: ${noteUrl}`);
      // stdoutにURLを出力（daily-shizuoka-post.jsが読み取る）
      process.stdout.write(noteUrl);
    }
  } catch (err) {
    console.error('\n❌ エラー:', err.message);
    await page.screenshot({ path: path.join(SCRIPT_DIR, 'error-screenshot.png') }).catch(() => {});
    console.error('   save-note-session.js を再実行してセッションを更新してください。');
    process.exit(1);
  } finally {
    await page.waitForTimeout(2000);
    await context.close();
  }
}

main().catch((err) => {
  console.error('エラー:', err.message);
  process.exit(1);
});
