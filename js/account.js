/* ==========================================================================
   ACCOUNT.JS — личный кабинет садовода (страница account.html)

   Разделы: обзор, избранные сорта, мои заявки, настройки профиля.
   Все данные читаются через слой js/db.js.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Страница доступна только авторизованному пользователю.
  // Если сессии нет — requireAuth сам отправит на страницу входа.
  const user = window.LycorisAuth.requireAuth();
  if (!user) return;

  const DB = window.LycorisDB;

  const MONTHS = ["", "янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  const STATUS_LABEL = {
    new: "Новая",
    in_work: "В работе",
    done: "Обработана",
    rejected: "Отклонена",
  };

  /** Дата в виде «09.10.2026». */
  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  /** Экранирование пользовательского текста перед вставкой в разметку. */
  function esc(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  }

  /* ----------------------------------------------------------------------
     Шапка кабинета
  ---------------------------------------------------------------------- */
  function renderIdentity() {
    const fresh = DB.Users.findById(user.id);
    document.getElementById("acc-avatar").textContent =
      (fresh.full_name || "?").trim().charAt(0).toUpperCase();
    document.getElementById("acc-name").innerHTML =
      esc(fresh.full_name) + '<span class="role-badge role-badge--gardener">Садовод</span>';
    document.getElementById("acc-email").textContent = fresh.email;
  }

  /* ----------------------------------------------------------------------
     Вкладки
  ---------------------------------------------------------------------- */
  const tabs = document.querySelectorAll(".account-tab");
  const panels = document.querySelectorAll(".account-panel");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.toggle("is-active", t === tab));
      panels.forEach((p) =>
        p.classList.toggle("is-active", p.dataset.panel === tab.dataset.tab)
      );
    });
  });

  /* ----------------------------------------------------------------------
     Обзор
  ---------------------------------------------------------------------- */
  function renderOverview() {
    const favs = DB.Favorites.byUser(user.id);
    const leads = DB.Leads.byUser(user.id);
    const inWork = leads.filter((l) => l.status === "new" || l.status === "in_work").length;
    const fresh = DB.Users.findById(user.id);

    document.getElementById("stat-fav").textContent = favs.length;
    document.getElementById("stat-leads").textContent = leads.length;
    document.getElementById("stat-leads-work").textContent = inWork;

    const d = new Date(fresh.created_at);
    document.getElementById("stat-since").textContent =
      d.getDate() + " " + MONTHS[d.getMonth() + 1];
  }

  /* ----------------------------------------------------------------------
     Избранные сорта
  ---------------------------------------------------------------------- */
  function renderFavorites() {
    const root = document.getElementById("fav-list");
    const favs = DB.Favorites.byUser(user.id);

    if (!favs.length) {
      root.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path d="M12 21s-7-4.6-9.3-9A5.3 5.3 0 0 1 12 6.6 5.3 5.3 0 0 1 21.3 12c-2.3 4.4-9.3 9-9.3 9Z"/>
          </svg>
          <p>В избранном пока пусто. Откройте энциклопедию и отметьте сорта, которые вам приглянулись.</p>
          <a href="catalog.html" class="btn btn-outline">Перейти в энциклопедию</a>
        </div>`;
      return;
    }

    const varieties = window.LYCORIS_VARIETIES || [];
    const cards = favs
      .map((f) => varieties.find((v) => v.id === f.variety_id))
      .filter(Boolean)
      .map((v) => {
        const bloom =
          v.bloomStart === v.bloomEnd
            ? MONTHS[v.bloomStart]
            : MONTHS[v.bloomStart] + "–" + MONTHS[v.bloomEnd];
        return `
          <article class="fav-card">
            <div class="fav-card-media">${window.flowerIllustration
              ? window.flowerIllustration(v.gradient)
              : ""}</div>
            <div class="fav-card-body">
              <p class="fav-latin">${esc(v.latin)}</p>
              <h3>${esc(v.name)}</h3>
              <p class="fav-meta">Зона USDA ${v.usdaMin}–${v.usdaMax} · ${v.heightCm} см · цветение ${bloom}</p>
              <button type="button" class="fav-remove" data-remove="${esc(v.id)}">Убрать из избранного</button>
            </div>
          </article>`;
      })
      .join("");

    root.innerHTML = '<div class="fav-grid">' + cards + "</div>";

    root.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        DB.Favorites.toggle(user.id, btn.dataset.remove);
        renderFavorites();
        renderOverview();
      });
    });
  }

  /* ----------------------------------------------------------------------
     Мои заявки
  ---------------------------------------------------------------------- */
  function renderLeads() {
    const root = document.getElementById("leads-list");
    const leads = DB.Leads.byUser(user.id);

    if (!leads.length) {
      root.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/>
          </svg>
          <p>Вы ещё не оставляли заявок. Заполните форму — и она появится здесь вместе со статусом обработки.</p>
          <a href="contact.html" class="btn btn-outline">Оставить заявку</a>
        </div>`;
      return;
    }

    const rows = leads
      .map(
        (l) => `
        <tr>
          <td class="cell-nowrap">${formatDate(l.created_at)}</td>
          <td>${esc(l.subject) || '<span class="cell-muted">Общая заявка</span>'}</td>
          <td class="cell-muted">${esc(l.region)}</td>
          <td class="cell-muted">${esc(l.comment) || "—"}</td>
          <td class="cell-nowrap"><span class="status-chip status-${l.status}">${STATUS_LABEL[l.status]}</span></td>
        </tr>`
      )
      .join("");

    root.innerHTML = `
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Дата</th><th>Интересует</th><th>Регион</th><th>Комментарий</th><th>Статус</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  /* ----------------------------------------------------------------------
     Настройки профиля
  ---------------------------------------------------------------------- */
  function initSettings() {
    const fresh = DB.Users.findById(user.id);
    const form = document.getElementById("profile-form");
    const success = document.getElementById("profile-success");

    form.full_name.value = fresh.full_name;
    form.phone.value = fresh.phone || "";
    form.region.value = fresh.region || "";
    document.getElementById("pf-email").value = fresh.email;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      success.classList.remove("is-visible");
      form.querySelectorAll(".field").forEach((f) => f.classList.remove("has-error"));

      const name = form.full_name.value.trim();
      const phone = form.phone.value.trim();

      let bad = false;
      if (name.length < 2) {
        form.full_name.closest(".field").classList.add("has-error");
        bad = true;
      }
      if (phone && !/^[\d\s()+-]{10,}$/.test(phone)) {
        form.phone.closest(".field").classList.add("has-error");
        bad = true;
      }
      if (bad) return;

      DB.Users.update(user.id, {
        full_name: name,
        phone: phone,
        region: form.region.value,
      });

      success.classList.add("is-visible");
      renderIdentity();
      window.LycorisAuth.renderHeader();
    });

    // --- Смена пароля ---
    const pwForm = document.getElementById("password-form");
    const pwSuccess = document.getElementById("password-success");
    const pwAlert = document.getElementById("password-alert");

    pwForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      pwSuccess.classList.remove("is-visible");
      pwAlert.classList.remove("is-visible");
      pwForm.querySelectorAll(".field").forEach((f) => f.classList.remove("has-error"));

      const current = pwForm.current.value;
      const next = pwForm.next.value;
      const repeat = pwForm.repeat.value;

      let bad = false;
      if (!current) { pwForm.current.closest(".field").classList.add("has-error"); bad = true; }
      if (next.length < 6) { pwForm.next.closest(".field").classList.add("has-error"); bad = true; }
      if (next !== repeat) { pwForm.repeat.closest(".field").classList.add("has-error"); bad = true; }
      if (bad) return;

      const res = await DB.Users.changePassword(user.id, current, next);
      if (!res.ok) {
        pwAlert.textContent = res.error;
        pwAlert.classList.add("is-visible");
        return;
      }

      pwForm.reset();
      pwSuccess.classList.add("is-visible");
    });
  }

  /* ---- Запуск ---------------------------------------------------------- */
  renderIdentity();
  renderOverview();
  renderFavorites();
  renderLeads();
  initSettings();
});
