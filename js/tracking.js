/**
 * 計測タグ（Meta ピクセル / GA4）の読み込みと、イベント送信の窓口。
 *
 * ID は js/config.js の1か所だけで管理する。ここには書かない。
 * ID が空のあいだは何も読み込まないので、仮公開のまま置いても外部に何も送らない。
 *
 * 他のファイルからは window.lpTrack() / window.lpTrackCustom() を使う。
 */
(function () {
  'use strict';

  var config = window.LP_CONFIG || {};
  var pixelId = String(config.metaPixelId || '').trim();
  var ga4Id = String(config.ga4Id || '').trim();

  // ── イベント名の対応表 ──────────────────────────────────
  // Meta と GA4 は同じ出来事を別の名前で呼ぶ。片方に寄せると、
  // どちらかの画面で「見慣れない名前のイベント」になって読めなくなる。
  // 呼び出し側は Meta の名前だけを使い、GA4 名はここで変換する。
  var GA4_NAME = {
    'Lead': 'generate_lead',        // GA4の推奨イベント名
    'FormView': 'form_view',
    'LineFriendAdd': 'line_friend_add'
  };

  function toGa4Name(name) {
    if (GA4_NAME[name]) return GA4_NAME[name];
    // 対応表に無ければ MyEvent → my_event の形に変換する
    return String(name).replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  }

  function sendMeta(kind, name, params) {
    if (typeof window.fbq === 'function') window.fbq(kind, name, params || {});
  }

  function sendGa4(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', toGa4Name(name), params || {});
  }

  // 呼び出し側はこの2つだけを使う。両方のタグに同時に送る。
  // タグが無いときは何も起きない（呼び出し側は場合分けしなくてよい）。
  window.lpTrack = function (name, params) {
    sendMeta('track', name, params);
    sendGa4(name, params);
  };
  window.lpTrackCustom = function (name, params) {
    sendMeta('trackCustom', name, params);
    sendGa4(name, params);
  };

  // ── Meta ピクセル ────────────────────────────────────────
  if (pixelId) {
    /* eslint-disable */
    // ここは Meta が配布している基本コードそのもの（書き換えない）
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */

    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
  } else if (window.console && window.console.info) {
    window.console.info('[tracking] metaPixelId が未設定のため、Metaピクセルは読み込みません。');
  }

  // ── Google アナリティクス4（任意） ───────────────────────
  if (ga4Id) {
    var gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga4Id);
    document.head.appendChild(gtagScript);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    // page_view は config で自動的に送られる。手動で足すと二重に数える
    window.gtag('config', ga4Id);
  } else if (window.console && window.console.info) {
    window.console.info('[tracking] ga4Id が未設定のため、GA4は読み込みません。');
  }

  // ── フォームまで到達した人を数える（LP本体だけ） ──────────
  // 「フォームが画面に入った」= 検討まで進んだ人。広告の良し悪しを
  // 申し込み数より早く判断できるので、ここだけ独自イベントを1つ置く。
  document.addEventListener('DOMContentLoaded', function () {
    var contact = document.getElementById('contact');
    if (!contact || typeof window.IntersectionObserver !== 'function') return;

    var fired = false;
    var observer = new window.IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || fired) return;
        fired = true;
        window.lpTrackCustom('FormView');
        observer.disconnect();
      });
    }, { threshold: 0.3 });

    observer.observe(contact);
  });

}());
