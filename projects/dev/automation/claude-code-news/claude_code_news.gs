/**
 * Claude Code 情報収集スクリプト
 * 毎朝7時に自動実行し、Claude Code関連の最新情報をスプレッドシートに保存する
 *
 * セットアップ手順:
 * 1. script.google.com で新規プロジェクトを作成
 * 2. このスクリプトを貼り付け
 * 3. 「プロジェクトの設定」→「スクリプトプロパティ」に以下を追加:
 *    - SHEET_ID: スプレッドシートのID（URLの /d/XXXX/ の部分）
 *    - NOTIFY_EMAIL: 通知先メールアドレス（不要なら空欄）
 * 4. 「実行」→「collectClaudeCodeNews」を1回手動実行（権限を承認）
 * 5. 「トリガー」→ collectClaudeCodeNews を「時間主導型」「毎日・午前7時」に設定
 */

// =============================================
// 設定
// =============================================

/** RSSフィード一覧（ここを編集してソースを追加・削除できる） */
const RSS_SOURCES = [
  {
    name: "GitHub claude-code リリース",
    url: "https://github.com/anthropics/claude-code/releases.atom",
    enabled: true,
  },
  {
    name: "Anthropic公式ブログ",
    url: "https://www.anthropic.com/rss.xml",
    enabled: true,
  },
  {
    name: "Zenn - Claude Codeトピック",
    url: "https://zenn.dev/topics/claudecode/feed",
    enabled: true,
  },
  {
    name: "Zenn - Claudeトピック",
    url: "https://zenn.dev/topics/claude/feed",
    enabled: true,
  },
  {
    name: "Reddit r/ClaudeAI",
    url: "https://www.reddit.com/r/ClaudeAI.rss",
    enabled: true,
  },
];

/** シート名 */
const SHEET_NAMES = {
  LOG: "新着ログ",
  SOURCES: "RSSソース管理",
};

/** 概要の最大文字数 */
const MAX_SUMMARY_LENGTH = 200;

// =============================================
// メイン関数
// =============================================

/**
 * メイン関数 - 毎朝7時のトリガーで実行
 */
function collectClaudeCodeNews() {
  const props = PropertiesService.getScriptProperties();
  const sheetId = props.getProperty("SHEET_ID");
  const notifyEmail = props.getProperty("NOTIFY_EMAIL") || "";

  if (!sheetId) {
    console.error("SHEET_ID がスクリプトプロパティに設定されていません");
    return;
  }

  const ss = SpreadsheetApp.openById(sheetId);
  const logSheet = getOrCreateLogSheet(ss);
  const existingUrls = getExistingUrls(logSheet);

  // 有効なソースからRSSを取得
  const activeSources = RSS_SOURCES.filter((s) => s.enabled);
  let newItems = [];

  for (const source of activeSources) {
    try {
      const items = fetchRssItems(source);
      const filtered = items.filter((item) => !existingUrls.has(item.url));
      newItems = newItems.concat(filtered);
      console.log(
        `${source.name}: ${filtered.length}件の新着（全${items.length}件中）`
      );
    } catch (e) {
      console.error(`${source.name} の取得でエラー: ${e.message}`);
    }
  }

  if (newItems.length === 0) {
    console.log("新着記事なし");
    return;
  }

  // 日時降順でソート（新しい順）
  newItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  // シートに追記
  appendToSheet(logSheet, newItems);
  console.log(`${newItems.length}件を追加しました`);

  // メール通知
  if (notifyEmail) {
    sendNotification(notifyEmail, newItems);
  }
}

// =============================================
// RSS取得・パース
// =============================================

/**
 * RSSフィードを取得してアイテム一覧を返す
 * @param {Object} source - {name, url} のソース情報
 * @returns {Array} アイテムの配列
 */
function fetchRssItems(source) {
  const response = UrlFetchApp.fetch(source.url, {
    muteHttpExceptions: true,
    headers: {
      "User-Agent": "Claude Code News Collector/1.0",
    },
  });

  if (response.getResponseCode() !== 200) {
    throw new Error(`HTTPエラー: ${response.getResponseCode()}`);
  }

  const content = response.getContentText("UTF-8");
  const doc = XmlService.parse(content);
  const root = doc.getRootElement();
  const rootName = root.getName();

  // Atom形式（GitHub releases等）
  if (rootName === "feed") {
    return parseAtomFeed(root, source.name);
  }

  // RSS形式
  if (rootName === "rss") {
    return parseRssFeed(root, source.name);
  }

  throw new Error(`不明なフォーマット: ${rootName}`);
}

/**
 * Atom形式のパース
 */
function parseAtomFeed(root, sourceName) {
  const ns = XmlService.getNamespace("http://www.w3.org/2005/Atom");
  const entries = root.getChildren("entry", ns);
  const items = [];

  for (const entry of entries) {
    const title = getElementText(entry, "title", ns);
    const url = getLinkHref(entry, ns);
    const pubDate = getElementText(entry, "updated", ns) ||
                    getElementText(entry, "published", ns);
    const summary = truncate(
      getElementText(entry, "summary", ns) ||
      getElementText(entry, "content", ns) || "",
      MAX_SUMMARY_LENGTH
    );

    if (title && url) {
      items.push({ sourceName, title, url, pubDate, summary });
    }
  }

  return items;
}

