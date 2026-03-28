"""
週次Googleワークスペース記事自動生成スクリプト
毎週月曜日 03:00 JST に GitHub Actions から実行される

機能:
- 固定15テーマ終了後もClaudeが自動でテーマを生成し続ける
- Googleワークスペース最新情報記事を毎週1本追加（計5本/週）
"""

import anthropic
import json
import os
import re
from datetime import datetime
from pathlib import Path

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

BASE_DIR = Path(__file__).parent
ARTICLES_DIR = BASE_DIR / "articles"
TOPICS_FILE = BASE_DIR / "weekly-article-topics.json"
GENERATED_TOPICS_FILE = BASE_DIR / "generated-topics-log.json"

WEEK_NUM = int(datetime.now().strftime("%V"))
YEAR = datetime.now().year

def get_existing_slugs():
    if not ARTICLES_DIR.exists():
        return set()
    return {d.name for d in ARTICLES_DIR.iterdir() if d.is_dir()}

def pick_fixed_topics(count=4):
    """固定トピックから未作成のものをcount件返す"""
    with open(TOPICS_FILE) as f:
        data = json.load(f)
    existing = get_existing_slugs()
    topics = []
    for week in data["week_schedule"]:
        for article in week["articles"]:
            if article["slug"] not in existing:
                topics.append(article)
            if len(topics) == count:
                return topics
    return topics

def get_generated_topic_titles():
    """過去にAI生成したトピックのタイトル一覧を返す"""
    if not GENERATED_TOPICS_FILE.exists():
        return []
    with open(GENERATED_TOPICS_FILE) as f:
        return json.load(f)

def save_generated_topic(title, slug):
    """AI生成トピックをログに保存"""
    titles = get_generated_topic_titles()
    titles.append({"title": title, "slug": slug, "created_at": datetime.now().isoformat()})
    with open(GENERATED_TOPICS_FILE, "w") as f:
        json.dump(titles, f, ensure_ascii=False, indent=2)

def generate_new_topics(count):
    """固定トピック終了後にClaudeが新テーマを自動生成"""
    existing_slugs = get_existing_slugs()
    past_titles = [t["title"] for t in get_generated_topic_titles()]

    print(f"  🤖 新テーマをAIで{count}件生成中...")
    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": f"""中小企業・個人事業主向けのGoogleワークスペース活用ブログ記事テーマを{count}件提案してください。

【既に作成済みのため除外するテーマ】
{chr(10).join(past_titles[-30:]) if past_titles else "なし"}

【条件】
- IT未経験の従業員が読んでも理解できる内容
- 以下のカテゴリからバランスよく選ぶ:
  Gmail / Googleドライブ / Googleドキュメント / Googleスプレッドシート / Googleフォーム / Googleカレンダー / Google Meet / Google Chat / セキュリティ / GAS自動化 / Gemini活用

以下のJSON形式のみで返答してください（説明文不要）:
[
  {{
    "slug": "記事のURLスラッグ（英数字とハイフンのみ）",
    "title": "記事タイトル【初心者向け完全ガイド{YEAR}年版】などの形式",
    "theme": "記事のサブテーマ・内容の要約（50字以内）",
    "color": "#1A73E8" または "#34A853"
  }}
]"""
        }]
    )
    text = resp.content[0].text.strip()
    match = re.search(r'\[[\s\S]*\]', text)
    if not match:
        return []
    topics = json.loads(match.group(0))
    # 既存スラッグと重複するものを除外
    return [t for t in topics if t["slug"] not in existing_slugs][:count]

def get_gws_news_topic():
    """Googleワークスペースの最新アップデート・機能変更記事のテーマをAIで生成"""
    print("  📰 最新情報記事テーマを生成中...")
    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=800,
        messages=[{
            "role": "user",
            "content": f"""Googleワークスペース管理者・利用者向けに、{YEAR}年のGoogleワークスペースの最新アップデート・機能追加・UI変更・Gemini AI機能について記事テーマを1件提案してください。

例:
- GmailのGemini AI機能の使い方
- Googleドライブの新しい整理機能
- Google Meetの新機能まとめ
- Googleワークスペースの管理コンソール変更点
- Google ChatのSpaces新機能

