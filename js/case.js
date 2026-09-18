/* ==========================================================================
   case.js — общая логика страниц-кейсов

   Каждый блок — отдельная функция init*, она сама проверяет, есть ли на
   странице нужная разметка, и молча выходит, если её нет. Поэтому файл
   подключается ко всем кейсам сразу.

   Содержание:
     1. Помощники: список элементов, обработчик скролла, показ элемента
     2. Появление элементов при скролле
     3. Боковая навигация: показ и активный пункт
     4. Горизонтальная прокрутка (галерея закладок, дашборд OnBook)
     5. Бегущая лента вайрфреймов
     6. Курсор-стрелка
   ========================================================================== */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ========================================================================
     1. Помощники
     ======================================================================== */

  function list(selector, root) {
    return [].slice.call((root || document).querySelectorAll(selector));
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

  /* Показывает элемент с его собственной задержкой: data-reveal-delay="1.5" */
  function reveal(el) {
    var delay = parseFloat(el.getAttribute('data-reveal-delay')) || 0;
    if (delay) {
      setTimeout(function () { el.classList.add('is-in'); }, delay * 1000);
    } else {
      el.classList.add('is-in');
    }
  }

  /* ========================================================================
     2. Появление элементов при скролле

     Длительность анимации задаётся на элементе: data-reveal-dur="2".
     Элементы первого экрана ждут ухода прелоадера, иначе анимация отыграет
     под ним и пользователь её не увидит.
     ======================================================================== */

  function initReveals() {
    var REVEAL_OPTIONS = { threshold: 0.15, rootMargin: '0px 0px -40px 0px' };
    var PRELOADER_FALLBACK = 5000;   /* страховка, если прелоадер не отработает */

    var targets = list('[data-reveal], .case-section');
    if (!targets.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    targets.forEach(function (el) {
      var dur = el.getAttribute('data-reveal-dur');
      if (dur) el.style.setProperty('--reveal-dur', dur + 's');
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        reveal(entry.target);
      });
    }, REVEAL_OPTIONS);

    /* Что видно сразу — показываем после прелоадера, остальное по скроллу */
    var onScreen = [];

    function playOnScreen() {
      onScreen.forEach(reveal);
      onScreen = [];
    }

    var preloader = document.getElementById('preloader');
    if (preloader && document.body.contains(preloader)) {
      document.addEventListener('preloader:done', playOnScreen, { once: true });
      setTimeout(playOnScreen, PRELOADER_FALLBACK);
    } else {
      /* Без прелоадера — через кадр, чтобы браузер увидел начальное состояние */
      requestAnimationFrame(function () {
        requestAnimationFrame(playOnScreen);
      });
    }

    targets.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      var inViewport = rect.top < window.innerHeight && rect.bottom > 0;
      if (inViewport) onScreen.push(el);
      else io.observe(el);
    });
  }

  /* ========================================================================
     3. Боковая навигация: прячется внутри помеченных блоков,
        подсвечивает раздел, до которого дочитали
     ======================================================================== */

  function initSideNav() {
    var HIDE_THRESHOLD = 0.05;   /* доля блока [data-nav-hide] на экране */
    var ACTIVE_LINE = 0.45;      /* граница подсветки — 45% высоты экрана */

    var nav = document.querySelector('.case-side-nav');
    if (!nav) return;

    var sections = list('.case-side-nav__item a').map(function (link) {
      var id = (link.getAttribute('href') || '').replace('#', '');
      return { item: link.parentNode, el: document.getElementById(id), id: id };
    }).filter(function (section) { return section.el; });

    if (!('IntersectionObserver' in window)) {
      nav.classList.add('is-visible');
    } else {
      initSideNavVisibility(nav, HIDE_THRESHOLD);
    }

    /* У скрытого элемента нет раскладки, его rect схлопнут в ноль —
       пункт меню, ведущий на него, иначе перехватил бы подсветку. */
    function isVisible(el) {
      return el.offsetParent !== null;
    }

    function updateActive() {
      var line = window.innerHeight * ACTIVE_LINE;
      var activeId = null;

      for (var i = sections.length - 1; i >= 0; i--) {
        if (!isVisible(sections[i].el)) continue;
        if (sections[i].el.getBoundingClientRect().top <= line) {
          activeId = sections[i].id;
          break;
        }
      }

      sections.forEach(function (section) {
        section.item.classList.toggle('is-active', section.id === activeId);
      });
    }

    onScroll(updateActive);
    updateActive();
  }

  /* Навигация скрыта, пока на экране хотя бы один блок с data-nav-hide
     (первый экран, ленты, метаданные — там она мешала бы) */
  function initSideNavVisibility(nav, threshold) {
    var blocks = list('[data-nav-hide]');
    var hiding = blocks.map(function () { return false; });

    function apply() {
      var covered = hiding.some(Boolean);
      nav.classList.toggle('is-visible', !covered);
    }

    blocks.forEach(function (block, i) {
      new IntersectionObserver(function (entries) {
        hiding[i] = entries[0].isIntersecting;
        apply();
      }, { threshold: threshold }).observe(block);
    });

    apply();
  }

  /* ========================================================================
     4. Горизонтальная прокрутка: галерея закладок, дашборд OnBook

     Разметка такого блока: __scroller (задаёт высоту прокрутки)
     > __stage (залипает) > __track (едет по горизонтали).
     Путь в пикселях — в data-travel на __scroller, значение "auto" считает
     путь по ширине ряда.
     ======================================================================== */

  var TRACK_BLOCKS = ['case-gallery', 'ob-scroll', 'case-track'];

  function initHorizontalTracks() {
    var FLOW_UNTIL = 1279;    /* до этой ширины блоки выложены в столбец */
    var DEFAULT_TRAVEL = 1150;

    var blocks = [];

    TRACK_BLOCKS.forEach(function (name) {
      list('.' + name + '__scroller').forEach(function (scroller) {
        var stage = scroller.querySelector('.' + name + '__stage');
        var track = scroller.querySelector('.' + name + '__track');
        if (!stage || !track) return;

        var travel = scroller.getAttribute('data-travel');
        blocks.push({
          scroller: scroller,
          stage: stage,
          track: track,
          auto: travel === 'auto',
          travel: travel === 'auto' ? 0 : (parseInt(travel, 10) || DEFAULT_TRAVEL)
        });
      });
    });

    if (!blocks.length) return;

    function update() {
      var narrow = window.innerWidth <= FLOW_UNTIL;
      blocks.forEach(function (block) {
        updateBlock(block, narrow);
      });
    }

    function updateBlock(block, narrow) {
      /* Лента с автоматическим путём едет ровно на столько, насколько ряд
         шире сцены, и блок получает высоту «сцена + путь». На узком экране
         высоту снимаем: там прокрутка жестом. */
      if (block.auto) {
        if (narrow || block.stage.offsetParent === null) {
          block.scroller.style.height = '';
        } else {
          block.travel = Math.max(0, block.track.scrollWidth - block.stage.clientWidth);
          block.scroller.style.height = (block.stage.offsetHeight + block.travel) + 'px';
        }
      }

      if (narrow) {
        block.track.style.transform = '';
        return;
      }

      /* Путь может быть короче блока: доехав, картинки стоят до конца блока */
      var distance = Math.min(
        block.travel,
        block.scroller.offsetHeight - block.stage.offsetHeight
      );
      if (distance <= 0) return;

      var passed = block.stage.getBoundingClientRect().top -
        block.scroller.getBoundingClientRect().top;
      var progress = Math.max(0, Math.min(1, passed / distance));

      block.track.style.transform =
        'translate3d(' + (-block.travel * progress) + 'px, 0, 0)';
    }

    onScroll(update);
    window.addEventListener('resize', update, { passive: true });
    /* Снимки догружаются и меняют ширину ряда */
    window.addEventListener('load', update);

    update();
  }

  /* ========================================================================
     5. Бегущая лента вайрфреймов: едет, только пока блок на экране
     ======================================================================== */

  function initMarquee() {
    var blocks = list('.ob-wire');
    if (!blocks.length) return;

    blocks.forEach(function (block) {
      if (!('IntersectionObserver' in window)) {
        block.classList.add('is-running');
        return;
      }

      new IntersectionObserver(function (entries) {
        block.classList.toggle('is-running', entries[0].isIntersecting);
      }, { threshold: 0 }).observe(block);
    });
  }

  /* ========================================================================
     6. Курсор-стрелка: только для мыши, на касании курсора нет
     ======================================================================== */

  function initCursor() {
    var TIP_OFFSET_X = 3;   /* хотспот — кончик стрелки, а не её угол */

    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var cursor = document.getElementById('pd-cursor');
    if (!cursor) return;

    document.addEventListener('mousemove', function (e) {
      cursor.style.transform =
        'translate(' + (e.clientX - TIP_OFFSET_X) + 'px, ' + e.clientY + 'px)';
      cursor.classList.add('is-visible');
    });

    document.addEventListener('mouseleave', function () {
      cursor.classList.remove('is-visible');
    });
  }

  /* ========================================================================
     Запуск
     ======================================================================== */

  function init() {
    initReveals();
    initSideNav();
    initHorizontalTracks();
    initMarquee();
    initCursor();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
