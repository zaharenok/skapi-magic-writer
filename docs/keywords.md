# Skool Magic Writer — ключевые запросы Chrome Web Store

Обновлено: 2026-11-04. Карточка: https://chromewebstore.google.com/detail/skool-magic-writer-%E2%80%94-ai-p/flpjgiibdkolidnhnfiiihbnhpcfifii
Baseline на момент правки: 1 установка, 0 оценок, категория Workflow & Planning.

## Как ранжирует CWS (факты)

- Порядок веса текстовых сигналов: **имя → short description → detailed description**. Плюс установки, рейтинг, свежесть отзывов.
- Keyword stuffing = [Keyword Spam policy](https://developer.chrome.com/docs/webstore/best-listing) → отклонение правок или suspension. Правило: каждый ключ ≤2 раз на поле, никаких перечислений ключей через запятую.
- Тексты должны читаться живым языком: без «supercharge», «ultimate», «seamless», «unleash». Конкретика вместо превосходных степеней.

## 10 основных ключей (EN)

| # | Ключ | Интент | Где зашит |
|---|------|--------|-----------|
| 1 | skool | бренд-хед | Name |
| 2 | skool chrome extension | навигационный | Detailed, 1-я строка |
| 3 | ai writer | дифференциатор | Name + Short + Detailed |
| 4 | ai post generator | генерация | Detailed (✨) |
| 5 | post scheduler | инструмент | Name + Short + Detailed (📅) |
| 6 | schedule skool posts | задача | Detailed (📅) |
| 7 | skool community owners | аудитория | Detailed, 1-я строка |
| 8 | community manager | аудитория | Detailed (новый абзац) |
| 9 | content calendar | смежный спрос | Detailed (🗂) |
| 10 | gif | ниша | Short + Detailed (🎬) |

## RU-ключи (ru-локаль витрины)

расширение для skool · ии-писатель · генератор постов ии · планировщик постов · отложенные посты skool · контент-календарь · комьюнити-менеджер skool · skool расписание · gif к постам · skool посты

## Watchlist (НЕ зашивать в тексты)

- `skool automation`, `skool tools`, `skool crm` — территория конкурентов; наша фича (AI-генерация) шире не становится от этих слов.
- Чужие бренды (ChatGPT, Grammarly, StickyHive, Skool on Autopilot, Skool Extensions) — нарушение Keyword Spam / trademark policy, риск отклонения.

## Замеры позиций

Раз в 2 недели, incognito: поиск по каждому ключу EN (интерфейс EN) и RU (интерфейс RU), записать позицию карточки или «не найдено».

| Ключ | Baseline 2026-11-04 | +2 нед | +4 нед |
|------|--------------------|--------|--------|
| skool | 39 | | |
| skool chrome extension | не найдено (все 33 результатов проверены) | | |
| ai writer | не найдено (топ-~108) | | |
| ai post generator | не найдено (топ-~109) | | |
| post scheduler | 63 | | |
| schedule skool posts | 5 | | |
| skool community owners | не найдено (все 25 результатов проверены) | | |
| community manager | не найдено (топ-~105) | | |
| content calendar | не найдено (топ-~109) | | |
| gif | не найдено (топ-~108) | | |
| расширение для skool (RU) | 11 | | |
| ии-писатель (RU) | не найдено (топ-~108) | | |
| генератор постов ии (RU) | не найдено (все 56 результатов проверены) | | |
| планировщик постов (RU) | не найдено (все 28 результатов проверены) | | |
| отложенные посты skool (RU) | 1 | | |
| контент-календарь (RU) | не найдено (все 55 результатов проверены) | | |
| комьюнити-менеджер skool (RU) | не найдено (единственный результат — не мы) | | |
| skool расписание (RU) | 1 | | |
| gif к постам (RU) | 8 | | |
| skool посты (RU) | 2 | | |

Замер прекращал после ~110 загруженных результатов (10 нажатий «Load more»); «топ-~N» = карточка не найдена в загруженных, дальше не копали.

Дополнительно: Google-поиск `site:chromewebstore.google.com skool` — видна ли карточка в индексе.

## Phase B (следующий релиз v1.1.42+, не срочно)

Синхронизировать хвосты `extName` в `_locales/*/messages.json` с новыми именами листинга (сейчас там старый «AI Posts & Scheduling» / «ИИ-посты и расписание»). Делается вместе с ближайшим функциональным релизом, отдельный релиз ради этого не поднимать.

## Anti-patterns (проверка перед каждой правкой текстов)

- Каждый ключ ≤2 раз на поле; ключи в естественных фразах, не списком.
- Без «supercharge / ultimate / seamless / unleash / elevate».
- Прочитать вслух: если фраза звучит как пресс-релиз — переписать.

## Статус проверки текстов (2026-11-04)

- Лимиты: 11/11 Name ≤45 (39–44), Short ≤132 (114–130) — зелёный.
- EN-ключи: 7/7 фраз найдено в `### en`; стемы в Detailed: writer 2, scheduler 1, generator 1, calendar 2, community 4.
- **Принятое отклонение:** `community` = 4 при норме ≤2. Два из четырёх — обязательные ключи (`community owners`, `community managers`), два — естественная проза (`content calendar for your community`, `growing the community is on you`). Политика Keyword Spam запрещает списки ключей и бессмысленное повторение, не слово «community» в описании тула для сообществ. Решение Олега: тексты оставить дословно. При следующей правке текстов — перепрогнать счётчики и помнить про этот лимит.
