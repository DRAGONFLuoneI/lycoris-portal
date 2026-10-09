/* ==========================================================================
   FORM.JS
   Валидация и отправка формы «Оставить заявку».
   Используется и на странице contact.html, и в модальном окне (главная,
   карточки сортов, баннеры в статьях) — селектор .lead-form находит оба.

   ЧТО НУЖНО ПОДКЛЮЧИТЬ РАЗРАБОТЧИКУ НА БЭКЕНДЕ (см. п.6 ТЗ):
   Сейчас отправка данных ИМИТИРУЕТСЯ на фронтенде (задержка + успех),
   чтобы дизайн/анимации можно было оценить без готового сервера.
   Реальная отправка выполняется в функции sendLeadToServer() —
   замените её тело на fetch() к вашему API endpoint, который должен:
     1) сохранить заявку в базу данных;
     2) отправить письмо администратору;
     3) отправить сообщение в Telegram-чат через Telegram Bot API
        (POST https://api.telegram.org/bot<TOKEN>/sendMessage).
   Подробности — в README.md проекта.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".lead-form").forEach(attachLeadForm);
  prefillFromProfile();
});

/**
 * Если пользователь вошёл в аккаунт, подставляет в формы заявки имя,
 * контакт и регион из его профиля — не нужно вводить их каждый раз.
 * Поля остаются доступными для правки.
 */
function prefillFromProfile() {
  const user = window.LycorisAuth ? window.LycorisAuth.currentUser() : null;
  if (!user) return;

  document.querySelectorAll(".lead-form").forEach((form) => {
    const name = form.querySelector('[name="name"]');
    const contact = form.querySelector('[name="contact"]');
    const region = form.querySelector('[name="region"]');

    if (name && !name.value) name.value = user.full_name || "";
    if (contact && !contact.value) contact.value = user.phone || user.email || "";
    if (region && !region.value) region.value = user.region || "";
  });
}

function attachLeadForm(form) {
  const submitBtn = form.querySelector('[type="submit"]');
  const originalBtnHTML = submitBtn ? submitBtn.innerHTML : "";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const errors = validateLeadForm(form);
    renderErrors(form, errors);
    if (Object.keys(errors).length > 0) {
      // Фокус на первое проблемное поле — удобно и доступно
      const firstBad = form.querySelector(".has-error input, .has-error textarea");
      if (firstBad) firstBad.focus();
      return;
    }

    const payload = collectFormData(form);

    // ---- Имитация состояния "отправка..." ---------------------------
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="loading-dot"></span> Отправляем…';
    }

    try {
      await sendLeadToServer(payload);
      showSuccessState(form);
      form.reset();
    } catch (err) {
      // В реальном проекте здесь стоит показать пользователю причину ошибки
      console.error("Не удалось отправить заявку:", err);
      alert("Не получилось отправить заявку. Проверьте соединение и попробуйте ещё раз.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
      }
    }
  });

  // Убираем состояние ошибки по мере того, как пользователь исправляет поле
  form.querySelectorAll("input, textarea").forEach((input) => {
    input.addEventListener("input", () => {
      input.closest(".field")?.classList.remove("has-error");
    });
  });
}

/**
 * Проверяет обязательные поля формы заявки.
 * Возвращает объект { имяПоля: "текст ошибки" }.
 */
function validateLeadForm(form) {
  const errors = {};
  const name = form.querySelector('[name="name"]');
  const contact = form.querySelector('[name="contact"]');
  const region = form.querySelector('[name="region"]');
  const consent = form.querySelector('[name="consent"]');

  if (name && name.value.trim().length < 2) {
    errors.name = "Пожалуйста, укажите имя";
  }

  if (contact) {
    const value = contact.value.trim();
    const isPhone = /^[\d\s()+-]{10,}$/.test(value);
    const isTelegram = /^@[\w]{4,}$/.test(value);
    if (!isPhone && !isTelegram) {
      errors.contact = "Укажите телефон (напр. +7 900 123-45-67) или Telegram (@username)";
    }
  }

  if (region && region.value.trim().length < 2) {
    errors.region = "Укажите регион или город";
  }

  if (consent && !consent.checked) {
    errors.consent = "Нужно согласие с политикой конфиденциальности";
  }

  return errors;
}

function renderErrors(form, errors) {
  // Сначала сбрасываем все состояния ошибок
  form.querySelectorAll(".field, .checkbox-field").forEach((f) => f.classList.remove("has-error"));

  Object.entries(errors).forEach(([fieldName, message]) => {
    const input = form.querySelector(`[name="${fieldName}"]`);
    const wrapper = input?.closest(".field, .checkbox-field");
    if (!wrapper) return;
    wrapper.classList.add("has-error");
    const errorEl = wrapper.querySelector(".field-error");
    if (errorEl) errorEl.textContent = message;
  });
}

function collectFormData(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  data.submittedAt = new Date().toISOString();
  data.sourcePage = window.location.pathname;
  return data;
}

/**
 * ИМИТАЦИЯ отправки на сервер. Замените на реальный fetch(), например:
 *
 *   return fetch("/api/leads", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify(payload),
 *   }).then((res) => {
 *     if (!res.ok) throw new Error("Ошибка сервера");
 *     return res.json();
 *   });
 *
 * Если используется Cloudflare Turnstile (см. index.html/contact.html —
 * div.cf-turnstile), не забудьте передать токен из поля
 * "cf-turnstile-response" вместе с данными формы для серверной проверки.
 */
function sendLeadToServer(payload) {
  // Заявка сохраняется в клиентском слое данных (см. js/db.js) — в
  // «таблицу» leads. Если пользователь авторизован, заявка привязывается
  // к его учётной записи и становится видна в личном кабинете.
  const user = window.LycorisAuth ? window.LycorisAuth.currentUser() : null;

  if (window.LycorisDB) {
    window.LycorisDB.Leads.create(
      Object.assign({}, payload, { user_id: user ? user.id : null })
    );
  }

  console.info("[Lycoris] Заявка сохранена:", payload);

  // Небольшая задержка имитирует сетевой запрос, чтобы было видно
  // состояние кнопки «Отправляем…».
  return new Promise((resolve) => setTimeout(resolve, 600));
}

/**
 * Показывает стильное окно успеха. Если форма находится внутри модалки —
 * подменяет содержимое модалки. Если это форма на отдельной странице —
 * показывает встроенный success-блок рядом с формой.
 */
function showSuccessState(form) {
  const successTemplate = document.getElementById("success-template");
  if (!successTemplate) return;

  const successNode = successTemplate.content.cloneNode(true);
  const modal = form.closest(".modal-box");

  if (modal) {
    modal.innerHTML = "";
    const closeBtn = document.createElement("button");
    closeBtn.className = "modal-close";
    closeBtn.setAttribute("data-close-modal", "");
    closeBtn.setAttribute("aria-label", "Закрыть окно");
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    closeBtn.addEventListener("click", () => window.LycorisModal?.close());
    modal.appendChild(closeBtn);
    modal.appendChild(successNode);
  } else {
    form.replaceWith(successNode);
  }
}
