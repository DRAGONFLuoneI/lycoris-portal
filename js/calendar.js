/* ==========================================================================
   CALENDAR.JS
   «Календарь ухода» (п.3 ТЗ) — интерактивный гид по месяцам:
   посадка, полив, обрезка, подготовка к зиме.
   ========================================================================== */

const CARE_CALENDAR = [
  { m: 1, name: "Январь", season: "winter", tasks: [
    "Период покоя — луковицы в грунте, вмешательство не требуется.",
    "В контейнерной культуре проверьте, что земляной ком не пересыхает полностью.",
  ]},
  { m: 2, name: "Февраль", season: "winter", tasks: [
    "Осмотрите укрытие после оттепелей — не допускайте застоя талой воды.",
    "Планируйте состав грядки и заказ новых сортов на сезон.",
  ]},
  { m: 3, name: "Март", season: "spring", tasks: [
    "Постепенно снимайте зимнее укрытие по мере схода снега.",
    "Появляются розетки листьев у видов, цветущих осенью, — не срезайте их.",
  ]},
  { m: 4, name: "Апрель", season: "spring", tasks: [
    "Активный рост листвы — внесите комплексное удобрение с азотом.",
    "Рыхлите почву вокруг куртин, не задевая луковицы.",
  ]},
  { m: 5, name: "Май", season: "spring", tasks: [
    "Лучшее время для деления и пересадки разросшихся гнёзд луковиц.",
    "Полив по мере подсыхания верхнего слоя почвы, без переувлажнения.",
  ]},
  { m: 6, name: "Июнь", season: "summer", tasks: [
    "Листва отмирает у летне-осенних видов — это норма, дайте ей пожелтеть естественно.",
    "Не поливайте участок в период покоя листвы — луковица уходит на отдых.",
  ]},
  { m: 7, name: "Июль", season: "summer", tasks: [
    "Начало цветения Lycoris squamigera — обеспечьте умеренный полив в жару.",
    "Срежьте отцветшие цветоносы, чтобы растение не тратило силы на семена.",
  ]},
  { m: 8, name: "Август", season: "summer", tasks: [
    "Пик цветения большинства сортов — цветонос появляется раньше листьев.",
    "Подкормка калийно-фосфорным удобрением поддержит закладку цветочных почек.",
  ]},
  { m: 9, name: "Сентябрь", season: "autumn", tasks: [
    "Цветение красного и золотистого сортов. Идеальное время для посадки новых луковиц.",
    "После цветения начинают отрастать листья — не убирайте их до весны.",
  ]},
  { m: 10, name: "Октябрь", season: "autumn", tasks: [
    "Последняя волна цветения поздних сортов в тёплых регионах.",
    "Мульчируйте посадки перед похолоданием — 5-7 см коры или листового опада.",
  ]},
  { m: 11, name: "Ноябрь", season: "autumn", tasks: [
    "Подготовка к зиме: в зонах 5-6 укройте посадки лапником или агроволокном.",
    "Прекратите поливы, листва продолжает зимовать под снегом зелёной.",
  ]},
  { m: 12, name: "Декабрь", season: "winter", tasks: [
    "Проверьте укрытие после первых сильных морозов, при необходимости усильте.",
    "Плановый отдых — луковицы и корни набираются сил под снежным покровом.",
  ]},
];

const SEASON_LABEL = { winter: "Зима · покой", spring: "Весна · рост", summer: "Лето · развитие", autumn: "Осень · цветение" };

document.addEventListener("DOMContentLoaded", () => {
  const wheel = document.getElementById("calendar-wheel");
  const panel = document.getElementById("calendar-panel");
  if (!wheel || !panel) return;

  // Строим 12 кнопок-месяцев, расставленных по кругу через CSS custom property.
  const bloomMonths = [7, 8, 9, 10];
  wheel.innerHTML = CARE_CALENDAR.map(
    (item, i) => `
    <button type="button"
      class="cal-month season-${item.season}${bloomMonths.includes(item.m) ? " is-bloom" : ""}"
      style="--i:${i}"
      data-month="${item.m}"
      aria-label="${item.name}">
      <span>${item.name.slice(0, 3)}</span>
    </button>`
  ).join("");

  const buttons = wheel.querySelectorAll(".cal-month");

  function selectMonth(monthNum, { silent = false } = {}) {
    const data = CARE_CALENDAR.find((c) => c.m === monthNum);
    if (!data) return;

    buttons.forEach((b) => b.classList.toggle("is-active", Number(b.dataset.month) === monthNum));

    panel.classList.remove("is-visible");
    const render = () => {
      panel.innerHTML = `
        <span class="cal-season-tag season-${data.season}">${SEASON_LABEL[data.season]}</span>
        <h3>${data.name}</h3>
        <ul class="cal-task-list">
          ${data.tasks.map((t) => `<li>${t}</li>`).join("")}
        </ul>`;
      requestAnimationFrame(() => panel.classList.add("is-visible"));
    };
    if (silent) render();
    else setTimeout(render, 160);
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => selectMonth(Number(btn.dataset.month)));
  });

  // Открываем календарь на текущем месяце — приятная деталь персонализации.
  const currentMonth = new Date().getMonth() + 1;
  selectMonth(currentMonth, { silent: true });
});
