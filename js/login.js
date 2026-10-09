/* ==========================================================================
   LOGIN.JS — обработка формы входа (страница login.html)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  if (!form) return;

  // Если пользователь уже вошёл, страница входа ему не нужна
  const current = window.LycorisAuth.currentUser();
  if (current) {
    window.location.replace(current.role === "admin" ? "admin.html" : "account.html");
    return;
  }

  const alertBox = document.getElementById("login-alert");
  const submitBtn = form.querySelector('[type="submit"]');
  const originalLabel = submitBtn.innerHTML;

  // Куда вернуть пользователя после входа (?redirect=catalog.html)
  const redirectTo = new URLSearchParams(window.location.search).get("redirect");

  function showAlert(message) {
    alertBox.textContent = message;
    alertBox.classList.add("is-visible");
  }
  function hideAlert() {
    alertBox.classList.remove("is-visible");
  }

  // Сбрасываем подсветку ошибки, как только поле правят
  form.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      input.closest(".field")?.classList.remove("has-error");
      hideAlert();
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const email = form.email.value.trim();
    const password = form.password.value;

    // Проверка заполненности
    let hasError = false;
    if (!email) {
      form.email.closest(".field").classList.add("has-error");
      hasError = true;
    }
    if (!password) {
      form.password.closest(".field").classList.add("has-error");
      hasError = true;
    }
    if (hasError) {
      form.querySelector(".has-error input")?.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-dot"></span> Проверяем…';

    try {
      const res = await window.LycorisAuth.login(email, password);

      if (!res.ok) {
        showAlert(res.error);
        return;
      }

      // Успешный вход — уходим в нужный кабинет
      const safeRedirect =
        redirectTo && /^[a-z0-9_-]+\.html$/i.test(redirectTo) ? redirectTo : null;
      const target = safeRedirect || (res.user.role === "admin" ? "admin.html" : "account.html");
      window.location.href = target;
    } catch (err) {
      console.error("Ошибка входа:", err);
      showAlert("Не удалось выполнить вход. Попробуйте ещё раз.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalLabel;
    }
  });
});
