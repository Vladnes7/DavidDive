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

  function menuOpen() { return burger.getAttribute('aria-expanded') === 'true'; }

  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    /* Меню закрывает собой всю страницу, поэтому и фокус должен жить внутри
       него: иначе с клавиатуры человек уходит на ссылки под тёмным экраном
       и жмёт то, чего не видит. */
    if (open) {
      var first = $('a', menu);
      if (first) first.focus();
    }
  }
  burger.addEventListener('click', function () { setMenu(!menuOpen()); });
  $$('a', menu).forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuOpen()) {
      setMenu(false);
      burger.focus();
    }
  });
  /* Tab по кругу: бургер → пункты меню → снова бургер. */
  menu.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !menuOpen()) return;
    var stops = [burger].concat($$('a', menu));
    var i = stops.indexOf(document.activeElement);
    if (i === -1) return;
    var next = e.shiftKey ? i - 1 : i + 1;
    if (next < 0) next = stops.length - 1;
    if (next >= stops.length) next = 0;
    e.preventDefault();
    stops[next].focus();
  });
  burger.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !menuOpen()) return;
    var links = $$('a', menu);
    if (!links.length) return;
    e.preventDefault();
    (e.shiftKey ? links[links.length - 1] : links[0]).focus();
  });
  /* Порог тот же, что в styles.css: на 1260 бургер сменяется меню в шапке. */
  var wide = window.matchMedia('(min-width: 1260px)');
  function onWide(e) { if (e.matches && menuOpen()) setMenu(false); }
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
      /* карточки отзыва — кнопки; в дубле они не должны ловить фокус табом */
      $$('button', rows[1]).forEach(function (el) { el.tabIndex = -1; });
    }
    /* длительность пропорциональна числу карточек, чтобы скорость не прыгала */
    var n = rows[0].children.length || 1;
    mq.style.setProperty('--dur', (n * 11) + 's');
  }

  /* Кнопка «Остановить / Продолжить». Ховер-пауза остаётся для мыши, но с
     телефона остановить ленту иначе нечем. */
  var mqBtn = $('#mqBtn');
  if (mqBtn && mq) {
    mqBtn.addEventListener('click', function () {
      var paused = mq.classList.toggle('is-paused');
      mqBtn.setAttribute('aria-pressed', String(paused));
      $('.mqbtn__t', mqBtn).textContent = paused ? 'Продолжить' : 'Остановить';
    });
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
        var on = a.getAttribute('href') === '#' + cur.id;
        a.classList.toggle('is-active', on);
        /* aria-current озвучивает скринридеру то же, что подсветка — глазу */
        if (on) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
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
    var qty  = $('#f-qty').value.trim();
    var gear = $$('#f-gear option:checked').map(function (o) { return o.textContent; });
    var date = $('#f-date').value.trim();
    var exp  = $('#f-exp').value.trim();
    var msg  = $('#f-msg').value.trim();
    if (qty && qty !== '1') lines.push('Сколько погружений: ' + qty);
    if (gear.length) lines.push('Аренда снаряжения: ' + gear.join(', '));
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

  /* Кнопка Telegram.
     Раньше сюда подставлялся «?text=...», но Телеграм этот параметр для
     личных аккаунтов игнорирует: чат открывался пустым, а текст заявки
     молча терялся. Поэтому текст кладём в буфер обмена и говорим об этом. */
  var tgBtn = $('#tgBtn');
  var tgHint = $('#tgHint');

  function hint(text) {
    if (!tgHint) return;
    tgHint.textContent = text;
    clearTimeout(hint.t);
    hint.t = setTimeout(function () { tgHint.textContent = ''; }, 6000);
  }

  tgBtn.addEventListener('click', function () {
    if (!nameI.value.trim()) return;
    var text = buildText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        hint('Текст заявки скопирован — вставьте его в чат.');
      }, function () {
        hint('Скопировать не вышло — напишите Давиду в чате пару слов о себе.');
      });
    } else {
      hint('Напишите Давиду в чате пару слов о себе — он ответит.');
    }
  });
})();

/* ------------------------------------------------- галерея: просмотр фото
   Фотография — настоящая <button>, просмотр — нативный <dialog>.
   showModal() сам даёт ловушку фокуса, Escape и инертный фон, поэтому
   руками остаются только перелистывание и свайп. Свайп добавлен сверх
   кнопок, а не вместо них: WCAG 2.2 требует, чтобы у жеста был
   альтернативный способ управления одним указателем. */
