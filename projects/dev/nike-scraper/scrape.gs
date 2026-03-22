// ============================================================
// Nike 商品スクレイパー — Google Apps Script (拡張版)
// ============================================================
// セル割り当て (Row1):
//   B1: Nike URL (例: https://www.nike.com/jp/w/bundle-promo-over-15000-shoes-6bt7oztll2zy7ok)
//   F1: 割引率 (%) の値
//   H1: Keepa API キー
// Row2: ヘッダー行（以下の列名を必ず含める）
//   型番 / カラー名 / 仕入れ先URL / 仕入れ価格元値 / 割引後仕入れ価格
//   Amazon ASIN / Amazon URL / Amazon現在価格 / 粗利額 / 粗利率 / Keepaランキング / 利益商品
// Row3以降: データ
// ============================================================

// ヘッダー列名の定義（Row2 で検出する列名）
var HEADERS = {
  styleColor:      '型番',
  color:           'カラー名',
  url:             '仕入れ先URL',
  price:           '仕入れ価格元値',
  discountedPrice: '割引後仕入れ価格',
  amazonAsin:      'Amazon ASIN',
  amazonUrl:       'Amazon URL',
  amazonPrice:     'Amazon現在価格',
  grossProfit:     '粗利額',
  grossMargin:     '粗利率',
  salesRank:       'Keepaランキング',
  profitFlag:      '利益商品',
};

// 利益商品フィルタ条件
var PROFIT_MARGIN_THRESHOLD = 15;    // 粗利率 15% 以上
var SALES_RANK_THRESHOLD    = 100000; // Keepaランキング 10万位以下

// Keepa APIを呼び出す最大商品数（GAS 6分制限対策）
// 1件あたり約2秒かかるため、50件 = 約100秒
var KEEPA_MAX_PRODUCTS = 50;

// ========== カスタムメニュー ==========
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Nike スクレイパー')
    .addItem('① シートを初期設定する', 'setupSheet')
    .addItem('② 商品データを取得', 'scrapeNikeProducts')
    .addSeparator()
    .addItem('【デバッグ】Nike 取得テスト', 'debugNikeApi')
    .addItem('【デバッグ】APIレスポンス確認', 'debugFeedApiRaw')
    .addItem('【デバッグ】Keepa検索テスト', 'debugKeepaSearch')
    .addToUi();
}

// ========== シート初期設定（ヘッダー・入力欄を自動作成） ==========
function setupSheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();

  // Row1: 設定ラベルと入力欄
  sheet.getRange('A1').setValue('最終取得:');
  sheet.getRange('B1').setValue(sheet.getRange('B1').getValue() || '← Nike URLをここに入力');
  sheet.getRange('E1').setValue('割引率(%)');
  sheet.getRange('F1').setValue(sheet.getRange('F1').getValue() || 50);
  sheet.getRange('G1').setValue('Keepa APIキー');
  sheet.getRange('H1').setValue(sheet.getRange('H1').getValue() || '← Keepa APIキーをここに入力');

  // Row2: ヘッダー（既存内容を確認してから上書き）
  const headerRow = [
    '型番', 'カラー名', '仕入れ先URL', '仕入れ価格元値', '割引後仕入れ価格',
    'Amazon ASIN', 'Amazon URL', 'Amazon現在価格', '粗利額', '粗利率', 'Keepaランキング', '利益商品'
  ];
  sheet.getRange(2, 1, 1, headerRow.length).setValues([headerRow]);

  // ヘッダー行を太字・背景色で強調
  sheet.getRange(2, 1, 1, headerRow.length)
    .setFontWeight('bold')
    .setBackground('#d9e1f2');

  // Row1を薄グレー
  sheet.getRange(1, 1, 1, 10).setBackground('#f2f2f2');

  alert('シートの初期設定が完了しました。\n\nB1にNike URLを入力してから「② 商品データを取得」を実行してください。');
}

