/* ==========================================================================
   CATALOG.JS
   «Умный фильтр сортов» (п.4 ТЗ) — «Энциклопедия сортов» (п.3 ТЗ).
   Данные берутся из window.LYCORIS_VARIETIES (см. js/data.js).
   ========================================================================== */

const MONTH_NAMES = ["", "янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("catalog-grid");
  if (!grid) return;

  const zoneSelect = document.getElementById("filter-zone");
  const heightRange = document.getElementById("filter-height");
  const heightOutput = document.getElementById("filter-height-value");
  const bloomSelect = document.getElementById("filter-bloom");
  const resetBtn = document.getElementById("filter-reset");
  const countEl = document.getElementById("catalog-count");

  function applyFilters() {
    const zone = Number(zoneSelect.value);
    const maxHeight = Number(heightRange.value);
    const bloomMonth = Number(bloomSelect.value);

    heightOutput.textContent = `до ${maxHeight} см`;

    const filtered = window.LYCORIS_VARIETIES.filter((v) => {
      const zoneOk = zone === 0 || v.usdaMin <= zone;
      const heightOk = v.heightCm <= maxHeight;
      const bloomOk = bloomMonth === 0 || (bloomMonth >= v.bloomStart && bloomMonth <= v.bloomEnd);
      return zoneOk && heightOk && bloomOk;
    });

    renderGrid(grid, filtered);
    attachPhotoFallbacks(grid);
    attachFavoriteToggles(grid);
    countEl.textContent = `Показано ${filtered.length} из ${window.LYCORIS_VARIETIES.length} сортов`;
  }

  [zoneSelect, heightRange, bloomSelect].forEach((el) =>
    el.addEventListener("input", applyFilters)
  );

  resetBtn.addEventListener("click", () => {
    zoneSelect.value = "0";
    heightRange.value = "70";
    bloomSelect.value = "0";
    applyFilters();
  });

  applyFilters();
});

function renderGrid(grid, varieties) {
  if (varieties.length === 0) {
    grid.innerHTML = `
      <div class="catalog-empty">
        <p>По этим параметрам сортов не найдено. Попробуйте расширить диапазон фильтра.</p>
      </div>`;
    return;
  }
  grid.innerHTML = varieties.map(varietyCardTemplate).join("");
}

function varietyCardTemplate(v) {
  const bloomLabel = v.bloomStart === v.bloomEnd
    ? MONTH_NAMES[v.bloomStart]
    : `${MONTH_NAMES[v.bloomStart]}–${MONTH_NAMES[v.bloomEnd]}`;

  // Если для сорта найдено фото с открытой лицензией — показываем его и
  // подпись с указанием источника. Если нет (или фото не загрузится —
  // см. attachPhotoFallbacks) — используем детализированную SVG-иллюстрацию.
  const mediaContent = v.photo
    ? `<img class="variety-photo" data-variety-id="${v.id}" src="${v.photo.src}"
         alt="${v.name} (${v.latin})" loading="lazy" />
       <a class="photo-credit" href="${v.photo.creditUrl}" target="_blank" rel="noopener noreferrer">
         Фото: ${v.photo.credit} · ${v.photo.license}
       </a>`
    : flowerIllustration(v.gradient);

  // Кнопка «в избранное» показывается только авторизованному пользователю:
  // избранное привязано к учётной записи (таблица favorites).
  const user = window.LycorisAuth ? window.LycorisAuth.currentUser() : null;
  const isFav = user ? window.LycorisDB.Favorites.has(user.id, v.id) : false;
  const favButton = user
    ? `<button type="button" class="fav-toggle${isFav ? " is-active" : ""}"
         data-fav="${v.id}"
         aria-pressed="${isFav}"
         title="${isFav ? "Убрать из избранного" : "Добавить в избранное"}">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
           <path d="M12 21s-7-4.6-9.3-9A5.3 5.3 0 0 1 12 6.6 5.3 5.3 0 0 1 21.3 12c-2.3 4.4-9.3 9-9.3 9Z"/>
         </svg>
       </button>`
    : "";

  return `
    <article class="variety-card card-enter">
      <div class="variety-media" style="--variety-color:${v.hex}" data-variety-id="${v.id}">
        ${favButton}
        ${mediaContent}
      </div>
      <div class="variety-body">
        <p class="variety-latin">${v.latin}</p>
        <h3>${v.name}</h3>
        <p class="variety-summary">${v.summary}</p>
        <dl class="variety-stats">
          <div><dt>Зона USDA</dt><dd>${v.usdaMin}–${v.usdaMax}</dd></div>
          <div><dt>Высота</dt><dd>${v.heightCm} см</dd></div>
          <div><dt>Цветение</dt><dd>${bloomLabel}</dd></div>
        </dl>
        <p class="variety-care"><strong>Уход:</strong> ${v.care}</p>
        <button type="button" class="btn btn-outline btn-block" data-open-modal data-variety="${v.name}">
          Узнать о наличии у партнёров
        </button>
      </div>
    </article>`;
}