以下のJSON形式のみで返答してください（説明文不要）:
{{
  "slug": "gws-news-{YEAR}-w{WEEK_NUM}",
  "title": "【{YEAR}年最新】Googleワークスペースの○○アップデートまとめ",
  "theme": "最新のGoogleワークスペース機能・アップデート情報",
  "color": "#1A73E8",
  "is_news": true
}}"""
        }]
    )
    text = resp.content[0].text.strip()
    match = re.search(r'\{[\s\S]*\}', text)
    if not match:
        return None
    return json.loads(match.group(0))

def generate_article(topic):
    slug = topic["slug"]
    title = topic["title"]
    theme = topic["theme"]
    color = topic["color"]
    is_news = topic.get("is_news", False)

    print(f"\n📝 生成中: {title}")

    article_dir = ARTICLES_DIR / slug
    images_dir = article_dir / "images"
    article_dir.mkdir(parents=True, exist_ok=True)
    images_dir.mkdir(exist_ok=True)

    # ① 記事本文
    print("  → 記事本文...")
    if is_news:
        content_prompt = f"""以下の仕様でGoogleワークスペース最新情報記事をMarkdown形式で作成してください。

タイトル: {title}
スラッグ: {slug}
テーマ: {theme}
対象: 中小企業のGoogleワークスペース管理者・利用者
文字数: 1500〜2500字
会社名: 株式会社ふじサンバ（DX支援部門）
年月: {YEAR}年{datetime.now().month}月

frontmatter（---）から始めて、以下を含む記事を作成してください:
・アップデート・変更点の概要（何がどう変わったか）
・利用者・管理者への影響と活用方法
・実践的な設定手順やTips
・記事末尾にCTA「📩 Googleワークスペースの導入・活用でお困りの場合は、株式会社ふじサンバ DX支援部門までお気軽にご相談ください。」"""
    else:
        content_prompt = f"""以下の仕様で記事本文をMarkdown形式で作成してください。

タイトル: {title}
スラッグ: {slug}
テーマ: {theme}
対象: 中小企業のIT未経験従業員
文字数: 2500〜3500字
会社名: 株式会社ふじサンバ（DX支援部門）

frontmatter（---）から始めて、SEO最適化済みの日本語記事を作成してください。
・具体的な操作手順・スクリーンショット説明を含める
・IT未経験者が迷わないよう丁寧に解説する
・記事末尾にCTA「📩 Googleワークスペースの導入・活用でお困りの場合は、株式会社ふじサンバ DX支援部門までお気軽にご相談ください。」を入れる"""

    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4000,
        messages=[{"role": "user", "content": content_prompt}]
    )
    article_content = resp.content[0].text
    (article_dir / f"{slug}.md").write_text(article_content, encoding="utf-8")

    # ② SVG図解（3枚 / ニュース記事は2枚）
    if is_news:
        svg_specs = [
            ("01-updates.svg", f"アップデート内容の概要まとめ図（800x400）"),
            ("02-howto.svg", f"新機能の使い方・設定手順図（800x380）"),
        ]
    else:
        svg_specs = [
            ("01-overview.svg", f"{title.split('【')[0]}の概要比較図（800x400）"),
            ("02-howto.svg", f"{theme.split('・')[0]}の使い方フロー図（800x400）"),
            ("03-tips.svg", f"よくある失敗と防ぎ方まとめ図（800x380）"),
        ]

    for filename, desc in svg_specs:
        print(f"  → SVG: {filename}...")
        resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=3000,
            messages=[{
                "role": "user",
                "content": f"""以下の仕様でSVGコードのみを出力してください（説明文不要）。

内容: {desc}
テーマ: Googleワークスペース / {theme}
メインカラー: {color}
サブカラー: {"#34A853" if color == "#1A73E8" else "#1A73E8"}
フォント: font-family="'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif"
背景色: #F8F9FA

日本語テキストを含む、視覚的にわかりやすいSVGを作成してください。
SVGタグから始まる完全なSVGコードのみ出力してください。"""
            }]
        )
        svg_content = resp.content[0].text.strip()
        match = re.search(r'<svg[\s\S]*</svg>', svg_content)
        if match:
            svg_content = match.group(0)
        (images_dir / filename).write_text(svg_content, encoding="utf-8")

    # ③ Studio CMS用データ
    print("  → Studio CMS用データ...")
    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=3000,
        messages=[{
            "role": "user",
            "content": f"""以下の記事をStudio CMSのブロックエディタ（Notionライク）に貼り付けるためのデータに変換してください。