// ========== メイン関数 ==========
function scrapeNikeProducts() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();

  const nikeUrl      = getUrlFromCell(sheet, 'B1');
  const discountRate = Number(sheet.getRange('F1').getValue()) || 0;
  const keepaApiKey  = sheet.getRange('H1').getValue().toString().trim();

  Logger.log('Nike URL: ' + nikeUrl);
  Logger.log('割引率: ' + discountRate + '% / Keepa: ' + (keepaApiKey ? '設定済み' : '未設定'));

  if (!nikeUrl || !nikeUrl.includes('nike.com')) {
    alert('B1セルにNikeのURLを入力してください');
    return;
  }

  const slugMatch = nikeUrl.match(/nike\.com\/jp\/w\/([^?#\/]+)/);
  if (!slugMatch) {
    alert('Nike URLの形式が正しくありません。\n例: https://www.nike.com/jp/w/bundle-promo-over-15000-shoes-6bt7oztll2zy7ok');
    return;
  }
  const slug = slugMatch[1];

  // URLのクエリパラメータから sortBy を抽出（例: ?sortBy=priceDesc）
  const sortByMatch = nikeUrl.match(/[?&]sortBy=([^&]+)/);
  const sortBy = sortByMatch ? sortByMatch[1] : '';

  const cols = findColumnsByHeader(sheet);
  if (!cols.styleColor) {
    alert('Row2に「型番」列が見つかりません。ヘッダーを確認してください。');
    return;
  }

  Logger.log('Nike スクレイピング開始... sortBy=' + (sortBy || 'なし'));
  const products = fetchAllNikeProducts(slug, sortBy);
  Logger.log('取得件数: ' + products.length);

  if (products.length === 0) {
    alert('商品データを取得できませんでした。ログを確認してください。');
    return;
  }

  clearDataArea(sheet, cols);

  // Nike データを先に書き込む（Keepaタイムアウトでもデータが残るように）
  writeProducts(sheet, products, cols, discountRate);

  if (keepaApiKey) {
    // GAS 6分制限対策：Keepa処理は先頭 KEEPA_MAX_PRODUCTS 件のみ
    const keepaTargets = products.slice(0, KEEPA_MAX_PRODUCTS);
    Logger.log('Keepa処理対象: ' + keepaTargets.length + '件 (全' + products.length + '件中)');
    enrichWithKeepa(keepaTargets, keepaApiKey, discountRate);
    // Keepa結果をシートに反映
    writeKeepaResults(sheet, keepaTargets, cols);
    highlightProfitableRows(sheet, cols);
  }

  const profitCount = products.filter(function(p) { return p.profitFlag === '◎'; }).length;
  alert(products.length + '件の商品データを書き込みました。\n利益商品 (粗利' + PROFIT_MARGIN_THRESHOLD + '%以上 / ランキング' + SALES_RANK_THRESHOLD.toLocaleString() + '位以内): ' + profitCount + '件');
}

// ========== Nike 全商品取得 ==========
function fetchAllNikeProducts(slug, sortBy) {
  var seen     = {};
  var products = [];

  // HTMLページ取得: sortByをクエリパラメータに含めて __NEXT_DATA__ の順序を正確に取得
  var slugWithSort = sortBy ? slug + '?sortBy=' + sortBy : slug;
  var html = fetchNikePageHtml(slugWithSort);
  var totalResources = extractTotalResources(html);
  Logger.log('Nike ページ表示件数 (totalResources): ' + totalResources);

  // ① __NEXT_DATA__ の productGroupings から最初のページ商品を取得
  // product_feed API に含まれない商品（例: HJ2147-003）を確保するために必須
  var nextDataProducts = parseProductGroupings(html);
  nextDataProducts.forEach(function(p) {
    if (!seen[p.styleColor]) { seen[p.styleColor] = true; products.push(p); }
  });
  Logger.log('__NEXT_DATA__ 取得: ' + nextDataProducts.length + '件');

  // ② product_feed API で全ページのスウォッチバリエーションを取得
  var attributeIds = extractChannelIdFromSlug(slug);
  Logger.log('attributeIds: ' + attributeIds);

  if (attributeIds) {
    var anchor = 0;
    var rollupFetched = 0;
    var maxPages = 15;

    for (var page = 0; page < maxPages; page++) {
      var result = fetchFromProductFeedApi(attributeIds, anchor);
      Logger.log('フィードAPI anchor=' + anchor + ': raw=' + result.rawCount + '件 / 解析=' + result.products.length + '件');

      result.products.forEach(function(p) {
        if (!seen[p.styleColor]) { seen[p.styleColor] = true; products.push(p); }
      });

      rollupFetched += result.rawCount;

      if (result.rawCount === 0 || result.rawCount < 48) break;
      if (totalResources > 0 && rollupFetched >= totalResources) break;
      anchor += 48;
      Utilities.sleep(400);
    }
    Logger.log('フィードAPI 総取得: ' + products.length + '件 (カード数: ' + rollupFetched + '/' + totalResources + ')');
  }

  // FOOTWEAR のみ（product_feed API 由来の APPAREL/EQUIPMENT を除外）
  // productType が空（__NEXT_DATA__ 由来の一部）は除外しない
  var hasTypes = products.some(function(p) { return p.productType; });
  if (hasTypes) {
    var before = products.length;
    products = products.filter(function(p) { return !p.productType || p.productType === 'FOOTWEAR'; });
    Logger.log('FOOTWEARフィルタ: ' + before + '件 → ' + products.length + '件');
  }

  // 価格降順ソート（URL に ?sortBy=priceAsc のみ昇順）
  if (sortBy === 'priceAsc') {
    products.sort(function(a, b) { return a.priceNum - b.priceNum; });
  } else {
    products.sort(function(a, b) { return b.priceNum - a.priceNum; });
  }

  return products;
}

// ========== __NEXT_DATA__ の productGroupings から商品を抽出 ==========
// product_feed API では取得できない商品（高価格帯など）を補完するために使用
function parseProductGroupings(html) {
  var products = [];
  if (!html) return products;

  var marker     = 'id="__NEXT_DATA__"';
  var mIdx       = html.indexOf(marker);
  if (mIdx === -1) { Logger.log('__NEXT_DATA__ タグなし'); return products; }
  var contentStart = html.indexOf('>', mIdx) + 1;
  var contentEnd   = html.indexOf('</script>', contentStart);
  if (contentStart <= 0 || contentEnd <= 0) return products;

  var jsonStr = html.substring(contentStart, contentEnd);
  var data;
  try { data = JSON.parse(jsonStr); } catch(e) { Logger.log('__NEXT_DATA__ JSON.parse エラー: ' + e); return products; }

  // productGroupings コンテナを再帰的に探す
  function findGroupingsContainer(obj, depth) {
    if (!obj || typeof obj !== 'object' || depth > 20) return null;
    if (obj.productGroupings && Array.isArray(obj.productGroupings)) return obj;
    if (Array.isArray(obj)) {
      for (var i = 0; i < obj.length; i++) {
        var r = findGroupingsContainer(obj[i], depth + 1);
        if (r) return r;
      }
    } else {
      var keys = Object.keys(obj);
      for (var k = 0; k < keys.length; k++) {
        var r = findGroupingsContainer(obj[keys[k]], depth + 1);
        if (r) return r;
      }
    }
    return null;
  }

  var container = findGroupingsContainer(data, 0);
  if (!container) { Logger.log('productGroupings コンテナが見つかりません'); return products; }

  var seen = {};
  (container.productGroupings || []).forEach(function(g) {
    (g.products || []).forEach(function(p) {
      var sc = p.productCode;
      if (!sc || !/^[A-Z]{2}\d{4}-\d{3}$/.test(sc) || seen[sc]) return;
      seen[sc] = true;

      // By You（カスタム）商品はURLで識別して除外
      var pdpUrl = (p.pdpUrl && p.pdpUrl.url) || '';
      if (pdpUrl.indexOf('by-you') !== -1) return;

      var pr       = p.prices || {};
      var priceNum = pr.currentPrice || pr.fullPrice || 0;
      var fullPrice = pr.initialPrice || priceNum;

      products.push({
        styleColor:  sc,
        color:       '',   // productGroupings にカラー名フィールドなし
        priceNum:    priceNum,
        fullPrice:   fullPrice,
        url:         pdpUrl,
        productType: p.productType || '',
        amazonAsin:  '', amazonUrl: '', amazonPrice: 0,
        grossProfit: 0, grossMargin: 0, salesRank: 0, profitFlag: '',
      });
    });
  });

  return products;
}

// ========== __NEXT_DATA__ から totalResources を抽出 ==========
function extractTotalResources(html) {
  if (!html) return 0;
  const m = html.match(/"totalResources"\s*:\s*(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

// ========== Nike ページ HTML 取得 ==========
function fetchNikePageHtml(slug) {
  const url = 'https://www.nike.com/jp/w/' + slug;
  const options = {
    headers: {
      'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8',
    },
    muteHttpExceptions: true,
  };
  const response   = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();
  Logger.log('Nike HTML HTTP: ' + statusCode);
  if (statusCode !== 200) return null;
  return response.getContentText('UTF-8');
}

// ========== __NEXT_DATA__ JSON から商品 + channelId を抽出 ==========
function extractFromNextData(html) {
  const result = { products: [], channelId: '' };

  // indexOf 方式（JSON内に < が含まれてもクラッシュしない）
  const marker     = 'id="__NEXT_DATA__"';
  const markerIdx  = html.indexOf(marker);
  if (markerIdx === -1) { Logger.log('__NEXT_DATA__ なし'); return result; }

  const contentStart = html.indexOf('>', markerIdx) + 1;
  const contentEnd   = html.indexOf('</script>', contentStart);
  if (contentStart <= 0 || contentEnd <= 0) return result;

  const jsonStr = html.substring(contentStart, contentEnd);
  Logger.log('__NEXT_DATA__ JSON サイズ: ' + Math.round(jsonStr.length / 1024) + 'KB');

  // channelId を文字列検索で取得
  const cidMatch = jsonStr.match(/"channelId"\s*:\s*"([0-9a-f\-]{30,})"/);
  if (cidMatch) result.channelId = cidMatch[1];

  try {
    const data = JSON.parse(jsonStr);
    const seen = {};
    collectProducts(data, result.products, seen, 0);
    Logger.log('再帰探索結果: ' + result.products.length + '件');
  } catch (e) {
    Logger.log('JSON.parse エラー: ' + e);
  }

  // 再帰で取れなかった場合 → JSON文字列を正規表現でスキャン
  if (result.products.length === 0) {
    Logger.log('文字列スキャンにフォールバック');
    const seen = {};
    const scRegex = /"(?:styleColor|style_color|sku)"\s*:\s*"([A-Z]{2}\d{4}-\d{3})"/g;
    let m;
    while ((m = scRegex.exec(jsonStr)) !== null) {
      const sc = m[1];
      if (seen[sc]) continue;
      seen[sc] = true;

      const chunk      = jsonStr.substring(Math.max(0, m.index - 800), Math.min(jsonStr.length, m.index + 800));
      const priceMatch = chunk.match(/"currentPrice"\s*:\s*(\d+)/);
      const urlMatch   = chunk.match(/"(?:pdpUrl|url)"\s*:\s*"(\/jp\/t\/[^"]+)"/);
      const colorMatch = chunk.match(/"colorDescription"\s*:\s*"([^"]+)"/);

      result.products.push({
        styleColor:  sc,
        color:       colorMatch ? colorMatch[1] : '',
        priceNum:    priceMatch ? parseInt(priceMatch[1], 10) : 0,
        url:         urlMatch ? 'https://www.nike.com' + urlMatch[1] : '',
        amazonAsin:  '', amazonUrl: '', amazonPrice: 0,
        grossProfit: 0, grossMargin: 0, salesRank: 0, profitFlag: '',
      });
    }
    Logger.log('文字列スキャン結果: ' + result.products.length + '件');
  }

  return result;
}

// ========== JSON ツリー再帰探索（colorways 対応） ==========
function collectProducts(obj, results, seen, depth) {
  depth = depth || 0;
  if (!obj || typeof obj !== 'object' || depth > 25) return;

  // styleColor パターンに合致するオブジェクト = 商品
  if (obj.styleColor && typeof obj.styleColor === 'string' && /^[A-Z]{2}\d{4}-\d{3}$/.test(obj.styleColor)) {
    if (!seen[obj.styleColor]) {
      seen[obj.styleColor] = true;

      // 価格取得（priceInfo / price / prices / currentPrice 直接 に対応）
      const priceInfo = obj.priceInfo || obj.price || obj.prices || {};
      let priceNum = priceInfo.currentPrice || priceInfo.fullPrice || 0;
      if (!priceNum) priceNum = obj.currentPrice || obj.fullPrice || 0;
      if (!priceNum && obj.localizedPrice) {
        const m = (obj.localizedPrice + '').replace(/,/g, '').match(/\d+/);
        if (m) priceNum = parseInt(m[0], 10);
      }

      // URL取得（なければ Nike 検索URLにフォールバック）
      const pdp        = obj.pdpUrl || obj.url || '';
      const productUrl = pdp.startsWith('http') ? pdp
        : pdp ? 'https://www.nike.com' + pdp
              : 'https://www.nike.com/jp/search?q=' + encodeURIComponent(obj.styleColor);

      results.push({
        styleColor:  obj.styleColor,
        color:       obj.colorDescription || obj.colorCode || obj.subtitle || '',
        priceNum:    priceNum,
        url:         productUrl,
        amazonAsin:  '',
        amazonUrl:   '',
        amazonPrice: 0,
        grossProfit: 0,
        grossMargin: 0,
        salesRank:   0,
        profitFlag:  '',
      });
    }

    // ネスト内の colorways も探索（バリエーション対応）
    ['colorways', 'nodes', 'availableColorways', 'relatedProducts'].forEach(function(key) {
      if (Array.isArray(obj[key])) {
        obj[key].forEach(function(cw) { collectProducts(cw, results, seen, depth + 1); });
      }
    });
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach(function(item) { collectProducts(item, results, seen, depth + 1); });
  } else {
    Object.keys(obj).forEach(function(key) { collectProducts(obj[key], results, seen, depth + 1); });
  }
}

// ========== Nike 製品フィード API（ページネーション用） ==========
function fetchFromProductFeedApi(attributeIds, anchor) {
  // Nike APIは &sort= パラメータを受け付けると0件を返すため送信しない
  // ソートはすべてのページ取得後にクライアント側で実施する
  var url = 'https://www.nike.com/product_feed/rollup_threads/v2'
    + '?filter=marketplace(JP)'
    + '&filter=language(ja)'
    + '&filter=attributeIds(' + attributeIds + ')'
    + '&anchor=' + anchor
    + '&count=48'
    + '&consumerChannelId=d9a5bc42-4b9c-4976-858a-f159cf99c647';

  const options = {
    headers: {
      'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept':          'application/json',
      'Accept-Language': 'ja-JP,ja;q=0.9',
    },
    muteHttpExceptions: true,
  };

  try {
    const response   = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    Logger.log('  フィードAPI HTTP: ' + statusCode);
    if (statusCode !== 200) return { products: [], rawCount: 0 };

    const data    = JSON.parse(response.getContentText());
    const items   = data.objects || data.products || data.threads || [];
    const results = [];
    const seen    = {};

    // まず parseNikeFeedItem で productInfo ベースの取得を試みる
    var parsed = [];
    items.forEach(function(item) {
      parseNikeFeedItem(item).forEach(function(p) {
        if (!seen[p.styleColor]) { seen[p.styleColor] = true; parsed.push(p); }
      });
    });

    // parseNikeFeedItem で取れなかった場合は collectProducts（再帰）で取得
    if (parsed.length === 0) {
      Logger.log('  parseNikeFeedItem で 0件 → collectProducts にフォールバック');
      items.forEach(function(item) {
        collectProducts(item, parsed, seen, 0);
      });
    }

    // FOOTWEAR のみ取得（Nike ページの shoes カテゴリフィルタに対応）
    // APPAREL はページに表示されないため除外。ソックスも FOOTWEAR に分類されるため含まれる。
    var hasProductType = parsed.some(function(p) { return p.productType; });
    if (hasProductType) {
      var beforeFilter = parsed.length;
      parsed = parsed.filter(function(p) { return p.productType === 'FOOTWEAR'; });
      Logger.log('  productTypeフィルタ: ' + beforeFilter + '件 → ' + parsed.length + '件 (FOOTWEAR のみ)');
    }

    parsed.forEach(function(p) { results.push(p); });

    return { products: results, rawCount: items.length };
  } catch (e) {
    Logger.log('フィードAPI エラー: ' + e);
    return { products: [], rawCount: 0 };
  }
}

// ========== Nike 製品フィード 専用パーサー ==========
// 実際のAPIレスポンス構造（テストで確認済み）:
//   productInfo[].merchProduct.styleColor      → 型番
//   productInfo[].merchPrice.currentPrice      → 現在価格（割引済みの場合あり）
//   productInfo[].productContent.colorDescription → カラー名
//   productInfo[].productContent.slug          → URL組み立て用スラグ
//   rollup.threads[].productInfo[]             → 同商品の他カラーウェイ
function parseNikeFeedItem(obj) {
  const results = [];
  const seen    = {};

  function addProduct(info) {
    const mp = info.merchProduct || {};
    const sc = mp.styleColor;
    if (!sc || !/^[A-Z]{2}\d{4}-\d{3}$/.test(sc) || seen[sc]) return;
    seen[sc] = true;

    // By You（カスタム）商品はバンドルプロモページに表示されないため除外
    const pcSlug = (info.productContent && info.productContent.slug) || '';
    if (pcSlug.indexOf('by-you') !== -1) return;

    // 価格: currentPrice（セール価格）と fullPrice（定価）を両方保持
    const mpr       = info.merchPrice || {};
    const fullPrice = mpr.fullPrice || 0;
    const priceNum  = mpr.currentPrice || fullPrice || 0;

    // カラー名・スラグ: productContent から取得
    const pc    = info.productContent || {};
    const color = pc.colorDescription || mp.colorCode || '';
    const slug  = pc.slug || '';

    // URL: 日本語スラグをencodeURIでパーセントエンコードして正しい商品ページURLを生成
    // 例: ナイキ-レボリューション-7-NpBscZ → %E3%83%8A%E3%82%A4%E3%82%AD-...-NpBscZ
    const url = slug
      ? 'https://www.nike.com/jp/t/' + encodeURI(slug) + '/' + sc
      : 'https://www.nike.com/jp/search?q=' + encodeURIComponent(sc);

    results.push({
      styleColor:  sc,
      color:       color,
      priceNum:    priceNum,   // セール価格（仕入れ価格として使用）
      fullPrice:   fullPrice,  // 定価（over-XXXXX フィルタの判定に使用）
      url:         url,
      productType: mp.productType || '',  // FOOTWEAR / APPAREL / EQUIPMENT 等
      amazonAsin:  '', amazonUrl: '', amazonPrice: 0,
      grossProfit: 0, grossMargin: 0, salesRank: 0, profitFlag: '',
    });
  }

  // メインカラーを処理
  (obj.productInfo || []).forEach(addProduct);

  // スウォッチ（小窓の色違い）= rollup.threads の各カラーも処理
  var threads = (obj.rollup && obj.rollup.threads) || [];
  threads.forEach(function(thread) {
    (thread.productInfo || []).forEach(addProduct);
  });

  return results;
}

// ========== URL slug から channelId を推定 ==========
function extractChannelIdFromSlug(slug) {
  // slug の末尾の英数字部分を抽出（例: "bundle-promo-over-15000-shoes-6bt7oztll2zy7ok" → "6bt7oztll2zy7ok"）
  const m = slug.match(/[-]([a-z0-9]{8,})$/);
  return m ? m[1] : '';
}

// ========== フォールバック: HTML 正規表現で型番抽出 ==========
function extractFromHtml(html) {
  const products = [];
  const seen     = {};
  const hrefRegex = /href="(\/jp\/t\/[^"]+)"/g;
  let m;

  while ((m = hrefRegex.exec(html)) !== null) {
    const path    = m[1];
    const scMatch = path.match(/([A-Z]{2}\d{4}-\d{3})/);
    if (!scMatch) continue;
    const styleColor = scMatch[1];
    if (seen[styleColor]) continue;
    seen[styleColor] = true;

    const productUrl = 'https://www.nike.com' + path;
    const start      = Math.max(0, m.index - 3000);
    const chunk      = html.substring(start, Math.min(html.length, m.index + 3000));
    const priceMatch = chunk.match(/¥\s*([\d,]+)/);
    const priceNum   = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : 0;

    products.push({ styleColor, color: '', priceNum, url: productUrl, amazonAsin: '', amazonUrl: '', amazonPrice: 0, grossProfit: 0, grossMargin: 0, salesRank: 0, profitFlag: '' });
  }

  if (products.length === 0) {
    const looseRegex = /([A-Z]{2}\d{4}-\d{3})/g;
    while ((m = looseRegex.exec(html)) !== null) {
      const styleColor = m[1];
      if (seen[styleColor]) continue;
      seen[styleColor] = true;
      const start      = Math.max(0, m.index - 2000);
      const chunk      = html.substring(start, Math.min(html.length, m.index + 2000));
      const priceMatch = chunk.match(/¥\s*([\d,]+)/);
      const priceNum   = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : 0;
      const urlMatch   = chunk.match(/href="(\/jp\/t\/[^"]+)"/);
      const productUrl = urlMatch ? 'https://www.nike.com' + urlMatch[1] : '';
      products.push({ styleColor, color: '', priceNum, url: productUrl, amazonAsin: '', amazonUrl: '', amazonPrice: 0, grossProfit: 0, grossMargin: 0, salesRank: 0, profitFlag: '' });
    }
  }
  return products;
}

