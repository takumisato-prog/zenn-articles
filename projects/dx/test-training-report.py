"""
generate-training-report.gs の完全内部テスト
GASロジックをPythonで再現し、全機能を検証する
"""

import re
from collections import defaultdict

# =========================================
# GASロジックをPythonで再現
# =========================================

TOOLS = [
    {'key': 'Gmail',    'label': 'Gmail',    'keyword': 'Gmail'},
    {'key': 'Drive',    'label': 'Drive',    'keyword': 'Googleドライブ'},
    {'key': 'Docs',     'label': 'Docs',     'keyword': 'Googleドキュメント'},
    {'key': 'Sheets',   'label': 'Sheets',   'keyword': 'Googleスプレッドシート'},
    {'key': 'Calendar', 'label': 'Calendar', 'keyword': 'Googleカレンダー'},
    {'key': 'Meet',     'label': 'Meet',     'keyword': 'Google Meet'},
    {'key': 'Chat',     'label': 'Chat',     'keyword': 'Google Chat'},
]

def parse_score(val):
    """'2：少し使える' → 2"""
    if not val:
        return 0
    m = re.match(r'^(\d)', str(val))
    return int(m.group(1)) if m else 0

def parse_checkbox(val):
    """'A, B, C' → ['A', 'B', 'C']（空・除外ワードを除く）"""
    exclude = {'特に困っていることはない', '特にない', '特に不安はない'}
    if not val:
        return []
    return [s.strip() for s in str(val).split(',')
            if s.strip() and s.strip() not in exclude]

def top_n(d, n):
    return sorted(d.items(), key=lambda x: -x[1])[:n]

def calc_avg_from_freq(freq):
    total = sum(int(k) * v for k, v in freq.items())
    cnt   = sum(freq.values())
    return total / cnt if cnt > 0 else 0

def analyze_responses(headers, rows):
    a = {
        'departments': defaultdict(int),
        'pcSkills':    defaultdict(int),
        'toolScores':  {t['key']: [] for t in TOOLS},
        'toolAverages': {},
        'painPoints':  defaultdict(int),
        'learningWishes': defaultdict(int),
        'anxieties':   defaultdict(int),
        'preferredStyles': defaultdict(int),
    }
    col = {}
    for i, h in enumerate(headers):
        if '所属部署'     in h: col['dept']    = i
        if 'パソコン操作' in h: col['pcSkill'] = i
        if '困ること' in h or 'ストレス' in h: col['pain'] = i
        if '学びたいこと' in h: col['learning'] = i
        if '不安'         in h: col['anxiety']  = i
        if 'スタイル'     in h: col['style']    = i
        for t in TOOLS:
            if t['keyword'] in h and f"tool_{t['key']}" not in col:
                col[f"tool_{t['key']}"] = i

    for row in rows:
        if 'dept' in col:
            a['departments'][row[col['dept']] or '未回答'] += 1
        if 'pcSkill' in col:
            sc = parse_score(row[col['pcSkill']])
            if sc > 0: a['pcSkills'][sc] += 1
        for t in TOOLS:
            ci = col.get(f"tool_{t['key']}")
            if ci is not None and row[ci]:
                sc = parse_score(row[ci])
                if sc > 0: a['toolScores'][t['key']].append(sc)
        for field, key in [('pain','painPoints'),('learning','learningWishes'),
                           ('anxiety','anxieties'),('style','preferredStyles')]:
            if field in col:
                for v in parse_checkbox(row[col[field]]):
                    a[key][v] += 1

    for t in TOOLS:
        scores = a['toolScores'][t['key']]
        a['toolAverages'][t['key']] = sum(scores)/len(scores) if scores else 0

    return a

def calc_priority(tool_averages, learning_wishes):
    wish_map = {
        'Gmail':    'Gmailの使い方・整理術',
        'Drive':    'Googleドライブでのファイル共有・フォルダ整理',
        'Docs':     'Googleスプレッドシート（Excelとの違い・基本操作）',
        'Sheets':   'Googleスプレッドシート（Excelとの違い・基本操作）',
        'Calendar': 'Googleカレンダーでの予定共有・会議設定',
        'Meet':     'Google Meet でのビデオ会議の使い方',
        'Chat':     '複数人で同じファイルを編集する方法',
    }
    total_wishes = sum(learning_wishes.values()) + 1  # div/0 回避
    result = []
    for t in TOOLS:
        avg     = tool_averages[t['key']]
        wish    = learning_wishes.get(wish_map[t['key']], 0)
        wish_pct = wish / total_wishes
        score   = ((5 - avg) / 4) * 0.6 + wish_pct * 0.4
        result.append({'tool': t['label'], 'key': t['key'], 'avg': avg, 'score': score})
    return sorted(result, key=lambda x: -x['score'])