/**
 * RSS形式のパース
 */
function parseRssFeed(root, sourceName) {
  const channel = root.getChild("channel");
  if (!channel) return [];

  const rssItems = channel.getChildren("item");
  const items = [];

  for (const item of rssItems) {
    const title = getElementText(item, "title", null);
    const url = getElementText(item, "link", null) ||
                getElementText(item, "guid", null);
    const pubDate = getElementText(item, "pubDate", null);
    const description = truncate(
      stripHtml(getElementText(item, "description", null) || ""),
      MAX_SUMMARY_LENGTH
    );

    if (title && url) {
      items.push({ sourceName, title, url, pubDate, summary: description });
    }
  }

  return items;
}

// =============================================
// スプレッドシート操作
// =============================================

/**
 * 新着ログシートを取得または作成する
 */
function getOrCreateLogSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_NAMES.LOG);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.LOG);
    // ヘッダー行を設定
    const headers = ["取得日時", "ソース名", "タイトル", "概要", "URL"];
    sheet.appendRow(headers);

    // ヘッダーを装飾
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#1a73e8");
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1);

    // 列幅を設定
    sheet.setColumnWidth(1, 150); // 取得日時
    sheet.setColumnWidth(2, 200); // ソース名
    sheet.setColumnWidth(3, 350); // タイトル
    sheet.setColumnWidth(4, 400); // 概要
    sheet.setColumnWidth(5, 400); // URL
  }

  return sheet;
}

/**
 * 既存のURLセットを取得（重複チェック用）
 */
function getExistingUrls(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return new Set();

  // URL列（5列目）を取得
  const urls = sheet
    .getRange(2, 5, lastRow - 1, 1)
    .getValues()
    .flat()
    .filter((url) => url);

  return new Set(urls);
}

/**
 * 新着アイテムをシートに追記する
 */
function appendToSheet(sheet, items) {
  const now = Utilities.formatDate(
    new Date(),
    "Asia/Tokyo",
    "yyyy/MM/dd HH:mm"
  );

  const rows = items.map((item) => [
    now,
    item.sourceName,
    item.title,
    item.summary || "",
    item.url,
  ]);

  if (rows.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet
      .getRange(startRow, 1, rows.length, rows[0].length)
      .setValues(rows);

    // URLにハイパーリンクを設定
    for (let i = 0; i < rows.length; i++) {
      const url = rows[i][4];
      if (url) {
        sheet
          .getRange(startRow + i, 5)
          .setFormula(`=HYPERLINK("${url.replace(/"/g, '""')}","リンク")`);
        // タイトルにもリンクを設定
        sheet
          .getRange(startRow + i, 3)
          .setFormula(
            `=HYPERLINK("${url.replace(/"/g, '""')}","${rows[i][2].replace(/"/g, '""')}")`
          );
      }
    }
  }
}

// =============================================
// メール通知
// =============================================

/**
 * 新着記事をGmailで通知する
 */
function sendNotification(email, items) {
  const subject = `【Claude Code News】新着${items.length}件 - ${
    Utilities.formatDate(new Date(), "Asia/Tokyo", "MM/dd")
  }`;

  const body = items
    .map(
      (item, i) =>
        `[${i + 1}] ${item.sourceName}\n${item.title}\n${item.url}\n${
          item.summary ? item.summary + "\n" : ""
        }`
    )
    .join("\n---\n");

  GmailApp.sendEmail(email, subject, body);
}

// =============================================
// ユーティリティ
// =============================================

/** XML要素のテキストを取得 */
function getElementText(element, tagName, ns) {
  try {
    const child = ns
      ? element.getChild(tagName, ns)
      : element.getChild(tagName);
    return child ? child.getText() : "";
  } catch (e) {
    return "";
  }
}

/** Atomのlink href を取得 */
function getLinkHref(entry, ns) {
  try {
    const links = entry.getChildren("link", ns);
    for (const link of links) {
      const rel = link.getAttribute("rel");
      if (!rel || rel.getValue() === "alternate") {
        const href = link.getAttribute("href");
        if (href) return href.getValue();
      }
    }
  } catch (e) {
    // no-op
  }
  return "";
}

/** HTMLタグを除去 */
function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** 文字列を指定文字数に切り詰める */
function truncate(str, maxLength) {
  if (!str) return "";
  const cleaned = str.replace(/\s+/g, " ").trim();
  return cleaned.length > maxLength
    ? cleaned.substring(0, maxLength) + "..."
    : cleaned;
}

// =============================================
// 初回セットアップ用ヘルパー
// =============================================

/**
 * スプレッドシートを新規作成してIDを表示する
 * （既存のシートを使う場合は不要）
 */
function createNewSpreadsheet() {
  const ss = SpreadsheetApp.create("Claude Code ニュース収集");
  const id = ss.getId();
  console.log(`スプレッドシートを作成しました。ID: ${id}`);
  console.log(`URL: https://docs.google.com/spreadsheets/d/${id}`);
  console.log(
    "このIDをスクリプトプロパティの SHEET_ID に設定してください"
  );
}