// ========== Amazon ASIN + Keepa データを付与 ==========
function enrichWithKeepa(products, keepaApiKey, discountRate) {
  products.forEach(function(p, i) {
    Logger.log('[' + (i + 1) + '/' + products.length + '] ' + p.styleColor + ' Keepa検索中...');

    // Keepa search API で型番からASIN取得（Amazon直接スクレイピングの代替）
    const asins = fetchAmazonAsins(p.styleColor, keepaApiKey);
    Logger.log('  ASIN候補: ' + (asins.length > 0 ? asins.join(', ') : 'なし'));

    if (asins.length === 0) { Utilities.sleep(500); return; }

    // Keepa product API で価格・ランキング取得
    const keepaResults = fetchKeepaData(asins, keepaApiKey);
    if (keepaResults.length === 0) { Utilities.sleep(500); return; }

    // ランキング最小（最も売れている）ASINを選択
    const best = selectBestAsin(keepaResults);
    if (!best) { Utilities.sleep(500); return; }

    p.amazonAsin  = best.asin;
    p.amazonUrl   = 'https://www.amazon.co.jp/dp/' + best.asin;
    p.amazonPrice = best.price;
    p.salesRank   = best.salesRank;

    // 粗利計算
    const costPrice = discountRate > 0
      ? Math.floor(p.priceNum * (1 - discountRate / 100))
      : p.priceNum;

    if (best.price > 0) {
      p.grossProfit = best.price - costPrice;
      p.grossMargin = Math.round((p.grossProfit / best.price) * 1000) / 10;
    }

    if (p.grossMargin >= PROFIT_MARGIN_THRESHOLD && p.salesRank > 0 && p.salesRank <= SALES_RANK_THRESHOLD) {
      p.profitFlag = '◎';
    }

    Logger.log('  → ASIN: ' + best.asin + ' / ¥' + best.price + ' / ランキング: ' + best.salesRank + ' / 粗利率: ' + p.grossMargin + '%');
    Utilities.sleep(600);
  });
}

