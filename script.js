/* ==========================================================================
   Diving David — поведение страницы. Без зависимостей.
   ========================================================================== */
(function () {
  'use strict';

  /* Номер для wa.me — только цифры, без + и пробелов. */
  var PHONE = '79262150886';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var hdr  = $('#hdr');
  var dock = $('#dock');
  var hero = $('#hero');

  /* ------------------------------------------------------- мобильное меню */
  var burger = $('#burger');
  var menu = $('#menu');

  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', function () {
    setMenu(burger.getAttribute('aria-expanded') !== 'true');
  });
  $$('a', menu).forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      burger.focus();
    }
  });
  var wide = window.matchMedia('(min-width: 980px)');
  function onWide(e) { if (e.matches) setMenu(false); }
  wide.addEventListener ? wide.addEventListener('change', onWide) : wide.addListener(onWide);

  /* ------------------------------- бегущая лента: клонируем карточки в дубль
     Второй ряд — точная копия первого, иначе на стыке петли будет разрыв. */
  var mq = $('#marquee');
  if (mq) {
    var rows = $$('.marquee__row', mq);
    if (rows.length === 2 && !rows[1].children.length) {
      rows[1].innerHTML = rows[0].innerHTML;
      /* дубль — чисто визуальный, из дерева доступности убираем */
      $$('[id]', rows[1]).forEach(function (el) { el.removeAttribute('id'); });
    }
    /* длительность пропорциональна числу карточек, чтобы скорость не прыгала */
    var n = rows[0].children.length || 1;
    mq.style.setProperty('--dur', (n * 11) + 's');
  }

  /* --------------------------------------------------------- скролл-логика */
  var navLinks = $$('#nav a');
  var sections = $$('main > section[id]');
  var ticking = false;

  function inView(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.top < window.innerHeight * 0.75 && r.bottom > 0;
  }

  function onScroll() {
    var y = window.pageYOffset;

    hdr.classList.toggle('is-stuck', y > 20);

    if (dock) {
      var pastHero = y > (hero ? hero.offsetHeight * 0.7 : 500);
      dock.classList.toggle('is-on', pastHero && !inView($('#contact')));
    }

    var line = y + window.innerHeight * 0.4;
    var cur = null;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].offsetTop <= line) cur = sections[i];
    }
    if (cur && cur.id) {
      navLinks.forEach(function (a) {
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + cur.id);
      });
    }
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------- появление */
  var rises = $$('.rise');
  if (reduced.matches || !('IntersectionObserver' in window)) {
    rises.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    rises.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------------- форма */
  var form  = $('#form');
  var nameI = $('#f-name');
  var errN  = $('#e-name');

  function clearErr() {
    nameI.closest('.field').classList.remove('field--bad');
    nameI.removeAttribute('aria-invalid');
    errN.textContent = '';
  }
  nameI.addEventListener('input', clearErr);

  function buildText() {
    var lines = [
      'Здравствуйте, Давид! Заявка с сайта.',
      '',
      'Имя: ' + nameI.value.trim(),
      'Интересует: ' + $('#f-svc').value
    ];
    var date = $('#f-date').value.trim();
    var exp  = $('#f-exp').value.trim();
    var msg  = $('#f-msg').value.trim();
    if (date) lines.push('Когда удобно: ' + date);
    if (exp)  lines.push('Опыт: ' + exp);
    if (msg)  lines.push('', 'Вопрос: ' + msg);
    return lines.join('\n');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (nameI.value.trim().length < 2) {
      nameI.closest('.field').classList.add('field--bad');
      nameI.setAttribute('aria-invalid', 'true');
      errN.textContent = 'Напишите имя — так я пойму, к кому обращаться.';
      nameI.focus();
      return;
    }
    clearErr();

    window.open('https://wa.me/' + PHONE + '?text=' + encodeURIComponent(buildText()),
                '_blank', 'noopener');
  });

  /* Кнопка Telegram несёт тот же текст, если форма уже заполнена */
  var tgBtn = $('#tgBtn');
  tgBtn.addEventListener('click', function () {
    if (!nameI.value.trim()) return;
    tgBtn.setAttribute('href', 'https://t.me/DriverDM?text=' + encodeURIComponent(buildText()));
  });
})();
