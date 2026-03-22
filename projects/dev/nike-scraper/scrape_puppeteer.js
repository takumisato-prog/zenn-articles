// Nike スクレイパー (Puppeteer版)
// 使い方: node scrape_puppeteer.js [Nike URL]
// 例:     node scrape_puppeteer.js "https://www.nike.com/jp/w/bundle-promo-over-15000-shoes-6bt7oztll2zy7ok?sortBy=priceDesc"
// 出力:   nike_products.csv（価格降順、ページ表示順と同じ）

const puppeteer = require('puppeteer');
const fs        = require('fs');
const path      = require('path');

const NIKE_URL = process.argv[2] || 'https://www.nike.com/jp/w/bundle-promo-over-15000-shoes-6bt7oztll2zy7ok?sortBy=priceDesc';
const OUTPUT_FILE = path.join(__dirname, 'nike_products.csv');

// ページ遷移・スクロールのタイムアウト設定
const SCROLL_INTERVAL_MS   = 1500; // スクロール間隔
const SCROLL_WAIT_API_MS   = 2000; // APIレスポンス待機
const MAX_SCROLL_ATTEMPTS  = 50;   // 最大スクロール回数（安全弁）

async function main() {
  console.log('=== Nike スクレイパー (Puppeteer版) ===');
  console.log('URL:', NIKE_URL);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--lang=ja-JP',
      '--accept-lang=ja-JP,ja;q=0.9',
    ],
  });

  const page = await browser.newPage();

  // 日本語ロケール設定
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8' });
  await page.setViewport({ width: 1280, height: 900 });

  // ========== APIレスポンス傍受 ==========
  // /discover/product_wall/v1/ のレスポンスを収集する
  const seen         = {};   // styleColor の重複排除
  const allProducts  = [];   // 収集した全商品

  page.on('response', async (response) => {
    const url = response.url();
    if (!url.includes('/discover/product_wall/v1/')) return;
    if (response.status() !== 200) return;

    try {
      const data      = await response.json();
      const groupings = data.productGroupings || [];

      groupings.forEach((g) => {
        (g.products || []).forEach((p) => {
          const sc = p.productCode;
          if (!sc || !/^[A-Z]{2}\d{4}-\d{3}$/.test(sc)) return;
          if (seen[sc]) return;

          // By You（カスタム）商品を除外
          const pdpUrl = (p.pdpUrl && p.pdpUrl.url) || '';
          if (pdpUrl.includes('by-you')) return;

          // FOOTWEARのみ
          if (p.productType && p.productType !== 'FOOTWEAR') return;

          seen[sc] = true;
          const pr = p.prices || {};
          allProducts.push({
            styleColor: sc,
            color:      '',    // productGroupings にカラー名フィールドなし
            url:        pdpUrl,
            priceNum:   pr.currentPrice || pr.fullPrice || 0,
          });
        });
      });

      console.log(`  APIレスポンス受信: +${groupings.length}カード (累計${allProducts.length}件)`);
    } catch (e) {
      // JSON解析失敗は無視
    }
  });

  // ========== ページ遷移 ==========
  console.log('ページを読み込んでいます...');
  await page.goto(NIKE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(SCROLL_WAIT_API_MS);

  // ========== __NEXT_DATA__ から最初のページを補完 ==========
  // ページ遷移後の初期データ（APIより先に取得できる場合がある）
  try {
    const nextDataProducts = await page.evaluate(() => {
      const el = document.getElementById('__NEXT_DATA__');
      if (!el) return [];
      const data = JSON.parse(el.textContent);

      function findGroupings(obj, depth) {
        if (!obj || typeof obj !== 'object' || depth > 20) return null;
        if (obj.productGroupings && Array.isArray(obj.productGroupings)) return obj;
        if (Array.isArray(obj)) {
          for (const i of obj) { const r = findGroupings(i, depth + 1); if (r) return r; }
        } else {
          for (const v of Object.values(obj)) { const r = findGroupings(v, depth + 1); if (r) return r; }
        }
        return null;
      }

      const container = findGroupings(data, 0);
      if (!container) return [];

      const result = [];
      (container.productGroupings || []).forEach((g) => {
        (g.products || []).forEach((p) => {
          const sc = p.productCode;
          if (!sc) return;
          const pdpUrl = (p.pdpUrl && p.pdpUrl.url) || '';
          if (pdpUrl.includes('by-you')) return;
          if (p.productType && p.productType !== 'FOOTWEAR') return;
          const pr = p.prices || {};
          result.push({
            styleColor: sc,
            color:      '',
            url:        pdpUrl,
            priceNum:   pr.currentPrice || pr.fullPrice || 0,
          });
        });
      });
      return result;
    });

    nextDataProducts.forEach((p) => {
      if (!seen[p.styleColor]) {
        seen[p.styleColor] = true;
        allProducts.push(p);
      }
    });
    console.log(`__NEXT_DATA__ から ${nextDataProducts.length}件 補完`);
  } catch (e) {
    console.warn('__NEXT_DATA__ 取得スキップ:', e.message);
  }

  // ========== 自動スクロールで全商品ロード ==========
  console.log('スクロールして全商品を読み込みます...');
  let prevCount = 0;
  let noChangeCount = 0;

  for (let i = 0; i < MAX_SCROLL_ATTEMPTS; i++) {
    // ページ最下部へスクロール
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(SCROLL_INTERVAL_MS);

    // APIレスポンス待機
    await sleep(SCROLL_WAIT_API_MS);

    const currentCount = allProducts.length;
    if (currentCount === prevCount) {
      noChangeCount++;
      if (noChangeCount >= 3) {
        console.log('新規商品なし（3回連続）→ スクロール終了');
        break;
      }
    } else {
      noChangeCount = 0;
    }
    prevCount = currentCount;
    process.stdout.write(`\r  スクロール ${i + 1}回目 / 累計 ${currentCount}件`);
  }
  console.log('');

  await browser.close();

  // ========== 価格降順ソート ==========
  allProducts.sort((a, b) => b.priceNum - a.priceNum);

  console.log(`\n取得完了: ${allProducts.length}件`);
  if (allProducts.length > 0) {
    console.log('1位:', allProducts[0].styleColor, '¥' + allProducts[0].priceNum.toLocaleString());
    console.log('2位:', allProducts[1] && allProducts[1].styleColor, '¥' + (allProducts[1] && allProducts[1].priceNum.toLocaleString()));
  }

  // ========== CSV出力 ==========
  const lines = ['型番,カラー名,仕入れ先URL,仕入れ価格元値'];
  allProducts.forEach((p) => {
    const col = [
      p.styleColor,
      (p.color || '').replace(/,/g, '、'),
      p.url,
      p.priceNum || '',
    ];
    lines.push(col.join(','));
  });
  fs.writeFileSync(OUTPUT_FILE, '\uFEFF' + lines.join('\n'), 'utf8'); // BOM付きUTF-8（Excel対応）
  console.log(`\nCSV出力完了: ${OUTPUT_FILE}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((e) => {
  console.error('エラー:', e);
  process.exit(1);
});