// ========== Keepa search API で型番 → ASIN 取得 ==========
function fetchAmazonAsins(styleCode, apiKey) {
  const url = 'https://api.keepa.com/search'
    + '?key='    + encodeURIComponent(apiKey)
    + '&domain=5'
    + '&type=product'
    + '&term='   + encodeURIComponent(styleCode);

  try {
    const response   = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const statusCode = response.getResponseCode();
    Logger.log('  Keepa search HTTP: ' + statusCode);
    if (statusCode !== 200) return [];

    const data = JSON.parse(response.getContentText());
    return (data.asinList || []).slice(0, 5);
  } catch (e) {
    Logger.log('  Keepa search エラー: ' + e);
    return [];
  }
}

// ========== Keepa product API で価格・ランキング取得 ==========
function fetchKeepaData(asins, apiKey) {
  if (!apiKey || asins.length === 0) return [];

  const url = 'https://api.keepa.com/product'
    + '?key='    + encodeURIComponent(apiKey)
    + '&domain=5'
    + '&asin='   + asins.join(',')
    + '&stats=1'
    + '&days=90';

  try {
    const response   = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const statusCode = response.getResponseCode();
    Logger.log('  Keepa product HTTP: ' + statusCode);
    if (statusCode !== 200) return [];

    const data    = JSON.parse(response.getContentText());
    const results = [];

    (data.products || []).forEach(function(prod) {
      const stats   = prod.stats   || {};
      const current = stats.current || [];

      // Keepa 価格単位: 整数 ÷ 100 = 円
      // [0]=Amazon直販, [1]=マーケットプレイス新品最安値, [3]=新品3rd party, [8]=カートボックス
      let price = -1;
      [8, 0, 1, 3].forEach(function(idx) {
        if (price < 0 && current[idx] != null && current[idx] > 0) {
          price = Math.round(current[idx] / 100);
        }
      });

      const salesRank = prod.currentSalesRank || 0;
      if (price > 0 || salesRank > 0) {
        results.push({ asin: prod.asin, price: price > 0 ? price : 0, salesRank });
      }
    });

    return results;
  } catch (e) {
    Logger.log('  Keepa product エラー: ' + e);
    return [];
  }
}

