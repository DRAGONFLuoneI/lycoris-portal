/* ==========================================================================
   DB.JS — клиентский слой доступа к данным (Data Access Layer)

   НАЗНАЧЕНИЕ
   Этот модуль имитирует работу с реляционной базой данных на стороне
   браузера. Структура «таблиц» здесь один в один повторяет схему из
   файла database/schema.sql — те же сущности, те же поля, те же связи
   по внешним ключам. Благодаря этому при подключении настоящего
   сервера достаточно заменить тела методов на fetch()-запросы к API,
   не меняя остальной код сайта.

   ХРАНИЛИЩЕ
   Данные лежат в localStorage браузера под ключом LYCORIS_DB одним
   JSON-объектом вида { users: [...], leads: [...], favorites: [...] }.
   Это постоянное хранилище: записи сохраняются после закрытия вкладки
   и перезагрузки страницы, но они привязаны к конкретному браузеру
   конкретного устройства.

   ОГРАНИЧЕНИЯ (важно для защиты проекта)
   Клиентское хранилище не является заменой серверной БД: данные видны
   и доступны для изменения через инструменты разработчика, не
   разделяются между устройствами и не защищены от подделки. Поэтому
   модуль реализован как прототип уровня представления, а эталонная
   схема данных вынесена в SQL-скрипт (см. database/schema.sql).
   ========================================================================== */

