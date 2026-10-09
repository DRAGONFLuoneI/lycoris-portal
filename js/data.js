/* ==========================================================================
   DATA.JS
   Единственный источник данных о сортах и питомниках-партнёрах.
   В реальном проекте этот файл заменяется на запрос к API/CMS —
   структура объектов при этом может остаться такой же.
   ========================================================================== */

/**
 * Энциклопедия сортов Ликориса.
 * usdaMin/usdaMax — зона морозостойкости USDA (чем меньше номер, тем сорт морозостойче).
 * heightCm — высота цветоноса в см.
 * bloomStart/bloomEnd — месяцы цветения (1 = январь ... 12 = декабрь).
 */
const LYCORIS_VARIETIES = [
  {
    id: "radiata",
    name: "Ликорис красный",
    latin: "Lycoris radiata",
    colorKey: "red",
    hex: "#E60000",
    // Градиент для векторной иллюстрации (используется как основа и как fallback,
    // если фото не загрузится): от центра цветка (throat) к кончику лепестка (tip).
    gradient: ["#ff9a86", "#e83c2e", "#a80000"],
    // Реальная фотография с открытой лицензией (Wikimedia Commons).
    // Если по какой-то причине не загрузится — сайт автоматически покажет
    // векторную иллюстрацию вместо неё (см. js/catalog.js, onerror).
    photo: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Red%20Spider%20Lily----Lycoris%20radiata.jpg?width=900",
      credit: "Wikimedia Commons",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Red_Spider_Lily----Lycoris_radiata.jpg",
      license: "CC BY-SA 4.0",
    },
    usdaMin: 6, usdaMax: 10,
    heightCm: 50,
    bloomStart: 8, bloomEnd: 9,
    summary: "Классическая «паучья лилия» — тонкие изогнутые лепестки огненно-красного цвета, распускаются внезапно на голом цветоносе до появления листьев.",
    care: "Светолюбив, но переносит лёгкую полутень. Предпочитает рыхлую, хорошо дренированную почву. Листья появляются после цветения и сохраняются до весны — не срезайте их.",
  },
  {
    id: "aurea",
    name: "Ликорис золотистый",
    latin: "Lycoris aurea",
    colorKey: "gold",
    hex: "#C9A227",
    gradient: ["#fff3c4", "#e0ac2e", "#a67c00"],
    photo: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Lycoris%20aurea.jpg?width=900",
      credit: "USDA ARS",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Lycoris_aurea.jpg",
      license: "Public Domain",
    },
    usdaMin: 7, usdaMax: 10,
    heightCm: 65,
    bloomStart: 9, bloomEnd: 10,
    summary: "Крупные ярко-жёлтые соцветия с золотистым отливом. Один из самых рослых видов, эффектен в групповых посадках вдоль дорожек.",
    care: "Требователен к теплу зимой — в регионах с зоной ниже 7 рекомендуется укрытие или выращивание в контейнере с зимовкой в помещении.",
  },
  {
    id: "albiflora",
    name: "Ликорис белоснежный",
    latin: "Lycoris × albiflora",
    colorKey: "white",
    hex: "#F2F0EA",
    gradient: ["#ffffff", "#f2ece0", "#d9cdb0"],
    photo: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Equinox%20Flower%20or%20Lycoris.jpg?width=900",
      credit: "Wikimedia Commons",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Equinox_Flower_or_Lycoris.jpg",
      license: "CC BY-SA 3.0",
    },
    usdaMin: 6, usdaMax: 9,
    heightCm: 45,
    bloomStart: 9, bloomEnd: 9,
    summary: "Природный гибрид красного и золотистого сортов. Соцветия кремово-белые, иногда с лёгким розовым оттенком у основания лепестков.",
    care: "Хорошо смотрится на тёмном фоне — туи, самшит. Влаголюбив в период активного роста листвы весной.",
  },
  {
    id: "squamigera",
    name: "Ликорис розовый «Воскрешающая лилия»",
    latin: "Lycoris squamigera",
    colorKey: "pink",
    hex: "#D98C9A",
    gradient: ["#ffe1e8", "#f2a0b8", "#c85f7a"],
    photo: {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Lycoris%20squamigera.jpg?width=900",
      credit: "Wikimedia Commons",
      creditUrl: "https://commons.wikimedia.org/wiki/File:Lycoris_squamigera.jpg",
      license: "CC BY-SA 3.0",
    },
    usdaMin: 5, usdaMax: 9,
    heightCm: 65,
    bloomStart: 7, bloomEnd: 8,
    summary: "Самый морозостойкий вид рода — переносит зимы средней полосы без укрытия. Нежно-розовые ароматные соцветия появляются в середине лета.",
    care: "Наименее прихотлив в культуре. Подходит новичкам. Место посадки не менять несколько лет — луковица наращивает силу постепенно.",
  },
  {
    id: "sprengeri",
    name: "Ликорис изящный",
    latin: "Lycoris sprengeri",
    colorKey: "bicolor",
    hex: "#B98FB0",
    // У этого сорта нет собственного фото с чистой открытой лицензией на Wikimedia
    // Commons на момент сборки сайта — используется детализированная векторная
    // иллюстрация с фирменным розово-голубым переходом, характерным для сорта.
    gradient: ["#ffd0dd", "#e485ab", "#6f7fd6"],
    usdaMin: 6, usdaMax: 9,
    heightCm: 40,
    bloomStart: 8, bloomEnd: 8,
    summary: "Редкий двухцветный сорт: розовые лепестки с голубовато-сиреневыми кончиками. Коллекционная позиция для ценителей необычных луковичных.",
    care: "Предпочитает лёгкую полутень в жарком климате — прямые полуденные лучи могут обесцвечивать окраску лепестков.",
  },
  {
    id: "pumila",
    name: "Ликорис карликовый",
    latin: "Lycoris radiata var. pumila",
    colorKey: "deepred",
    hex: "#A80000",
    gradient: ["#ff7a68", "#d81f1f", "#6e0000"],
    usdaMin: 6, usdaMax: 9,
    heightCm: 32,
    bloomStart: 9, bloomEnd: 9,
    summary: "Компактная и наиболее морозостойкая форма красного ликориса. Идеален для бордюров, альпинариев и контейнерного выращивания.",
    care: "Благодаря компактности легко переносит зимовку под лёгким укрытием даже в зоне 6. Ежегодно образует дочерние луковицы.",
  },
];

