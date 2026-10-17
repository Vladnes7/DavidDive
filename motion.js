/* Движение и переходы основной версии. Без зависимостей.
   Работает, только если ранний скрипт поставил .mo на <html>
   (есть JS и не выбрано «уменьшить движение»). */
(function () {
  'use strict';

  var root = document.documentElement;
  if (!root.classList.contains('mo')) return;

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var vh = window.innerHeight, vw = root.clientWidth;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------------------------------------------- слова в заголовках */
  // Каждое слово — в маске; при появлении слова выезжают снизу по очереди.
  function splitWords(el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 1) { walk(n); return; }
        if (n.nodeType !== 3 || !n.textContent.trim()) return;
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span'); w.className = 'w';
          var inner = document.createElement('span'); inner.className = 'w__i';
          inner.style.setProperty('--i', i++);
          inner.textContent = part;
          w.appendChild(inner); frag.appendChild(w);
        });
        node.replaceChild(frag, n);
      });
    })(el);
  }

  // в демо у заголовка своя раскладка по строкам (span-ы), её не трогаем
  var heroH1 = root.classList.contains('js-dive') ? null : $('.hero .h1');
  if (heroH1) splitWords(heroH1);
  var h2s = $$('main .h2');
  h2s.forEach(splitWords);

  // Маска нужна только на время выезда: потом её снимаем, иначе она
  // подрезает хвосты курсива и букв «у», «р», «д».
  function showWords(el) {
    el.classList.add('is-words');
    setTimeout(function () { el.classList.add('is-shown'); }, 1100 + el.querySelectorAll('.w').length * 55);
  }

  /* ---------------------------------------------- заставка */
  var intro = $('#intro');
  function ready() {
    root.classList.add('is-ready');
    if (heroH1) showWords(heroH1);
  }
  if (intro && !root.classList.contains('mo-seen')) {
    try { sessionStorage.setItem('dd-intro', '1'); } catch (e) {}
    var started = Date.now();
    var lifted = false;
    var lift = function () {
      if (lifted) return;
      lifted = true;
      // заставка держится не меньше 1,5 с, чтобы логотип успел прочитаться
      setTimeout(function () {
        intro.classList.add('is-out');
        setTimeout(ready, 380);
        setTimeout(function () { intro.remove(); }, 1200);
      }, Math.max(0, 1500 - (Date.now() - started)));
    };
    var img = $('.hero__img');
    if (img && !img.complete) { img.addEventListener('load', lift, { once: true }); img.addEventListener('error', lift, { once: true }); setTimeout(lift, 2600); }
    else lift();
  } else {
    if (intro) intro.remove();
    requestAnimationFrame(function () { requestAnimationFrame(ready); });
  }

  /* ---------------------------------------------- появление групп */
  var groups = $$('.stats, .cards, .mkgrid, .geo, .faq, .program__list');
  groups.forEach(function (g) {
    g.classList.add('stagger');
    Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty('--i', i); });
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      if (el.classList.contains('h2')) showWords(el);
      if (el.classList.contains('stagger')) {
        el.classList.add('is-in');
        setTimeout(function () { el.classList.add('is-done'); }, 900 + el.children.length * 70);
        if (el.classList.contains('stats')) countUp(el);
      }
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  h2s.concat(groups).forEach(function (el) { io.observe(el); });

  // «1000+» набегает от нуля — только честные числа, год и звёзды не трогаем
  function countUp(box) {
    $$('.stat b', box).forEach(function (b) {
      var m = b.textContent.match(/^(\d{3,})\+$/);
      if (!m || +m[1] > 1900 && +m[1] < 2100) return;
      var end = +m[1], t0 = performance.now(), dur = 1600;
      (function tick(t) {
        var p = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 4);
        b.textContent = Math.round(end * e) + '+';
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }

  /* ---------------------------------------------- волны на стыках полос */
  var WAVE = 'M0 40C360 -10 1080 90 1440 40C1800 -10 2520 90 2880 40V80H0Z';
  var waves = [];
  $$('main > section').forEach(function (sec) {
    var prev = sec.previousElementSibling;
    if (!prev || prev.tagName !== 'SECTION') return;
    var bg = getComputedStyle(sec).backgroundColor;
    if (bg === getComputedStyle(prev).backgroundColor) return;
    var box = document.createElement('div');
    box.className = 'wv'; box.setAttribute('aria-hidden', 'true');
    box.style.setProperty('--wv', bg);
    box.innerHTML =
      '<svg viewBox="0 0 2880 80" preserveAspectRatio="none"><path d="' + WAVE + '"/></svg>' +
      '<svg viewBox="0 0 2880 80" preserveAspectRatio="none"><path d="' + WAVE + '"/></svg>';
    sec.insertBefore(box, sec.firstChild);
    var svgs = box.querySelectorAll('svg');
    waves.push({ box: box, a: svgs[0], b: svgs[1] });
  });

  /* ---------------------------------------------- шапка */
  var hdr = $('#hdr'), burger = $('#burger');

  /* ---------------------------------------------- «Как проходит» */
  var stepLists = $$('.how__steps');

  /* ---------------------------------------------- футер из-под страницы */
  var foot = $('.foot');
  function measureFoot() {
    // в демо страница прозрачная поверх фона-глубины — футер просвечивал бы насквозь
    document.body.classList.toggle('foot-reveal', !root.classList.contains('js-dive') && !!foot && foot.offsetHeight < vh * .85 && vw >= 700);
  }

  /* ---------------------------------------------- главный цикл скролла */
  // в демо «Погружение» первым экраном и фоном управляет dive.js
  var dive = root.classList.contains('js-dive');
  var hero = dive ? null : $('.hero'), heroImg = $('.hero__img'), heroIn = $('.hero__in');
  var lastY = window.pageYOffset, vel = 0, frame = 0, mx = 0, my = 0, px = 0, py = 0;
  var rows = $$('.marquee__row'), mqAnims = null;

  function update() {
    frame = 0;
    var y = window.pageYOffset;
    var dy = y - lastY; lastY = y;
    vel += (dy - vel) * .2;

    // первый экран уходит под следующий блок
    if (hero) {
      var p = clamp(y / vh, 0, 1);
      if (p < 1 || hero._p !== 1) {
        hero._p = p;
        hero.style.transform = p ? 'scale(' + (1 - p * .07).toFixed(4) + ')' : '';
        hero.style.clipPath = p ? 'inset(0 round ' + (p * 44).toFixed(1) + 'px)' : '';
        hero.style.setProperty('--dim', (p * .55).toFixed(3));
        heroIn.style.transform = 'translate3d(0,' + (-p * 90).toFixed(1) + 'px,0)';
        heroIn.style.opacity = (1 - p * 1.3).toFixed(3);
      }
    }

    // шапка прячется при скролле вниз и возвращается при скролле вверх
    var menuOpen = burger && burger.getAttribute('aria-expanded') === 'true';
    if (Math.abs(dy) > 3 && !menuOpen && !hdr.contains(document.activeElement)) {
      hdr.classList.toggle('is-hidden', dy > 0 && y > vh * .9);
    }
    if (y < vh * .5) hdr.classList.remove('is-hidden');

    // волны плывут со скроллом, ближняя быстрее дальней
    for (var i = 0; i < waves.length; i++) {
      var w = waves[i], r = w.box.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) continue;
      var half = w.box.offsetWidth;
      w.a.style.transform = 'translate3d(' + (-((y * .35) % half)).toFixed(1) + 'px,0,0)';
      w.b.style.transform = 'translate3d(' + (-((half * .5 + y * .2) % half)).toFixed(1) + 'px,0,0)';
    }

    // нить «Как проходит» и номера шагов
    stepLists.forEach(function (ol) {
      var r = ol.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var line = vh * .62;
      var q = clamp((line - r.top) / r.height, 0, 1);
      ol.style.setProperty('--p', q.toFixed(4));
      var lis = ol.children, now = null;
      for (var k = 0; k < lis.length; k++) {
        var done = lis[k].getBoundingClientRect().top < line;
        lis[k].classList.toggle('is-done', done);
        if (done) now = lis[k];
        lis[k].classList.remove('is-now');
      }
      if (now && q < 1) now.classList.add('is-now');
    });

    // лента отзывов ускоряется от быстрого скролла и плавно успокаивается
    if (rows.length) {
      if (!mqAnims) mqAnims = rows.map(function (r) { return r.getAnimations ? r.getAnimations()[0] : null; });
      var rate = 1 + Math.min(Math.abs(vel) / 14, 5);
      mqAnims.forEach(function (a) { if (a) a.playbackRate = rate; });
    }

    // фото на первом экране чуть следует за курсором
    if (fine && heroImg && y < vh) {
      px += (mx - px) * .06; py += (my - py) * .06;
      heroImg.style.transform = 'translate3d(' + (px * -14).toFixed(2) + 'px,' + (py * -10).toFixed(2) + 'px,0)';
    }

    // пока что-то ещё движется по инерции — следующий кадр
    if (Math.abs(vel) > .05 || (fine && y < vh && (Math.abs(mx - px) > .002 || Math.abs(my - py) > .002))) request();
  }
  function request() { if (!frame) frame = requestAnimationFrame(update); }

  window.addEventListener('scroll', request, { passive: true });
  if (fine) window.addEventListener('pointermove', function (e) {
    mx = e.clientX / vw - .5; my = e.clientY / vh - .5;
    if (window.pageYOffset < vh) request();
  }, { passive: true });

  function layout() {
    vh = window.innerHeight; vw = root.clientWidth;
    measureFoot();
    request();
  }
  var lastVW = vw;
  window.addEventListener('resize', function () {
    // на телефоне адресная строка шлёт resize при каждом скролле — ширина не меняется
    if (root.clientWidth !== lastVW || !('ontouchstart' in window)) { lastVW = root.clientWidth; layout(); }
  });
  window.addEventListener('load', layout);
  // раскрытая карточка рэка, FAQ и т. п. меняют высоту страницы
  if ('ResizeObserver' in window) new ResizeObserver(function () { measureFoot(); request(); }).observe(document.body);
  layout();

  /* ---------------------------------------------- курсор: подсветка и магнит */
  if (fine) {
    $$('.card, .mkc, .stat, .geo__i, .disc, .sidebox').forEach(function (el) { el.classList.add('spot'); });
    document.addEventListener('pointermove', function (e) {
      var el = e.target.closest && e.target.closest('.spot');
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });

    $$('.hero .btn, #contact .btn--primary, .hdr__cta, .bridge .btn, .lost__head .btn').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) / r.width, y = (e.clientY - r.top - r.height / 2) / r.height;
        b.classList.add('is-mag');
        b.style.translate = (x * 12).toFixed(1) + 'px ' + (y * 10).toFixed(1) + 'px';
      });
      b.addEventListener('pointerleave', function () { b.classList.remove('is-mag'); b.style.translate = ''; });
    });
  }
})();