// ========== ランキング最小の ASIN を選択 ==========
function selectBestAsin(keepaResults) {
  if (keepaResults.length === 0) return null;
  const withRank = keepaResults.filter(function(r) { return r.salesRank > 0; });
  if (withRank.length > 0) {
    return withRank.reduce(function(best, r) { return r.salesRank < best.salesRank ? r : best; });
  }
  return keepaResults.find(function(r) { return r.price > 0; }) || keepaResults[0];
}

// ========== 利益商品行をハイライト ==========
function highlightProfitableRows(sheet, cols) {
  if (!cols.profitFlag) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return;
  for (var row = 3; row <= lastRow; row++) {
    const flag = sheet.getRange(row, cols.profitFlag).getValue();
    if (flag === '◎') {
      sheet.getRange(row, 1, 1, sheet.getLastColumn()).setBackground('#c6efce');
    }
  }
}

// ========== スプレッドシートへ書き込み（Nike基本データのみ） ==========
// setValues で列ごと一括書き込み（setValue 1セルずつはタイムアウトの原因のため廃止）
function writeProducts(sheet, products, cols, discountRate) {
  if (products.length === 0) return;

  if (cols.styleColor) sheet.getRange(3, cols.styleColor, products.length, 1)
    .setValues(products.map(function(p) { return [p.styleColor]; }));
  if (cols.color) sheet.getRange(3, cols.color, products.length, 1)
    .setValues(products.map(function(p) { return [p.color]; }));
  if (cols.url) sheet.getRange(3, cols.url, products.length, 1)
    .setValues(products.map(function(p) { return [p.url]; }));
  if (cols.price) sheet.getRange(3, cols.price, products.length, 1)
    .setValues(products.map(function(p) { return [p.priceNum || '']; }));
  if (cols.discountedPrice && discountRate > 0)
    sheet.getRange(3, cols.discountedPrice, products.length, 1)
      .setValues(products.map(function(p) {
        return [p.priceNum > 0 ? Math.floor(p.priceNum * (1 - discountRate / 100)) : ''];
      }));

  sheet.getRange('D1').setValue('最終取得: ' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'));
}

// ========== Keepa結果をシートに反映（Nikeデータ書込み後に呼ぶ） ==========
function writeKeepaResults(sheet, products, cols) {
  products.forEach(function(p, i) {
    const row = 3 + i;
    if (cols.amazonAsin && p.amazonAsin)   sheet.getRange(row, cols.amazonAsin).setValue(p.amazonAsin);
    if (cols.amazonUrl && p.amazonUrl)     sheet.getRange(row, cols.amazonUrl).setValue(p.amazonUrl);
    if (cols.amazonPrice && p.amazonPrice) sheet.getRange(row, cols.amazonPrice).setValue(p.amazonPrice);
    if (cols.grossProfit && p.grossProfit) sheet.getRange(row, cols.grossProfit).setValue(p.grossProfit);
    if (cols.grossMargin && p.grossMargin) sheet.getRange(row, cols.grossMargin).setValue(p.grossMargin).setNumberFormat('0.0"%"');
    if (cols.salesRank && p.salesRank)     sheet.getRange(row, cols.salesRank).setValue(p.salesRank);
    if (cols.profitFlag && p.profitFlag)   sheet.getRange(row, cols.profitFlag).setValue(p.profitFlag);
  });
}

// ========== Row2 ヘッダーから列番号を検出 ==========
function findColumnsByHeader(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), 30);
  const headers = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
  const cols    = {};
  headers.forEach(function(h, i) {
    const header = (h || '').toString().trim();
    Object.keys(HEADERS).forEach(function(key) {
      if (header === HEADERS[key]) cols[key] = i + 1;
    });
  });
  return cols;
}

