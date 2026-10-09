/* ==========================================================================
   CALCULATOR.JS
   «Калькулятор луковиц» (п.4 ТЗ).
   Пользователь вводит площадь клумбы в м², скрипт считает необходимое
   количество луковиц по схеме посадки 12×12 см — стандарт для Ликориса,
   обеспечивающий кустам место для разрастания за 2-3 сезона.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", initBulbCalculator);

const PLANTING_STEP_M = 0.12; // 12 см = 0.12 м — шаг посадки по ТЗ
const AREA_PER_BULB_M2 = PLANTING_STEP_M * PLANTING_STEP_M; // площадь на 1 луковицу
const RESERVE_RATIO = 0.08; // рекомендованный запас на пересадку/потери, 8%

function initBulbCalculator() {
  const form = document.getElementById("bulb-calculator");
  if (!form) return;

  const areaInput = form.querySelector("#calc-area");
  const areaSlider = form.querySelector("#calc-area-slider");
  const resultCount = form.querySelector("#calc-result-count");
  const resultGrid = form.querySelector("#calc-result-grid");
  const resultReserve = form.querySelector("#calc-result-reserve");

  const update = (value) => {
    const area = Math.max(0, Number(value) || 0);
    const rawBulbs = area / AREA_PER_BULB_M2;
    const bulbs = Math.ceil(rawBulbs);
    const reserve = Math.ceil(rawBulbs * RESERVE_RATIO);
    const side = Math.round(Math.sqrt(area) / PLANTING_STEP_M);

    animateNumber(resultCount, bulbs);
    resultGrid.textContent = area > 0 ? `≈ ${side} × ${side} луковиц в ряд` : "—";
    resultReserve.textContent = area > 0 ? `+${reserve} шт. в запас` : "";
  };

  areaInput.addEventListener("input", (e) => {
    areaSlider.value = e.target.value;
    update(e.target.value);
  });
  areaSlider.addEventListener("input", (e) => {
    areaInput.value = e.target.value;
    update(e.target.value);
  });

  update(areaInput.value);
}

/** Плавно "прокручивает" число к целевому значению — приятный микро-эффект. */
function animateNumber(el, target) {
  const start = Number(el.dataset.value || 0);
  const duration = 350;
  const startTime = performance.now();

  function frame(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(start + (target - start) * eased);
    el.textContent = value;
    if (progress < 1) requestAnimationFrame(frame);
    else el.dataset.value = target;
  }
  requestAnimationFrame(frame);
}