/**
 * Питомники-партнёры для страницы «Где купить».
 * lat/lng — координаты для карты; при подключении реального Яндекс.Карт API
 * они передаются напрямую в конструктор геообъекта (см. js/map.js).
 */
const PARTNER_NURSERIES = [
  {
    id: "np-msk-1",
    name: "Сад Восточных Луковичных",
    city: "Москва",
    address: "Калужское шоссе, питомник «Виктория», уч. 14",
    phone: "+7 (495) 120-40-11",
    lat: 55.588, lng: 37.371,
    varieties: ["radiata", "aurea", "squamigera"],
  },
  {
    id: "np-msk-2",
    name: "Питомник «Лунный сад»",
    city: "Москва",
    address: "Новорижское шоссе, 23 км, тепличный комплекс",
    phone: "+7 (495) 220-18-04",
    lat: 55.802, lng: 37.115,
    varieties: ["albiflora", "sprengeri", "pumila"],
  },
  {
    id: "np-spb-1",
    name: "СадЦентр «Северная Лилия»",
    city: "Санкт-Петербург",
    address: "Пушкинский р-н, Красносельское шоссе, 8",
    phone: "+7 (812) 448-22-90",
    lat: 59.716, lng: 30.396,
    varieties: ["squamigera", "radiata"],
  },
  {
    id: "np-krd-1",
    name: "Питомник «Кубанский Цветовод»",
    city: "Краснодар",
    address: "ст. Елизаветинская, ул. Садовая, 2",
    phone: "+7 (861) 275-63-18",
    lat: 45.084, lng: 38.878,
    varieties: ["radiata", "aurea", "albiflora", "pumila"],
  },
  {
    id: "np-soc-1",
    name: "Субтропический сад «Дендрарий+»",
    city: "Сочи",
    address: "Хостинский р-н, Тисо-самшитовая аллея, 5",
    phone: "+7 (862) 296-51-27",
    lat: 43.567, lng: 39.729,
    varieties: ["aurea", "sprengeri"],
  },
  {
    id: "np-ekb-1",
    name: "Уральский питомник луковичных",
    city: "Екатеринбург",
    address: "Сысертский р-н, тепличное хозяйство «Заречное»",
    phone: "+7 (343) 302-77-45",
    lat: 56.792, lng: 60.612,
    varieties: ["squamigera", "pumila"],
  },
  {
    id: "np-kzn-1",
    name: "Садовый центр «Свияга»",
    city: "Казань",
    address: "Верхнеуслонский р-н, тепличный комплекс «Свияжск»",
    phone: "+7 (843) 231-09-56",
    lat: 55.795, lng: 49.108,
    varieties: ["radiata", "squamigera"],
  },
];

/* Делаем данные доступными для остальных скриптов страницы (без модулей,
   чтобы сайт открывался напрямую из файловой системы, без сервера). */
window.LYCORIS_VARIETIES = LYCORIS_VARIETIES;
window.PARTNER_NURSERIES = PARTNER_NURSERIES;
