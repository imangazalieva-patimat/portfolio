/* ==========================================================================
   main.js — общий скрипт всех страниц

   Каждый блок — отдельная функция init*, она сама проверяет, есть ли на
   странице нужная разметка, и молча выходит, если её нет. Поэтому один файл
   подключается и к главной, и к кейсам, и к политике.

   Содержание:
     1.  Помощники: готовность документа, наблюдатель появления
     2.  Прелоадер
     3.  Шапка: въезд и подсветка активного пункта
     4.  Появление блоков по скроллу ([data-animate])
     5.  Блок «Обо мне»: падение карточек
     6.  Навыки: появление карточек
     7.  Навыки на телефоне: вкладки
     8.  Мобильное меню
     9.  Параллакс первого экрана
     10. Галерея «Посмотреть ещё»
     11. Переход по якорю с другой страницы
     12. Карточка проекта кликабельна целиком
     13. Курсор-след
     14. Плашка о cookies
   ========================================================================== */

(function () {
  'use strict';

  /* ========================================================================
     1. Помощники
     ======================================================================== */

  /* Запускает fn, когда разметка готова (скрипт подключён в конце body,
     но на всякий случай учитываем и состояние loading) */
  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  /* Следит за элементами и один раз вызывает onShow(el), когда элемент
     появляется на экране. Без поддержки IntersectionObserver показывает
     всё сразу — блоки не должны остаться невидимыми. */
  function revealOnScroll(elements, onShow, options) {
    var items = [].slice.call(elements);
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
      items.forEach(onShow);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        onShow(entry.target);
      });
    }, options);

    items.forEach(function (el) { io.observe(el); });
  }

  /* Блок инициализируется один раз: разметка шапки и навыков есть на всех
     страницах, а скрипт может быть подключён повторно */
  function claim(el, flag) {
    if (!el || el.dataset[flag]) return false;
    el.dataset[flag] = '1';
    return true;
  }

  /* ========================================================================
     2. Прелоадер — рисуется росчерк, затем экран уходит вверх

     Тайминги связаны со стилями блока PRELOADER в css/style.css.
     Когда экран ушёл, страница получает событие preloader:done — его ждут
     плашка о cookies и переход по якорю.
     ======================================================================== */

  function initPreloader() {
    var preloader = document.getElementById('preloader');
    var path = document.getElementById('pl-path');
    var dot = document.getElementById('pl-dot');
    if (!preloader || !path || !dot) return;

    var DRAW_START = 150;     /* пауза перед рисованием росчерка */
    var DRAW_TIME = 1500;     /* столько рисуется росчерк */
    var SLIDE_START = 2100;   /* когда экран уезжает вверх */
    var SLIDE_TIME = 900;     /* длительность ухода, как в CSS */

    /* Росчерк рисуется через strokeDashoffset, поэтому нужна точная длина */
    var length = path.getTotalLength();
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;
    path.getBoundingClientRect();   /* принудительный пересчёт: без него переход не стартует */

    requestAnimationFrame(function () {
      dot.classList.add('go');

      setTimeout(function () {
        path.style.transition = 'stroke-dashoffset ' + (DRAW_TIME / 1000) + 's cubic-bezier(.4,0,.2,1)';
        path.style.strokeDashoffset = '0';
      }, DRAW_START);

      setTimeout(function () {
        preloader.classList.add('slide-up');
        setTimeout(function () {
          preloader.remove();
          document.dispatchEvent(new CustomEvent('preloader:done'));
        }, SLIDE_TIME);
      }, SLIDE_START);
    });
  }

  /* ========================================================================
     3. Шапка: въезд логотипа и меню, подсветка активного пункта
     ======================================================================== */

  function initNav() {
    var nav = document.querySelector('.pd-nav');
    if (!claim(nav, 'pdInit')) return;

    /* Два кадра подряд: браузер должен увидеть начальное состояние,
       иначе переход не проигрывается */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { nav.classList.add('pd-in'); });
    });

    onReady(function () { initNavSpy(nav); });
  }

  function initNavSpy(nav) {
    var LINE_OFFSET = 40;     /* граница переключения — чуть ниже шапки */
    var BOTTOM_GAP = 20;      /* «долистали до конца» с запасом на округления */

    var links = [].slice.call(nav.querySelectorAll('.pd-nav__link'));
    var targets = links.map(function (link) {
      var id = (link.getAttribute('href') || '').replace('#', '');
      var section = id && document.getElementById(id);
      return section ? { link: link, section: section } : null;
    }).filter(Boolean);

    if (!targets.length) return;

    /* Позиция секции от верха документа, а не от родителя */
    function docTop(el) {
      return el.getBoundingClientRect().top + window.scrollY;
    }

    function setActive(activeLink) {
      links.forEach(function (link) {
        link.classList.toggle('is-active', link === activeLink);
      });
    }

    function update() {
      var atBottom = window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - BOTTOM_GAP;
      if (atBottom) {
        setActive(links[links.length - 1]);
        return;
      }

      /* На первом экране не подсвечиваем ничего — ждём второй блок */
      var secondBlock = document.getElementById('about-inner');
      if (secondBlock && window.scrollY + nav.offsetHeight < docTop(secondBlock) - BOTTOM_GAP) {
        setActive(null);
        return;
      }

      var line = window.scrollY + nav.offsetHeight + LINE_OFFSET;
      var current = null;
      targets.forEach(function (target) {
        if (docTop(target.section) <= line) current = target.link;
      });
      setActive(current);
    }

    onScroll(update);
    update();
  }

  /* Обработчик скролла, который срабатывает не чаще одного кадра */
  function onScroll(handler) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        handler();
      });
    }, { passive: true });
  }

  /* ========================================================================
     4. Появление блоков по скроллу — [data-animate]
     ======================================================================== */

  function initScrollReveal() {
    revealOnScroll(
      document.querySelectorAll('[data-animate]'),
      function (el) { el.classList.add('in-view'); },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    /* Первый экран виден сразу — показываем без ожидания наблюдателя */
    document.querySelectorAll('.hero [data-animate]').forEach(function (el) {
      el.classList.add('in-view');
    });
  }

  /* ========================================================================
     5. Блок «Обо мне»: карточки падают, когда блок появился на экране

     Раскладка блока — в секции ABOUT BLOCK в css/style.css, здесь только
     класс pd-ab-drop, который запускает падение и проявляет подписи.
     ======================================================================== */

  function initAboutDrop() {
    var wrap = document.getElementById('pd-ab');
    if (!wrap) return;

    var groups = [].slice.call(wrap.querySelectorAll('.pd-ab-group'));
    if (!groups.length) return;

    function drop() {
      groups.forEach(function (group) { group.classList.add('pd-ab-drop'); });
    }

    /* Наблюдаем за всем блоком, а падают карточки все вместе */
    revealOnScroll([wrap], drop, { threshold: 0.15 });
  }

  /* ========================================================================
     6. Навыки: карточки и заголовок появляются по скроллу
     ======================================================================== */

  function initSkillsReveal() {
    var root = document.querySelector('.pd-skills');
    if (!claim(root, 'pdInit')) return;

    /* Номер элемента внутри карточки — для лестничной задержки в CSS */
    root.querySelectorAll('.pd-card').forEach(function (card) {
      card.querySelectorAll('.pd-card__tag, .pd-card__list li, .pd-tool')
        .forEach(function (el, i) { el.style.setProperty('--i', i); });
    });

    revealOnScroll(
      root.querySelectorAll('.pd-anim, .pd-anim--left, .pd-anim--right'),
      function (el) {
        var delay = parseInt(el.dataset.delay, 10) || 0;
        setTimeout(function () { el.classList.add('pd-in'); }, delay);
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
  }

  /* ========================================================================
     7. Навыки на телефоне: вкладки вместо четырёх карточек подряд

     Кнопки вкладок создаёт скрипт: в разметке их нет, на десктопе они не
     нужны. Показ и скрытие карточек — классом is-active-tab в CSS.
     ======================================================================== */

  /* Длинные подписи карточек не влезают в кнопку вкладки — сокращаем */
  var TAB_LABELS = {
    'Проектирование и UX': 'Проектирование и UX',
    'Рабочий процесс': 'Рабочий процесс',
    'Инструменты': 'Инструменты',
    'UI и дизайн-система': 'UI и Visual'
  };

  function initSkillsTabs() {
    var skills = document.querySelector('.pd-skills');
    if (!claim(skills, 'tabsInit')) return;

    var cards = [].slice.call(skills.querySelectorAll('.pd-card'));
    var cols = skills.querySelector('.pd-skills__cols');
    if (!cards.length || !cols) return;

    /* В разметке карточки разложены по двум колонкам, и порядок в DOM не
       совпадает с порядком чтения — его задаёт data-order */
    cards.sort(function (a, b) {
      return (parseInt(a.dataset.order, 10) || 0) - (parseInt(b.dataset.order, 10) || 0);
    });

    var tabsEl = document.createElement('div');
    tabsEl.className = 'pd-skills__tabs';

    var tabs = cards.map(function (card, i) {
      var tagEl = card.querySelector('.pd-card__tag');
      /* В подписях стоят неразрывные пробелы — заменяем обычными,
         иначе короткое имя вкладки не находится */
      var rawLabel = tagEl ? tagEl.textContent.replace(/ /g, ' ').trim() : '';

      var btn = document.createElement('button');
      btn.className = 'pd-skills__tab' + (i === 0 ? ' is-active' : '');
      btn.textContent = TAB_LABELS[rawLabel] || rawLabel;
      btn.dataset.idx = i;
      tabsEl.appendChild(btn);
      return btn;
    });

    skills.insertBefore(tabsEl, cols);
    cards[0].classList.add('is-active-tab', 'pd-in');

    tabsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.pd-skills__tab');
      if (!btn) return;

      var idx = parseInt(btn.dataset.idx, 10);
      tabs.forEach(function (tab) { tab.classList.toggle('is-active', tab === btn); });

      cards.forEach(function (card, i) {
        var active = i === idx;
        card.classList.toggle('is-active-tab', active);
        /* Карточка могла ещё не появиться по скроллу — показываем сразу */
        if (active) card.classList.add('pd-in');
      });
    });
  }

  /* ========================================================================
     8. Мобильное меню
     ======================================================================== */

  function initNavDrawer() {
    var DESKTOP_FROM = 640;   /* с этой ширины меню в шапке, ящик не нужен */

    var burger = document.getElementById('pd-nav__burger');
    var drawer = document.getElementById('pd-nav-drawer');
    if (!burger || !drawer) return;

    function setOpen(open) {
      burger.classList.toggle('is-open', open);
      drawer.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
      /* Страница под открытым меню не прокручивается. Блокируем прокрутку
         у всего документа, а не у body: overflow у body делал его отдельным
         прокручиваемым блоком, и шапка (sticky) уезжала к началу страницы —
         посреди страницы вместе с ней пропадал крестик закрытия. */
      document.documentElement.style.overflow = open ? 'hidden' : '';
    }

    burger.addEventListener('click', function () {
      setOpen(!burger.classList.contains('is-open'));
    });

    drawer.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { setOpen(false); });
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > DESKTOP_FROM) setOpen(false);
    }, { passive: true });
  }

  /* ========================================================================
     9. Параллакс первого экрана: содержимое отстаёт от прокрутки
     ======================================================================== */

  function initHeroParallax() {
    var SPEED = 0.35;         /* доля прокрутки, на которую сдвигается блок */
    var TAIL = 200;           /* ниже первого экрана пересчитывать нечего */

    var hero = document.querySelector('.hero');
    if (!hero) return;

    var layers = [
      hero.querySelector('.hero__content'),
      hero.querySelector('.hero__illustration')
    ].filter(Boolean);
    if (!layers.length) return;

    onScroll(function () {
      if (window.scrollY > hero.offsetHeight + TAIL) return;
      var offset = window.scrollY * SPEED;
      layers.forEach(function (layer) {
        layer.style.transform = 'translateY(' + offset + 'px)';
      });
    });
  }

  /* ========================================================================
     10. Галерея: клик по «Посмотреть ещё» раскрывает снимки

     Наведение раскладывает стопку в ряд средствами CSS. Клик раскрывает
     снимки и убирает кнопку; свернуть можно кликом по галерее или Esc.
     Вся раскладка — в css/style.css, здесь только класс is-open.
     ======================================================================== */

  function initGallery() {
    var inner = document.querySelector('.gallery__inner');
    var btn = inner && inner.querySelector('.gallery__btn');
    if (!btn) return;

    function setOpen(open) {
      inner.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    setOpen(false);

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      setOpen(true);
    });

    inner.addEventListener('click', function (e) {
      if (!inner.classList.contains('is-open')) return;
      if (e.target.closest('.gallery__btn')) return;
      setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  /* ========================================================================
     11. Переход на главную с якорем (index.html#portfolio и т.п.)

     Браузер прокручивает к якорю сразу при загрузке, но блоки выше ещё
     меняют высоту: догружаются картинки. Когда страница собрана,
     прокручиваем ещё раз.
     ======================================================================== */

  function initHashScroll() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;

    function go() {
      var el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    }

    /* Прелоадер уходит позже события load — ловим оба момента */
    document.addEventListener('preloader:done', go, { once: true });
    window.addEventListener('load', function () { setTimeout(go, 60); });
  }

  /* ========================================================================
     12. Карточка проекта кликабельна целиком

     Раньше кейс открывался только по стрелке и по кнопке «Открыть кейс».
     Ссылки внутри карточки работают сами, их не перехватываем.
     ======================================================================== */

  function initCardClicks() {
    document.addEventListener('click', function (e) {
      var card = e.target.closest('.project-card');
      if (!card || e.target.closest('a')) return;

      var link = card.querySelector('.project-card__btn[href]');
      var href = link && link.getAttribute('href');
      if (!href || href === '#') return;

      /* Внешние ссылки и клик с Cmd или Ctrl — в новой вкладке,
         как у обычной ссылки */
      if (link.target === '_blank' || e.metaKey || e.ctrlKey) {
        window.open(link.href, '_blank', 'noopener');
      } else {
        location.href = link.href;
      }
    });
  }

  /* ========================================================================
     13. Курсор-след: линия из затухающих отрезков на canvas

     Только для мыши: на касании курсора нет. На страницах кейсов свой
     курсор-стрелка (#pd-cursor из case.js), там след не рисуем.
     ======================================================================== */

  function initCursorTrail() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (document.getElementById('pd-cursor')) return;

    var POINTS = 7;           /* звеньев в следе */
    var EASE = 0.55;          /* насколько звено догоняет предыдущее за кадр */
    var R_BASE = 4;           /* радиус головы обычно */
    var R_HOVER = 18;         /* радиус над ссылкой или карточкой */
    var R_EASE = 0.15;        /* скорость изменения радиуса */
    var OFFSCREEN = -400;     /* стартовая позиция за краем экрана */
    var HOVER_SELECTOR = 'a, button, .btn, [data-cursor-hover], .project-card, .contacts__card';
    var DARK_SELECTOR = '.project-card, .contacts__card';

    var points = [];
    for (var i = 0; i < POINTS; i++) points.push({ x: OFFSCREEN, y: OFFSCREEN });

    var canvas = document.createElement('canvas');
    canvas.id = 'trail-canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    /* Пока идёт прелоадер, следа не видно */
    if (document.getElementById('preloader')) {
      canvas.style.visibility = 'hidden';
      document.addEventListener('preloader:done', function () {
        canvas.style.visibility = 'visible';
      }, { once: true });
    }

    window.addEventListener('resize', function () {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });

    window.addEventListener('mousemove', function (e) {
      points[0].x = e.clientX;
      points[0].y = e.clientY;
    });

    var radius = R_BASE;
    var targetRadius = R_BASE;

    document.addEventListener('mouseover', function (e) {
      targetRadius = e.target.closest(HOVER_SELECTOR) ? R_HOVER : R_BASE;
      /* На тёмных и цветных поверхностях белый след виден сам,
         на светлом фоне difference делает его тёмным */
      var onDark = !!e.target.closest(DARK_SELECTOR);
      canvas.style.mixBlendMode = onDark ? 'normal' : 'difference';
    });

    (function draw() {
      radius += (targetRadius - radius) * R_EASE;

      for (var i = 1; i < POINTS; i++) {
        points[i].x += (points[i - 1].x - points[i].x) * EASE;
        points[i].y += (points[i - 1].y - points[i].y) * EASE;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      /* Звенья: чем дальше от головы, тем тоньше и прозрачнее */
      for (var s = 0; s < POINTS - 1; s++) {
        var t = s / (POINTS - 1);
        var midX = (points[s].x + points[s + 1].x) / 2;
        var midY = (points[s].y + points[s + 1].y) / 2;

        ctx.beginPath();
        ctx.moveTo(points[s].x, points[s].y);
        ctx.quadraticCurveTo(points[s].x, points[s].y, midX, midY);
        ctx.lineWidth = (radius * 1.2) * (1 - t);
        ctx.strokeStyle = 'rgba(255,255,255,' + (1 - t).toFixed(2) + ')';
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();

      requestAnimationFrame(draw);
    })();
  }

  /* ========================================================================
     14. Плашка о cookies

     Появляется после прелоадера (на главной) или через секунду (на
     остальных страницах). После «Хорошо» выбор запоминается в браузере.
     Стили — блок COOKIE NOTICE в css/style.css.
     ======================================================================== */

  function initCookieNotice() {
    var KEY = 'pd-cookie-ok';
    var AFTER_PRELOADER = 800;   /* пауза после ухода прелоадера */
    var AFTER_LOAD = 1000;       /* пауза на страницах без прелоадера */
    var FALLBACK = 6000;         /* страховка, если событие не придёт */
    var HIDE_TIME = 600;         /* длительность ухода, как в CSS */

    /* В приватном режиме обращение к localStorage может бросить ошибку */
    try {
      if (localStorage.getItem(KEY) === '1') return;
    } catch (e) { /* хранилище недоступно — покажем плашку как обычно */ }

    var box = document.createElement('div');
    box.className = 'pd-cookie';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', 'Уведомление о cookies');
    box.innerHTML =
      '<p class="pd-cookie__text">Сайт использует cookies для анализа посещаемости. ' +
      '<a class="pd-cookie__link" href="privacy.html">Подробнее</a></p>' +
      '<button type="button" class="pd-cookie__ok">Хорошо</button>';

    var shown = false;
    function show() {
      if (shown) return;
      shown = true;
      document.body.appendChild(box);
      void box.offsetWidth;   /* пересчёт, иначе переход появления не сработает */
      box.classList.add('is-in');
    }

    box.querySelector('.pd-cookie__ok').addEventListener('click', function () {
      try {
        localStorage.setItem(KEY, '1');
      } catch (e) { /* не запомнилось — плашка появится в следующий раз */ }
      box.classList.remove('is-in');
      box.classList.add('is-out');
      setTimeout(function () {
        if (box.parentNode) box.parentNode.removeChild(box);
      }, HIDE_TIME);
    });

    if (document.getElementById('preloader')) {
      document.addEventListener('preloader:done', function () {
        setTimeout(show, AFTER_PRELOADER);
      }, { once: true });
      setTimeout(show, FALLBACK);
    } else {
      setTimeout(show, AFTER_LOAD);
    }
  }

  /* ========================================================================
     Запуск
     ======================================================================== */

  initPreloader();
  initNav();
  initNavDrawer();
  initScrollReveal();
  initCursorTrail();
  initCardClicks();
  initHashScroll();
  initHeroParallax();
  initGallery();

  onReady(function () {
    initAboutDrop();
    initSkillsReveal();
    initSkillsTabs();
    initCookieNotice();
  });
})();