// ========== 既存データをクリア ==========
function clearDataArea(sheet, cols) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return;
  const colNums = Object.values(cols).filter(Boolean);
  if (colNums.length === 0) return;
  const maxCol = Math.max.apply(null, colNums);
  // 一括クリア（列ごとのループより高速）
  sheet.getRange(3, 1, lastRow - 2, maxCol).clearContent().setBackground(null);
}

// ========== URLを確実に取得 ==========
function getUrlFromCell(sheet, cellAddr) {
  const cell = sheet.getRange(cellAddr);
  let val = (cell.getValue() || '').toString().trim();
  if (val && val.startsWith('http')) return val;
  val = (cell.getDisplayValue() || '').toString().trim();
  if (val && val.startsWith('http')) return val;
  try {
    const rt = cell.getRichTextValue();
    if (rt) {
      for (var i = 0; i < rt.getRuns().length; i++) {
        const u = rt.getRuns()[i].getLinkUrl();
        if (u && u.startsWith('http')) return u;
      }
    }
  } catch (e) {}
  return val;
}

// ========== デバッグ：製品フィード API の構造解析 ==========
function debugFeedApiRaw() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const nikeUrl = getUrlFromCell(sheet, 'B1');
  const slugMatch = nikeUrl.match(/nike\.com\/jp\/w\/([^?#\/]+)/);
  if (!slugMatch) { alert('slug 抽出失敗'); return; }

  const attributeIds = extractChannelIdFromSlug(slugMatch[1]);
  const url = 'https://www.nike.com/product_feed/rollup_threads/v2'
    + '?filter=marketplace(JP)'
    + '&filter=language(ja)'
    + '&filter=attributeIds(' + attributeIds + ')'
    + '&anchor=0&count=1'  // 1件だけ取得して構造を確認
    + '&consumerChannelId=d9a5bc42-4b9c-4976-858a-f159cf99c647';

  const options = {
    headers: {
      'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept':          'application/json',
      'Accept-Language': 'ja-JP,ja;q=0.9',
    },
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);
  const body     = response.getContentText();
  const data     = JSON.parse(body);
  const obj      = (data.objects || [])[0];

  if (!obj) { alert('objects が空です'); return; }

  // JSON全体を A20 に出力
  sheet.getRange('A20').setValue(body.substring(0, 50000));

  // styleColor パターンに合致する文字列と周辺キーを収集
  const jsonStr = JSON.stringify(obj);
  const scMatches = [];
  const scRegex = /([A-Z]{2}\d{4}-\d{3})/g;
  let m;
  while ((m = scRegex.exec(jsonStr)) !== null && scMatches.length < 3) {
    const ctx = jsonStr.substring(Math.max(0, m.index - 60), m.index + 60);
    scMatches.push(ctx);
  }

  // 価格らしき数値を収集
  const priceMatches = [];
  const priceRegex = /"(\w*[Pp]rice\w*)"\s*:\s*(\d+)/g;
  while ((m = priceRegex.exec(jsonStr)) !== null && priceMatches.length < 5) {
    priceMatches.push('"' + m[1] + '": ' + m[2]);
  }

  // URL らしき文字列を収集
  const urlMatches = [];
  const urlRegex = /"(\w*[Uu]rl\w*)"\s*:\s*"([^"]{5,80})"/g;
  while ((m = urlRegex.exec(jsonStr)) !== null && urlMatches.length < 5) {
    urlMatches.push('"' + m[1] + '": ' + m[2]);
  }

  const msg = '=== 構造解析 ===\n'
    + 'トップレベルキー: ' + Object.keys(obj).join(', ') + '\n\n'
    + '型番周辺コンテキスト:\n' + scMatches.join('\n---\n') + '\n\n'
    + '価格フィールド:\n' + priceMatches.join('\n') + '\n\n'
    + 'URLフィールド:\n' + urlMatches.join('\n');

  Logger.log(msg);
  alert(msg);
}