(function () {
  var dlg = document.getElementById('lb');
  var btns = [].slice.call(document.querySelectorAll('.gal__b'));
  if (!dlg || !btns.length) return;

  // без нативного <dialog> не притворяемся, что фото кликабельно
  if (typeof dlg.showModal !== 'function') {
    btns.forEach(function (b) { b.style.cursor = 'default'; });
    return;
  }

  var img = document.getElementById('lbImg');
  var num = document.getElementById('lbN');
  var prev = document.getElementById('lbP');
  var next = document.getElementById('lbNx');
  var close = document.getElementById('lbX');
  var stage = dlg.querySelector('.lb__stage');
  var idx = 0;
  var scrollY = 0;
  var shut = true;   // страховка от повторной уборки

  function srcOf(i) {
    var im = btns[i].querySelector('img');
    return { src: im.getAttribute('src'), alt: im.getAttribute('alt') || '' };
  }

  function paint() {
    var d = srcOf(idx);
    img.setAttribute('src', d.src);
    img.setAttribute('alt', d.alt);
    num.textContent = (idx + 1) + ' / ' + btns.length;
    // подгрузить соседей, чтобы листалось без паузы
    [idx - 1, idx + 1].forEach(function (j) {
      var k = (j + btns.length) % btns.length;
      new Image().src = srcOf(k).src;
    });
  }

  function step(d) {
    idx = (idx + d + btns.length) % btns.length;
    paint();
  }

  function open(i) {
    idx = i;
    paint();
    scrollY = window.scrollY;
    document.documentElement.style.overflow = 'hidden';
    shut = false;
    dlg.showModal();
  }

  /* Уборка после закрытия. Событие close ловит Escape и закрытие браузером,
     но когда close() вызван из нашего же обработчика клика, событие может
     не прийти — поэтому по своим путям закрытия уборка вызывается напрямую.
     Флаг shut делает её идемпотентной. */
  function tidy() {
    if (shut) return;
    shut = true;
    document.documentElement.style.overflow = '';
    window.scrollTo({ top: scrollY, behavior: 'instant' });
    img.removeAttribute('src');
    // вернуть фокус на ту карточку, на которой человек остановился
    btns[idx].focus({ preventScroll: true });
  }

  function hide() {
    if (dlg.open) dlg.close();
    tidy();
  }

  btns.forEach(function (b, i) {
    b.addEventListener('click', function () { open(i); });
  });

  prev.addEventListener('click', function () { step(-1); });
  next.addEventListener('click', function () { step(1); });
  close.addEventListener('click', hide);

  dlg.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    // Escape закрывает и сам, но уборку вызываем явно — не полагаемся на close
    else if (e.key === 'Escape') { hide(); }
  });

  dlg.addEventListener('cancel', tidy);

  // клик мимо фотографии закрывает просмотр
  stage.addEventListener('click', function (e) {
    if (e.target === stage) hide();
  });

  // свайп — в дополнение к кнопкам
  var tx = 0, ty = 0, tracking = false;
  stage.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { tracking = false; return; }
    tracking = true; tx = e.touches[0].clientX; ty = e.touches[0].clientY;
  }, { passive: true });

  stage.addEventListener('touchend', function (e) {
    if (!tracking) return;
    tracking = false;
    var t = e.changedTouches[0];
    var dx = t.clientX - tx, dy = t.clientY - ty;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.6) step(dx < 0 ? 1 : -1);
  }, { passive: true });

  dlg.addEventListener('close', tidy);
})();

/* ------------------------------------------------- отзывы: читать целиком
   Тот же приём, что у фотогалереи: каждая карточка — кнопка, просмотр —
   нативный <dialog>. Источник данных — только первый (живой) ряд ленты;
   дубль для бесшовной прокрутки визуальный и в опросе не участвует. */
