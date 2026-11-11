/**
 * LP 全体の設定。値を変えるのはこのファイルだけ。
 *
 * 受付・計測は yours集客LP（260713_yours集客LP）の仕組みに乗せている。
 * 送信先・ID はそちらの js/config.js と同じ値。変えるときは両方の案件の資料を確認する。
 * 空文字（''）の項目は、その機能が動かない（エラーにはならない）。
 */
window.LP_CONFIG = {

  // このLPの識別ID。GASの申込記録と担当者通知に流入元を残す。
  // GAS側の LP_SOURCE_LABELS に yours_manga を追加するまでは、流入元は空欄で記録される。
  lpSource: 'yours_manga',

  // 問い合わせフォームの送信先（UTAGE）。既存LPと同じ受付先。
  formEndpoint: 'https://utage-system.com/r/MYMf7jiFVpxN/store',

  // 受付成功後の完了ページ（UTAGE共通）。
  thanksEndpoint: 'https://utage-system.com/p/d2PYgfy0rtyN',

  // 記録と通知の送り先（GAS）。シート記録・通知メール・自動返信・Chatwork投稿を行う。
  recordEndpoint: 'https://script.google.com/macros/s/AKfycbyK569dMZgKOsGUTB2SJHaHaPZwuwOO-pr9XeqEdYDIh5yDB1ihiGCERi1Q2wyVSbre/exec',

  // Meta ピクセルID・GA4 測定ID（既存のIDを使う。新しいピクセルは作らない）。
  metaPixelId: '935676508791031',
  ga4Id: 'G-TSCZZXDWRT',

  // 公式LINEの友だち追加URL（既存と同じ登録先。分けるかは仕様書 Q12）。
  lineUrl: 'https://utage-system.com/line/open/MYMf7jiFVpxN'

};

/**
 * 手元と確認用URLでは、本番の受付・計測へ何も送らない。
 * localhost・127.0.0.1・ファイル直開き、確認用URL（*.workers.dev / *.pages.dev / *.github.io）では、
 * 送信先と計測IDを空にする。
 * フォームを送信すると「送信していません」の表示になり、UTAGE・GAS・Meta・GA4 には届かない。
 * 本番のドメイン（yoursnet.jp）では、この処理は働かない。
 */
(function () {
  var host = (window.location && window.location.hostname) || '';
  var isPreview = host === '' || host === 'localhost' || host === '127.0.0.1' || host === '[::1]' ||
    /\.localhost$/.test(host) || /\.test$/.test(host) ||
    /\.workers\.dev$/.test(host) || /\.pages\.dev$/.test(host) || /\.github\.io$/.test(host);
  if (!isPreview) return;
  var c = window.LP_CONFIG;
  c.isLocalPreview = true;
  c.formEndpoint = '';
  c.recordEndpoint = '';
  c.metaPixelId = '';
  c.ga4Id = '';
}());
