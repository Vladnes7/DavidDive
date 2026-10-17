/* Атмосфера «Погружения»: преломлённый заголовок под водой, лучи света,
   пузырьки и переходы по шкале глубины. Без зависимостей.
   Работает только с .mo на <html> (есть JS, движение не отключено). */
(function () {
  'use strict';

  var root = document.documentElement;
  if (!root.classList.contains('mo')) return;

  var hero = document.querySelector('.hero');
  var wave = document.querySelector('.wave');
  if (!hero || !wave) return;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  var vh = window.innerHeight, vw = root.clientWidth, pin = 0, dive = 1;

  /* ------------------------------------------- заголовок под водой */
  // Копия неба с надписью; dive.js открывает её снизу ровно на столько,
  // на сколько вода закрыла оригинал. Для скринридеров её нет.
  var sky = hero.querySelector('.hero__sky');
  var sea = sky.cloneNode(true);
  sea.classList.add('hero__sea');
  sea.setAttribute('aria-hidden', 'true');
  sea.removeAttribute('style');
  var h1 = sea.querySelector('h1');
  if (h1) { var d = document.createElement('div'); d.className = h1.className; d.innerHTML = h1.innerHTML; h1.replaceWith(d); }
  sky.parentNode.insertBefore(sea, sky.nextSibling);

  // фильтр «рябь»: шум сдвигает пиксели, частота шума медленно дышит
  var defs = document.createElement('div');
  defs.className = 'fx-defs';
  defs.innerHTML =
    '<svg aria-hidden="true" focusable="false"><filter id="refract" x="-5%" y="-20%" width="110%" height="140%">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.008 0.07" numOctaves="2" seed="3" result="n">' +
    '<animate attributeName="baseFrequency" dur="7s" values="0.008 0.07;0.011 0.05;0.008 0.07" repeatCount="indefinite"/></feTurbulence>' +
    '<feDisplacementMap in="SourceGraphic" in2="n" scale="12" xChannelSelector="R" yChannelSelector="G"/>' +
    '</filter></svg>';
  document.body.appendChild(defs);

  /* ------------------------------------------- лучи и пузырьки */
  var main = document.querySelector('main');
  var rays = document.createElement('div');
  rays.className = 'fx-rays'; rays.setAttribute('aria-hidden', 'true');
  var cv = document.createElement('canvas');
  cv.className = 'fx-bubbles'; cv.setAttribute('aria-hidden', 'true');
  main.parentNode.insertBefore(rays, main);
  main.parentNode.insertBefore(cv, main);
  var ctx = cv.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  var bubbles = [];

  function seed(b, anywhere) {
    // мелких много, крупных мало — как у настоящего выдоха
    var big = Math.random() < .12;
    b.r = big ? 4 + Math.random() * 5 : 1.2 + Math.random() * 2.6;
    b.x = Math.random() * vw;
    b.y = anywhere ? Math.random() * vh : vh + 20 + Math.random() * 120;
    b.v = 18 + b.r * 7 + Math.random() * 20;       // крупные всплывают быстрее
    b.a = 6 + Math.random() * 14;                  // размах покачивания
    b.f = .6 + Math.random() * 1.2;
    b.p = Math.random() * 6.28;
    b.k = .25 + b.r / 12;                          // насколько пузырь «ближе» и сильнее реагирует на скролл
    return b;
  }
  function size() {
    vh = window.innerHeight; vw = root.clientWidth;
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.round(clamp(vw / 32, 14, 44));
    while (bubbles.length < n) bubbles.push(seed({}, true));
    bubbles.length = n;
    pin = parseFloat(getComputedStyle(hero).getPropertyValue('--pin')) || 0;
    dive = Math.max(1, wave.getBoundingClientRect().top + window.pageYOffset - vh);
  }

  var lastS = window.pageYOffset, lastT = 0, running = false, alpha = 0;
  function frame(t) {
    var dt = Math.min(.05, lastT ? (t - lastT) / 1000 : .016); lastT = t;
    var s = window.pageYOffset, ds = s - lastS; lastS = s;

    // под водой — от линии горизонта до волны в конце
    var under = clamp((s - pin * .7) / (vh * .5), 0, 1) * (1 - clamp((s - dive) / (vh * .6), 0, 1));
    alpha += (under - alpha) * .12;
    cv.style.opacity = alpha.toFixed(3);
    // лучи сильнее всего у поверхности и гаснут к трети глубины
    var shallow = clamp((s - pin * .5) / (vh * .4), 0, 1) * (1 - clamp((s - pin) / ((dive - pin) * .35 || 1), 0, 1));
    rays.style.opacity = shallow.toFixed(3);

    ctx.clearRect(0, 0, vw, vh);
    if (alpha > .01) {
      for (var i = 0; i < bubbles.length; i++) {
        var b = bubbles[i];
        b.y -= b.v * dt + ds * b.k;    // скролл вниз — пузыри быстрее уходят вверх
        b.p += b.f * dt;
        if (b.y < -30 || b.y > vh + 160) seed(b, false);
        var x = b.x + Math.sin(b.p) * b.a;
        ctx.beginPath();
        ctx.arc(x, b.y, b.r, 0, 6.2832);
        ctx.strokeStyle = 'rgba(214,236,255,' + (.25 + b.r / 18).toFixed(2) + ')';
        ctx.lineWidth = b.r > 4 ? 1.2 : .9;
        ctx.stroke();
        ctx.fillStyle = 'rgba(214,236,255,.08)';
        ctx.fill();
        if (b.r > 2.5) {   // блик
          ctx.beginPath();
          ctx.arc(x - b.r * .35, b.y - b.r * .35, b.r * .28, 0, 6.2832);
          ctx.fillStyle = 'rgba(255,255,255,.55)';
          ctx.fill();
        }
      }
    }
    // крутимся, пока пузыри видны или вот-вот станут видны
    if (alpha > .01 || under > .01 || shallow > 0) requestAnimationFrame(frame);
    else { running = false; lastT = 0; }
  }
  function wake() { if (!running && !document.hidden) { running = true; requestAnimationFrame(frame); } }

  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', function () { if (root.clientWidth !== vw) { size(); wake(); } });
  window.addEventListener('load', function () { size(); wake(); });
  document.addEventListener('visibilitychange', wake);
  if ('ResizeObserver' in window) new ResizeObserver(function () { size(); }).observe(main);
  size(); wake();

  /* ------------------------------------------- переходы по шкале глубины */
  Array.prototype.forEach.call(document.querySelectorAll('.gauge__tick'), function (t) {
    t.addEventListener('click', function () {
      var frac = parseFloat(t.style.top) / 100 || 0;
      window.scrollTo({ top: Math.round(pin + frac * (dive - pin)) + 2, behavior: 'smooth' });
    });
  });
})();