(function () {
  var dlg = document.getElementById('revLb');
  var row = document.querySelector('#marquee .marquee__row');
  var btns = row ? [].slice.call(row.querySelectorAll('.rev__b')) : [];
  var cards = btns.map(function (b) { return b.closest('.rev'); });
  if (!dlg || !cards.length) return;

  if (typeof dlg.showModal !== 'function') {
    btns.forEach(function (b) { b.style.cursor = 'default'; });
    return;
  }

  var av = document.getElementById('revLbAv');
  var nm = document.getElementById('revLbN');
  var stars = document.getElementById('revLbStars');
  var quote = document.getElementById('revLbQ');
  var num = document.getElementById('revLbNum');
  var prev = document.getElementById('revLbP');
  var next = document.getElementById('revLbNx');
  var close = document.getElementById('revLbX');
  var stage = dlg.querySelector('.lb__stage');
  var idx = 0;
  var scrollY = 0;
  var shut = true;

  function dataOf(i) {
    var c = cards[i];
    var s = c.querySelector('.rev__stars');
    return {
      av: c.querySelector('.rev__av').textContent,
      name: c.querySelector('.rev__n').textContent,
      starsHtml: s.innerHTML,
      starsLabel: s.getAttribute('aria-label') || '',
      quote: c.querySelector('blockquote').textContent
    };
  }

  function paint() {
    var d = dataOf(idx);
    av.textContent = d.av;
    nm.textContent = d.name;
    stars.innerHTML = d.starsHtml;
    stars.setAttribute('aria-label', d.starsLabel);
    quote.textContent = d.quote;
    num.textContent = (idx + 1) + ' / ' + cards.length;
  }

  function step(d) {
    idx = (idx + d + cards.length) % cards.length;
    paint();
  }

  function open(i) {
    idx = i;
    paint();
    scrollY = window.scrollY;
    document.documentElement.style.overflow = 'hidden';
    shut = false;
    dlg.showModal();
  }

  function tidy() {
    if (shut) return;
    shut = true;
    document.documentElement.style.overflow = '';
    window.scrollTo({ top: scrollY, behavior: 'instant' });
    btns[idx].focus({ preventScroll: true });
  }

  function hide() {
    if (dlg.open) dlg.close();
    tidy();
  }

  btns.forEach(function (b, i) {
    b.addEventListener('click', function () { open(i); });
  });

  prev.addEventListener('click', function () { step(-1); });
  next.addEventListener('click', function () { step(1); });
  close.addEventListener('click', hide);

  dlg.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'Escape') { hide(); }
  });

  dlg.addEventListener('cancel', tidy);

  stage.addEventListener('click', function (e) {
    if (e.target === stage) hide();
  });

  var tx = 0, ty = 0, tracking = false;
  stage.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { tracking = false; return; }
    tracking = true; tx = e.touches[0].clientX; ty = e.touches[0].clientY;
  }, { passive: true });

  stage.addEventListener('touchend', function (e) {
    if (!tracking) return;
    tracking = false;
    var t = e.changedTouches[0];
    var dx = t.clientX - tx, dy = t.clientY - ty;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.6) step(dx < 0 ? 1 : -1);
  }, { passive: true });

  dlg.addEventListener('close', tidy);
})();

/* Кнопка «Заказать поиск» в «Потеряшках» сразу выбирает услугу в форме,
   чтобы человек не искал её в длинном списке. */
(function () {
  'use strict';
  var svc = document.getElementById('f-svc');
  if (!svc) return;
  Array.prototype.forEach.call(document.querySelectorAll('[data-svc]'), function (a) {
    a.addEventListener('click', function () { svc.value = a.getAttribute('data-svc'); });
  });
})();

/* «Потеряшки»: ролик открывается в вертикальном плеере размером с телефон
   (как Reels) — кнопку «во весь экран» убрали, чтобы видео не растягивалось.
   Листание — стрелками, клавишами и свайпом, как в фотогалерее. */
(function () {
  'use strict';
  var dlg = document.getElementById('vidLb');
  var items = Array.prototype.slice.call(document.querySelectorAll('.lost__i'));
  if (!dlg || !items.length || typeof dlg.showModal !== 'function') return;
  var vid = document.getElementById('vidEl');
  var num = document.getElementById('vidN');
  var stage = document.getElementById('vidStage');
  var cur = 0, opener = null;

  function show(i) {
    cur = (i + items.length) % items.length;
    var b = items[cur];
    vid.poster = b.getAttribute('data-poster');
    vid.src = b.getAttribute('data-video');
    vid.setAttribute('aria-label', b.getAttribute('aria-label').replace(/^Смотреть: /, ''));
    num.textContent = (cur + 1) + ' / ' + items.length;
    var p = vid.play();
    if (p && p.catch) p.catch(function () {});
  }
  function hide() { if (dlg.open) dlg.close(); }

  items.forEach(function (b, i) {
    b.addEventListener('click', function () { opener = b; dlg.showModal(); show(i); });
  });
  document.getElementById('vidX').addEventListener('click', hide);
  document.getElementById('vidP').addEventListener('click', function () { show(cur - 1); });
  document.getElementById('vidNx').addEventListener('click', function () { show(cur + 1); });
  dlg.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') show(cur - 1);
    else if (e.key === 'ArrowRight') show(cur + 1);
  });
  stage.addEventListener('click', function (e) { if (e.target === stage) hide(); });
  dlg.addEventListener('close', function () {
    vid.pause(); vid.removeAttribute('src'); vid.load();
    if (opener) opener.focus();
  });

  var tx = 0, ty = 0;
  stage.addEventListener('touchstart', function (e) {
    tx = e.touches[0].clientX; ty = e.touches[0].clientY;
  }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    var t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.6) show(cur + (dx < 0 ? 1 : -1));
  }, { passive: true });
})();