// ========== デバッグ：Nike 取得テスト ==========
function debugNikeApi() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const nikeUrl = getUrlFromCell(sheet, 'B1');
  const slugMatch = nikeUrl.match(/nike\.com\/jp\/w\/([^?#\/]+)/);
  if (!slugMatch) { alert('slug 抽出失敗: ' + nikeUrl); return; }
  const slug = slugMatch[1];

  const html = fetchNikePageHtml(slug);
  if (!html) { alert('Nike ページ取得失敗'); return; }

  const nextDataResult = extractFromNextData(html);
  const attributeIds = extractChannelIdFromSlug(slug);

  // 製品フィード API テスト（最初の追加ページ）
  const feedProducts = attributeIds ? fetchFromProductFeedApi(attributeIds, 0) : [];

  const msg = 'slug: ' + slug
    + '\nattributeIds: ' + (attributeIds || '未検出')
    + '\n__NEXT_DATA__ 商品数: ' + nextDataResult.products.length + '件'
    + '\n製品フィード API 商品数(anchor=0): ' + feedProducts.length + '件'
    + '\n型番パターン検出数: ' + (html.match(/[A-Z]{2}\d{4}-\d{3}/g) || []).length + '件'
    + '\nHTML サイズ: ' + Math.round(html.length / 1024) + 'KB';

  Logger.log(msg);
  alert(msg);
}

// ========== デバッグ：Keepa 検索テスト ==========
function debugKeepaSearch() {
  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const sheet    = ss.getActiveSheet();
  const apiKey   = sheet.getRange('H1').getValue().toString().trim();

  if (!apiKey) { alert('H1 に Keepa API キーを入力してください'); return; }

  // スプレッドシート3行目の型番でテスト（なければ固定値）
  const testStyleCode = sheet.getRange('A3').getValue() || 'FQ2941-001';

  const asins = fetchAmazonAsins(testStyleCode, apiKey);
  Logger.log('テスト型番: ' + testStyleCode + ' → ASIN: ' + asins.join(', '));

  if (asins.length === 0) {
    alert('テスト型番: ' + testStyleCode + '\nASIN が見つかりませんでした。\n\n型番が Amazon に出品されていないか、Keepa APIキーを確認してください。');
    return;
  }

  const keepaResults = fetchKeepaData(asins, apiKey);
  const best         = selectBestAsin(keepaResults);

  const msg = 'テスト型番: ' + testStyleCode
    + '\nASIN候補: ' + asins.join(', ')
    + '\nベストASIN: ' + (best ? best.asin : 'なし')
    + '\n価格: ¥' + (best ? best.price : '-')
    + '\nランキング: ' + (best ? best.salesRank : '-');

  Logger.log(msg);
  alert(msg);
}

// ========== ユーティリティ ==========
function getSheetByGid(ss, gid) {
  const sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === gid) return sheets[i];
  }
  return null;
}

function alert(msg) {
  SpreadsheetApp.getUi().alert(msg);
}
