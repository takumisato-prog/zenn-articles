// Nike スクレイパー ローカルテスト（GASロジックをNode.jsで再現）
// 実行: node test_scrape.js [Nike URL]
// 例:   node test_scrape.js "https://www.nike.com/jp/w/bundle-promo-over-15000-shoes-6bt7oztll2zy7ok"

const NIKE_URL = process.argv[2] || 'https://www.nike.com/jp/w/bundle-promo-over-15000-shoes-6bt7oztll2zy7ok';

// ========== slug抽出 ==========
function extractChannelIdFromSlug(slug) {
  const m = slug.match(/[-]([a-z0-9]{8,})$/);
  return m ? m[1] : '';
}

// ========== フィードAPIパーサー ==========
function parseNikeFeedItem(obj) {
  const results = [];
  const props    = (obj.publishedContent && obj.publishedContent.properties) || {};
  const urlMap   = {};
  const colorMap = {};

  (props.colorways || []).forEach(cw => {
    if (!cw.styleColor) return;
    const rawUrl = cw.pdpUrl || cw.url || '';
    if (rawUrl) urlMap[cw.styleColor] = rawUrl.startsWith('http') ? rawUrl : 'https://www.nike.com' + rawUrl;
    if (cw.colorDescription) colorMap[cw.styleColor] = cw.colorDescription;
  });

  let coverProducts = [];
  try { coverProducts = obj.publishedContent.properties.coverCard.properties.products || []; } catch(e) {}
  coverProducts.forEach(cp => {
    if (!cp.styleColor) return;
    const rawUrl = cp.pdpUrl || cp.url || '';
    if (rawUrl && !urlMap[cp.styleColor]) urlMap[cp.styleColor] = rawUrl.startsWith('http') ? rawUrl : 'https://www.nike.com' + rawUrl;
    if (cp.colorDescription && !colorMap[cp.styleColor]) colorMap[cp.styleColor] = cp.colorDescription;
  });

  const mainUrl = (obj.links && obj.links.pdp && obj.links.pdp.url) || '';

  (obj.productInfo || []).forEach(info => {
    const sc = info.styleColor;
    if (!sc || !/^[A-Z]{2}\d{4}-\d{3}$/.test(sc)) return;

    const prices = info.prices || {};
    // 価格フィールドのfallback
    let priceNum = prices.currentPrice || prices.fullPrice || prices.discountedPrice || prices.salePrice || 0;
    if (!priceNum) priceNum = info.currentPrice || info.fullPrice || 0;
    if (!priceNum && info.localizedPrice) {
      const lp = (info.localizedPrice + '').replace(/[¥,￥\s]/g, '').match(/\d+/);
      if (lp) priceNum = parseInt(lp[0], 10);
    }

    const productUrl = urlMap[sc]
      || (mainUrl ? (mainUrl.startsWith('http') ? mainUrl : 'https://www.nike.com' + mainUrl) : '')
      || 'https://www.nike.com/jp/search?q=' + encodeURIComponent(sc);

    results.push({
      styleColor: sc,
      color: colorMap[sc] || info.colorDescription || '',
      priceNum,
      url: productUrl,
      // 価格フィールドのデバッグ情報
      _pricesRaw: prices,
    });
  });
  return results;
}

// ========== 再帰探索（フォールバック） ==========
function collectProducts(obj, results, seen, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 25) return;
  if (obj.styleColor && typeof obj.styleColor === 'string' && /^[A-Z]{2}\d{4}-\d{3}$/.test(obj.styleColor)) {
    if (!seen[obj.styleColor]) {
      seen[obj.styleColor] = true;
      const priceInfo = obj.priceInfo || obj.price || obj.prices || {};
      let priceNum = priceInfo.currentPrice || priceInfo.fullPrice || obj.currentPrice || 0;
      const pdp = obj.pdpUrl || obj.url || '';
      const productUrl = pdp.startsWith('http') ? pdp : pdp ? 'https://www.nike.com' + pdp : 'https://www.nike.com/jp/search?q=' + encodeURIComponent(obj.styleColor);
      results.push({ styleColor: obj.styleColor, color: obj.colorDescription || '', priceNum, url: productUrl });
    }
    ['colorways', 'nodes', 'availableColorways'].forEach(key => {
      if (Array.isArray(obj[key])) obj[key].forEach(cw => collectProducts(cw, results, seen, depth + 1));
    });
    return;
  }
  if (Array.isArray(obj)) { obj.forEach(item => collectProducts(item, results, seen, depth + 1)); }
  else { Object.keys(obj).forEach(key => collectProducts(obj[key], results, seen, depth + 1)); }
}

