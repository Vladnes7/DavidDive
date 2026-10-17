/* Сцена «волна»: ролик проматывается скроллом, на последних кадрах
   проявляется призыв записаться. Без зависимостей, как и весь сайт. */
(function () {
  'use strict';

  var scene = document.querySelector('.wave');
  if (!scene || !window.CSS || !CSS.supports('position', 'sticky') || !window.fetch) return;

  var stage = scene.querySelector('.wave__stage');
  var video = scene.querySelector('.wave__video');
  var copy = scene.querySelector('.wave__copy');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches) return;

  var target = 0, smooth = 0, frame = 0, live = false, loading = false;

  function clamp(v) { return Math.max(0, Math.min(1, v)); }

  // Текст привязан к реально показанному кадру, а не к скроллу:
  // если видео не успевает за пальцем, надпись не опережает волну.
  function paint() {
    if (!live || video.readyState < 2 || !video.duration) return;
    var p = video.currentTime / video.duration;
    var shown = clamp((p - .6) / .2);
    scene.style.setProperty('--wave-copy', shown.toFixed(3));
    scene.style.setProperty('--wave-tint', clamp((p - .35) / .4).toFixed(3));
    scene.style.setProperty('--wave-seam', (1 - clamp(p / .3)).toFixed(3));
    copy.classList.toggle('is-on', shown > .6);
  }

  function seek() {
    frame = 0;
    if (!live || video.readyState < 2 || video.seeking || !isFinite(video.duration)) return;
    // ролик догоняет скролл с мягкой инерцией, а не дёргается за колесом
    smooth += (target - smooth) * .22;
    if (Math.abs(target - smooth) < .002) smooth = target;
    var time = smooth * Math.max(0, video.duration - 1 / 30);
    if (Math.abs(video.currentTime - time) < 1 / 60) { paint(); if (smooth !== target) request(); return; }
    try { video.currentTime = time; } catch (e) { /* повторим на seeked */ }
  }

  function request() { if (live && !frame) frame = requestAnimationFrame(seek); }

  function measure() {
    var travel = scene.offsetHeight - stage.offsetHeight;
    target = clamp(travel > 0 ? -scene.getBoundingClientRect().top / travel : 0);
    request();
  }

  function stop() {
    live = false;
    scene.classList.remove('is-live');
    copy.classList.remove('is-on');
    window.removeEventListener('scroll', measure);
    window.removeEventListener('resize', measure);
  }

  function start(url) {
    video.muted = true;
    video.src = url;
    video.addEventListener('error', stop);
    ['loadeddata', 'canplay', 'seeked'].forEach(function (name) {
      video.addEventListener(name, function () { paint(); request(); });
    });
    video.addEventListener('loadeddata', function () {
      // Сцену включаем только с готовым первым кадром: до этого
      // на странице остаётся статичный вариант, без пустого экрана.
      live = true;
      scene.classList.add('is-live');
      // iOS не декодирует кадры по currentTime, пока видео ни разу не играло.
      var primed = video.play();
      if (primed && primed.then) primed.then(function () { video.pause(); measure(); }, function () {});
      measure();
    }, { once: true });
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    video.load();
  }

  // Ролик качаем целиком в память: перемотка тогда не зависит от того,
  // умеет ли хостинг отдавать видео кусками (HTTP Range).
  function load() {
    if (loading) return;
    loading = true;
    var small = window.matchMedia('(max-width: 700px)').matches;
    fetch(video.getAttribute(small ? 'data-src-m' : 'data-src'))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(function (blob) { start(URL.createObjectURL(blob)); })
      .catch(function () { /* остаётся статичный кадр с призывом */ });
  }

  // С клавиатуры кнопка не должна оставаться невидимой: доматываем сцену до конца.
  copy.addEventListener('focusin', function () {
    if (!live || copy.classList.contains('is-on')) return;
    var travel = scene.offsetHeight - stage.offsetHeight;
    window.scrollTo(0, window.pageYOffset + scene.getBoundingClientRect().top + travel);
  });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { io.disconnect(); load(); }
    }, { rootMargin: '200% 0px' });
    io.observe(scene);
  } else {
    load();
  }

  reduced.addEventListener && reduced.addEventListener('change', function () { if (reduced.matches) stop(); });
})();
