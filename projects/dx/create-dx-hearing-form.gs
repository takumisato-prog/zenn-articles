/**
 * DX支援 ヒアリングフォーム 自動生成スクリプト
 * 実行方法: Google Apps Script (script.google.com) に貼り付けて createDxHearingForm() を実行
 */
function createDxHearingForm() {
  try {
    // フォーム作成
    var form = FormApp.create('【】DX支援 ヒアリングシート');
    form.setDescription(
      'このフォームは初回面談の前にご記入いただくものです。\n' +
      '回答内容をもとに、最適なDX支援プランをご提案します。\n' +
      'ご不明な点は空欄のままで構いません。'
    );
    form.setCollectEmail(false);
    form.setAllowResponseEdits(true);

    // ━━━━━━━━━━━━━a━━━━━━━━━━
    // 会社基本情報
    // ━━━━━━━━━━━━━━━━━━━━━━━
    form.addSectionHeaderItem()
      .setTitle('会社基本情報');

    form.addTextItem()
      .setTitle('会社名')
      .setRequired(true);

    form.addTextItem()
      .setTitle('ご担当者名・役職')
      .setRequired(true);

    form.addTextItem()
      .setTitle('業種（例：製造業、飲食業、小売業 など）');

    var empChoices = ['1〜5名', '6〜10名', '11〜30名', '31〜100名', '101名以上'];
    var empItem = form.addMultipleChoiceItem();
    empItem.setTitle('従業員数')
      .setChoiceValues(empChoices);

    form.addParagraphTextItem()
      .setTitle('主な事業内容');

    // ━━━━━━━━━━━━━━━━━━━━━━━
    // セクション①：現在の課題・お困りごと
    // ━━━━━━━━━━━━━━━━━━━━━━━
    form.addPageBreakItem()
      .setTitle('① 現在の課題・お困りごと');

    form.addParagraphTextItem()
      .setTitle('今一番時間がかかっている・手間な業務を教えてください（最大3つ）')
      .setHelpText('例：毎月の請求書作成、在庫確認の集計、会議の議事録作成 など');

    // 業務ごとの作業時間（グリッド）
    var timeGrid = form.addGridItem();
    timeGrid.setTitle('上記の業務に1週間でかかる時間（目安）')
      .setRows(['業務①', '業務②', '業務③'])
      .setColumns(['1時間未満', '1〜3時間', '3〜8時間', '8〜20時間', '20時間以上']);

    var painChoices = [
      'ミス・抜け漏れが多い',
      '情報共有が遅い・属人化している',
      '紙・Excel・メールでの管理が煩雑',
      '承認・申請の手続きが遅い',
      'リモートワーク・テレワークがうまくいっていない',
      'ファイル管理がバラバラ（PCローカル・USBなど）',
      '会議が多い・議事録管理が大変',
      'その他'
    ];
    form.addCheckboxItem()
      .setTitle('業務で感じている課題（あてはまるものすべて選択）')
      .setChoiceValues(painChoices);

    // ━━━━━━━━━━━━━━━━━━━━━━━
    // セクション②：現在使っているツール・環境
    // ━━━━━━━━━━━━━━━━━━━━━━━
    form.addPageBreakItem()
      .setTitle('② 現在使っているツール・環境');

    var mailChoices = [
      'Gmail（個人アカウント）',
      'Google Workspace（法人契約）',
      'Microsoft 365（Outlook）',
      'その他',
      '特に決まっていない'
    ];
    form.addCheckboxItem()
      .setTitle('現在メインで使っているメール・グループウェアは？')
      .setChoiceValues(mailChoices);

    var toolChoices = [
      'Googleドライブ',
      'Googleスプレッドシート',
      'Googleフォーム',
      'Microsoft SharePoint / OneDrive',
      'Dropbox / Box',
      'Slack / ChatWork / LINE WORKS',
      'Zoom / Google Meet',
      'kintone / Notion / Monday.com',
      'freee / マネーフォワード 等の会計ソフト',
      'その他'
    ];
    form.addCheckboxItem()
      .setTitle('現在使っているツール（あてはまるものすべて選択）')
      .setChoiceValues(toolChoices);

    var pcChoices = ['Windows', 'Mac', 'Windows・Mac混在', '会社支給PCなし（個人PC使用）'];
    form.addMultipleChoiceItem()
      .setTitle('PCの環境')
      .setChoiceValues(pcChoices);

    // ━━━━━━━━━━━━━━━━━━━━━━━
    // セクション③：DXの目的・目標
    // ━━━━━━━━━━━━━━━━━━━━━━━
    form.addPageBreakItem()
      .setTitle('③ DXの目的・目標');

    form.addParagraphTextItem()
      .setTitle('DX推進で達成したいことを教えてください')
      .setHelpText('例：月30時間の事務作業を削減したい / 在宅勤務を導入したい / 紙をなくしたい');

    form.addParagraphTextItem()
      .setTitle('成功したと感じる基準は何ですか？')
      .setHelpText('できれば数値で。例：週〇時間削減 / ミスを〇%減らす / 〇人がリモートで働ける');

    var scheduleChoices = [
      'すぐに着手したい（1ヶ月以内）',
      '3ヶ月以内に進めたい',
      '半年以内を目処に検討したい',
      'まずは情報収集したい'
    ];
    form.addMultipleChoiceItem()
      .setTitle('DX推進の優先度')
      .setChoiceValues(scheduleChoices);

    // ━━━━━━━━━━━━━━━━━━━━━━━
    // セクション④：体制・予算
    // ━━━━━━━━━━━━━━━━━━━━━━━
    form.addPageBreakItem()
      .setTitle('④ 体制・予算');

    var internalChoices = [
      'いる（IT担当者・推進できる社員がいる）',
      'いない',
      '今後育てていきたい'
    ];
    form.addMultipleChoiceItem()
      .setTitle('社内でDXを担当・推進できる方はいますか？')
      .setChoiceValues(internalChoices);

    var budgetChoices = [
      '月1〜3万円程度',
      '月3〜10万円程度',
      '月10万円以上',
      '補助金・助成金を活用したい',
      'まだ決まっていない'
    ];
    form.addMultipleChoiceItem()
      .setTitle('月々の予算感')
      .setChoiceValues(budgetChoices);

    var subsidyChoices = [
      '活用したい（IT導入補助金・小規模事業者持続化補助金など）',
      '詳しく知りたい',
      '特に考えていない'
    ];
    form.addMultipleChoiceItem()
      .setTitle('補助金・助成金の活用について')
      .setChoiceValues(subsidyChoices);

    // ━━━━━━━━━━━━━━━━━━━━━━━
    // セクション⑤：過去の経緯・懸念点
    // ━━━━━━━━━━━━━━━━━━━━━━━
    form.addPageBreakItem()
      .setTitle('⑤ 過去の経緯・懸念点');

    var pastChoices = ['ある', 'ない'];
    form.addMultipleChoiceItem()
      .setTitle('過去にDX・システム導入を試みたことはありますか？');

    form.addTextItem()
      .setTitle('「ある」場合：導入したツール名と結果を簡単に教えてください')
      .setHelpText('例：kintoneを入れたが誰も使わなかった');

    var failChoices = [
      '社員が使いこなせなかった',
      '導入後のサポートがなかった',
      'コストが高かった',
      '業務に合っていなかった',
      'その他'
    ];
    form.addCheckboxItem()
      .setTitle('うまくいかなかった理由（あてはまるものすべて）')
      .setChoiceValues(failChoices);

    form.addParagraphTextItem()
      .setTitle('今回の取り組みで特に心配していることはありますか？');

    // ━━━━━━━━━━━━━━━━━━━━━━━
    // セクション⑥：自由記述
    // ━━━━━━━━━━━━━━━━━━━━━━━
    form.addPageBreakItem()
      .setTitle('⑥ その他・自由記述');

    form.addParagraphTextItem()
      .setTitle('上記以外に共有したいこと、事前に知ってほしいことがあればご記入ください');

    // 送信後メッセージ
    form.setConfirmationMessage(
      'ご記入ありがとうございます！\n' +
      '内容を確認のうえ、担当者よりご連絡いたします。\n' +
      '面談当日はどうぞよろしくお願いいたします。\n\n' +
      '— DX支援部門'
    );

    // 結果をログ出力
    var formUrl = form.getPublishedUrl();
    var editUrl = form.getEditUrl();

    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.log('✅ フォーム生成完了！');
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.log('📋 回答URL（クライアントに送付）:');
    Logger.log(formUrl);
    Logger.log('');
    Logger.log('✏️  編集URL（自分用）:');
    Logger.log(editUrl);
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // スプレッドシートに回答を紐付ける場合
    // form.setDestination(FormApp.DestinationType.SPREADSHEET, 'スプレッドシートID');

  } catch(e) {
    Logger.log('❌ エラーが発生しました: ' + e.message);
  }
}
