#!/usr/bin/env node
// HTML → PNG 変換スクリプト
// 使い方: node html-to-png.js <htmlファイルパス>

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const htmlPath = process.argv[2];
if (!htmlPath) {
  console.error('使い方: node html-to-png.js <htmlファイルパス>');
  process.exit(1);
}

const absolutePath = path.resolve(htmlPath);
const pngPath = absolutePath.replace('.html', '.png');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setViewport({ width: 900, height: 800, deviceScaleFactor: 2 });
  await page.goto(`file://${absolutePath}`, { waitUntil: 'networkidle0' });

  // コンテンツ全体の高さに合わせる
  const height = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({ width: 900, height: height + 60, deviceScaleFactor: 2 });

  await page.screenshot({ path: pngPath, fullPage: true });
  await browser.close();

  console.log(`✅ 保存しました: ${pngPath}`);
})();
