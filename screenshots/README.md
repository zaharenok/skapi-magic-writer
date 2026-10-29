# Chrome Web Store assets

## Текущий набор (2026-10-26) — `store-1280x800/`

Ровно 1280×800, готовы к загрузке в «Локализованные скриншоты» (все локали).
Порядок = рекомендованный порядок в консоли (первый кадр решает клик):

| # | Файл | Что на кадре |
|---|---|---|
| 1 | `screenshot-oDxpS.png` | Hero: «No more copy-pasting», перечёркнутый «старый путь» (логотипы сторонних AI убраны — риск rejection по товарным знакам), панель + «Paste thoughts → ready Skool post in seconds» |
| 2 | `screenshot-ciVtb.png` | «Writes your posts & schedules them!» |
| 3 | `screenshot-real-panel.png` | Реальный UI Magic Post Writer (снят с `dev/edit-mock.html`, исходник `../panel-real.png`) + заголовок «From rough notes to a ready post» |
| 4 | `screenshot-3XE6y.png` | Before/After |
| 5 | `screenshot-XU2QQ.png` | «Not for bots. Zero spam. Works in 150+ languages» (стиль выбивается — кандидат на перегенерацию) |

Оригиналы иллюстраций: `oDxpS.jpg`, `ciVtb.jpg`, `3XE6y.jpg` (1344×768), `XU2QQ.jpg` (все 16:9 → приведены к 1280×800 паддингом с заблюренным фоном; скрипт компоновки — PIL, не сохранён).

## Старые ассеты

| Файл | Куда в консоли | Размер |
|---|---|---|
| `promo-440x280.png` | Маленькое рекламное изображение | 440×280 |
| `marquee-1400x560.png` | Большое рекламное изображение (Marquee, опционально) | 1400×560 |

- `promo-440x280.png` — карточка с логотипом `mw-logo.png` на фоне BRAND (#FF90E8).
- `marquee-1400x560.png` — брендовый баннер: логотип, название, подзаголовок, жёлтая CTA «Add to Chrome», справа диалог.
- Диалоги сняты со стенда `dev/edit-mock.html` (CSS один в один с content.js).
