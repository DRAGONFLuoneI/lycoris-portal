/* ==========================================================================
   AUTH.JS — регистрация, вход, сессия и разграничение доступа

   Работает поверх слоя данных js/db.js. Отвечает за:
     1. регистрацию нового пользователя (роль «садовод»);
     2. вход по email и паролю с проверкой хеша;
     3. хранение текущей сессии;
     4. защиту личных кабинетов от неавторизованного доступа;
     5. отображение состояния входа в шапке сайта.

   СЕССИЯ хранится в sessionStorage (а не в localStorage): она живёт до
   закрытия вкладки, что ближе к поведению серверных сессий и безопаснее
   для общего компьютера. В ней лежит только идентификатор и роль —
   сами данные пользователя каждый раз читаются из «базы».
   ========================================================================== */

(function (global) {
  "use strict";

  const SESSION_KEY = "LYCORIS_SESSION";
  const DB = global.LycorisDB;

  /* ----------------------------------------------------------------------
     Сессия
  ---------------------------------------------------------------------- */

  function getSession() {
    try {
      const raw = global.sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setSession(user) {
    global.sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ userId: user.id, role: user.role, startedAt: new Date().toISOString() })
    );
  }

  function clearSession() {
    global.sessionStorage.removeItem(SESSION_KEY);
  }

  /** Текущий пользователь целиком (из «базы») либо null. */
  function currentUser() {
    const s = getSession();
    if (!s) return null;
    const user = DB.Users.findById(s.userId);
    if (!user || !user.is_active) {
      clearSession();
      return null;
    }
    return user;
  }

  function isLoggedIn() {
    return currentUser() !== null;
  }

  function isAdmin() {
    const u = currentUser();
    return !!u && u.role === "admin";
  }

  /* ----------------------------------------------------------------------
     Регистрация и вход
  ---------------------------------------------------------------------- */

  /** Проверка данных формы регистрации. Возвращает объект ошибок. */
  function validateRegistration({ fullName, email, phone, password, passwordRepeat, consent }) {
    const errors = {};

    if (!fullName || fullName.trim().length < 2) {
      errors.fullName = "Укажите имя (не менее 2 символов)";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || "").trim())) {
      errors.email = "Укажите корректный адрес электронной почты";
    }
    const phoneValue = String(phone || "").trim();
    if (phoneValue && !/^[\d\s()+-]{10,}$/.test(phoneValue)) {
      errors.phone = "Проверьте формат телефона";
    }
    if (!password || password.length < 6) {
      errors.password = "Пароль должен содержать не менее 6 символов";
    }
    if (password !== passwordRepeat) {
      errors.passwordRepeat = "Пароли не совпадают";
    }
    if (!consent) {
      errors.consent = "Нужно согласие с политикой конфиденциальности";
    }
    return errors;
  }

  /** Регистрация нового пользователя с ролью «садовод». */
  async function register(data) {
    const errors = validateRegistration(data);
    if (Object.keys(errors).length) return { ok: false, errors };

    const res = await DB.Users.create({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      password: data.password,
      role: "gardener",
    });

    if (!res.ok) return { ok: false, errors: { email: res.error } };

    setSession(res.user);
    return { ok: true, user: res.user };
  }

  /** Вход по email и паролю. */
  async function login(email, password) {
    const user = DB.Users.findByEmail(email);
    if (!user) {
      return { ok: false, error: "Пользователь с такой почтой не найден" };
    }
    if (!user.is_active) {
      return { ok: false, error: "Учётная запись заблокирована администратором" };
    }

    const hash = await DB.hashPassword(password);
    if (hash !== user.password_hash) {
      return { ok: false, error: "Неверный пароль" };
    }

    setSession(user);
    return { ok: true, user };
  }

  function logout() {
    clearSession();
    global.location.href = "index.html";
  }

  /* ----------------------------------------------------------------------
     Защита страниц
  ---------------------------------------------------------------------- */

  /**
   * Вызывается в начале личного кабинета. Если пользователь не вошёл —
   * перенаправляет на страницу входа. Если требуется роль admin, а её
   * нет — отправляет в обычный кабинет.
   */
  function requireAuth(requiredRole) {
    const user = currentUser();
    if (!user) {
      const back = encodeURIComponent(global.location.pathname.split("/").pop() || "index.html");
      global.location.replace("login.html?redirect=" + back);
      return null;
    }
    if (requiredRole === "admin" && user.role !== "admin") {
      global.location.replace("account.html");
      return null;
    }
    return user;
  }

  /* ----------------------------------------------------------------------
     Отображение состояния входа в шапке
  ---------------------------------------------------------------------- */

  /**
   * Подменяет кнопку «Оставить заявку» в навигации на блок пользователя,
   * если он вошёл. Разметку для этого добавлять на каждую страницу не
   * нужно — всё строится здесь.
   */
  function renderHeader() {
    const nav = document.querySelector(".main-nav");
    if (!nav) return;

    const slot = nav.querySelector(".nav-auth");
    if (!slot) return;

    const user = currentUser();

    if (!user) {
      slot.innerHTML =
        '<a href="login.html" class="nav-login">Войти</a>' +
        '<a href="register.html" class="btn btn-primary nav-cta">Регистрация</a>';
      return;
    }

    const cabinet = user.role === "admin" ? "admin.html" : "account.html";
    const label = user.role === "admin" ? "Панель администратора" : "Личный кабинет";
    const initial = (user.full_name || "?").trim().charAt(0).toUpperCase();

    slot.innerHTML =
      '<a href="' + cabinet + '" class="nav-user" title="' + label + '">' +
        '<span class="nav-user-avatar">' + initial + '</span>' +
        '<span class="nav-user-name">' + user.full_name.split(" ")[0] + '</span>' +
      '</a>' +
      '<button type="button" class="nav-logout" title="Выйти из аккаунта">Выйти</button>';

    const btn = slot.querySelector(".nav-logout");
    if (btn) btn.addEventListener("click", logout);
  }

  /* ----------------------------------------------------------------------
     Инициализация
  ---------------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", async () => {
    await DB.seed();      // создаём администратора при первом запуске
    renderHeader();
  });

  global.LycorisAuth = {
    register,
    login,
    logout,
    currentUser,
    isLoggedIn,
    isAdmin,
    requireAuth,
    renderHeader,
    validateRegistration,
  };
})(window);
