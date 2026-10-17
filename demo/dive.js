/* «Погружение»: закреплённый фон едет по прогрессу скролла, первый экран
   уходит под воду, сбоку шкала глубины. Без зависимостей. */
(function () {
  'use strict';

  var bg = document.querySelector('.dive-bg');
  var wave = document.querySelector('.wave');
  var hero = document.querySelector('.hero');
  if (!bg || !wave || !hero) return;

  var track = bg.querySelector('.dive-bg__track');
  var tiles = track.children;
  var sky = hero.querySelector('.hero__sky:not(.hero__sea)');
  var sea = hero.querySelector('.hero__sea');
  var gauge = document.querySelector('.gauge');
  var mark = gauge.querySelector('.gauge__mark');
  var read = gauge.querySelector('.gauge__read');
  var num = gauge.querySelector('.gauge__num');
  var ticks = gauge.querySelectorAll('.gauge__tick');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Геометрия исходника 1200×15956: верхняя плитка 1200×1200, ниже семь по 2108.
  var REST = 7 * 2108 / 1200;   // высота глубинной части в долях ширины
  var HORIZON = 497 / 1200;     // линия горизонта в долях ширины
  var MAX_DEPTH = 20;           // рэк «Перванш», самое глубокое погружение на сайте

  var W = 0, pin = 0, travel = 0, dive = 1, rate = 1, lineH = 0, frame = 0, lastW = 0, lastH = 0, shown = '';

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function layout() {
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight;
    var still = reduced.matches;

    // Фон не уже экрана, а горизонт не выше середины: иначе на телефоне
    // небу достаётся узкая полоска и заголовку негде встать.
    W = Math.max(vw, Math.round(vh * 1.16));
    var horizon = W * HORIZON;

    // Первый экран закреплён, пока вода не накроет заголовок целиком.
    pin = still ? 0 : Math.round(horizon * .64);
    hero.style.setProperty('--pin', pin + 'px');
    hero.style.setProperty('--horizon', Math.round(horizon) + 'px');

    // Погружение длится до момента, когда волна показывается снизу экрана.
    dive = Math.max(1, wave.getBoundingClientRect().top + window.pageYOffset - vh);

    // Ниже первого экрана фон идёт медленнее текста (около 0,7 его скорости).
    // Под это глубинная часть слегка сжимается или растягивается по высоте:
    // на тёмной воде и рифе это незаметно, а небо остаётся в своих пропорциях.
    var want = still ? 1 : .7;
    var bgH = bg.offsetHeight;
    var stretch = clamp((pin + want * (dive - pin) + bgH - W) / (W * REST), .55, 1.3);

    track.style.width = W + 'px';
    tiles[0].style.height = W + 'px';
    for (var i = 1; i < tiles.length; i++) tiles[i].style.height = Math.ceil(W * 2108 / 1200 * stretch) + 'px';

    travel = Math.max(0, track.offsetHeight - bgH);
    rate = dive > pin ? (travel - pin) / (dive - pin) : 0;
    lineH = gauge.offsetHeight;
    lastW = vw; lastH = document.documentElement.scrollHeight;
    update();
  }

  function update() {
    frame = 0;
    var s = window.pageYOffset;
    var y = clamp(s <= pin ? s : pin + (s - pin) * rate, 0, travel);
    var shift = 'translate3d(-50%,' + (-y).toFixed(1) + 'px,0)';
    track.style.transform = shift;
    // Заголовок обрезается по линии горизонта. Пока экран закреплён, линия
    // поднимается на величину сдвига фона; после открепления экран уезжает
    // вверх сам, и из сдвига вычитается его собственный ход.
    if (s < pin + window.innerHeight) {
      var hidden = Math.max(0, y - Math.max(0, s - pin));
      sky.style.clipPath = sky.style.webkitClipPath = 'inset(-60px -60px ' + hidden.toFixed(1) + 'px -60px)';
      // преломлённая копия (fx.js) видна ровно там, где оригинал ушёл под воду
      if (sea) sea.style.clipPath = sea.style.webkitClipPath = 'inset(calc(100% - ' + hidden.toFixed(1) + 'px) -60px -200px -60px)';
    }

    var p = clamp((s - pin) / (dive - pin), 0, 1);
    // отметка и плашка с цифрой двигаются каждая своим transform
    mark.style.transform = read.style.transform = 'translate3d(0,' + (p * lineH).toFixed(1) + 'px,0)';
    var text = (p * MAX_DEPTH).toFixed(1).replace('.', ',');
    if (text !== shown) { num.textContent = shown = text; }
    for (var i = 0; i < ticks.length; i++) {
      ticks[i].classList.toggle('is-near', Math.abs(i / (ticks.length - 1) - p) < .07);
    }
    // шкала нужна только под водой: до горизонта и после всплытия её нет
    gauge.classList.toggle('is-on', s > pin && s < dive + window.innerHeight * .35);
  }

  function request() { if (!frame) frame = requestAnimationFrame(update); }

  // На телефоне адресная строка прячется при скролле и шлёт resize:
  // пересчитываем, только если изменилась ширина или высота страницы.
  function relayout() {
    var vw = document.documentElement.clientWidth;
    if (vw !== lastW || Math.abs(document.documentElement.scrollHeight - lastH) > 4) layout();
  }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', relayout);
  window.addEventListener('load', layout);
  if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(document.querySelector('main'));
  reduced.addEventListener && reduced.addEventListener('change', layout);
  layout();
})();
