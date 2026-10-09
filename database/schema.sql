-- =============================================================================
--  ИНФОРМАЦИОННЫЙ ПОРТАЛ «LYCORIS»
--  Скрипт создания базы данных
--
--  СУБД:        MySQL 8.0 / MariaDB 10.5 и выше
--  Кодировка:   utf8mb4 (поддержка кириллицы и символов Unicode)
--  Движок:      InnoDB (поддержка внешних ключей и транзакций)
--
--  Порядок применения:
--     mysql -u root -p < schema.sql
--
--  Состав скрипта:
--     1. Создание базы данных и выбор кодировки
--     2. Создание таблиц в порядке зависимостей
--     3. Индексы для ускорения выборок
--     4. Представления (VIEW) для типовых отчётов
--     5. Контрольные (тестовые) данные
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. СОЗДАНИЕ БАЗЫ ДАННЫХ
-- -----------------------------------------------------------------------------
DROP DATABASE IF EXISTS lycoris_portal;
CREATE DATABASE lycoris_portal
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE lycoris_portal;


-- -----------------------------------------------------------------------------
-- 2. ТАБЛИЦЫ
-- -----------------------------------------------------------------------------

-- 2.1 Роли пользователей ------------------------------------------------------
-- Справочник ролей. Вынесен в отдельную таблицу, чтобы при расширении
-- системы (например, добавлении роли «питомник-партнёр») не менять
-- структуру таблицы пользователей.
CREATE TABLE roles (
    id          TINYINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Первичный ключ',
    code        VARCHAR(32)      NOT NULL                COMMENT 'Системный код роли (gardener, admin)',
    title       VARCHAR(64)      NOT NULL                COMMENT 'Название роли для интерфейса',
    description VARCHAR(255)     NULL                    COMMENT 'Пояснение прав роли',
    PRIMARY KEY (id),
    UNIQUE KEY uq_roles_code (code)
) ENGINE = InnoDB COMMENT = 'Справочник ролей пользователей';