// ========== メイン ==========
async function main() {
  const slugMatch = NIKE_URL.match(/nike\.com\/jp\/w\/([^?#\/]+)/);
  if (!slugMatch) { console.error('URLの形式が正しくありません'); process.exit(1); }
  const slug = slugMatch[1];
  const attributeIds = extractChannelIdFromSlug(slug);

  console.log('=== Nike スクレイパー テスト ===');
  console.log('URL   :', NIKE_URL);
  console.log('slug  :', slug);
  console.log('attrId:', attributeIds);
  console.log('');

  // ページ1だけ取得（テスト用）
  const apiUrl = `https://www.nike.com/product_feed/rollup_threads/v2`
    + `?filter=marketplace(JP)`
    + `&filter=language(ja)`
    + `&filter=attributeIds(${attributeIds})`
    + `&anchor=0&count=48`
    + `&consumerChannelId=d9a5bc42-4b9c-4976-858a-f159cf99c647`;

  const res = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'ja-JP,ja;q=0.9',
    }
  });

  console.log('HTTP Status:', res.status);
  if (res.status !== 200) { console.error('APIエラー'); process.exit(1); }

  const data = await res.json();
  const items = data.objects || data.products || data.threads || [];
  console.log('API items数:', items.length);
  console.log('');

  // parseNikeFeedItem で取得
  const seen = {};
  const parsed = [];
  items.forEach(item => {
    parseNikeFeedItem(item).forEach(p => {
      if (!seen[p.styleColor]) { seen[p.styleColor] = true; parsed.push(p); }
    });
  });

  console.log(`--- parseNikeFeedItem 結果: ${parsed.length}件 ---`);
  if (parsed.length > 0) {
    parsed.slice(0, 5).forEach((p, i) => {
      console.log(`[${i+1}] 型番: ${p.styleColor} | カラー: ${p.color || '(なし)'} | 価格: ${p.priceNum || '(なし)'} | URL: ${p.url ? '✓' : '✗(空)'}`);
      // 価格フィールドのデバッグ
      if (!p.priceNum) console.log(`     → prices raw:`, JSON.stringify(p._pricesRaw));
    });
    if (parsed.length > 5) console.log(`  ... 他 ${parsed.length - 5}件`);
  } else {
    console.log('→ 0件。collectProducts にフォールバック...');
    const fallback = [];
    const seen2 = {};
    items.forEach(item => collectProducts(item, fallback, seen2));
    console.log(`collectProducts 結果: ${fallback.length}件`);
    fallback.slice(0, 5).forEach((p, i) => {
      console.log(`[${i+1}] 型番: ${p.styleColor} | 価格: ${p.priceNum || '(なし)'} | URL: ${p.url ? '✓' : '✗'}`);
    });
  }

  // 1件目の生データを出力（構造確認用）
  if (items.length > 0) {
    console.log('\n--- 1件目の productInfo 構造 ---');
    const firstItem = items[0];
    const pi = (firstItem.productInfo || []).slice(0, 2);
    pi.forEach((info, i) => {
      console.log(`productInfo[${i}]:`, JSON.stringify({
        styleColor: info.styleColor,
        prices: info.prices,
        currentPrice: info.currentPrice,
        localizedPrice: info.localizedPrice,
        colorDescription: info.colorDescription,
      }, null, 2));
    });
    // urlMap確認
    const props = (firstItem.publishedContent && firstItem.publishedContent.properties) || {};
    console.log('\ncolorways count:', (props.colorways || []).length);
    if (props.colorways && props.colorways[0]) {
      console.log('colorways[0]:', JSON.stringify({
        styleColor: props.colorways[0].styleColor,
        pdpUrl: props.colorways[0].pdpUrl,
        colorDescription: props.colorways[0].colorDescription,
      }, null, 2));
    }
  }
}

main().catch(console.error);