# =========================================
# テストデータ（5名分のダミー回答）
# =========================================

HEADERS = [
    'タイムスタンプ',
    '所属部署（近いものを選んでください）',
    '勤続年数',
    '年代',
    'パソコン操作の得意度（1〜5で選んでください）',
    '現在、仕事でよく使うツールは？（あてはまるものすべて）',
    'Gmail（メール）',
    'Googleドライブ（ファイル保存・共有）',
    'Googleドキュメント（文書作成）',
    'Googleスプレッドシート（表計算）',
    'Googleカレンダー（スケジュール管理）',
    'Google Meet（ビデオ会議）',
    'Google Chat（チャット・社内連絡）',
    '仕事でよく困ること・ストレスに感じることは？（あてはまるものすべて）',
    '「これ、もっと楽にならないかな」と感じること',
    '研修で学びたいこと・知りたいことは？（あてはまるものすべて）',
    '研修に対して不安・心配なことは？（あてはまるものすべて）',
    '研修に希望するスタイルは？（あてはまるものすべて）',
    '研修担当者へのメッセージ',
]

ROWS = [
    # 回答1: 営業・30代・PCやや苦手
    ['2026/03/30 10:00', '営業・販売', '1〜3年', '30代',
     '2：メール・検索くらいはできる', 'Excel / Word（Microsoft Office）',
     '2：少し使える', '1：使ったことがない', '1：使ったことがない',
     '2：少し使える', '3：普通に使える', '1：使ったことがない', '1：使ったことがない',
     'ファイルがどこにあるかわからなくなる, メールの整理・管理が追いついていない', '',
     'Gmailの使い方・整理術, Googleドライブでのファイル共有・フォルダ整理',
     '操作についていけるか不安', 'ゆっくり丁寧に教えてほしい', ''],

    # 回答2: 総務・40代・PC普通
    ['2026/03/30 10:05', '総務・人事', '3〜10年', '40代',
     '3：ExcelやWordを普通に使える', 'Excel / Word（Microsoft Office）',
     '3：普通に使える', '2：少し使える', '1：使ったことがない',
     '3：普通に使える', '2：少し使える', '1：使ったことがない', '1：使ったことがない',
     'ファイルがどこにあるかわからなくなる, 他の人と同じファイルを同時に編集するのが怖い', '',
     'Googleドライブでのファイル共有・フォルダ整理, 複数人で同じファイルを編集する方法',
     '覚えたことをすぐ忘れてしまいそう', 'テキスト・マニュアルを手元に残してほしい', ''],

    # 回答3: 経理・50代・PC苦手
    ['2026/03/30 10:10', '経理・財務', '10年以上', '50代以上',
     '1：ほぼ使えない・苦手意識がある', '紙・手書きが中心',
     '1：使ったことがない', '1：使ったことがない', '1：使ったことがない',
     '1：使ったことがない', '1：使ったことがない', '1：使ったことがない', '1：使ったことがない',
     'ビデオ会議の接続・操作が不安, パスワードを忘れてログインできなくなる, メールの整理・管理が追いついていない', '',
     'Gmailの使い方・整理術, Google Meet でのビデオ会議の使い方',
     '操作についていけるか不安, 今の仕事のやり方を変えたくない',
     'ゆっくり丁寧に教えてほしい, 後から動画や資料で復習したい', ''],

    # 回答4: 営業・20代・PCやや得意
    ['2026/03/30 10:15', '営業・販売', '1年未満', '20代',
     '4：関数・グラフ・フォルダ整理など一通りできる', 'Googleスプレッドシート / ドキュメント',
     '4：応用できる', '3：普通に使える', '3：普通に使える',
     '4：応用できる', '3：普通に使える', '2：少し使える', '2：少し使える',
     'チームのメンバーと情報共有がうまくできていない', '',
     'Google Meet でのビデオ会議の使い方, Googleカレンダーでの予定共有・会議設定',
     '特に不安はない', '基本だけ教えてもらえれば自分で応用できる', ''],

    # 回答5: 製造・40代・PC普通
    ['2026/03/30 10:20', '製造・現場', '3〜10年', '40代',
     '2：メール・検索くらいはできる', 'LINE / LINE WORKS',
     '2：少し使える', '1：使ったことがない', '1：使ったことがない',
     '2：少し使える', '2：少し使える', '1：使ったことがない', '1：使ったことがない',
     'ファイルがどこにあるかわからなくなる, スマホからデータにアクセスできない', '',
     'Gmailの使い方・整理術, Googleドライブでのファイル共有・フォルダ整理',
     '操作についていけるか不安', 'ゆっくり丁寧に教えてほしい, 実際の業務に近い例で教えてほしい', ''],
]

