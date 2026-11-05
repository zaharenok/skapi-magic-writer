# Google Ads keywords — Skool Magic Writer

Обновлено: 2026-11-05. Источник частот: Google Ads Keyword Planner API (реальные данные, US/RU/DE базы, GOOGLE_SEARCH network). Суммы — средние за 12 мес; для аккаунтов с малым расходом Google бакетит малые объёмы в 0 → «0» здесь значит «почти никто не ищет, <~10/мес», а не «точно ноль».

Важно: это **поисковые кампании Google Ads** (лендинг/карточка CWS как посадочная), НЕ ASO для Chrome Store (то — `docs/keywords.md`).

## Главная ловушка ниши

Запрос `skool` (165K/мес US) на 80%+ загрязнён ботинками **Vans Old Skool** и школами. В выдаче идей по `skool*` почти всё — «vans old skool black», «knu skool» и т.п. Поэтому:

- **Обязательно** минус-слова с первого дня: `vans`, `van`, `shoes`, `shoe`, `sneaker`, `skate`, `knu`, `platform` (в паре с vans), `school`, `high school`, `school district`, `back to school`, `old skool` (без привязки к платформе — чисто обувной), `comfycush`, `stackform`, `suede`, `black`, `pink`, `blue`, `white`.
- В группу skool-бренда — только точное/фразовое соответствие, не широкое.

## Ad group 1 — Skool-платформа (самое горячее)

Люди уже на Skool, ищут инструменты. Конверсия максимальная.

| Ключ | Частота/мес (US) | Конкуренция | Ставка top page |
|---|---|---|---|
| skool | 165 000 | LOW | $0.01–8.59 |
| skool app | 9 900 | LOW | $0.02–12.29 |
| skool community | 6 600 | LOW | $1.58–13.45 |
| skool communities | 6 600 | LOW | $1.58–13.45 |
| skool com | 4 400 | LOW | $0.62–6.05 |
| skool calendar | 10 | LOW | — |
| skool content | 10 | MED | — |
| skool admin | 10 | LOW | — |
| skool automation | 20 | MED | $4.49–7.75 |

Match: `skool`, `skool app`, `skool community` — phrase; остальное exact. Без минусов не запускать (см. выше). «skool» один чистить вручную по поисковым запросам первые 2 недели.

## Ad group 2 — AI-писательство

| Ключ | Частота/мес (US) | Конкуренция | Ставка |
|---|---|---|---|
| ai writing tools | 57 400 | MED | $1.91–9.93 |
| ai writer | 33 100 | MED | $1.01–5.30 |
| ai write | 16 900 | MED | $0.93–6.34 |
| ai writer free | 3 850 + 2 600 | MED | $0.80–3.56 |
| ai paragraph writer | 3 050 | LOW | $0.74–3.56 |
| ai writing generator | 2 650 | MED | $0.99–5.81 |
| write with ai | 1 920 | MED | $0.79–6.35 |
| ai content generator | 1 200 | MED | $2.68–14.48 |
| **ai post generator** | **390** | MED | $2.54–9.80 |
| ai writer for social media | 10 | MED | — |

`ai post generator` — самое релевантное, но узкое. Голова (`ai writer`, `ai writing tools`) дорогая и широкая — ленд должен сразу говорить «для Skool», иначе деньги сгорят. Начать с `ai post generator` + `ai paragraph writer` + `write with ai`.

## Ad group 3 — Планирование постов

| Ключ | Частота/мес (US) | Конкуренция | Ставка |
|---|---|---|---|
| social media scheduler | 121 500 | LOW | $4.77–25.46 |
| schedule instagram posts | 6 700 | LOW | $1.64–16.44 |
| schedule facebook posts | 2 975 | LOW | $2.30–17.08 |
| instagram scheduling tool | 2 950 | LOW | $1.89–19.74 |
| social media scheduling tools | 2 460 | MED | $6.91–30.65 |
| social scheduling | 1 980 | LOW | $4.47–26.43 |
| schedule linkedin posts | 1 650 | LOW | $3.40–28.59 |
| social media post scheduler | 1 300 | MED | $3.54–22.56 |
| social media posting schedule | 1 300 | MED | $3.54–22.59 |
| tiktok scheduler | 1 145 | LOW | $2.65–19.67 |
| post scheduler | 880 | LOW | $3.63–23.16 |

