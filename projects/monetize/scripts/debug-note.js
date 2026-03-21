import { chromium } from 'playwright';
import path from 'path';

const PROFILE_DIR = path.resolve(import.meta.dirname, 'browser-profile');

async function main() {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = await context.newPage();

  // トップページのログイン状態確認
  console.log('1. note.com トップ...');
  await page.goto('https://note.com');
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'debug-top.png' });
  console.log(`   URL: ${page.url()}`);

  // エディタへ移動
  console.log('\n2. エディタページへ...');
  await page.goto('https://note.com/notes/new');
  await page.waitForURL(/editor\.note\.com/, { timeout: 15000 }).catch(() => {});
  console.log(`   URL: ${page.url()}`);

  // 30秒待機してスクリーンショット
  for (let i = 5; i <= 30; i += 5) {
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `debug-editor-${i}s.png` });
    console.log(`   ${i}秒後のスクリーンショット保存`);

    // エディタが表示されたか確認
    const editorVisible = await page.$('.ProseMirror, [contenteditable="true"]');
    if (editorVisible) {
      console.log(`   ✅ ${i}秒後にエディタが表示されました！`);
      break;
    }
  }

  await context.close();
}

main().catch(console.error);