【変換する記事】
{article_content[:2000]}

【ルール】
- ---ブロックN: [種類]--- の形式で分割
- 種類: 段落/H2/H3/番号付きリスト/箇条書きリスト/コールアウト/警告/画像/表
- 画像の箇所は「→ 画像: images/[ファイル名] 代替テキスト: [説明]」と記載
- ファイル先頭にCMSフィールド情報（タイトル/スラッグ/メタディスクリプション/タグ/公開日）を記載"""
        }]
    )
    (article_dir / f"{slug}-studio-cms.md").write_text(resp.content[0].text, encoding="utf-8")

    # ④ HTMLプレビュー
    print("  → HTMLプレビュー...")
    svgs = {}
    for filename, _ in svg_specs:
        svg_path = images_dir / filename
        if svg_path.exists():
            svgs[filename] = svg_path.read_text(encoding="utf-8")

    svg_inline = "\n".join([f"SVG{i+1}: {v}" for i, (k, v) in enumerate(svgs.items())])

    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=6000,
        messages=[{
            "role": "user",
            "content": f"""以下の記事のHTMLプレビューページを作成してください。

タイトル: {title}
メインカラー: {color}
会社名: 株式会社ふじサンバ
部門: DX支援部門
記事概要: {theme}
{"記事タイプ: 最新情報・アップデート" if is_news else ""}

【SVG図解（インライン埋め込み）】
{svg_inline}

【要件】
- 完全なHTML（DOCTYPE含む）
- ナビバーに「株式会社ふじサンバ」
- フッターに「© {YEAR} 株式会社ふじサンバ DX支援部門」
- サイドバーに目次・CTAカード（「Googleワークスペースを相談する」ボタン）
- {"最新情報記事のためヘッダーに「最新情報」バッジを付ける" if is_news else ""}
- SVGはすべてインライン埋め込み（objectタグ不使用）
- Googleカラー（ブルー #1A73E8・グリーン #34A853）を使ったデザイン
- 日本語フォント指定（Hiragino Sans）

HTMLのみ出力してください（説明文不要）。"""
        }]
    )
    html_content = resp.content[0].text.strip()
    match = re.search(r'<!DOCTYPE[\s\S]*</html>', html_content, re.IGNORECASE)
    if match:
        html_content = match.group(0)
    (article_dir / "preview.html").write_text(html_content, encoding="utf-8")

    # AI生成テーマはログに保存
    fixed_slugs = {a["slug"] for week in json.load(open(TOPICS_FILE))["week_schedule"] for a in week["articles"]}
    if slug not in fixed_slugs:
        save_generated_topic(title, slug)

    print(f"  ✅ 完了: {title}")
    return slug

def main():
    print(f"🚀 GWS記事 週次生成開始 ({YEAR}年 第{WEEK_NUM}週)")

    # ① 固定トピックから4件取得（残りがあれば）
    fixed_topics = pick_fixed_topics(count=4)
    remaining = 4 - len(fixed_topics)

    # ② 固定トピックが足りない分はAIで新テーマを生成
    ai_topics = []
    if remaining > 0:
        print(f"\n📋 固定トピック残り{len(fixed_topics)}件 → AIで{remaining}件追加生成")
        ai_topics = generate_new_topics(remaining)

    topics = fixed_topics + ai_topics

    # ③ 最新情報記事を毎週1本追加（計5本）
    news_topic = get_gws_news_topic()
    if news_topic:
        topics.append(news_topic)

    print(f"\n📋 今週のテーマ ({len(topics)}記事):")
    for t in topics:
        badge = "📰 最新情報" if t.get("is_news") else "📝 通常記事"
        print(f"  {badge}: {t['title']}")

    created = []
    for topic in topics:
        try:
            slug = generate_article(topic)
            created.append(slug)
        except Exception as e:
            print(f"❌ エラー ({topic.get('slug', '?')}): {e}")

    print(f"\n✨ 生成完了: {len(created)}/{len(topics)} 記事")
    for slug in created:
        print(f"  ✅ {slug}")

if __name__ == "__main__":
    main()
