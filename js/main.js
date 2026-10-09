/* ==========================================================================
   MAIN.JS
   Общая логика, нужная на каждой странице:
   1. Поведение шапки при скролле
   2. Мобильное меню
   3. Модальное окно «Оставить заявку» (вызывается кнопками с data-open-modal)
   4. Плавное появление блоков при прокрутке (.reveal)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initHeaderScroll();
  initMobileNav();
  initModal();
  initScrollReveal();
  setYear();
});

/* ---------------------------------------------------------------------
   1. Шапка: получает класс .is-scrolled после небольшого скролла,
      чтобы стать непрозрачной поверх тёмного/фото hero.
--------------------------------------------------------------------- */
function initHeaderScroll() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const updateHeader = () => {
    if (window.scrollY > 40) {
      header.classList.add("is-scrolled");
    } else if (!header.classList.contains("is-solid")) {
      header.classList.remove("is-scrolled");
    }
  };
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
}

/* ---------------------------------------------------------------------
   2. Мобильное меню (гамбургер)
--------------------------------------------------------------------- */
function initMobileNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    document.body.style.overflow = isOpen ? "hidden" : "";
  });

  // Закрываем меню при клике на пункт навигации
  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    });
  });
}

/* ---------------------------------------------------------------------
   3. Модальное окно заявки.
   Открывается ЛЮБОЙ кнопкой/ссылкой с атрибутом [data-open-modal].
   Необязательный атрибут data-variety позволяет подставить в форму
   название сорта (используется кнопкой «Узнать о наличии у партнёров»
   в карточке сорта — см. catalog.js).

   Важно: обработчик открытия навешан через ДЕЛЕГИРОВАНИЕ СОБЫТИЙ на
   document, а не на конкретные кнопки. Так модалка одинаково открывается
   и со статичных кнопок в HTML, и с кнопок, которые catalog.js/map.js
   создают динамически уже после загрузки страницы.
--------------------------------------------------------------------- */
function initModal() {
  const overlay = document.getElementById("lead-modal");
  if (!overlay) return; // на странице может не быть модалки

  const closers = overlay.querySelectorAll("[data-close-modal]");
  const varietyField = overlay.querySelector("#modal-context");

  const openModal = (context) => {
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (varietyField) {
      if (context) {
        varietyField.value = context;
        varietyField.closest(".field").style.display = "flex";
      } else {
        varietyField.value = "";
        varietyField.closest(".field").style.display = "none";
      }
    }
    const firstInput = overlay.querySelector("input:not([readonly]), textarea");
    if (firstInput) setTimeout(() => firstInput.focus(), 250);
  };

  const closeModal = () => {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  // Делегирование: слушаем клики на всём документе и проверяем,
  // не произошёл ли клик внутри/на элементе с [data-open-modal].
  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-open-modal]");
    if (!opener) return;
    e.preventDefault();
    openModal(opener.dataset.variety || opener.getAttribute("data-open-modal-context"));
  });

  closers.forEach((btn) => btn.addEventListener("click", closeModal));

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) closeModal();
  });

  // Позволяет другим скриптам (form.js) закрыть модалку программно
  window.LycorisModal = { open: openModal, close: closeModal };
}

/* ---------------------------------------------------------------------
   4. Появление блоков при прокрутке — один аккуратный эффект,
      не навешенный на каждую карточку отдельно, а на смысловые секции.
--------------------------------------------------------------------- */
function initScrollReveal() {
  const targets = document.querySelectorAll(".reveal");
  if (!targets.length) return;

  if (!("IntersectionObserver" in window)) {
    targets.forEach((t) => t.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
  );

  targets.forEach((t) => observer.observe(t));
}

/* ---------------------------------------------------------------------
   Мелочь: год в подвале, чтобы не редактировать вручную каждый январь.
--------------------------------------------------------------------- */
function setYear() {
  const el = document.getElementById("current-year");
  if (el) el.textContent = new Date().getFullYear();
}
