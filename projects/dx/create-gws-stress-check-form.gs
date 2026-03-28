/**
 * Google Workspace 社員向けストレスチェック（研修前ヒアリング）自動生成スクリプト
 * 実行方法: Google Apps Script (script.google.com) に貼り付けて createGwsStressCheckForm() を実行
 * ※ 匿名式・研修内容カスタマイズ用
 */
function createGwsStressCheckForm() {
  try {
    var form = FormApp.create('【研修前アンケート】Google Workspace 困りごとチェック');
    form.setDescription(
      'このアンケートは匿名です。個人が特定されることはありません。\n' +
      '正直にお答えいただくことで、あなたに合った研修内容をご用意できます。\n' +
      '所要時間：約5分'
    );
    form.setCollectEmail(false);
    form.setAllowResponseEdits(true);

    // ━━━━━━━━━━━━━━━━━━━━━━━
    // 基本属性（匿名・属性のみ）
    // ━━━━━━━━━━━━━━━━━━━━━━━
    form.addSectionHeaderItem()
      .setTitle('あなたについて（匿名・属性のみ）');

    var deptChoices = [
      '経営・管理部門',
      '営業・販売',
      '製造・現場',
      '総務・人事',
      '経理・財務',
      'その他'
    ];
    form.addMultipleChoiceItem()
      .setTitle('所属部署（近いものを選んでください）')
      .setChoiceValues(deptChoices);

    var tenureChoices = [
      '1年未満',
      '1〜3年',
      '3〜10年',
      '10年以上'
    ];
    form.addMultipleChoiceItem()
      .setTitle('勤続年数')
      .setChoiceValues(tenureChoices);

    var ageChoices = [
      '20代',
      '30代',
      '40代',
      '50代以上'
    ];
    form.addMultipleChoiceItem()
      .setTitle('年代')
      .setChoiceValues(ageChoices);

    // ━━━━━━━━━━━━━━━━━━━━━━━
    // セクション①：パソコン・スマホの使い慣れ度
    // ━━━━━━━━━━━━━━━━━━━━━━━
    form.addPageBreakItem()
      .setTitle('① パソコン・スマホの使い慣れ度');

    var pcLevelChoices = [
      '1：ほぼ使えない・苦手意識がある',
      '2：メール・検索くらいはできる',
      '3：ExcelやWordを普通に使える',
      '4：関数・グラフ・フォルダ整理など一通りできる',
      '5：自分でトラブル解決・応用もできる'
    ];
    form.addMultipleChoiceItem()
      .setTitle('パソコン操作の得意度（1〜5で選んでください）')
      .setChoiceValues(pcLevelChoices);

    var currentToolChoices = [
      'Excel / Word（Microsoft Office）',
      'Googleスプレッドシート / ドキュメント',
      'LINE / LINE WORKS',
      'Chatwork / Slack',
      'Zoom',
      'kintone / サイボウズ',
      '紙・手書きが中心',
      'その他'
    ];
    form.addCheckboxItem()
      .setTitle('現在、仕事でよく使うツールは？（あてはまるものすべて）')
      .setChoiceValues(currentToolChoices);

    // ━━━━━━━━━━━━━━━━━━━━━━━
    // セクション②：Googleツール 習熟度チェック
    // ━━━━━━━━━━━━━━━━━━━━━━━
    form.addPageBreakItem()
      .setTitle('② Googleツール 習熟度チェック');

    form.addSectionHeaderItem()
      .setTitle('各ツールについて、自分の使いこなし度を選んでください\n（1: 使ったことがない 〜 5: バリバリ使いこなせる）');

    // Gmail
    var skillScale = ['1：使ったことがない', '2：少し使える', '3：普通に使える', '4：応用できる', '5：完璧に使いこなせる'];

    form.addMultipleChoiceItem()
      .setTitle('Gmail（メール）')
      .setChoiceValues(skillScale);

    form.addMultipleChoiceItem()
      .setTitle('Googleドライブ（ファイル保存・共有）')
      .setChoiceValues(skillScale);

    form.addMultipleChoiceItem()
      .setTitle('Googleドキュメント（文書作成）')
      .setChoiceValues(skillScale);

    form.addMultipleChoiceItem()
      .setTitle('Googleスプレッドシート（表計算）')
      .setChoiceValues(skillScale);

    form.addMultipleChoiceItem()
      .setTitle('Googleカレンダー（スケジュール管理）')
      .setChoiceValues(skillScale);

    form.addMultipleChoiceItem()
      .setTitle('Google Meet（ビデオ会議）')
      .setChoiceValues(skillScale);

    form.addMultipleChoiceItem()
      .setTitle('Google Chat（チャット・社内連絡）')
      .setChoiceValues(skillScale);

    // ━━━━━━━━━━━━━━━━━━━━━━━
    // セクション③：困りごと・ストレスポイント
    // ━━━━━━━━━━━━━━━━━━━━━━━
    form.addPageBreakItem()
      .setTitle('③ 日常業務での困りごと・ストレスポイント');

    var stressChoices = [
      'ファイルがどこにあるかわからなくなる',
      '他の人と同じファイルを同時に編集するのが怖い',
      'メールの整理・管理が追いついていない',
      '会議の日程調整に時間がかかる',
      'ビデオ会議の接続・操作が不安',
      'スマホからデータにアクセスできない',
      '退職した人のデータがどこにあるかわからない',
      '誤って大事なファイルを消してしまいそうで怖い',
      'チームのメンバーと情報共有がうまくできていない',
      'パスワードを忘れてログインできなくなる',
      '特に困っていることはない'
    ];
    form.addCheckboxItem()
      .setTitle('仕事でよく困ること・ストレスに感じることは？（あてはまるものすべて）')
      .setChoiceValues(stressChoices);

    form.addParagraphTextItem()
      .setTitle('上記以外で、日常業務の中で「これ、もっと楽にならないかな」と感じることがあれば教えてください')
      .setHelpText('どんな小さなことでも構いません');

    // ━━━━━━━━━━━━━━━━━━━━━━━
    // セクション④：研修への期待・不安
    // ━━━━━━━━━━━━━━━━━━━━━━━
    form.addPageBreakItem()
      .setTitle('④ 研修への期待・不安');

    var learnChoices = [
      'Gmailの使い方・整理術',
      'Googleドライブでのファイル共有・フォルダ整理',
      'Googleスプレッドシート（Excelとの違い・基本操作）',
      'Google Meet でのビデオ会議の使い方',
      'Googleカレンダーでの予定共有・会議設定',
      'スマホからGWSを使う方法',
      '複数人で同じファイルを編集する方法',
      '業務を自動化する方法（GAS・マクロ）',
      '特にない'
    ];
    form.addCheckboxItem()
      .setTitle('研修で学びたいこと・知りたいことは？（あてはまるものすべて）')
      .setChoiceValues(learnChoices);

    var anxietyChoices = [
      '操作についていけるか不安',
      '覚えたことをすぐ忘れてしまいそう',
      '研修後に使う機会がなさそう',
      '今の仕事のやり方を変えたくない',
      '特に不安はない',
      'その他'
    ];
    form.addCheckboxItem()
      .setTitle('研修に対して不安・心配なことは？（あてはまるものすべて）')
      .setChoiceValues(anxietyChoices);

    var paceChoices = [
      'ゆっくり丁寧に教えてほしい',
      '基本だけ教えてもらえれば自分で応用できる',
      '実際の業務に近い例で教えてほしい',
      'テキスト・マニュアルを手元に残してほしい',
      '後から動画や資料で復習したい'
    ];
    form.addCheckboxItem()
      .setTitle('研修に希望するスタイルは？（あてはまるものすべて）')
      .setChoiceValues(paceChoices);

    // ━━━━━━━━━━━━━━━━━━━━━━━
    // セクション⑤：自由記述
    // ━━━━━━━━━━━━━━━━━━━━━━━
    form.addPageBreakItem()
      .setTitle('⑤ 最後に');

    form.addParagraphTextItem()
      .setTitle('研修担当者へのメッセージ・要望があれば自由にお書きください')
      .setHelpText('「ここだけは絶対教えてほしい」「こういう進め方は苦手」など何でもOKです');

    // 送信後メッセージ
    form.setConfirmationMessage(
      'ご回答ありがとうございます！\n' +
      'みなさんの声をもとに、できる限り実践的で使いやすい研修をご用意します。\n\n' +
      '— DX支援部門'
    );

    // ログ出力
    var formUrl = form.getPublishedUrl();
    var editUrl = form.getEditUrl();

    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.log('✅ GWSストレスチェックフォーム生成完了！');
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.log('📋 回答URL（全社員に配布）:');
    Logger.log(formUrl);
    Logger.log('');
    Logger.log('✏️  編集URL（自分用）:');
    Logger.log(editUrl);
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch(e) {
    Logger.log('❌ エラーが発生しました: ' + e.message);
  }
}