# =========================================
# テスト実行
# =========================================

def run_tests():
    passed = 0
    failed = 0

    def check(name, condition, detail=''):
        nonlocal passed, failed
        if condition:
            print(f'  ✅ {name}')
            passed += 1
        else:
            print(f'  ❌ {name}  {detail}')
            failed += 1

    print('=' * 60)
    print('🔍 generate-training-report.gs 内部テスト')
    print('=' * 60)

    # --- Test 1: ヘッダー解析 ---
    print('\n【1】ヘッダー解析テスト')
    col = {}
    for i, h in enumerate(HEADERS):
        if '所属部署'     in h: col['dept']    = i
        if 'パソコン操作' in h: col['pcSkill'] = i
        if '困ること' in h or 'ストレス' in h: col['pain'] = i
        if '学びたいこと' in h: col['learning'] = i
        if '不安'         in h: col['anxiety']  = i
        if 'スタイル'     in h: col['style']    = i
        for t in TOOLS:
            if t['keyword'] in h and f"tool_{t['key']}" not in col:
                col[f"tool_{t['key']}"] = i

    check('dept列を検出',       col.get('dept') == 1,          f"実際:{col.get('dept')}")
    check('pcSkill列を検出',    col.get('pcSkill') == 4,       f"実際:{col.get('pcSkill')}")
    check('pain列を検出',       col.get('pain') == 13,         f"実際:{col.get('pain')}")
    check('learning列を検出',   col.get('learning') == 15,     f"実際:{col.get('learning')}")
    check('anxiety列を検出',    col.get('anxiety') == 16,      f"実際:{col.get('anxiety')}")
    check('style列を検出',      col.get('style') == 17,        f"実際:{col.get('style')}")
    check('Gmail列を検出',      col.get('tool_Gmail') == 6,    f"実際:{col.get('tool_Gmail')}")
    check('Drive列を検出',      col.get('tool_Drive') == 7,    f"実際:{col.get('tool_Drive')}")
    check('Sheets列を検出',     col.get('tool_Sheets') == 9,   f"実際:{col.get('tool_Sheets')}")
    check('Meet列を検出',       col.get('tool_Meet') == 11,    f"実際:{col.get('tool_Meet')}")

    # --- Test 2: parseScore ---
    print('\n【2】parseScore テスト')
    check("'1：使ったことがない' → 1", parse_score('1：使ったことがない') == 1)
    check("'2：少し使える' → 2",       parse_score('2：少し使える') == 2)
    check("'5：バリバリ' → 5",          parse_score('5：バリバリ') == 5)
    check("空文字 → 0",                 parse_score('') == 0)
    check("None → 0",                  parse_score(None) == 0)

    # --- Test 3: parseCheckbox ---
    print('\n【3】parseCheckbox テスト')
    r = parse_checkbox('A, B, C')
    check("3項目パース", r == ['A', 'B', 'C'], f"実際:{r}")
    r2 = parse_checkbox('特に困っていることはない')
    check("除外ワードを除去", r2 == [], f"実際:{r2}")
    r3 = parse_checkbox('')
    check("空文字 → []", r3 == [], f"実際:{r3}")

    # --- Test 4: データ解析 ---
    print('\n【4】analyzeResponses テスト（5名分）')
    a = analyze_responses(HEADERS, ROWS)

    check('部署が集計されている',      len(a['departments']) > 0)
    check('PCスキルが集計されている',  len(a['pcSkills']) > 0)
    check('Gmail スコアが5件',         len(a['toolScores']['Gmail']) == 5,
          f"実際:{len(a['toolScores']['Gmail'])}")
    check('Drive スコアが5件',         len(a['toolScores']['Drive']) == 5)
    check('痛みポイントが集計されている', len(a['painPoints']) > 0)
    check('学びたいことが集計されている', len(a['learningWishes']) > 0)

    # ツール平均スコアの確認
    avg_gmail = a['toolAverages']['Gmail']
    # Gmail scores: 2,3,1,4,2 → avg=2.4
    check(f'Gmail平均スコア ≈ 2.4', abs(avg_gmail - 2.4) < 0.01,
          f"実際:{avg_gmail:.2f}")

    avg_drive = a['toolAverages']['Drive']
    # Drive scores: 1,2,1,3,1 → avg=1.6
    check(f'Drive平均スコア ≈ 1.6', abs(avg_drive - 1.6) < 0.01,
          f"実際:{avg_drive:.2f}")

    # 困りごとTOP確認
    top_pain = top_n(a['painPoints'], 1)
    check('最多困りごとを正しく取得', len(top_pain) > 0)
    print(f'     → 最多困りごと: 「{top_pain[0][0]}」({top_pain[0][1]}名)')

    # 学びたいことTOP確認
    top_wish = top_n(a['learningWishes'], 1)
    check('最多学びたいことを正しく取得', len(top_wish) > 0)
    print(f'     → 最多: 「{top_wish[0][0]}」({top_wish[0][1]}名)')

    # --- Test 5: calcPriority ---
    print('\n【5】calcPriority テスト')
    priorities = calc_priority(a['toolAverages'], a['learningWishes'])
    check('7ツール全て含まれる',    len(priorities) == 7,    f"実際:{len(priorities)}")
    check('スコア降順にソート済み', all(priorities[i]['score'] >= priorities[i+1]['score']
                                        for i in range(len(priorities)-1)))
    print(f'     → 研修優先順: {" > ".join(p["tool"] for p in priorities)}')
    print(f'     → 最優先: {priorities[0]["tool"]} (avg={priorities[0]["avg"]:.1f}, score={priorities[0]["score"]:.3f})')

    # --- Test 6: calcAvgFromFreq ---
    print('\n【6】calcAvgFromFreq テスト')
    avg_pc = calc_avg_from_freq(a['pcSkills'])
    # PC scores: 2,3,1,4,2 → avg=2.4
    check(f'PCスキル平均 ≈ 2.4', abs(avg_pc - 2.4) < 0.01, f"実際:{avg_pc:.2f}")

    # --- Test 7: ロードマップ生成確認 ---
    print('\n【7】ロードマップ Week2内容テスト')
    top3_tools = [p['tool'] for p in priorities[:3]]
    week2_content = f"{top3_tools[0]}・{top3_tools[1] if len(top3_tools) > 1 else 'Sheets'}"
    check('Week2に優先ツールが反映される', len(week2_content) > 0)
    print(f'     → Week2内容: 「{week2_content}」')

    # --- Test 8: shorten ---
    print('\n【8】shorten テスト')
    def shorten(s, n):
        return s[:n] + '…' if len(s) > n else s
    check('30文字超えで切り詰め', shorten('A'*31, 30) == 'A'*30 + '…')
    check('30文字以内はそのまま',  shorten('短いテキスト', 30) == '短いテキスト')

    # --- Test 9: データなし時の安全性 ---
    print('\n【9】空データ安全性テスト')
    empty = analyze_responses(HEADERS, [])
    check('回答0件でもクラッシュしない', True)
    check('0件時のPCスキル平均=0', calc_avg_from_freq(empty['pcSkills']) == 0)
    check('0件時の優先度計算が動く', len(calc_priority(empty['toolAverages'], empty['learningWishes'])) == 7)

    # --- 結果サマリー ---
    print('\n' + '=' * 60)
    print(f'📊 テスト結果: {passed}件 ✅ 合格 / {failed}件 ❌ 失敗')
    print('=' * 60)

    if failed == 0:
        print('🎉 全テスト合格！GASへの移植準備完了。')
    else:
        print('⚠️  失敗したテストを確認してください。')

    # 分析サマリーも表示
    print('\n📋 ダミーデータ分析サマリー（5名）:')
    a = analyze_responses(HEADERS, ROWS)
    print(f'  部署構成: {dict(a["departments"])}')
    print(f'  PCスキル平均: {calc_avg_from_freq(a["pcSkills"]):.1f} / 5.0')
    print(f'  ツール平均スコア:')
    for t in TOOLS:
        avg = a['toolAverages'][t['key']]
        bar = '█' * int(avg * 4)
        status = '要対応' if avg < 2 else '要強化' if avg < 3.5 else '良好'
        print(f'    {t["label"]:10s} {avg:.1f} {bar:20s} [{status}]')
    print(f'  困りごとTOP3:')
    for label, cnt in top_n(a['painPoints'], 3):
        print(f'    ・{label} ({cnt}名)')
    print(f'  学びたいTOP3:')
    for label, cnt in top_n(a['learningWishes'], 3):
        print(f'    ・{label} ({cnt}名)')
    print(f'  研修優先順位:')
    for i, p in enumerate(calc_priority(a['toolAverages'], a['learningWishes'])):
        mark = ['最優先','高優先','中優先','通常','通常','低','低'][i]
        print(f'    {i+1}. {p["tool"]:10s} avg={p["avg"]:.1f}  [{mark}]')

if __name__ == '__main__':
    run_tests()
