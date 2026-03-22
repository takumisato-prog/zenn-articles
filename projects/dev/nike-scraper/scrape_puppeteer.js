// Nike スクレイパー (Puppeteer版)
// 使い方: node scrape_puppeteer.js [Nike URL]
// 例:     node scrape_puppeteer.js "https://www.nike.com/jp/w/bundle-promo-over-15000-shoes-6bt7oztll2zy7ok?sortBy=priceDesc"
// 出力:   nike_products.csv（ページ表示順 + 全スウォッチ）

const puppeteer    = require('puppeteer');
const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');

const NIKE_URL    = process.argv[2] || 'https://www.nike.com/jp/w/bundle-promo-over-15000-shoes-6bt7oztll2zy7ok?sortBy=priceDesc';
const OUTPUT_FILE = path.join(__dirname, 'nike_products.csv');

const SCROLL_WAIT_MS      = 4000; // スクロール後の待機（長めにして確実にロード）
const MAX_SCROLL_ATTEMPTS = 60;

function extractAttrId(nikeUrl) {
  const m = nikeUrl.match(/\/w\/([^?#/]+)/);
  if (!m) return '';
  const id = m[1].match(/[-]([a-z0-9]{8,})$/);
  return id ? id[1] : '';
}

// pdpUrl から rollupKey を取得（URLの最後の / の前の英数字部分）
// 例: /jp/t/ナイキ-...-MAdes8gk/HJ2147-003 → MAdes8gk
function rollupKeyFromUrl(pdpUrl) {
  const m = pdpUrl.match(/\/t\/[^/]+-([A-Za-z0-9]{5,})\//);
  return m ? m[1] : '';
}

async function main() {
  console.log('=== Nike スクレイパー (Puppeteer版) ===');
  console.log('URL:', NIKE_URL);

  const attrId = extractAttrId(NIKE_URL);

  // ========== STEP 1: Puppeteer でページ順序 + product_wall スウォッチを取得 ==========
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=ja-JP'],
  });
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8' });
  await page.setViewport({ width: 1280, height: 900 });

  // pageWallData: rollupKey → [{styleColor, priceNum, url}]  ページ順で記録
  const pageWallData  = new Map(); // rollupKey → products（product_wallの分）
  const pageOrderKeys = [];        // rollupKey の表示順（重複なし）

  page.on('response', async (response) => {
    if (!response.url().includes('/discover/product_wall/v1/')) return;
    if (response.status() !== 200) return;
    try {
      const data = await response.json();
      (data.productGroupings || []).forEach((g) => {
        (g.products || []).forEach((p) => {
          const pdpUrl    = (p.pdpUrl && p.pdpUrl.url) || '';
          const rollupKey = rollupKeyFromUrl(pdpUrl);
          if (!rollupKey) return;
          if (p.productType && p.productType !== 'FOOTWEAR') return;
          if (pdpUrl.includes('by-you')) return;

          // 初回登場 → ページ順に追加
          if (!pageWallData.has(rollupKey)) {
            pageWallData.set(rollupKey, []);
            pageOrderKeys.push(rollupKey);
          }
          const sc = p.productCode;
          if (sc && !pageWallData.get(rollupKey).some((x) => x.styleColor === sc)) {
            const pr = p.prices || {};
            pageWallData.get(rollupKey).push({
              styleColor: sc,
              color:      '',
              priceNum:   pr.currentPrice || pr.fullPrice || 0,
              url:        pdpUrl,
            });
          }
        });
      });
    } catch (e) { /* 無視 */ }
  });

  console.log('ページを読み込んでいます...');
  await page.goto(NIKE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(SCROLL_WAIT_MS);

  // __NEXT_DATA__ から最初のカードを補完
  try {
    const firstPageData = await page.evaluate(() => {
      const el = document.getElementById('__NEXT_DATA__');
      if (!el) return [];
      const data = JSON.parse(el.textContent);
      function find(obj, d) {
        if (!obj || typeof obj !== 'object' || d > 20) return null;
        if (obj.productGroupings) return obj;
        if (Array.isArray(obj)) { for (const i of obj) { const r = find(i, d+1); if (r) return r; } }
        else { for (const v of Object.values(obj)) { const r = find(v, d+1); if (r) return r; } }
        return null;
      }
      const c = find(data, 0);
      if (!c) return [];
      const result = [];
      (c.productGroupings || []).forEach((g) => {
        (g.products || []).forEach((p) => {
          const pdpUrl = (p.pdpUrl && p.pdpUrl.url) || '';
          const m = pdpUrl.match(/\/t\/[^/]+-([A-Za-z0-9]{5,})\//);
          const rollupKey = m ? m[1] : '';
          if (!rollupKey) return;
          if (p.productType && p.productType !== 'FOOTWEAR') return;
          if (pdpUrl.includes('by-you')) return;
          const pr = p.prices || {};
          result.push({ rollupKey, sc: p.productCode, price: pr.currentPrice || pr.fullPrice || 0, url: pdpUrl });
        });
      });
      return result;
    });

    // __NEXT_DATA__ 分を先頭に挿入（ページ先頭カードが確実に入るように）
    firstPageData.reverse().forEach(({ rollupKey, sc, price, url }) => {
      if (!pageWallData.has(rollupKey)) {
        pageWallData.set(rollupKey, []);
        pageOrderKeys.unshift(rollupKey);
      }
      if (sc && !pageWallData.get(rollupKey).some((x) => x.styleColor === sc)) {
        pageWallData.get(rollupKey).push({ styleColor: sc, color: '', priceNum: price, url });
      }
    });
    console.log('__NEXT_DATA__ 補完: ' + [...new Set(firstPageData.map(x=>x.rollupKey))].length + 'カード');
  } catch (e) { /* 無視 */ }

  // 自動スクロールで全カードを読み込む
  console.log('スクロール中...');
  let prevCount = 0;
  let noChange  = 0;
  for (let i = 0; i < MAX_SCROLL_ATTEMPTS; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(SCROLL_WAIT_MS);
    const cur = pageOrderKeys.length;
    if (cur === prevCount) { if (++noChange >= 4) { console.log('4回連続変化なし → 終了'); break; } }
    else { noChange = 0; }
    prevCount = cur;
    process.stdout.write(`\r  スクロール ${i+1}回目 / カード数 ${cur}`);
  }
  console.log('');
  await browser.close();
  console.log('ページ順カード数:', pageOrderKeys.length);

  // ========== STEP 2: product_feed API で全スウォッチを取得 ==========
  // rollupKey で絞り込み: ページ上のカードのみ対象
  const feedMap = new Map(); // rollupKey → [{styleColor, color, priceNum, url}]

  if (attrId) {
    console.log('全スウォッチを product_feed API から取得中...');
    let anchor = 0;
    let total  = 0;

    for (let pg = 0; pg < 25; pg++) {
      const apiUrl =
        'https://www.nike.com/product_feed/rollup_threads/v2' +
        '?filter=marketplace(JP)&filter=language(ja)' +
        '&filter=attributeIds(' + attrId + ')' +
        '&anchor=' + anchor + '&count=48' +
        '&consumerChannelId=d9a5bc42-4b9c-4976-858a-f159cf99c647';

      const res = await fetch(apiUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', 'Accept-Language': 'ja-JP,ja;q=0.9' },
      });
      if (res.status !== 200) break;

      const data  = await res.json();
      const items = data.objects || [];
      if (items.length === 0) break;

      items.forEach((item) => {
        const allInfos = [
          ...(item.productInfo || []),
          ...((item.rollup && item.rollup.threads) || []).flatMap((t) => t.productInfo || []),
        ];
        allInfos.forEach((info) => {
          const mp = info.merchProduct || {};
          const sc = mp.styleColor;
          if (!sc || !/^[A-Z]{2}\d{4}-\d{3}$/.test(sc)) return;
          if (mp.productType && mp.productType !== 'FOOTWEAR') return;

          const rollupKey = (mp.productRollup && mp.productRollup.key) || '';
          if (!rollupKey) return;

          // ページ上に存在するrollupKeyのみ対象
          if (!pageWallData.has(rollupKey)) return;

          const pc     = info.productContent || {};
          if ((pc.slug || '').includes('by-you')) return;

          const mpr      = info.merchPrice || {};
          const priceNum = mpr.currentPrice || mpr.fullPrice || 0;
          const slug     = pc.slug || '';
          const url      = slug ? 'https://www.nike.com/jp/t/' + encodeURI(slug) + '/' + sc : '';

          if (!feedMap.has(rollupKey)) feedMap.set(rollupKey, []);
          if (!feedMap.get(rollupKey).some((x) => x.styleColor === sc)) {
            feedMap.get(rollupKey).push({ styleColor: sc, color: pc.colorDescription || '', priceNum, url });
            total++;
          }
        });
      });

      process.stdout.write(`\r  anchor=${anchor}: フィード累計 ${total}件 / マッチ ${feedMap.size}カード`);
      if (items.length < 48) break;
      anchor += 48;
      await sleep(300);
    }
    console.log('');
  }

  // ========== STEP 3: ページ順にスウォッチを並べる ==========
  const result = [];
  const seenSc = new Set();

  pageOrderKeys.forEach((rollupKey) => {
    // feedMap にあれば全スウォッチ、なければ product_wall のデータで補完
    const swatches = feedMap.has(rollupKey)
      ? feedMap.get(rollupKey)
      : (pageWallData.get(rollupKey) || []);

    swatches.forEach((p) => {
      if (!seenSc.has(p.styleColor)) {
        seenSc.add(p.styleColor);
        result.push(p);
      }
    });
  });

  console.log(`\n取得完了: ${result.length}件`);
  if (result[0]) console.log('1位:', result[0].styleColor, '¥' + result[0].priceNum.toLocaleString());
  if (result[1]) console.log('2位:', result[1].styleColor, '¥' + result[1].priceNum.toLocaleString());

  // ========== CSV出力 ==========
  const lines = ['型番,カラー名,仕入れ先URL,仕入れ価格元値'];
  result.forEach((p) => {
    lines.push([p.styleColor, (p.color || '').replace(/,/g, '、'), p.url, p.priceNum || ''].join(','));
  });
  fs.writeFileSync(OUTPUT_FILE, '\uFEFF' + lines.join('\n'), 'utf8');
  console.log(`CSV出力完了: ${OUTPUT_FILE}`);
  try { execSync(`open -R "${OUTPUT_FILE}"`); } catch (e) { /* 無視 */ }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
main().catch((e) => { console.error('エラー:', e); process.exit(1); });
