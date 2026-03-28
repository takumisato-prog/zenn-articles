/**
 * Google Workspace 導入支援 ヒアリングフォーム 自動生成スクリプト
 * 実行方法: Google Apps Script (script.google.com) に貼り付けて createGwsHearingForm() を実行
 */
function createGwsHearingForm() {
  try {
    var form = FormApp.create('【】Google Workspace 導入支援 ヒアリングシート');
    form.setDescription(
      'Google Workspace の導入支援に向けて、現状をお聞かせください。\n' +
      '回答内容をもとに、最適な導入プランをご提案します。\n' +
      'ご不明な点は空欄のままで構いません。'
    );
    form.setCollectEmail(false);
    form.setAllowResponseEdits(true);

    // ━━━━━━━━━━━━━━━━━━━━━━━
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

    var empChoices = ['1〜5名', '6〜10名', '11〜30名', '31〜50名', '51〜100名', '101名以上'];
    form.addMultipleChoiceItem()
      .setTitle('従業員数（導入対象アカウント数の目安）')
      .setChoiceValues(empChoices);

    form.addTextItem()
      .setTitle('業種（例：製造業、飲食業、士業 など）');

    // ━━━━━━━━━━━━━━━━━━━━━━━
    // セクション①：現在のメール・グループウェア環境
    // ━━━━━━━━━━━━━━━━━━━━━━━
    form.addPageBreakItem()
      .setTitle('① 現在のメール・グループウェア環境');

    var currentMailChoices = [
      'Gmail（個人アカウント @gmail.com）',
      'Microsoft 365（Exchange / Outlook）',
      'Yahoo!メール / 独自ドメインメール',
      'オンプレミスのメールサーバー',
      'その他',
      'メールサービスをほぼ使っていない'
    ];
    form.addCheckboxItem()
      .setTitle('現在使っているメールサービスは？（あてはまるものすべて）')
      .setChoiceValues(currentMailChoices);

    var domainChoices = [
      'ある（独自ドメインで運用中）',
      'ない（Gmail個人アカウントを使用）',
      'これから取得したい'
    ];
    form.addMultipleChoiceItem()
      .setTitle('会社の独自ドメイン（例: company.co.jp）はありますか？')
      .setChoiceValues(domainChoices);

    var currentStorageChoices = [
      'PCのローカル（社内サーバー・NAS）',
      'Googleドライブ（個人）',
      'Dropbox / Box',
      'Microsoft OneDrive / SharePoint',
      'USBメモリ・外付けHDD',
      'その他',
      '特に管理していない'
    ];
    form.addCheckboxItem()
      .setTitle('現在のファイル管理・保管場所は？（あてはまるものすべて）')
      .setChoiceValues(currentStorageChoices);

    var communicationChoices = [
      'メール',
      'LINE / LINE WORKS',
      'Slack',
      'Chatwork',
      '電話',
      '社内掲示板・グループウェア（サイボウズ等）',
      'その他'
    ];
    form.addCheckboxItem()
      .setTitle('社内のコミュニケーション手段は？（あてはまるものすべて）')
      .setChoiceValues(communicationChoices);

    // ━━━━━━━━━━━━━━━━━━━━━━━
    // セクション②：導入の目的・課題
    // ━━━━━━━━━━━━━━━━━━━━━━━
    form.addPageBreakItem()
      .setTitle('② 導入の目的・解決したい課題');

    var purposeChoices = [
      'メールを会社のドメインで統一したい',
      'ファイルをクラウドで一元管理したい',
      'リモートワーク・テレワークを整備したい',
      'ビデオ会議（Google Meet）を導入したい',
      'Excelの共同編集をスムーズにしたい',
      '情報の属人化を解消したい',
      'セキュリティを強化したい',
      'Google認定を取得したい',
      'その他'
    ];
    form.addCheckboxItem()
      .setTitle('GWS導入で解決したいこと・目的（あてはまるものすべて）')
      .setChoiceValues(purposeChoices);

    form.addParagraphTextItem()
      .setTitle('現在一番困っていることを具体的に教えてください')
      .setHelpText('例：社員がバラバラのメールを使っていて情報が散らばっている / 退職者のデータ引き継ぎができない');

    // ━━━━━━━━━━━━━━━━━━━━━━━
    // セクション③：移行・引き継ぎの確認
    // ━━━━━━━━━━━━━━━━━━━━━━━
    form.addPageBreakItem()
      .setTitle('③ 移行・引き継ぎの確認');

    var migrationChoices = [
      '過去のメールを全件移行したい',
      '直近1年分だけ移行したい',
      '移行は不要（新規スタートでOK）',
      'まだ決まっていない'
    ];
    form.addMultipleChoiceItem()
      .setTitle('既存メールの移行はどうしますか？')
      .setChoiceValues(migrationChoices);

    var filesMigrationChoices = [
      '既存ファイルをGoogleドライブに全移行したい',
      '重要ファイルだけ移行したい',
      '移行は不要',
      'まだ決まっていない'
    ];
    form.addMultipleChoiceItem()
      .setTitle('既存ファイルの移行はどうしますか？')
      .setChoiceValues(filesMigrationChoices);

    var excelChoices = [
      'ExcelファイルはそのままGoogleスプレッドシートに変換したい',
      'ExcelとGoogleシートを併用したい',
      'Excelはそのまま使い続けたい',
      'まだ決まっていない'
    ];
    form.addMultipleChoiceItem()
      .setTitle('ExcelファイルはGoogleスプレッドシートに移行しますか？')
      .setChoiceValues(excelChoices);

    // ━━━━━━━━━━━━━━━━━━━━━━━
    // セクション④：セキュリティ・管理ポリシー
    // ━━━━━━━━━━━━━━━━━━━━━━━
    form.addPageBreakItem()
      .setTitle('④ セキュリティ・管理ポリシー');

    var securityChoices = [
      '社外へのファイル共有を禁止・制限したい',
      '二段階認証を全員に義務付けたい',
      'スマートフォンからのアクセス管理をしたい（MDM）',
      'メールの誤送信を防ぐ設定をしたい',
      '特になし / まだ考えていない'
    ];
    form.addCheckboxItem()
      .setTitle('セキュリティ面で希望する設定は？（あてはまるものすべて）')
      .setChoiceValues(securityChoices);

    var orgChoices = [
      '部署・チームごとに権限を分けたい',
      '全員同じ権限でシンプルに管理したい',
      'まだ決まっていない'
    ];
    form.addMultipleChoiceItem()
      .setTitle('組織・権限管理の希望は？')
      .setChoiceValues(orgChoices);

    // ━━━━━━━━━━━━━━━━━━━━━━━
    // セクション⑤：研修・サポート
    // ━━━━━━━━━━━━━━━━━━━━━━━
    form.addPageBreakItem()
      .setTitle('⑤ 研修・サポートの希望');

    var trainingChoices = [
      '全社員向けの基本操作研修を希望',
      '管理者向けの設定・運用研修を希望',
      'マニュアル・操作ガイドの作成を希望',
      '導入後の保守サポートを希望（月次）',
      '特に不要（自社で運用できる）'
    ];
    form.addCheckboxItem()
      .setTitle('研修・サポートの希望（あてはまるものすべて）')
      .setChoiceValues(trainingChoices);

    var itPersonChoices = [
      'いる（専任のIT担当者がいる）',
      'いない（総務や代表が兼任）',
      '今後育てる予定'
    ];
    form.addMultipleChoiceItem()
      .setTitle('社内でGWSを管理できる方はいますか？')
      .setChoiceValues(itPersonChoices);

    // ━━━━━━━━━━━━━━━━━━━━━━━
    // セクション⑥：スケジュール・予算
    // ━━━━━━━━━━━━━━━━━━━━━━━
    form.addPageBreakItem()
      .setTitle('⑥ スケジュール・予算');

    var scheduleChoices = [
      '1ヶ月以内に導入したい',
      '2〜3ヶ月以内',
      '半年以内',
      'まだ検討段階'
    ];
    form.addMultipleChoiceItem()
      .setTitle('導入希望時期')
      .setChoiceValues(scheduleChoices);

    var budgetChoices = [
      '初期費用のみ（月額ライセンスは自社管理）',
      '初期費用＋月額サポートを依頼したい',
      '補助金（IT導入補助金等）を活用したい',
      'まだ決まっていない'
    ];
    form.addMultipleChoiceItem()
      .setTitle('費用・契約形態の希望')
      .setChoiceValues(budgetChoices);

    // ━━━━━━━━━━━━━━━━━━━━━━━
    // セクション⑦：自由記述
    // ━━━━━━━━━━━━━━━━━━━━━━━
    form.addPageBreakItem()
      .setTitle('⑦ その他・ご要望');

    form.addParagraphTextItem()
      .setTitle('上記以外に共有したいこと、ご要望・ご質問があればご記入ください');

    // 送信後メッセージ
    form.setConfirmationMessage(
      'ご記入ありがとうございます！\n' +
      '内容を確認のうえ、担当者よりご連絡いたします。\n' +
      '面談当日はどうぞよろしくお願いいたします。\n\n' +
      '— DX支援部門'
    );

    // ログ出力
    var formUrl = form.getPublishedUrl();
    var editUrl = form.getEditUrl();

    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.log('✅ GWSヒアリングフォーム生成完了！');
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.log('📋 回答URL（クライアントに送付）:');
    Logger.log(formUrl);
    Logger.log('');
    Logger.log('✏️  編集URL（自分用）:');
    Logger.log(editUrl);
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch(e) {
    Logger.log('❌ エラーが発生しました: ' + e.message);
  }
}
