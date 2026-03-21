/**
 * 静岡DEEP — 毎日自動投稿スクリプト
 * 記事生成 → サムネイル生成 → Note.com投稿 を統括する
 *
 * 使い方（手動）:
 *   node daily-shizuoka-post.js                    # 通常実行（公開まで）
 *   node daily-shizuoka-post.js --draft            # 下書き保存のみ
 *   node daily-shizuoka-post.js --skip-generate    # 記事生成をスキップ（前日生成済みの場合）
 *
 * cron設定（毎朝7:00）:
 *   crontab -e
 *   0 7 * * * cd /Users/satoutakumi/AI/projects/dev/shizuoka-note && node scripts/daily-shizuoka-post.js >> scripts/daily-post.log 2>&1
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCRIPT_DIR = import.meta.dirname;
const ROOT = path.resolve(SCRIPT_DIR, '..');
const LOG_FILE = path.join(SCRIPT_DIR, 'daily-post.log');
const PROGRESS_FILE = path.join(ROOT, 'progress.json');

// Google DriveのフォルダID（rclone経由でアップロード）
const GDRIVE_FOLDER_ID = '16nAAMuNw_Homc4Qoj2wlF_5ILGkU-enl';
const RCLONE_REMOTE = 'gdrive:';

// ========================================
// ログ出力（ファイル＋stderr）
// ========================================
function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.error(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

// ========================================
// 未投稿の記事を探す（--skip-generate用）
// ========================================
function findPendingArticle() {
  const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  const pendingEntry = progress.posted.find((p) => p.note_url === null);
  if (!pendingEntry) return null;

  const articlePath = path.join(ROOT, 'articles', pendingEntry.file);
  const thumbnailPath = path.join(ROOT, 'thumbnails', pendingEntry.thumbnail);

  if (!fs.existsSync(articlePath)) return null;

  return {
    articlePath,
    thumbnailPath: fs.existsSync(thumbnailPath) ? thumbnailPath : null,
    index: pendingEntry.index,
  };
}

// ========================================
// progress.jsonのnote_urlを更新
// ========================================
function updateNoteUrl(articleIndex, noteUrl) {
  const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  const entry = progress.posted.find((p) => p.index === articleIndex);
  if (entry) {
    entry.note_url = noteUrl;
    entry.posted_at = new Date().toISOString();
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  }
}

// ========================================
// Google Driveにアップロード（rclone使用）
// タイトルをファイル名にして保存
// ========================================
function uploadToGDrive(articlePath) {
  // H1タイトルを記事から取得
  const raw = fs.readFileSync(articlePath, 'utf-8');
  const titleMatch = raw.match(/^#\s+(.+)$/m);
  if (!titleMatch) {
    log('   ⚠️  タイトルが取得できなかったためGDriveアップロードをスキップ');
    return;
  }
  const title = titleMatch[1].trim();

  // タイトルをファイル名に使う（ファイルシステムで使えない文字を除去）
  const safeTitle = title.replace(/[/\\:*?"<>|]/g, '');
  const driveFilename = `${safeTitle}.md`;

  // 一時ファイルとして書き出し（ファイル名をタイトルにする）
  const tmpPath = path.join(ROOT, 'articles', driveFilename);
  fs.copyFileSync(articlePath, tmpPath);

  try {
    execSync(
      `rclone copy "${tmpPath}" "${RCLONE_REMOTE}" --drive-root-folder-id "${GDRIVE_FOLDER_ID}"`,
      { encoding: 'utf-8' }
    );
    log(`   ✅ Google Drive保存完了: ${driveFilename}`);
  } finally {
    // 一時ファイルを削除（元のarticle-XX.mdは残す）
    if (tmpPath !== articlePath) fs.unlinkSync(tmpPath);
  }
}

// ========================================
// 記事番号をファイル名から取得
// ========================================
function extractArticleIndex(filepath) {
  const basename = path.basename(filepath);
  const match = basename.match(/article-(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// ========================================
// メイン処理
// ========================================
async function main() {
  const args = process.argv.slice(2);
  const draftOnly = args.includes('--draft');
  const skipGenerate = args.includes('--skip-generate');

  log('=== 静岡DEEP 毎日投稿 開始 ===');

  let articlePath = null;
  let thumbnailPath = null;
  let articleIndex = null;

  try {
    if (skipGenerate) {
      // 既存の未投稿記事を探す
      log('1. 既存の未投稿記事を確認中...');
      const pending = findPendingArticle();
      if (!pending) {
        log('✅ 投稿済みか生成待ちの記事がありません。--skip-generate を外して実行してください。');
        return;
      }
      articlePath = pending.articlePath;
      thumbnailPath = pending.thumbnailPath;
      articleIndex = pending.index;
      log(`   未投稿記事: ${articlePath}`);
    } else {
      // Step 1: 記事生成
      log('1. 記事生成中...');
      const generateResult = execSync(
        `node "${path.join(SCRIPT_DIR, 'generate-shizuoka-article.js')}"`,
        { cwd: SCRIPT_DIR, encoding: 'utf-8' }
      );

      // stdoutの最後の行がファイルパス
      articlePath = generateResult.trim().split('\n').pop();

      if (!articlePath || !fs.existsSync(articlePath)) {
        log('✅ 投稿すべき記事がありません（全30本完了）');
        return;
      }

      articleIndex = extractArticleIndex(articlePath);
      log(`   生成完了: ${articlePath}`);

      // Step 2: Google Driveに保存（タイトルをファイル名として）
      log('2. Google Driveに保存中...');
      uploadToGDrive(articlePath);

      // Step 4: サムネイル生成
      log('3. サムネイル生成中...');
      const thumbnailResult = execSync(
        `node "${path.join(SCRIPT_DIR, 'generate-thumbnail.js')}" "${articlePath}"`,
        { cwd: SCRIPT_DIR, encoding: 'utf-8' }
      );

      thumbnailPath = thumbnailResult.trim().split('\n').pop();

      if (thumbnailPath && fs.existsSync(thumbnailPath)) {
        log(`   生成完了: ${thumbnailPath}`);
      } else {
        log('   ⚠️  サムネイル生成に失敗しましたが投稿を続行します。');
        thumbnailPath = null;
      }
    }

    // Step 5: Note.com に投稿
    log(`4. Note.com に投稿中... (モード: ${draftOnly ? '下書き' : '公開'})`);

    const publishArgs = [
      `"${path.join(SCRIPT_DIR, 'publish-note.js')}"`,
      `"${articlePath}"`,
      thumbnailPath ? `"${thumbnailPath}"` : '""',
      draftOnly ? '--draft' : '',
    ].filter(Boolean).join(' ');

    const publishResult = execSync(
      `node ${publishArgs}`,
      { cwd: SCRIPT_DIR, encoding: 'utf-8' }
    );

    const noteUrl = publishResult.trim() || null;

    // Step 4: progress.json 更新
    if (articleIndex && noteUrl && !draftOnly) {
      updateNoteUrl(articleIndex, noteUrl);
      log(`✅ 投稿完了: ${noteUrl}`);
    } else if (draftOnly) {
      log('✅ 下書き保存完了');
    } else {
      log('✅ 投稿完了（URLの取得に失敗しましたが投稿は完了しています）');
    }

    log('=== 静岡DEEP 毎日投稿 完了 ===');
  } catch (err) {
    log(`❌ エラー: ${err.message}`);
    if (err.stdout) log(`   stdout: ${err.stdout}`);
    if (err.stderr) log(`   stderr: ${err.stderr}`);
    process.exit(1);
  }
}

main();