/**
 * Если фото сорта (внешняя ссылка на Wikimedia Commons) не загрузилось —
 * например, нет интернета или файл переименовали — прозрачно подменяем
 * его на детализированную векторную иллюстрацию, чтобы карточка никогда
 * не показывала «битую» картинку.
 */
/**
 * Навешивает обработчики на кнопки «в избранное». Запись добавляется или
 * удаляется в «таблице» favorites, привязанной к текущему пользователю.
 */
function attachFavoriteToggles(grid) {
  const user = window.LycorisAuth ? window.LycorisAuth.currentUser() : null;
  if (!user) return;

  grid.querySelectorAll("[data-fav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const res = window.LycorisDB.Favorites.toggle(user.id, btn.dataset.fav);
      btn.classList.toggle("is-active", res.added);
      btn.setAttribute("aria-pressed", String(res.added));
      btn.title = res.added ? "Убрать из избранного" : "Добавить в избранное";
    });
  });
}

function attachPhotoFallbacks(grid) {
  grid.querySelectorAll("img.variety-photo[data-variety-id]").forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        const variety = window.LYCORIS_VARIETIES.find((v) => v.id === img.dataset.varietyId);
        const media = img.closest(".variety-media");
        if (variety && media) {
          media.innerHTML = flowerIllustration(variety.gradient);
        }
      },
      { once: true }
    );
  });
}

/**
 * Детализированная векторная иллюстрация ЗОНТИКА ликориса (несколько
 * цветков вокруг общего центра, как в реальном соцветии) — 6 маленьких
 * цветков по 6 лепестков и 6 длинных изогнутых тычинок каждый, плюс
 * стебель. Раскрашивается под конкретный сорт через gradientStops
 * (3 цвета: горло → середина → кончик лепестка).
 */
let flowerIconSeed = 0;

function rotVec(x, y, deg) {
  const a = (deg * Math.PI) / 180;
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
}

function bezPoint(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return [
    mt ** 3 * p0[0] + 3 * mt ** 2 * t * p1[0] + 3 * mt * t ** 2 * p2[0] + t ** 3 * p3[0],
    mt ** 3 * p0[1] + 3 * mt ** 2 * t * p1[1] + 3 * mt * t ** 2 * p2[1] + t ** 3 * p3[1],
  ];
}

function bezTangent(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  return [
    3 * mt ** 2 * (p1[0] - p0[0]) + 6 * mt * t * (p2[0] - p1[0]) + 3 * t ** 2 * (p3[0] - p2[0]),
    3 * mt ** 2 * (p1[1] - p0[1]) + 6 * mt * t * (p2[1] - p1[1]) + 3 * t ** 2 * (p3[1] - p2[1]),
  ];
}

/** Гладкая изогнутая ось (кубическая кривая Безье) + гофрированный
    (волнистый) край — имитирует мятый/гофрированный лепесток настоящего
    ликориса, а не просто гладкую ленту. */
function makePetal(cx, cy, angleDeg, length, maxWidth, recurveDeg, rippleAmp, phase) {
  const aTip = angleDeg + recurveDeg;
  const P0 = [cx, cy];
  const d1 = rotVec(length * 0.42, 0, angleDeg);
  const P1 = [cx + d1[0], cy + d1[1]];
  const d2 = rotVec(length * 0.78, 0, angleDeg + recurveDeg * 0.55);
  const P2 = [cx + d2[0], cy + d2[1]];
  const dtip = rotVec(length, 0, aTip);
  const P3 = [cx + dtip[0], cy + dtip[1]];

  const N = 20;
  const rightPts = [];
  const leftPts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const [cxp, cyp] = bezPoint(P0, P1, P2, P3, t);
    const [tx, ty] = bezTangent(P0, P1, P2, P3, t);
    const tl = Math.hypot(tx, ty) || 1;
    const nx = -ty / tl, ny = tx / tl;
    const envelope = t < 0.22 ? t / 0.22 : Math.max(0, 1 - (t - 0.22) / 0.78) ** 0.8;
    const ripple =
      1 + rippleAmp * Math.sin(t * 3.4 * Math.PI * 2 + phase) * Math.min(1, t / 0.15) * Math.min(1, (1 - t) / 0.05 + 0.3);
    let w = maxWidth * envelope * Math.max(ripple, 0.35);
    w = Math.max(w, 0.3);
    rightPts.push([cxp + (nx * w) / 2, cyp + (ny * w) / 2]);
    leftPts.push([cxp - (nx * w) / 2, cyp - (ny * w) / 2]);
  }
  const pts = rightPts.concat(leftPts.reverse());
  const f = (n) => n.toFixed(1);
  const d = `M${f(pts[0][0])},${f(pts[0][1])} ` + pts.slice(1).map((p) => `L${f(p[0])},${f(p[1])}`).join(" ") + " Z";
  const vm = bezPoint(P0, P1, P2, P3, 0.5);
  const vt = bezPoint(P0, P1, P2, P3, 0.85);
  const vein = `M${f(cx)},${f(cy)} Q${f(vm[0])},${f(vm[1])} ${f(vt[0])},${f(vt[1])}`;
  return { d, vein };
}

