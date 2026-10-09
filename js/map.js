/* ==========================================================================
   MAP.JS
   «Интерактивная карта (API Яндекс.Карт)» (п.3, п.4 ТЗ).

   КАК ПОДКЛЮЧИТЬ РЕАЛЬНУЮ КАРТУ:
   1. Получите бесплатный API-ключ JavaScript API и HTTP Геокодера:
      https://developer.tech.yandex.ru/services/
   2. В файле map.html найдите строку:
         <script src="https://api-maps.yandex.ru/2.1/?apikey=YOUR_YANDEX_MAPS_API_KEY&lang=ru_RU">
      и замените YOUR_YANDEX_MAPS_API_KEY на свой ключ.
   3. Готово — этот файл сам определит, что ymaps доступен, и построит карту.

   Пока ключ не подключён (или недоступен интернет), скрипт автоматически
   показывает аккуратный список питомников с фильтром по городу —
   сайт остаётся полностью рабочим и без карты.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const mapRoot = document.getElementById("nursery-map");
  const listRoot = document.getElementById("nursery-list");
  const citySelect = document.getElementById("filter-city");
  if (!listRoot || !citySelect) return;

  const nurseries = window.PARTNER_NURSERIES || [];
  populateCityFilter(citySelect, nurseries);

  let yandexMapInstance = null;
  let placemarks = [];

  // Пытаемся дождаться ymaps ограниченное время; если апи-ключ не подключен,
  // скрипт api-maps.yandex.ru не выполнится вовсе — тогда работаем со списком.
  const mapReadyTimeout = setTimeout(() => showFallbackNotice(mapRoot), 1500);

  if (window.ymaps) {
    window.ymaps.ready(() => {
      clearTimeout(mapReadyTimeout);
      yandexMapInstance = new window.ymaps.Map(mapRoot, {
        center: [56.5, 45], // условный центр между городами присутствия
        zoom: 4,
        controls: ["zoomControl", "fullscreenControl"],
      });
      placemarks = nurseries.map((n) => createPlacemark(n));
      placemarks.forEach((p) => yandexMapInstance.geoObjects.add(p));
      mapRoot.classList.add("is-ready");
    });
  }

  function createPlacemark(nursery) {
    return new window.ymaps.Placemark(
      [nursery.lat, nursery.lng],
      {
        balloonContentHeader: `<strong>${nursery.name}</strong>`,
        balloonContentBody: `${nursery.address}<br>${nursery.phone}`,
      },
      { preset: "islands#redDotIcon" }
    );
  }

  function renderList(filterCity) {
    const filtered = filterCity === "all" ? nurseries : nurseries.filter((n) => n.city === filterCity);
    listRoot.innerHTML = filtered.length
      ? filtered.map(nurseryCardTemplate).join("")
      : `<p class="catalog-empty">В этом городе пока нет партнёров — оставьте заявку, и мы подскажем ближайший вариант.</p>`;

    if (yandexMapInstance && placemarks.length) {
      placemarks.forEach((p, i) => {
        p.options.set("visible", filterCity === "all" || nurseries[i].city === filterCity);
      });
    }
  }

  citySelect.addEventListener("change", () => renderList(citySelect.value));
  renderList("all");
});

function populateCityFilter(select, nurseries) {
  const cities = [...new Set(nurseries.map((n) => n.city))].sort();
  select.innerHTML =
    `<option value="all">Все города</option>` +
    cities.map((c) => `<option value="${c}">${c}</option>`).join("");
}

function showFallbackNotice(mapRoot) {
  if (!mapRoot || mapRoot.classList.contains("is-ready")) return;
  mapRoot.innerHTML = `
    <div class="map-fallback">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32">
        <path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11Z"/>
        <circle cx="12" cy="10" r="2.5"/>
      </svg>
      <p>Карта появится здесь после подключения API-ключа Яндекс.Карт.<br>
      Полный список партнёров — ниже, с фильтром по городу.</p>
    </div>`;
}

function nurseryCardTemplate(n) {
  const varietyNames = (n.varieties || [])
    .map((id) => window.LYCORIS_VARIETIES.find((v) => v.id === id)?.name)
    .filter(Boolean);

  return `
    <article class="nursery-card card-enter">
      <div class="nursery-card-head">
        <h3>${n.name}</h3>
        <span class="badge">${n.city}</span>
      </div>
      <p class="nursery-address">${n.address}</p>
      <p class="nursery-varieties">${varietyNames.join(" · ")}</p>
      <div class="nursery-card-foot">
        <a class="btn-ghost" href="tel:${n.phone.replace(/[^\d+]/g, "")}">${n.phone}</a>
        <button type="button" class="btn btn-outline" data-open-modal data-variety="${n.name}, ${n.city}">Оставить заявку</button>
      </div>
    </article>`;
}