-- 2.2 Пользователи ------------------------------------------------------------
-- Учётные записи. Пароль хранится исключительно в виде необратимого хеша;
-- в открытом виде он не сохраняется никогда.
CREATE TABLE users (
    id            INT UNSIGNED     NOT NULL AUTO_INCREMENT COMMENT 'Первичный ключ',
    role_id       TINYINT UNSIGNED NOT NULL                COMMENT 'Ссылка на роль',
    full_name     VARCHAR(120)     NOT NULL                COMMENT 'Имя пользователя',
    email         VARCHAR(160)     NOT NULL                COMMENT 'Электронная почта (служит логином)',
    phone         VARCHAR(32)      NULL                    COMMENT 'Контактный телефон',
    region        VARCHAR(120)     NULL                    COMMENT 'Регион или город проживания',
    password_hash CHAR(64)         NOT NULL                COMMENT 'Хеш пароля (SHA-256, 64 hex-символа)',
    is_active     BOOLEAN          NOT NULL DEFAULT TRUE   COMMENT 'Признак активности учётной записи',
    created_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Дата регистрации',
    updated_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                            ON UPDATE CURRENT_TIMESTAMP COMMENT 'Дата последнего изменения',
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_role (role_id),
    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES roles (id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB COMMENT = 'Учётные записи пользователей портала';


-- 2.3 Сорта ликориса ----------------------------------------------------------
-- Содержимое раздела «Энциклопедия сортов». Поля usda_min/usda_max,
-- height_cm и месяцы цветения используются умным фильтром (п. 4 ТЗ).
CREATE TABLE varieties (
    id           INT UNSIGNED    NOT NULL AUTO_INCREMENT COMMENT 'Первичный ключ',
    slug         VARCHAR(64)     NOT NULL                COMMENT 'Текстовый идентификатор (radiata, aurea)',
    name         VARCHAR(160)    NOT NULL                COMMENT 'Название сорта на русском языке',
    latin_name   VARCHAR(160)    NOT NULL                COMMENT 'Латинское ботаническое название',
    summary      TEXT            NULL                    COMMENT 'Краткое описание сорта',
    care_text    TEXT            NULL                    COMMENT 'Рекомендации по уходу',
    usda_min     TINYINT UNSIGNED NOT NULL               COMMENT 'Минимальная зона морозостойкости USDA',
    usda_max     TINYINT UNSIGNED NOT NULL               COMMENT 'Максимальная зона морозостойкости USDA',
    height_cm    SMALLINT UNSIGNED NOT NULL              COMMENT 'Высота цветоноса, см',
    bloom_start  TINYINT UNSIGNED NOT NULL               COMMENT 'Месяц начала цветения (1-12)',
    bloom_end    TINYINT UNSIGNED NOT NULL               COMMENT 'Месяц окончания цветения (1-12)',
    color_hex    CHAR(7)         NULL                    COMMENT 'Основной цвет лепестков (#RRGGBB)',
    photo_url    VARCHAR(500)    NULL                    COMMENT 'Ссылка на фотографию',
    photo_credit VARCHAR(255)    NULL                    COMMENT 'Автор и лицензия фотографии',
    is_published BOOLEAN         NOT NULL DEFAULT TRUE   COMMENT 'Отображать ли сорт на сайте',
    created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_varieties_slug (slug),
    KEY idx_varieties_filter (usda_min, height_cm, bloom_start),
    CONSTRAINT chk_varieties_usda  CHECK (usda_min BETWEEN 1 AND 13 AND usda_max BETWEEN 1 AND 13 AND usda_min <= usda_max),
    CONSTRAINT chk_varieties_bloom CHECK (bloom_start BETWEEN 1 AND 12 AND bloom_end BETWEEN 1 AND 12)
) ENGINE = InnoDB COMMENT = 'Каталог сортов ликориса';


-- 2.4 Питомники-партнёры ------------------------------------------------------
-- Точки продаж для раздела «Где купить». Координаты нужны для расстановки
-- маркеров на карте Яндекс.Карт (п. 4 ТЗ).
CREATE TABLE nurseries (
    id         INT UNSIGNED  NOT NULL AUTO_INCREMENT COMMENT 'Первичный ключ',
    name       VARCHAR(200)  NOT NULL                COMMENT 'Название питомника',
    city       VARCHAR(120)  NOT NULL                COMMENT 'Город (используется фильтром)',
    address    VARCHAR(300)  NOT NULL                COMMENT 'Почтовый адрес',
    phone      VARCHAR(32)   NULL                    COMMENT 'Контактный телефон',
    email      VARCHAR(160)  NULL                    COMMENT 'Электронная почта',
    latitude   DECIMAL(9,6)  NOT NULL                COMMENT 'Широта для карты',
    longitude  DECIMAL(9,6)  NOT NULL                COMMENT 'Долгота для карты',
    is_active  BOOLEAN       NOT NULL DEFAULT TRUE   COMMENT 'Действует ли партнёрство',
    created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_nurseries_city (city)
) ENGINE = InnoDB COMMENT = 'Питомники-партнёры портала';


-- 2.5 Ассортимент питомников (связь «многие ко многим») ------------------------
-- Какие сорта доступны в каком питомнике. Связывает varieties и nurseries.
CREATE TABLE nursery_varieties (
    nursery_id  INT UNSIGNED NOT NULL COMMENT 'Ссылка на питомник',
    variety_id  INT UNSIGNED NOT NULL COMMENT 'Ссылка на сорт',
    in_stock    BOOLEAN      NOT NULL DEFAULT TRUE COMMENT 'Наличие в продаже',
    price       DECIMAL(10,2) NULL   COMMENT 'Цена за луковицу, руб.',
    PRIMARY KEY (nursery_id, variety_id),
    KEY idx_nv_variety (variety_id),
    CONSTRAINT fk_nv_nursery
        FOREIGN KEY (nursery_id) REFERENCES nurseries (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_nv_variety
        FOREIGN KEY (variety_id) REFERENCES varieties (id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB COMMENT = 'Ассортимент сортов по питомникам';


-- 2.6 Заявки ------------------------------------------------------------------
-- Основная бизнес-сущность портала: заявки, которые передаются
-- питомникам-партнёрам (бизнес-модель из п. 1 ТЗ).
-- Поле user_id допускает NULL: заявку может оставить и незарегистрированный
-- посетитель. При удалении пользователя заявка сохраняется, но обезличивается.
CREATE TABLE leads (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Первичный ключ',
    user_id       INT UNSIGNED NULL                    COMMENT 'Автор заявки, если он авторизован',
    nursery_id    INT UNSIGNED NULL                    COMMENT 'Питомник, которому передана заявка',
    customer_name VARCHAR(120) NOT NULL                COMMENT 'Имя заказчика',
    contact       VARCHAR(160) NOT NULL                COMMENT 'Телефон или Telegram',
    region        VARCHAR(120) NOT NULL                COMMENT 'Регион или город заказчика',
    subject       VARCHAR(255) NULL                    COMMENT 'Интересующий сорт или питомник',
    comment       TEXT         NULL                    COMMENT 'Комментарий к заказу',
    order_type    ENUM('individual','wholesale') NOT NULL DEFAULT 'individual'
                                                      COMMENT 'Тип заявки: индивидуальная или оптовая',
    status        ENUM('new','in_work','done','rejected') NOT NULL DEFAULT 'new'
                                                      COMMENT 'Стадия обработки заявки',
    source_page   VARCHAR(160) NULL                    COMMENT 'Страница, с которой отправлена заявка',
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Дата поступления',
    processed_at  DATETIME     NULL                    COMMENT 'Дата обработки',
    PRIMARY KEY (id),
    KEY idx_leads_status  (status),
    KEY idx_leads_created (created_at),
    KEY idx_leads_user    (user_id),
    KEY idx_leads_nursery (nursery_id),
    CONSTRAINT fk_leads_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_leads_nursery
        FOREIGN KEY (nursery_id) REFERENCES nurseries (id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB COMMENT = 'Заявки посетителей портала';


-- 2.7 Избранные сорта ---------------------------------------------------------
-- Связь «многие ко многим» между пользователями и сортами.
-- Составной первичный ключ не допускает дубликатов.
CREATE TABLE favorites (
    user_id    INT UNSIGNED NOT NULL COMMENT 'Ссылка на пользователя',
    variety_id INT UNSIGNED NOT NULL COMMENT 'Ссылка на сорт',
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Дата добавления',
    PRIMARY KEY (user_id, variety_id),
    KEY idx_fav_variety (variety_id),
    CONSTRAINT fk_fav_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_fav_variety
        FOREIGN KEY (variety_id) REFERENCES varieties (id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB COMMENT = 'Избранные сорта пользователей';


-- 2.8 Календарь ухода ---------------------------------------------------------
-- Содержимое раздела «Календарь ухода»: задачи садовода по месяцам.
CREATE TABLE care_calendar (
    id         SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Первичный ключ',
    month_num  TINYINT UNSIGNED  NOT NULL                COMMENT 'Номер месяца (1-12)',
    season     ENUM('winter','spring','summer','autumn') NOT NULL COMMENT 'Сезон',
    task_text  VARCHAR(500)      NOT NULL                COMMENT 'Текст рекомендации',
    sort_order TINYINT UNSIGNED  NOT NULL DEFAULT 1      COMMENT 'Порядок вывода внутри месяца',
    PRIMARY KEY (id),
    KEY idx_care_month (month_num),
    CONSTRAINT chk_care_month CHECK (month_num BETWEEN 1 AND 12)
) ENGINE = InnoDB COMMENT = 'Календарь работ по уходу за растениями';


-- 2.9 Журнал входов -----------------------------------------------------------
-- Протокол попыток входа. Нужен для контроля безопасности и выявления
-- подбора пароля (требование п. 7 ТЗ о защите).
CREATE TABLE login_log (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Первичный ключ',
    user_id    INT UNSIGNED    NULL                    COMMENT 'Пользователь, если он найден',
    email      VARCHAR(160)    NOT NULL                COMMENT 'Введённый адрес почты',
    is_success BOOLEAN         NOT NULL                COMMENT 'Успешность попытки входа',
    ip_address VARCHAR(45)     NULL                    COMMENT 'IP-адрес (IPv4 или IPv6)',
    user_agent VARCHAR(255)    NULL                    COMMENT 'Браузер посетителя',
    created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Момент попытки',
    PRIMARY KEY (id),
    KEY idx_log_user (user_id),
    KEY idx_log_created (created_at),
    CONSTRAINT fk_log_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB COMMENT = 'Журнал попыток входа в систему';


-- -----------------------------------------------------------------------------
-- 3. ПРЕДСТАВЛЕНИЯ ДЛЯ ТИПОВЫХ ОТЧЁТОВ
-- -----------------------------------------------------------------------------

-- 3.1 Заявки с расшифровкой связанных сущностей (для панели администратора)
CREATE OR REPLACE VIEW v_leads_full AS
SELECT
    l.id,
    l.created_at,
    l.customer_name,
    l.contact,
    l.region,
    l.subject,
    l.order_type,
    l.status,
    u.full_name AS user_name,
    u.email     AS user_email,
    n.name      AS nursery_name
FROM leads l
LEFT JOIN users     u ON u.id = l.user_id
LEFT JOIN nurseries n ON n.id = l.nursery_id;

-- 3.2 Статистика по сортам: сколько раз сорт добавляли в избранное
CREATE OR REPLACE VIEW v_variety_popularity AS
SELECT
    v.id,
    v.name,
    v.latin_name,
    COUNT(f.user_id) AS favorites_count
FROM varieties v
LEFT JOIN favorites f ON f.variety_id = v.id
GROUP BY v.id, v.name, v.latin_name
ORDER BY favorites_count DESC;

-- 3.3 Сводка по обработке заявок
CREATE OR REPLACE VIEW v_leads_stats AS
SELECT
    COUNT(*)                                            AS total,
    SUM(status = 'new')                                 AS new_count,
    SUM(status = 'in_work')                             AS in_work_count,
    SUM(status = 'done')                                AS done_count,
    SUM(status = 'rejected')                            AS rejected_count,
    ROUND(SUM(status IN ('done','rejected')) * 100.0 / COUNT(*), 1) AS processed_percent
FROM leads;


-- -----------------------------------------------------------------------------
-- 4. КОНТРОЛЬНЫЕ ДАННЫЕ
-- -----------------------------------------------------------------------------

-- 4.1 Роли
INSERT INTO roles (id, code, title, description) VALUES
    (1, 'gardener', 'Садовод',       'Зарегистрированный пользователь: избранное, история заявок, профиль'),
    (2, 'admin',    'Администратор', 'Полный доступ: управление заявками, пользователями и контентом');

-- 4.2 Пользователи
-- Хеш соответствует паролю «admin123» (SHA-256).
INSERT INTO users (role_id, full_name, email, phone, region, password_hash) VALUES
    (2, 'Администратор портала', 'admin@lycoris.ru', '+7 (495) 123-45-67', 'Москва',
        '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'),
    (1, 'Анна Петрова',          'anna@lycoris.ru',  '+7 (900) 123-45-67', 'Москва',
        '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'),
    (1, 'Игорь Савельев',        'igor@lycoris.ru',  '+7 (921) 555-10-20', 'Санкт-Петербург',
        '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9');

-- 4.3 Сорта
INSERT INTO varieties (slug, name, latin_name, summary, care_text, usda_min, usda_max, height_cm, bloom_start, bloom_end, color_hex) VALUES
    ('radiata',   'Ликорис красный',    'Lycoris radiata',
     'Классическая «паучья лилия» с тонкими изогнутыми лепестками огненно-красного цвета.',
     'Светолюбив, переносит лёгкую полутень. Листья появляются после цветения — их не срезают.',
     6, 10, 50, 8, 9, '#E60000'),
    ('aurea',     'Ликорис золотистый', 'Lycoris aurea',
     'Крупные ярко-жёлтые соцветия с золотистым отливом, один из самых рослых видов.',
     'Требователен к теплу зимой: в зонах ниже 7 необходимо укрытие.',
     7, 10, 65, 9, 10, '#C9A227'),
    ('albiflora', 'Ликорис белоснежный','Lycoris x albiflora',
     'Природный гибрид красного и золотистого сортов с кремово-белыми соцветиями.',
     'Хорошо смотрится на тёмном фоне. Влаголюбив в период роста листвы.',
     6, 9, 45, 9, 9, '#F2F0EA'),
    ('squamigera','Ликорис розовый',    'Lycoris squamigera',
     'Самый морозостойкий вид рода, переносит зимы средней полосы без укрытия.',
     'Наименее прихотлив, подходит начинающим садоводам.',
     5, 9, 65, 7, 8, '#D98C9A'),
    ('sprengeri', 'Ликорис изящный',    'Lycoris sprengeri',
     'Редкий двухцветный сорт: розовые лепестки с голубовато-сиреневыми кончиками.',
     'Предпочитает лёгкую полутень в жарком климате.',
     6, 9, 40, 8, 8, '#B98FB0'),
    ('pumila',    'Ликорис карликовый', 'Lycoris radiata var. pumila',
     'Компактная и наиболее морозостойкая форма красного ликориса.',
     'Легко переносит зимовку под лёгким укрытием даже в зоне 6.',
     6, 9, 32, 9, 9, '#A80000');

-- 4.4 Питомники
INSERT INTO nurseries (name, city, address, phone, latitude, longitude) VALUES
    ('Сад Восточных Луковичных',        'Москва',          'Калужское шоссе, питомник «Виктория», уч. 14', '+7 (495) 120-40-11', 55.588000, 37.371000),
    ('Питомник «Лунный сад»',           'Москва',          'Новорижское шоссе, 23 км, тепличный комплекс',  '+7 (495) 220-18-04', 55.802000, 37.115000),
    ('СадЦентр «Северная Лилия»',       'Санкт-Петербург', 'Пушкинский р-н, Красносельское шоссе, 8',       '+7 (812) 448-22-90', 59.716000, 30.396000),
    ('Питомник «Кубанский Цветовод»',   'Краснодар',       'ст. Елизаветинская, ул. Садовая, 2',            '+7 (861) 275-63-18', 45.084000, 38.878000),
    ('Субтропический сад «Дендрарий+»', 'Сочи',            'Хостинский р-н, Тисо-самшитовая аллея, 5',      '+7 (862) 296-51-27', 43.567000, 39.729000),
    ('Уральский питомник луковичных',   'Екатеринбург',    'Сысертский р-н, тепличное хозяйство «Заречное»','+7 (343) 302-77-45', 56.792000, 60.612000),
    ('Садовый центр «Свияга»',          'Казань',          'Верхнеуслонский р-н, комплекс «Свияжск»',       '+7 (843) 231-09-56', 55.795000, 49.108000);

-- 4.5 Ассортимент питомников
INSERT INTO nursery_varieties (nursery_id, variety_id, in_stock, price) VALUES
    (1, 1, TRUE, 450.00), (1, 2, TRUE, 520.00), (1, 4, TRUE, 390.00),
    (2, 3, TRUE, 610.00), (2, 5, TRUE, 890.00), (2, 6, TRUE, 470.00),
    (3, 4, TRUE, 410.00), (3, 1, FALSE, 450.00),
    (4, 1, TRUE, 420.00), (4, 2, TRUE, 500.00), (4, 3, TRUE, 580.00), (4, 6, TRUE, 450.00),
    (5, 2, TRUE, 540.00), (5, 5, TRUE, 920.00),
    (6, 4, TRUE, 430.00), (6, 6, TRUE, 480.00),
    (7, 1, TRUE, 440.00), (7, 4, TRUE, 400.00);

-- 4.6 Календарь ухода (фрагмент: осенние месяцы — период цветения)
INSERT INTO care_calendar (month_num, season, task_text, sort_order) VALUES
    (9,  'autumn', 'Цветение красного и золотистого сортов. Идеальное время для посадки новых луковиц.', 1),
    (9,  'autumn', 'После цветения начинают отрастать листья — не убирайте их до весны.',                2),
    (10, 'autumn', 'Последняя волна цветения поздних сортов в тёплых регионах.',                         1),
    (10, 'autumn', 'Мульчируйте посадки перед похолоданием: 5-7 см коры или листового опада.',           2),
    (11, 'autumn', 'В зонах 5-6 укройте посадки лапником или агроволокном.',                             1),
    (11, 'autumn', 'Прекратите поливы, листва зимует под снегом зелёной.',                               2);

-- 4.7 Избранное
INSERT INTO favorites (user_id, variety_id) VALUES
    (2, 1), (2, 4), (3, 5);

-- 4.8 Заявки
INSERT INTO leads (user_id, nursery_id, customer_name, contact, region, subject, comment, order_type, status) VALUES
    (2,    1,    'Анна Петрова',   '+7 (900) 123-45-67', 'Москва',          'Ликорис красный',   'Нужно 50 луковиц к осенней посадке', 'individual', 'done'),
    (3,    3,    'Игорь Савельев', '+7 (921) 555-10-20', 'Санкт-Петербург', 'Ликорис изящный',   'Интересует коллекционный сорт',      'individual', 'in_work'),
    (NULL, NULL, 'Мария Волкова',  '@maria_garden',      'Казань',          NULL,                'Подскажите, что подойдёт для зоны 5','individual', 'new'),
    (NULL, 4,    'ООО «ЛандАрт»',  '+7 (861) 700-11-22', 'Краснодар',       'Ликорис золотистый','Оптовая закупка 500 шт. для проекта','wholesale',  'new');

-- 4.9 Журнал входов
INSERT INTO login_log (user_id, email, is_success, ip_address) VALUES
    (1,    'admin@lycoris.ru', TRUE,  '192.168.1.10'),
    (2,    'anna@lycoris.ru',  TRUE,  '192.168.1.24'),
    (NULL, 'anna@lycoris.ru',  FALSE, '192.168.1.24');


-- -----------------------------------------------------------------------------
-- 5. ПРОВЕРОЧНЫЕ ЗАПРОСЫ
-- -----------------------------------------------------------------------------
-- Выполняются после создания базы для проверки целостности данных.

-- 5.1 Сорта, подходящие для зоны 6 и высотой не более 50 см
-- SELECT name, usda_min, height_cm FROM varieties
--  WHERE usda_min <= 6 AND height_cm <= 50 AND is_published = TRUE;

-- 5.2 Новые заявки с расшифровкой
-- SELECT * FROM v_leads_full WHERE status = 'new' ORDER BY created_at DESC;

-- 5.3 Популярность сортов
-- SELECT * FROM v_variety_popularity;

-- 5.4 Где купить конкретный сорт
-- SELECT n.name, n.city, nv.price FROM nursery_varieties nv
--   JOIN nurseries n ON n.id = nv.nursery_id
--   JOIN varieties v ON v.id = nv.variety_id
--  WHERE v.slug = 'radiata' AND nv.in_stock = TRUE;

-- =============================================================================
-- КОНЕЦ СКРИПТА
-- =============================================================================