⚠️ Интент «планировщик для Instagram/Facebook» ≠ наш продукт (мы только Skool). Эти ключи дадут трафик без конверсии. Брать точным соответствием и только если объявление прямо отсекает: «для Skool-сообществ». Рекомендация: НЕ включать на старте; сначала группы 1–2.

## Ad group 4 — Контент-календарь / комьюнити

| Ключ | Частота/мес (US) | Конкуренция | Ставка |
|---|---|---|---|
| content calendar | 4 400 | HIGH | $6.08–26.66 |
| content calendar template | 2 575 | HIGH | $4.01–14.76 |
| social media calendar | 1 970 | HIGH | $5.97–21.59 |
| content planner | 1 300 | HIGH | $4.77–24.02 |
| community management | 1 900 | LOW | $2.24–8.95 |
| community management tools | 110 | LOW | $11.36–35.11 |
| skool alternative | 210 | MED | $2.97–15.37 |
| skool vs kajabi | 140 | MED | $4.01–33.34 |

`skool alternative` / `skool vs kajabi` — люди выбирают платформу, нам мало пользы. HIGH-конкуренция + дорогие ставки — вторая очередь.

## RU (geo Россия)

Факт: вся русская семантика вокруг Skool-инструментов — **0 поиска** (бакет <10). Единственное живое:

| Ключ | Частота/мес (RU) | Конкуренция | Ставка |
|---|---|---|---|
| skool | 1 900 | LOW | $0.21–1.19 |

`расширение для skool`, `skool расписание`, `генератор постов`, `ии писатель`, `планировщик постов`, `контент календарь` — всё 0. RU-кампания = только `skool` (phrase) с обувными минусами. Ставки копеечные ($0.21–1.19) — дёшево протестировать.

## DE (geo Германия) — неожиданно жирно

KI-писательство в Германии дёшево и объёмно:

| Ключ | Частота/мес (DE) | Конкуренция | Ставка |
|---|---|---|---|
| ki texte schreiben | 12 100 | LOW | $0.06–1.04 |
| künstliche intelligenz texte schreiben | 12 550 | LOW | $0.06–1.04 |
| ki texter | 9 900 | LOW | $0.04–1.13 |
| künstliche intelligenz text | 10 265 | LOW | $0.04–1.13 |
| ki texte schreiben kostenlos | 3 880 | LOW | $0.08–0.61 |
| ki text generator | 3 675 | LOW | $0.21–1.35 |
| ki generator | 2 960 | MED | $0.41–1.32 |
| ki schreiben (lassen) | 2 950–1 700 | LOW/MED | $0.04–1.35 |
| skool (DE) | 18 100 | LOW | $0.01–5.18 |
| skool community (DE) | 1 000 | LOW | $1.57–10.76 |
| community management (DE) | 720 | LOW | $0.97–3.77 |
| content kalender (DE) | 110 | MED | $1.67–7.49 |
| beiträge planen | 0 | — | — |

Ставки $0.04–1.35 при объёмах 10K+/мес — самый дешёвый CPC из трёх рынков. Если продукт локализован на немецкий (а листинг CWS уже есть) — DE-кампания окупится первой.

## Рекомендованный запуск

1. **Старт**: Ad group 1 (skool-бренд, phrase+exact, с минусами) + `ai post generator`, `write with ai`, `ai paragraph writer` из группы 2. Бюджет-тест: $5–10/день, US.
2. **Параллельно дёшево**: RU `skool` ($0.2–1 CPC) и DE ki-texter-группа.
3. **Не включать на старте**: instagram/facebook-планировщики (не тот интент), content calendar (HIGH, дорого).
4. Первые 2 недели — еженедельная чистка поисковых запросов (Vans-мусор будет лезть постоянно).

## Минус-слова (общий список, вставить в кампанию)

```
vans van shoes shoe sneaker sneakers skate skateboard knu comfycush stackform suede checkerboard
school highschool "high school" "school district" "back to school" homework teacher college university
free download proxy unblocked
black white pink blue red grey beige green
```

(`free` не минусовать, если есть бесплатный триал — скорее оставить.)

---
Данные сняты 2026-11-05 через Google Ads Keyword Planner API (customer 1248523790, GOOGLE_SEARCH). Повторный съём — перед каждым масштабированием ставок; объёмы плавают ±30% сезонно (декабрь проседает).
