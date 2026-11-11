/**
 * 漫画制作・Kindle出版コース LP の動き。
 * フォーム送信の処理は yours集客LP の js/main.js と同じ内容（jQueryを使わない形に書き直した）。
 */
(function () {
  'use strict';

  var config = window.LP_CONFIG || {};
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── スクロールでのふわっと表示（動きを減らす設定のときは何もしない） ── */
  (function () {
    var targets = document.querySelectorAll('.reveal');
    if (!targets.length) return;
    if (reduceMotion || typeof window.IntersectionObserver !== 'function') return;
    document.documentElement.classList.add('has-reveal');
    var io = new window.IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach(function (el) { io.observe(el); });
  }());

  /* ── 予約ボタンの固定表示：FVを過ぎてから出し、フォームが見えている間は隠す ── */
  (function () {
    var fv = document.getElementById('fv');
    var contact = document.getElementById('contact');
    var floats = document.querySelectorAll('[data-float-cta]');
    if (!fv || !floats.length || typeof window.IntersectionObserver !== 'function') return;
    var pastFv = false;
    var inForm = false;
    function update() {
      floats.forEach(function (el) {
        el.classList.toggle('is-visible', pastFv && !inForm);
      });
    }
    new window.IntersectionObserver(function (entries) {
      pastFv = !entries[0].isIntersecting;
      update();
    }, { threshold: 0 }).observe(fv);
    if (contact) {
      new window.IntersectionObserver(function (entries) {
        inForm = entries[0].isIntersecting;
        update();
      }, { threshold: 0.05 }).observe(contact);
    }
  }());

  /* ── PCの目次：今いる節に印をつける ── */
  (function () {
    var links = document.querySelectorAll('.side-nav a[href^="#"]');
    if (!links.length || typeof window.IntersectionObserver !== 'function') return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new window.IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute('aria-current'); });
        var a = map[entry.target.id];
        if (a) a.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }());

  /* ── LINEのリンク先は config から差し込む ── */
  (function () {
    var lineUrl = String(config.lineUrl || '').trim();
    document.querySelectorAll('[data-line-link]').forEach(function (a) {
      if (lineUrl) a.setAttribute('href', lineUrl);
      else a.closest('[data-line-block]').hidden = true;
    });
  }());

  /* ── 予約フォーム ── */
  (function () {
    var form = document.getElementById('contactForm');
    if (!form) return;

    var endpoint = String(config.formEndpoint || '').trim();
    var recordEndpoint = String(config.recordEndpoint || '').trim();
    var notice = document.getElementById('formNotice');

    // 送信先が未設定のときは送らせない（手元での確認中もここに入る）。
    // action が空のまま送ると、ページを読み込み直して入力内容が黙って消える。
    if (!endpoint) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        if (!notice) return;
        notice.hidden = false;
        notice.textContent = config.isLocalPreview
          ? '確認用のページのため、送信していません（本番の受付先には届きません）。'
          : 'ただいまフォームを調整中です。お手数ですが、時間をおいてお試しください。';
        notice.focus();
      });
      return;
    }

    form.setAttribute('action', endpoint);

    // UTAGEの302はactionの_glを捨てるため、公式のthanks_urlへ引き継ぐ。
    // 実際のPOSTデータが構築されるformdataで、Googleタグが装飾したactionを読む。
    form.addEventListener('formdata', function (event) {
      try {
        var thanksEndpoint = String(config.thanksEndpoint || '').trim();
        if (!thanksEndpoint) return;
        var action = new URL(form.action);
        var target = new URL(thanksEndpoint);
        var expected = new URL(endpoint);
        // 設定した受付・完了ページ間だけで引き継ぐ。任意の転送先は受け付けない。
        if (action.origin !== expected.origin || action.pathname !== expected.pathname ||
            target.protocol !== 'https:' || target.origin !== expected.origin) return;
        var linker = action.searchParams.get('_gl');
        if (!linker) return;
        target.searchParams.set('_gl', linker);
        event.formData.set('thanks_url', target.href);
      } catch (e) {
        // 計測の問題で申し込みを止めない。
      }
    });

    // UTAGE の項目名 → GAS が待っている項目名への読み替え。
    var TO_GAS = {
      sei: 'lastName',
      mei: 'firstName',
      mail: 'email',
      phone: 'tel',
      free2: 'area',
      free1: 'inquiryType',
      free3: 'message'
    };

    form.addEventListener('submit', function () {
      if (!recordEndpoint) return;
      // GAS への送信に失敗しても、UTAGE への送信（申し込みそのもの）は必ず通す。
      try {
        var params = new URLSearchParams();
        new FormData(form).forEach(function (value, key) {
          if (TO_GAS[key]) params.append(TO_GAS[key], value);
        });

        // 流入元はページの固定設定を使う。申込者の入力やURLパラメータは混ぜない。
        var lpSource = String(config.lpSource || '').trim();
        if (lpSource) params.set('lpSource', lpSource);

        // 広告URLの識別子だけを許可形式で渡す。fbclid等や許可形式外の値は送らない。
        var query = new URLSearchParams((window.location && window.location.search) || '');
        var AD_TRACKING_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
        var adContent = query.get('utm_content') || '';
        var adPlacement = query.get('utm_term') || '';
        if (AD_TRACKING_PATTERN.test(adContent)) params.set('adContent', adContent);
        if (AD_TRACKING_PATTERN.test(adPlacement)) params.set('adPlacement', adPlacement);

        if (navigator.sendBeacon && navigator.sendBeacon(recordEndpoint, params)) return;

        window.fetch(recordEndpoint, {
          method: 'POST',
          mode: 'no-cors',
          body: params,
          keepalive: true
        });
      } catch (e) {}
    });
  }());
}());