(function (global) {
  "use strict";

  const STORAGE_KEY = "LYCORIS_DB";

  /** Пустая структура «базы» — повторяет перечень таблиц из schema.sql. */
  function emptyDb() {
    return {
      meta: { version: 1, createdAt: new Date().toISOString() },
      users: [],      // соответствует таблице users
      leads: [],      // соответствует таблице leads
      favorites: [],  // соответствует таблице favorites
    };
  }

  /** Чтение всей «базы» из localStorage. */
  function read() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyDb();
      const parsed = JSON.parse(raw);
      // страхуемся от повреждённых/устаревших данных
      return Object.assign(emptyDb(), parsed);
    } catch (e) {
      console.warn("[Lycoris DB] Не удалось прочитать хранилище, создаётся новое:", e);
      return emptyDb();
    }
  }

  /** Запись всей «базы» обратно в localStorage. */
  function write(db) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      return true;
    } catch (e) {
      console.error("[Lycoris DB] Не удалось сохранить данные:", e);
      return false;
    }
  }

  /** Генерация первичного ключа — аналог AUTO_INCREMENT в SQL. */
  function nextId(rows) {
    return rows.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0) + 1;
  }

  /**
   * Хеширование пароля алгоритмом SHA-256 через Web Crypto API.
   * В открытом виде пароль не хранится никогда — в «таблице» users
   * лежит только значение password_hash, как и предусмотрено схемой БД.
   * Примечание: в промышленной системе применяется bcrypt/Argon2 с солью
   * на стороне сервера; SHA-256 выбран как доступный в браузере аналог.
   */
  async function hashPassword(password) {
    const data = new TextEncoder().encode(password);
    const buffer = await global.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /* ----------------------------------------------------------------------
     Операции с таблицей USERS
  ---------------------------------------------------------------------- */
  const Users = {
    /** SELECT * FROM users */
    all() {
      return read().users;
    },

    /** SELECT * FROM users WHERE email = ? */
    findByEmail(email) {
      const needle = String(email || "").trim().toLowerCase();
      return read().users.find((u) => u.email === needle) || null;
    },

    /** SELECT * FROM users WHERE id = ? */
    findById(id) {
      return read().users.find((u) => u.id === Number(id)) || null;
    },

    /**
     * INSERT INTO users (...) VALUES (...)
     * Возвращает { ok: true, user } либо { ok: false, error }.
     */
    async create({ fullName, email, phone, password, role }) {
      const db = read();
      const mail = String(email).trim().toLowerCase();

      if (db.users.some((u) => u.email === mail)) {
        return { ok: false, error: "Пользователь с такой почтой уже зарегистрирован" };
      }

      const user = {
        id: nextId(db.users),
        full_name: String(fullName).trim(),
        email: mail,
        phone: String(phone || "").trim(),
        password_hash: await hashPassword(password),
        role: role === "admin" ? "admin" : "gardener",
        region: "",
        created_at: new Date().toISOString(),
        is_active: true,
      };

      db.users.push(user);
      write(db);
      return { ok: true, user };
    },

    /** UPDATE users SET ... WHERE id = ? */
    update(id, fields) {
      const db = read();
      const user = db.users.find((u) => u.id === Number(id));
      if (!user) return { ok: false, error: "Пользователь не найден" };

      // поля, которые разрешено менять из личного кабинета
      ["full_name", "phone", "region"].forEach((key) => {
        if (key in fields) user[key] = String(fields[key]).trim();
      });

      write(db);
      return { ok: true, user };
    },

    /** Смена пароля с проверкой текущего. */
    async changePassword(id, currentPassword, newPassword) {
      const db = read();
      const user = db.users.find((u) => u.id === Number(id));
      if (!user) return { ok: false, error: "Пользователь не найден" };

      const currentHash = await hashPassword(currentPassword);
      if (user.password_hash !== currentHash) {
        return { ok: false, error: "Текущий пароль указан неверно" };
      }

      user.password_hash = await hashPassword(newPassword);
      write(db);
      return { ok: true };
    },

    /** Блокировка/разблокировка учётной записи (действие администратора). */
    setActive(id, isActive) {
      const db = read();
      const user = db.users.find((u) => u.id === Number(id));
      if (!user) return { ok: false, error: "Пользователь не найден" };
      user.is_active = !!isActive;
      write(db);
      return { ok: true, user };
    },

    /** DELETE FROM users WHERE id = ? (вместе со связанными записями) */
    remove(id) {
      const db = read();
      const uid = Number(id);
      db.users = db.users.filter((u) => u.id !== uid);
      db.favorites = db.favorites.filter((f) => f.user_id !== uid);
      // заявки не удаляем, а обезличиваем — они нужны для статистики
      db.leads.forEach((l) => { if (l.user_id === uid) l.user_id = null; });
      write(db);
      return { ok: true };
    },
  };

  /* ----------------------------------------------------------------------
     Операции с таблицей LEADS (заявки)
  ---------------------------------------------------------------------- */
  const Leads = {
    /** SELECT * FROM leads ORDER BY created_at DESC */
    all() {
      return read().leads.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
    },

    /** SELECT * FROM leads WHERE user_id = ? */
    byUser(userId) {
      return this.all().filter((l) => l.user_id === Number(userId));
    },

    /** INSERT INTO leads (...) VALUES (...) */
    create(payload) {
      const db = read();
      const lead = {
        id: nextId(db.leads),
        user_id: payload.user_id ? Number(payload.user_id) : null,
        customer_name: String(payload.name || "").trim(),
        contact: String(payload.contact || "").trim(),
        region: String(payload.region || "").trim(),
        subject: String(payload.context || "").trim(),   // интересующий сорт/питомник
        comment: String(payload.comment || "").trim(),
        order_type: payload.orderType || "Индивидуальный",
        source_page: payload.sourcePage || "",
        status: "new",                                    // new | in_work | done | rejected
        created_at: new Date().toISOString(),
      };
      db.leads.push(lead);
      write(db);
      return { ok: true, lead };
    },

    /** UPDATE leads SET status = ? WHERE id = ? (действие администратора) */
    setStatus(id, status) {
      const allowed = ["new", "in_work", "done", "rejected"];
      if (!allowed.includes(status)) return { ok: false, error: "Недопустимый статус" };
      const db = read();
      const lead = db.leads.find((l) => l.id === Number(id));
      if (!lead) return { ok: false, error: "Заявка не найдена" };
      lead.status = status;
      write(db);
      return { ok: true, lead };
    },

    /** DELETE FROM leads WHERE id = ? */
    remove(id) {
      const db = read();
      db.leads = db.leads.filter((l) => l.id !== Number(id));
      write(db);
      return { ok: true };
    },
  };

  /* ----------------------------------------------------------------------
     Операции с таблицей FAVORITES (избранные сорта)
  ---------------------------------------------------------------------- */
  const Favorites = {
    /** SELECT variety_id FROM favorites WHERE user_id = ? */
    byUser(userId) {
      return read().favorites.filter((f) => f.user_id === Number(userId));
    },

    has(userId, varietyId) {
      return read().favorites.some(
        (f) => f.user_id === Number(userId) && f.variety_id === String(varietyId)
      );
    },

    /** Добавить/убрать сорт из избранного. Возвращает новое состояние. */
    toggle(userId, varietyId) {
      const db = read();
      const uid = Number(userId);
      const vid = String(varietyId);
      const idx = db.favorites.findIndex((f) => f.user_id === uid && f.variety_id === vid);

      let added;
      if (idx >= 0) {
        db.favorites.splice(idx, 1);
        added = false;
      } else {
        db.favorites.push({
          id: nextId(db.favorites),
          user_id: uid,
          variety_id: vid,
          created_at: new Date().toISOString(),
        });
        added = true;
      }
      write(db);
      return { ok: true, added };
    },
  };

  /* ----------------------------------------------------------------------
     Служебные операции
  ---------------------------------------------------------------------- */

  /**
   * Первичное наполнение: создаёт учётную запись администратора,
   * если «база» пуста. Логин и пароль намеренно простые — это
   * демонстрационный стенд (указано на странице входа).
   */
  async function seed() {
    const db = read();
    if (db.users.length > 0) return;
    await Users.create({
      fullName: "Администратор портала",
      email: "admin@lycoris.ru",
      phone: "+7 (495) 123-45-67",
      password: "admin123",
      role: "admin",
    });
    console.info("[Lycoris DB] Создана учётная запись администратора по умолчанию");
  }

  /** Полная очистка хранилища — удобно для демонстрации и отладки. */
  function reset() {
    global.localStorage.removeItem(STORAGE_KEY);
  }

  /** Выгрузка всей «базы» в JSON-файл (аналог экспорта в Excel из ТЗ). */
  function exportJson() {
    return JSON.stringify(read(), null, 2);
  }

  global.LycorisDB = {
    Users,
    Leads,
    Favorites,
    seed,
    reset,
    exportJson,
    hashPassword,
    STORAGE_KEY,
  };
})(window);
