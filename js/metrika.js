/* ==========================================================================
   metrika.js — счётчик Яндекс Метрики, номер 112800374

   Подключается в <head> всех страниц, кроме 404.html. Код — стандартный
   из Метрики, вынесен в файл, потому что встроенных скриптов в страницах
   по правилам проекта нет.

   Что включено:
     clickmap            — карта кликов: сводка, куда нажимают на странице
     accurateTrackBounce — точный показатель отказов: заход не считается
                           отказом, если человек провёл на странице время
     trackLinks          — переходы по внешним ссылкам (Behance, Telegram…)

   Вебвизор (запись действий посетителя) НЕ включён — так написано
   в политике конфиденциальности (privacy.html, раздел про Метрику).
   Если когда-нибудь включать его, сначала нужно поправить политику.

   Меняешь настройки в Метрике — скопируй новый код и замени блок ниже.
   ========================================================================== */

(function (m, e, t, r, i, k, a) {
  m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
  m[i].l = 1 * new Date();
  for (var j = 0; j < document.scripts.length; j++) {
    if (document.scripts[j].src === r) { return; }
  }
  k = e.createElement(t);
  a = e.getElementsByTagName(t)[0];
  k.async = 1;
  k.src = r;
  a.parentNode.insertBefore(k, a);
})(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=112800374', 'ym');

ym(112800374, 'init', {
  ssr: true,
  clickmap: true,
  referrer: document.referrer,
  url: location.href,
  accurateTrackBounce: true,
  trackLinks: true
});
