/* ==========================================================================
   REGISTER.JS — обработка формы регистрации (страница register.html)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");
  if (!form) return;

  // Вошедшему пользователю регистрация не нужна
  const current = window.LycorisAuth.currentUser();
  if (current) {
    window.location.replace(current.role === "admin" ? "admin.html" : "account.html");
    return;
  }

  const alertBox = document.getElementById("register-alert");
  const submitBtn = form.querySelector('[type="submit"]');
  const originalLabel = submitBtn.innerHTML;

  function showAlert(message) {
    alertBox.textContent = message;
    alertBox.classList.add("is-visible");
  }
  function hideAlert() {
    alertBox.classList.remove("is-visible");
  }

  /** Подсветка полей с ошибками и подстановка текста ошибки. */
  function renderErrors(errors) {
    form.querySelectorAll(".field, .checkbox-field").forEach((f) => f.classList.remove("has-error"));

    Object.entries(errors).forEach(([field, message]) => {
      const input = form.querySelector(`[name="${field}"]`);
      const wrap = input?.closest(".field, .checkbox-field");
      if (!wrap) return;
      wrap.classList.add("has-error");
      const errEl = wrap.querySelector(".field-error");
      if (errEl) errEl.textContent = message;
    });
  }

  form.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      input.closest(".field, .checkbox-field")?.classList.remove("has-error");
      hideAlert();
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const data = {
      fullName: form.fullName.value,
      email: form.email.value,
      phone: form.phone.value,
      password: form.password.value,
      passwordRepeat: form.passwordRepeat.value,
      consent: form.consent.checked,
    };

    // Предварительная проверка на стороне формы
    const errors = window.LycorisAuth.validateRegistration(data);
    if (Object.keys(errors).length) {
      renderErrors(errors);
      form.querySelector(".has-error input, .has-error textarea")?.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-dot"></span> Создаём аккаунт…';

    try {
      const res = await window.LycorisAuth.register(data);

      if (!res.ok) {
        renderErrors(res.errors);
        // Ошибку занятой почты показываем ещё и общим сообщением
        if (res.errors.email) showAlert(res.errors.email);
        return;
      }

      // Регистрация выполняет вход автоматически
      window.location.href = "account.html";
    } catch (err) {
      console.error("Ошибка регистрации:", err);
      showAlert("Не удалось завершить регистрацию. Попробуйте ещё раз.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalLabel;
    }
  });
});