/** Длинная изогнутая тычинка с пыльником на конце. */
function makeStamen(cx, cy, angleDeg, length, bendDeg) {
  const aTip = angleDeg + bendDeg;
  const P0 = [cx, cy];
  const d1 = rotVec(length * 0.5, 0, angleDeg);
  const P1 = [cx + d1[0], cy + d1[1]];
  const d2 = rotVec(length * 0.85, 0, angleDeg + bendDeg * 0.6);
  const P2 = [cx + d2[0], cy + d2[1]];
  const dtip = rotVec(length, 0, aTip);
  const P3 = [cx + dtip[0], cy + dtip[1]];
  const f = (n) => n.toFixed(1);
  const d = `M${f(P0[0])},${f(P0[1])} C${f(P1[0])},${f(P1[1])} ${f(P2[0])},${f(P2[1])} ${f(P3[0])},${f(P3[1])}`;
  return { d, ax: P3[0], ay: P3[1], angle: aTip };
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Детализированная иллюстрация ЗОНТИКА ликориса — несколько цветков
 * (по умолчанию 6) вокруг общего центра, как в реальном соцветии: у
 * каждого цветка 6 гладких изогнутых лепестков и 6 длинных тычинок с
 * пыльниками, плюс стебель. Раскрашивается под сорт через gradientStops
 * (3 цвета: горло → середина → кончик лепестка).
 */
function flowerIllustration(gradientStops, options) {
  const opts = options || {};
  const floretCount = opts.floretCount || 6;
  const gid = `flowerGrad-${flowerIconSeed++}`;
  const [c1, c2, c3] = gradientStops;
  const CX = 300, CY = 320;
  const STAMEN_COLOR = "#e8ddc8"; // бледные, почти белые тычинки — как у настоящего ликориса
  const ANTHER_COLOR = "#3a2018"; // тёмный пыльник на конце тычинки

  const florets = [];
  for (let i = 0; i < floretCount; i++) {
    const baseAngle = i * (360 / floretCount) + rand(-8, 8);
    const offsetR = rand(8, 14);
    const [ox, oy] = rotVec(offsetR, 0, baseAngle);
    florets.push({ fx: CX + ox, fy: CY + oy, rot: baseAngle + rand(-14, 14), scale: rand(0.9, 1.1) });
  }

  const petals = [], veins = [], stamens = [];
  florets.forEach(({ fx, fy, rot, scale }) => {
    for (let k = 0; k < 6; k++) {
      const ang = rot + k * 60 + rand(-3, 3);
      const { d, vein } = makePetal(fx, fy, ang, 108 * scale, 24 * scale, 34, 0.5, rand(0, 6.28));
      petals.push(d);
      veins.push(vein);
    }
    for (let k = 0; k < 6; k++) {
      const ang = rot + 30 + k * 60 + rand(-8, 8);
      const { d, ax, ay, angle } = makeStamen(fx, fy, ang, rand(175, 215), rand(-28, 28));
      stamens.push({ d, ax, ay, angle });
    }
  });

  const stemTopY = CY + 10;
  const stemD =
    `M${CX - 4},${stemTopY} C${CX - 5},${stemTopY + 90} ${CX + 2},${stemTopY + 160} ${CX},${stemTopY + 230} ` +
    `L${CX + 8},${stemTopY + 230} C${CX + 10},${stemTopY + 160} ${CX + 5},${stemTopY + 90} ${CX + 5},${stemTopY} Z`;

  const petalMarkup = petals.map((d) => `<path d="${d}" />`).join("");
  const veinMarkup = veins.map((d) => `<path d="${d}" />`).join("");
  const stamenMarkup = stamens
    .map(
      (s) =>
        `<path d="${s.d}" /><ellipse cx="${s.ax.toFixed(1)}" cy="${s.ay.toFixed(1)}" rx="3.4" ry="2.2" fill="${ANTHER_COLOR}" transform="rotate(${s.angle.toFixed(1)} ${s.ax.toFixed(1)} ${s.ay.toFixed(1)})" />`
    )
    .join("");

  return `
  <svg class="flower-illustration" viewBox="60 40 480 520" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="${gid}" cx="${CX}" cy="${CY}" r="120" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${c1}" />
        <stop offset="55%" stop-color="${c2}" />
        <stop offset="100%" stop-color="${c3}" />
      </radialGradient>
    </defs>
    <path d="${stemD}" fill="#3d5c3a" />
    <g stroke="${STAMEN_COLOR}" stroke-width="1.3" stroke-linecap="round" fill="none" opacity="0.95">${stamenMarkup}</g>
    <g fill="url(#${gid})" stroke="${c3}" stroke-width="0.4" stroke-opacity="0.5">${petalMarkup}</g>
    <g stroke="rgba(0,0,0,0.22)" stroke-width="0.5" fill="none">${veinMarkup}</g>
    <circle cx="${CX}" cy="${CY}" r="9" fill="#3d5c3a" />
  </svg>`;
}

/* Делаем генератор иллюстрации доступным другим страницам (личный кабинет
   рисует им карточки избранных сортов). */
window.flowerIllustration = flowerIllustration;
