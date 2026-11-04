/* LEOPARD Energy Honey: one script and one template for both product pages.
   You should not need to edit this file. Text, prices and photos live in /content/*.json. */
(function () {
  'use strict';

  var root = document.documentElement;
  var slug = root.getAttribute('data-product');
  var IMG = '../assets/img/';
  var SHEET_TIMEOUT_MS = 2500;
  var content = null;
  var lang = null;
  var observers = [];

  /* ---------- small helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { return null; }
  }
  function isFilled(v) { return !!v && v.indexOf('[') === -1; }
  function digits(v) { return String(v).replace(/[^\d]/g, ''); }

  function chooseLang() {
    var q = /[?&]lang=(en|ar)\b/.exec(location.search);
    if (q) return q[1];
    var saved = store('leopard-lang');
    if (saved === 'en' || saved === 'ar') return saved;
    var prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];
    return /^ar\b/i.test(prefs[0]) ? 'ar' : 'en';
  }

  /* ---------- artwork drawn in code ---------- */
  var HEX = '<svg class="hex" viewBox="0 0 20 22" aria-hidden="true"><path d="M10 1 19 6v10l-9 5-9-5V6z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
  var WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.400 1.300-2 1.400-.5.100-1.200.100-1.900-.100-.4-.100-1-.300-1.700-.600-3-1.300-5-4.300-5.100-4.500-.200-.200-1.200-1.600-1.200-3s.800-2.100 1-2.400c.300-.300.600-.400.800-.400h.600c.200 0 .400 0 .600.500l.800 2c.100.100.100.300 0 .500l-.300.500-.400.500c-.100.100-.300.300-.100.600.200.300.800 1.300 1.700 2.100 1.200 1 2.100 1.400 2.400 1.500.300.100.500.100.700-.100l.900-1.100c.200-.300.400-.200.700-.100l1.900.900c.300.100.500.200.500.300.100.100.100.700-.200 1.400z"/></svg>';
  var CHEV = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 3 7 7-7 7"/></svg>';
  var CHEV_BACK = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m13 3-7 7 7 7"/></svg>';
  var CLOSE = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 4 12 12M16 4 4 16"/></svg>';
  var HONEYCOMB = (function () {
    var cells = [[42, 30], [94, 30], [146, 30], [16, 75], [68, 75], [120, 75], [42, 120], [94, 120], [16, 165]];
    var d = cells.map(function (c) {
      var x = c[0], y = c[1];
      return 'M' + x + ' ' + (y - 30) + 'l26 15v30l-26 15-26-15v-30z';
    }).join('');
    return '<svg class="honeycomb" viewBox="-12 -2 190 200" aria-hidden="true"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
  })();
  function ribbon(cls) {
    return '<svg class="ribbon ' + cls + '" viewBox="0 0 1200 110" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs><linearGradient id="rg-' + cls + '" x1="0" x2="1"><stop offset="0" stop-color="#C9A063"/><stop offset=".55" stop-color="#E7C98F"/><stop offset="1" stop-color="#C9A063"/></linearGradient></defs>' +
      '<path d="M0 110C220 40 420 20 640 62s400 40 560-40v88z" fill="#5A2E16" opacity=".92"/>' +
      '<path d="M0 84C240 22 430 6 650 46s390 34 550-34v10C1040 90 860 92 650 56 430 18 240 34 0 96z" fill="url(#rg-' + cls + ')"/></svg>';
  }

  /* ---------- the one template ---------- */
  function ctaHtml(t) {
    return '<a class="cta" href="' + esc(whatsappLink(t)) + '" target="_blank" rel="noopener">' + WA + '<span>' + esc(t.labels.order) + '</span></a>';
  }
  function whatsappLink(t) {
    var n = content.contact.whatsapp;
    return 'https://wa.me/' + (isFilled(n) ? digits(n) : '') + '?text=' + encodeURIComponent(t.whatsappMessage);
  }
  function list(rows, fn) { return (rows || []).map(fn).join(''); }

  function slideHtml(g, i, t) {
    var cap = esc(g[lang]);
    if (!g.image) {
      return '<figure class="slide"><div class="placeholder">' + HEX + '<b>' + esc(t.photoNeeded) + '</b><span>' + cap + '</span></div></figure>';
    }
    return '<figure class="slide"><button class="slide-btn" type="button" data-open="' + i + '" aria-label="' + esc(t.labels.enlarge) + ': ' + cap + '">' +
      '<img src="' + esc(IMG + g.image) + '" alt="' + cap + '" loading="lazy" decoding="async"' +
      (g.w ? ' width="' + g.w + '" height="' + g.h + '"' : '') + '></button><figcaption>' + cap + '</figcaption></figure>';
  }

  function footLink(label, value, href) {
    var inner = '<small>' + esc(label) + '</small><bdi class="val">' + esc(value) + '</bdi>';
    return href ? '<li><a href="' + esc(href) + '" target="_blank" rel="noopener"><span>' + inner + '</span></a></li>'
      : '<li><span><span>' + inner + '</span></span></li>';
  }

  function template(t) {
    var c = content.contact, L = t.labels, other = t.otherProduct;
    var shots = content.gallery.filter(function (g) { return g.image; });
    var idx = 0;
    var slides = content.gallery.map(function (g) { return slideHtml(g, g.image ? idx++ : -1, t); }).join('');
    var isUrl = function (v) { return /^https?:\/\//.test(v || '') ? v : null; };

    return '' +
    '<header class="hero">' + HONEYCOMB + ribbon('hero-ribbon') +
      '<div class="lang-bar"><button class="lang-btn" type="button" id="lang" lang="' + (lang === 'ar' ? 'en' : 'ar') + '">' + (lang === 'ar' ? 'English' : 'العربية') + '</button></div>' +
      '<div class="hero-inner">' +
        '<div class="hero-copy">' +
          '<img class="logo reveal" src="' + IMG + 'logo.webp" width="300" height="345" alt="LEOPARD Energy Honey">' +
          '<h1 class="reveal"><span class="headline" style="display:block">' + esc(t.headline) + '</span><span class="product-name">' + esc(t.productName) + '</span></h1>' +
          '<div class="buy reveal hero-buy-lg"><div class="price-row"><bdi class="price">' + esc(t.price) + '</bdi><span class="price-note">' + esc(t.priceNote) + '</span></div><div id="hero-cta">' + ctaHtml(t) + '</div></div>' +
        '</div>' +
        '<div class="sachet-wrap reveal"><img class="sachet" src="' + esc(IMG + content.images.hero) + '" width="240" height="720" alt="' + esc(t.pageTitle) + '" fetchpriority="high"></div>' +
      '</div>' +
    '</header>' +

    '<main class="sections">' +
      '<section class="panel gallery reveal" aria-labelledby="h-gal"><h2 id="h-gal">' + esc(L.gallery) + '</h2>' +
        '<div class="gallery-nav"><button type="button" data-nav="-1" aria-label="' + esc(L.previous) + '">' + CHEV_BACK + '</button><button type="button" data-nav="1" aria-label="' + esc(L.next) + '">' + CHEV + '</button></div>' +
        '<div class="track" id="track" tabindex="0" role="group" aria-labelledby="h-gal">' + slides + '</div></section>' +

      '<section class="panel about reveal"><h2>' + esc(L.about) + '</h2><p>' + esc(t.about) + '</p>' +
        '<img class="about-art" src="' + IMG + 'leopard.webp" width="442" height="610" alt="" loading="lazy" decoding="async"></section>' +

      '<section class="panel reveal"><h2>' + esc(L.ingredients) + '</h2><ul class="items">' +
        list(t.ingredients, function (r) { return '<li>' + HEX + '<div><strong>' + esc(r.name) + '</strong>' + esc(r.note) + '</div></li>'; }) + '</ul></section>' +

      '<section class="panel reveal"><h2>' + esc(L.benefits) + '</h2><ul class="items">' +
        list(t.benefits, function (r) { return '<li>' + HEX + '<div><strong>' + esc(r.title) + '</strong>' + esc(r.text) + '</div></li>'; }) + '</ul></section>' +

      '<section class="panel reveal"><h2>' + esc(L.howTo) + '</h2><ol class="steps">' +
        list(t.howTo, function (s) { return '<li><span>' + esc(s) + '</span></li>'; }) + '</ol></section>' +

      '<section class="panel reveal"><h2>' + esc(L.details) + '</h2><dl class="details">' +
        list(t.details, function (r) { return '<div><dt>' + esc(r.label) + '</dt><dd><bdi>' + esc(r.value) + '</bdi></dd></div>'; }) + '</dl></section>' +

      '<section class="panel warnings reveal"><h2>' + esc(L.warnings) + '</h2><ul>' +
        list(t.warnings, function (w) { return '<li>' + esc(w) + '</li>'; }) + '</ul></section>' +
    '</main>' +

    ribbon('foot-ribbon') +
    '<footer><div class="foot-inner">' +
      '<div><span class="foot-title">' + esc(L.contact) + '</span><ul class="foot-links">' +
        footLink(L.whatsapp, c.whatsapp, isFilled(c.whatsapp) ? 'https://wa.me/' + digits(c.whatsapp) : null) +
        footLink(L.phone, c.phone, isFilled(c.phone) ? 'tel:' + c.phone.replace(/[^\d+]/g, '') : null) +
        footLink(L.instagram, isUrl(c.instagram) ? 'Instagram' : c.instagram, isUrl(c.instagram)) +
        footLink(L.facebook, isUrl(c.facebook) ? 'Facebook' : c.facebook, isUrl(c.facebook)) +
      '</ul></div>' +
      '<div><span class="foot-title">' + esc(L.alsoFrom) + '</span><a class="other" href="' + esc(other.url) + '"><span>' + esc(other.name) + '</span>' + CHEV + '</a></div>' +
    '</div></footer>' +

    '<div class="sticky" id="sticky">' + ctaHtml(t) + '</div>' +

    '<dialog class="lightbox" id="lb" aria-label="' + esc(L.gallery) + '">' +
      '<div class="lb-track" id="lb-track">' +
        shots.map(function (g) {
          return '<figure class="lb-slide"><img src="' + esc(IMG + g.image) + '" alt="' + esc(g[lang]) + '" loading="lazy"><figcaption>' + esc(g[lang]) + '</figcaption></figure>';
        }).join('') +
      '</div>' +
      '<button class="lb-btn lb-close" type="button" id="lb-close" aria-label="' + esc(L.close) + '">' + CLOSE + '</button>' +
      '<button class="lb-btn lb-prev" type="button" data-lb="-1" aria-label="' + esc(L.previous) + '">' + CHEV_BACK + '</button>' +
      '<button class="lb-btn lb-next" type="button" data-lb="1" aria-label="' + esc(L.next) + '">' + CHEV + '</button>' +
    '</dialog>';
  }

  /* ---------- behaviour ---------- */
  function centreSlide(track, el, smooth) {
    var t = track.getBoundingClientRect(), r = el.getBoundingClientRect();
    track.scrollBy({ left: (r.left + r.width / 2) - (t.left + t.width / 2), behavior: smooth ? 'smooth' : 'auto' });
  }
  function currentIndex(track) {
    var t = track.getBoundingClientRect(), mid = t.left + t.width / 2, best = 0, bestD = Infinity;
    Array.prototype.forEach.call(track.children, function (el, i) {
      var r = el.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }
  function step(track, dir) {
    var n = Math.max(0, Math.min(track.children.length - 1, currentIndex(track) + dir));
    centreSlide(track, track.children[n], true);
  }

  function wire() {
    observers.forEach(function (o) { o.disconnect(); });
    observers = [];

    document.getElementById('lang').addEventListener('click', function () {
      lang = lang === 'ar' ? 'en' : 'ar';
      store('leopard-lang', lang);
      paint();
    });

    /* fade-ins */
    var reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      var ro = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -6% 0px' });
      reveals.forEach(function (el) { ro.observe(el); });
      observers.push(ro);

      /* sticky order bar appears once the hero's button is off screen */
      var sticky = document.getElementById('sticky');
      var so = new IntersectionObserver(function (es) { sticky.classList.toggle('on', !es[0].isIntersecting); });
      so.observe(document.getElementById('hero-cta'));
      observers.push(so);
    } else {
      reveals.forEach(function (el) { el.classList.add('in'); });
    }

    /* gallery + lightbox */
    var track = document.getElementById('track');
    var lb = document.getElementById('lb');
    var lbTrack = document.getElementById('lb-track');
    track.addEventListener('click', function (e) {
      var b = e.target.closest('[data-open]');
      if (!b) return;
      if (lb.showModal) {
        lb.showModal();
        /* Load every enlarged photo first, and pause snapping, so loading can't shift the slide. */
        lbTrack.querySelectorAll('img').forEach(function (im) { im.loading = 'eager'; });
        lbTrack.style.scrollSnapType = 'none';
        centreSlide(lbTrack, lbTrack.children[+b.getAttribute('data-open')], false);
        setTimeout(function () { lbTrack.style.scrollSnapType = ''; }, 400);
      } else {
        window.open(b.querySelector('img').src, '_blank');
      }
    });
    document.querySelector('.gallery-nav').addEventListener('click', function (e) {
      var b = e.target.closest('[data-nav]');
      if (b) step(track, +b.getAttribute('data-nav'));
    });
    document.getElementById('lb-close').addEventListener('click', function () { lb.close(); });
    lb.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lb]');
      if (b) step(lbTrack, +b.getAttribute('data-lb'));
      else if (e.target.classList.contains('lb-slide')) lb.close();
    });
    lb.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var forward = (e.key === 'ArrowRight') === (root.dir !== 'rtl');
      step(lbTrack, forward ? 1 : -1);
    });
  }

  function paint() {
    var t = content[lang];
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = t.pageTitle;
    document.getElementById('app').innerHTML = template(t);
    wire();
  }

  /* ---------- optional Google Sheet: columns key, en, ar ---------- */
  function parseCsv(text) {
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') q = false;
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (ch !== '\r') cell += ch;
    }
    row.push(cell); rows.push(row);
    return rows;
  }
  function setPath(obj, path, value) {
    var parts = path.split('.'), o = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      if (o == null || typeof o[parts[i]] !== 'object') return;
      o = o[parts[i]];
    }
    if (parts[parts.length - 1] in o) o[parts[parts.length - 1]] = value;
  }
  function applySheet(rows) {
    rows.slice(1).forEach(function (r) {
      var key = (r[0] || '').trim();
      if (!key) return;
      if (key.indexOf('contact.') === 0) { if (r[1]) setPath(content, key, r[1].trim()); return; }
      if (r[1]) setPath(content.en, key, r[1].trim());
      if (r[2]) setPath(content.ar, key, r[2].trim());
    });
  }
  function loadSheet(url) {
    if (!url || !window.fetch) return;
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = ctl && setTimeout(function () { ctl.abort(); }, SHEET_TIMEOUT_MS);
    fetch(url, ctl ? { signal: ctl.signal } : {})
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (txt) {
        var rows = parseCsv(txt);
        if ((rows[0][0] || '').trim().toLowerCase() !== 'key') throw new Error('not a key/en/ar sheet');
        applySheet(rows);
        paint();
      })
      .catch(function () { /* the JSON version is already showing, so nothing to do */ })
      .then(function () { clearTimeout(timer); });
  }

  /* ---------- start ---------- */
  function fail() {
    var saved = store('leopard-good-' + slug);
    if (saved) { try { start(JSON.parse(saved)); return; } catch (e) { /* fall through */ } }
    document.getElementById('app').innerHTML =
      '<p class="notice"><img src="' + IMG + 'logo.webp" alt="LEOPARD Energy Honey" width="150" style="margin:0 auto 16px">' +
      'Product details are being updated. Please try again in a minute.<br><span lang="ar" dir="rtl">يتم تحديث تفاصيل المنتج. يرجى المحاولة مرة أخرى بعد دقيقة.</span></p>';
  }
  function start(data) {
    content = data;
    lang = chooseLang();
    paint();
    loadSheet(content.googleSheetCsvUrl);
  }
  fetch('../content/' + slug + '.json')
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (txt) {
      var data = JSON.parse(txt);
      store('leopard-good-' + slug, txt);
      start(data);
    })
    .catch(fail);
})();
