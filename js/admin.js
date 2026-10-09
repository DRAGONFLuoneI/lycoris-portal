/* ==========================================================================
   ADMIN.JS — панель администратора (страница admin.html)

   Разделы: сводка, управление заявками, управление пользователями.
   Доступ только для роли admin — проверяется через requireAuth("admin").
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Страница доступна только администратору: обычного пользователя
  // requireAuth отправит в его собственный кабинет, гостя — на вход.
  const admin = window.LycorisAuth.requireAuth("admin");
  if (!admin) return;

  const DB = window.LycorisDB;

  const STATUS_LABEL = {
    new: "Новая",
    in_work: "В работе",
    done: "Обработана",
    rejected: "Отклонена",
  };

  function formatDateTime(iso) {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
      " " +
      d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    );
  }

  function esc(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  }

  /* ----------------------------------------------------------------------
     Шапка и вкладки
  ---------------------------------------------------------------------- */
  document.getElementById("adm-avatar").textContent =
    (admin.full_name || "A").trim().charAt(0).toUpperCase();
  document.getElementById("adm-email").textContent = admin.email;

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
     Сводка
  ---------------------------------------------------------------------- */
  function renderOverview() {
    const leads = DB.Leads.all();
    const users = DB.Users.all();
    const processed = leads.filter((l) => l.status === "done" || l.status === "rejected").length;

    document.getElementById("adm-leads-new").textContent =
      leads.filter((l) => l.status === "new").length;
    document.getElementById("adm-leads-total").textContent = leads.length;
    document.getElementById("adm-users").textContent = users.length;
    document.getElementById("adm-conv").textContent =
      leads.length ? Math.round((processed / leads.length) * 100) + "%" : "0%";
  }

  /* ----------------------------------------------------------------------
     Заявки
  ---------------------------------------------------------------------- */
  const leadSearch = document.getElementById("adm-lead-search");
  const leadStatus = document.getElementById("adm-lead-status");

  function renderLeads() {
    const root = document.getElementById("adm-leads-table");
    const query = leadSearch.value.trim().toLowerCase();
    const status = leadStatus.value;

    let leads = DB.Leads.all();
    if (status !== "all") leads = leads.filter((l) => l.status === status);
    if (query) {
      leads = leads.filter((l) =>
        [l.customer_name, l.contact, l.region, l.subject]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    if (!leads.length) {
      root.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/>
          </svg>
          <p>Заявок по заданным условиям не найдено.</p>
        </div>`;
      return;
    }

    const rows = leads
      .map(
        (l) => `
        <tr>
          <td class="cell-nowrap cell-muted">${formatDateTime(l.created_at)}</td>
          <td><strong>${esc(l.customer_name)}</strong><br><span class="cell-muted">${esc(l.contact)}</span></td>
          <td class="cell-muted">${esc(l.region)}</td>
          <td>${esc(l.subject) || '<span class="cell-muted">Общая заявка</span>'}
              ${l.comment ? '<br><span class="cell-muted">' + esc(l.comment) + "</span>" : ""}</td>
          <td class="cell-nowrap">${esc(l.order_type)}</td>
          <td class="cell-nowrap">
            <select class="table-select" data-status-for="${l.id}" aria-label="Статус заявки">
              ${Object.entries(STATUS_LABEL)
                .map(
                  ([v, label]) =>
                    `<option value="${v}"${l.status === v ? " selected" : ""}>${label}</option>`
                )
                .join("")}
            </select>
          </td>
          <td class="cell-nowrap">
            <button type="button" class="table-action" data-delete-lead="${l.id}">Удалить</button>
          </td>
        </tr>`
      )
      .join("");

    root.innerHTML = `
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Дата</th><th>Заказчик</th><th>Регион</th><th>Интересует</th>
              <th>Тип</th><th>Статус</th><th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    // Смена статуса заявки
    root.querySelectorAll("[data-status-for]").forEach((sel) => {
      sel.addEventListener("change", () => {
        DB.Leads.setStatus(sel.dataset.statusFor, sel.value);
        renderOverview();
        renderLeads();
      });
    });

    // Удаление заявки
    root.querySelectorAll("[data-delete-lead]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!confirm("Удалить заявку? Действие необратимо.")) return;
        DB.Leads.remove(btn.dataset.deleteLead);
        renderOverview();
        renderLeads();
      });
    });
  }

  leadSearch.addEventListener("input", renderLeads);
  leadStatus.addEventListener("change", renderLeads);

  /* ----------------------------------------------------------------------
     Пользователи
  ---------------------------------------------------------------------- */
  const userSearch = document.getElementById("adm-user-search");

  function renderUsers() {
    const root = document.getElementById("adm-users-table");
    const query = userSearch.value.trim().toLowerCase();

    let users = DB.Users.all();
    if (query) {
      users = users.filter((u) =>
        (u.full_name + " " + u.email).toLowerCase().includes(query)
      );
    }

    if (!users.length) {
      root.innerHTML = '<div class="empty-state"><p>Пользователей по запросу не найдено.</p></div>';
      return;
    }

    const rows = users
      .map((u) => {
        const leadCount = DB.Leads.byUser(u.id).length;
        const favCount = DB.Favorites.byUser(u.id).length;
        const isSelf = u.id === admin.id;
        return `
        <tr>
          <td><strong>${esc(u.full_name)}</strong>${isSelf ? ' <span class="cell-muted">(вы)</span>' : ""}</td>
          <td class="cell-muted">${esc(u.email)}</td>
          <td class="cell-muted cell-nowrap">${esc(u.phone) || "—"}</td>
          <td class="cell-nowrap">${u.role === "admin" ? "Администратор" : "Садовод"}</td>
          <td class="cell-nowrap">${leadCount} / ${favCount}</td>
          <td class="cell-nowrap">
            <span class="status-chip ${u.is_active ? "status-done" : "status-rejected"}">
              ${u.is_active ? "Активен" : "Заблокирован"}
            </span>
          </td>
          <td class="cell-nowrap">
            ${
              isSelf
                ? '<span class="cell-muted">—</span>'
                : `<button type="button" class="table-action" data-toggle-user="${u.id}">${
                    u.is_active ? "Заблокировать" : "Разблокировать"
                  }</button>`
            }
          </td>
        </tr>`;
      })
      .join("");

    root.innerHTML = `
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Имя</th><th>Почта</th><th>Телефон</th><th>Роль</th>
              <th>Заявок / избранного</th><th>Статус</th><th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    root.querySelectorAll("[data-toggle-user]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.toggleUser);
        const u = DB.Users.findById(id);
        DB.Users.setActive(id, !u.is_active);
        renderUsers();
      });
    });
  }

  userSearch.addEventListener("input", renderUsers);

  /* ----------------------------------------------------------------------
     Выгрузка данных (аналог экспорта в Excel из п. 6 ТЗ)
  ---------------------------------------------------------------------- */
  document.getElementById("adm-export").addEventListener("click", () => {
    const blob = new Blob([DB.exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lycoris-data-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  /* ---- Запуск ---------------------------------------------------------- */
  renderOverview();
  renderLeads();
  renderUsers();
});
