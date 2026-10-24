# Chrome Web Store — submission kit (SKapi Magic Writer v0.5.0)

Zip для загрузки: `chrome-web-store-v0.5.0.zip` (в корне сабмодуля).
Консоль: https://chrome.google.com/webstore/devconsole (нужен аккаунт разработчика, разовый взнос $5).

## Что заполнять в консоли (обязательные поля)

- **Upload zip** → `chrome-web-store-v0.5.0.zip`
- **Store listing → Locale**: добавить языки ниже (Add locale), в каждый вставить Name / Short description / Detailed description из разделов.
- **Category**: Productivity · **Language**: все добавленные.
- **Screenshots**: 1–5 штук 1280×800 (или 640×400). Снимки: ✨-диалог генерации, 📅 окно Schedule post (календарь + пресеты), попап со списком отложенных постов.
- **Promo images**: small 440×280 (обязательно), marquee 1400×560 (опционально). Можно собрать из icon128 + скриншот.
- **Icon**: 128×128 уже в zip; для витрины загрузить `icons/icon128.png`.
- **Privacy tab**:
  - Single purpose: `Write, improve and schedule posts on skool.com, and notify when they publish.`
  - Permission justifications:
    - `storage` — "Saves user settings (default community, notify toggle, dialog position) locally."
    - `cookies` — "Reads the Skool auth_token cookie so the user's own Skool session publishes their posts; the token is never displayed or shared."
    - `notifications` — "Shows a system notification when a scheduled post goes out."
    - `host_permissions *.skool.com` — "The editor UI lives inside skool.com pages."
    - `host_permissions api.skapi.pro` — "Saves/loads scheduled posts and AI generation through our API (api.skapi.pro). No other servers are contacted."
  - Data usage: не продаём данные, не используется для рекламы/кредитования; privacy policy URL обязателен (см. ниже).
  - **Privacy policy URL** — ОБЯЗАТЕЛЕНО для расширений с host_permissions. Поставь страницу на skapi.pro (например `https://skapi.pro/privacy`) — текст-заготовку можно взять из раздела Privacy policy ниже.
- **Distribution**: Public. Страны — все.
- Submit for review. Ревью с cookies+host_permissions обычно 1–5 дней.

---

## Переводы витрины (Name ≤45 · Short ≤132 · Detailed)

### en — English
**Name:** SKapi Magic Writer
**Short:** Write and schedule Skool posts with AI, GIFs and a calendar — right inside your community.
**Detailed:**
SKapi Magic Writer adds an AI writing assistant and a post scheduler directly into skool.com — no tab switching, no copy-paste.

✨ MAGIC POST — describe your idea in any language, get a ready-to-publish post with a title and paragraphs.
📅 SCHEDULE — pick a date and time (or use quick presets like "Tomorrow 9:00"), and the post publishes automatically, as you, in your community.
🎬 GIFs — attach a GIF and it goes out with the post.
🔔 Notifications — get a system notification with a link when a scheduled post is live.
🗂 Manager — a popup lists all your scheduled, published and failed posts with one-click delete.

Works with your own Skool session: no passwords, no extra logins. Free trial included.

Privacy: the extension only reads your Skool auth cookie to publish as you, stores settings locally, and talks only to our API (api.skapi.pro). No ads, no trackers, no data selling.

### ru — Русский
**Name:** SKapi Magic Writer
**Short:** Пишите и откладывайте посты в Skool с ИИ, GIF и календарём — прямо внутри вашего сообщества.
**Detailed:**
SKapi Magic Writer добавляет ИИ-ассистента и планировщик постов прямо в skool.com — без переключения вкладок и копипасты.

✨ МАГИЧЕСКИЙ ПОСТ — опишите идею на любом языке, получите готовый пост с заголовком и абзацами.
📅 РАСПИСАНИЕ — выберите дату и время (или быстрые пресеты вроде «Завтра в 9:00») — пост опубликуется автоматически, от вашего имени.
🎬 GIF — прикрепите гифку, она уйдёт вместе с постом.
🔔 Уведомления — системное уведомление со ссылкой, когда отложенный пост вышел.
🗂 Менеджер — попап со всеми отложенными, опубликованными и неудавшимися постами, удаление в один клик.

Работает с вашей сессией Skool: без паролей и лишних входов. Есть бесплатный пробный период.

Приватность: расширение читает только cookie Skool, чтобы публиковать от вашего имени, хранит настройки локально и обращается только к нашему API (api.skapi.pro). Без рекламы и трекеров.

### uk — Українська
**Name:** SKapi Magic Writer
**Short:** Створюйте й плануйте пости у Skool зі ШІ, GIF і календарем — просто у вашій спільноті.
**Detailed:**
SKapi Magic Writer додає ШІ-асистента та планувальник постів прямо в skool.com — без перемикання вкладок.

✨ МАГІЧНИЙ ПОСТ — опишіть ідею будь-якою мовою, отримайте готовий пост із заголовком та абзацами.
📅 РОЗКЛАД — оберіть дату й час або швидкі пресети — пост опублікується автоматично від вашого імені.
🎬 GIF — додайте гіфку, вона вийде разом із постом.
🔔 Повідомлення — системне сповіщення з посиланням, коли відкладений пост вийшов.
🗂 Менеджер — попап зі всіма відкладеними, опублікованими та невдалими постами.

Працює з вашою сесією Skool: без паролів. Є безкоштовний пробний період.
Приватність: розширення читає лише cookie Skool, зберігає налаштування локально й звертається лише до нашого API (api.skapi.pro).

### de — Deutsch
**Name:** SKapi Magic Writer
**Short:** Skool-Beiträge mit KI, GIFs und Kalender schreiben und planen — direkt in deiner Community.
**Detailed:**
SKapi Magic Writer bringt einen KI-Schreibassistenten und einen Beitragsplaner direkt in skool.com — ohne Tab-Wechsel, ohne Copy-Paste.

✨ MAGIC POST — beschreibe deine Idee in jeder Sprache und erhalte einen fertigen Beitrag mit Titel und Absätzen.
📅 PLANEN — Datum und Uhrzeit wählen (oder Schnellvorlagen wie „Morgen 9:00“) — der Beitrag erscheint automatisch, von dir, in deiner Community.
🎬 GIFs — GIF anhängen, es geht mit dem Beitrag raus.
🔔 Benachrichtigungen — Systembenachrichtigung mit Link, sobald der geplante Beitrag live ist.
🗂 Verwaltung — Popup mit allen geplanten, veröffentlichten und fehlgeschlagenen Beiträgen.

Funktioniert mit deiner eigenen Skool-Sitzung: keine Passwörter, kein zusätzlicher Login. Kostenlose Testphase inklusive.

Datenschutz: Die Erweiterung liest nur deinen Skool-Auth-Cookie, um in deinem Namen zu veröffentlichen, speichert Einstellungen lokal und kommuniziert ausschließlich mit unserer API (api.skapi.pro). Keine Werbung, keine Tracker.

### es — Español
**Name:** SKapi Magic Writer
**Short:** Escribe y programa publicaciones en Skool con IA, GIFs y calendario — dentro de tu comunidad.
**Detailed:**
SKapi Magic Writer añade un asistente de escritura con IA y un programador de publicaciones directamente en skool.com — sin cambiar de pestaña ni copiar y pegar.

✨ PUBLICACIÓN MÁGICA — describe tu idea en cualquier idioma y obtén una publicación lista con título y párrafos.
📅 PROGRAMAR — elige fecha y hora (o usa presets rápidos como «Mañana 9:00») y la publicación sale automáticamente, como tú, en tu comunidad.
🎬 GIFs — adjunta un GIF y se publicará con el post.
🔔 Notificaciones — recibe una notificación del sistema con enlace cuando se publique.
🗂 Gestor — un popup con todas tus publicaciones programadas, publicadas y fallidas.

Funciona con tu propia sesión de Skool: sin contraseñas. Incluye prueba gratuita.

Privacidad: la extensión solo lee tu cookie de Skool para publicar en tu nombre, guarda ajustes localmente y solo se comunica con nuestra API (api.skapi.pro). Sin anuncios ni rastreadores.

### fr — Français
**Name:** SKapi Magic Writer
**Short:** Rédigez et planifiez vos posts Skool avec IA, GIF et calendrier — au sein de votre communauté.
**Detailed:**
SKapi Magic Writer intègre un assistant de rédaction IA et un planificateur de posts directement dans skool.com — sans changer d'onglet.

✨ POST MAGIQUE — décrivez votre idée dans n'importe quelle langue, obtenez un post prêt à publier avec titre et paragraphes.
📅 PLANIFIER — choisissez date et heure (ou préréglages rapides comme « Demain 9:00 ») — le post est publié automatiquement, en votre nom.
🎬 GIF — joignez un GIF, il partira avec le post.
🔔 Notifications — une notification système avec lien dès la publication.
🗂 Gestion — un popup liste vos posts planifiés, publiés et échoués.

Fonctionne avec votre session Skool : aucun mot de passe. Essai gratuit inclus.

Confidentialité : l'extension lit uniquement votre cookie Skool pour publier en votre nom, stocke les réglages localement et ne communique qu'avec notre API (api.skapi.pro). Sans publicité ni traqueurs.

### it — Italiano
**Name:** SKapi Magic Writer
**Short:** Scrivi e programma i post su Skool con IA, GIF e calendario — direttamente nella tua community.
**Detailed:**
SKapi Magic Writer porta un assistente di scrittura IA e un pianificatore di post direttamente in skool.com — senza cambiare scheda.

✨ POST MAGICO — descrivi la tua idea in qualsiasi lingua, ottieni un post pronto con titolo e paragrafi.
📅 PROGRAMMA — scegli data e ora (o preset rapidi come «Domani 9:00») — il post viene pubblicato in automatico, come te.
🎬 GIF — allega una GIF, esce insieme al post.
🔔 Notifiche — notifica di sistema con link quando il post programmato va online.
🗂 Gestione — popup con tutti i post programmati, pubblicati e non riusciti.

Funziona con la tua sessione Skool: nessuna password. Prova gratuita inclusa.

Privacy: l'estensione legge solo il cookie Skool per pubblicare per conto tuo, salva le impostazioni in locale e parla solo con la nostra API (api.skapi.pro). Niente pubblicità né tracker.

### pt_BR — Português (Brasil)
**Name:** SKapi Magic Writer
**Short:** Escreva e agende posts no Skool com IA, GIFs e calendário — direto na sua comunidade.
**Detailed:**
O SKapi Magic Writer traz um assistente de escrita com IA e um agendador de posts direto no skool.com — sem trocar de aba.

✨ POST MÁGICO — descreva sua ideia em qualquer idioma e receba um post pronto com título e parágrafos.
📅 AGENDAR — escolha data e hora (ou presets rápidos como «Amanhã 9:00») — o post é publicado automaticamente, como você.
🎬 GIFs — anexe um GIF e ele sai junto com o post.
🔔 Notificações — notificação do sistema com link quando o post agendado for publicado.
🗂 Gerenciador — popup com todos os posts agendados, publicados e com falha.

Funciona com a sua própria sessão do Skool: sem senhas. Teste grátis incluído.

Privacidade: a extensão lê apenas o cookie do Skool para publicar em seu nome, guarda as configurações localmente e fala só com a nossa API (api.skapi.pro). Sem anúncios nem rastreadores.

### pl — Polski
**Name:** SKapi Magic Writer
**Short:** Pisz i planuj posty w Skool z AI, GIF-ami i kalendarzem — bezpośrednio w Twojej społeczności.
**Detailed:**
SKapi Magic Writer dodaje asystenta pisania AI i planer postów bezpośrednio w skool.com — bez przełączania kart.

✨ MAGICZNY POST — opisz swój pomysł w dowolnym języku, otrzymasz gotowy post z tytułem i akapitami.
📅 HARMONOGRAM — wybierz datę i godzinę (lub szybkie presety, np. „Jutro 9:00”) — post opublikuje się automatycznie jako Ty.
🎬 GIF-y — dodaj GIF-a, opublikuje się razem z postem.
🔔 Powiadomienia — powiadomienie systemowe z linkiem, gdy zaplanowany post wyjdzie.
🗂 Menedżer — popup ze wszystkimi zaplanowanymi, opublikowanymi i nieudanymi postami.

Działa na Twojej sesji Skool: bez haseł. Darmowy okres próbny w zestawie.

Prywatność: rozszerzenie czyta tylko ciasteczko Skool, żeby publikować w Twoim imieniu, zapisuje ustawienia lokalnie i łączy się wyłącznie z naszym API (api.skapi.pro). Bez reklam i trackerów.

### tr — Türkçe
**Name:** SKapi Magic Writer
**Short:** Skool gönderilerini yapay zekâ, GIF ve takvimle yazın ve planlayın — topluluğunuzun içinde.
**Detailed:**
SKapi Magic Writer, skool.com içine bir yapay zekâ yazma asistanı ve gönderi planlayıcı ekler — sekme değiştirmeye gerek yok.

✨ SİHİRLİ GÖNDERİ — fikrinizi herhangi bir dilde anlatın, başlığı ve paragrafları hazır bir gönderi alın.
📅 PLANLA — tarih ve saat seçin (ya da «Yarın 9:00» gibi hızlı ön ayarlar kullanın) — gönderi sizin adınıza otomatik yayınlanır.
🎬 GIF — bir GIF ekleyin, gönderiyle birlikte çıkar.
🔔 Bildirimler — planlanan gönderi yayınlandığında bağlantılı sistem bildirimi.
🗂 Yönetici — planlanan, yayınlanan ve başarısız tüm gönderilerin listelendiği pencere.

Kendi Skool oturumunuzla çalışır: şifre yok. Ücretsiz deneme dahil.

Gizlilik: uzantı yalnızca sizin adınıza yayınlamak için Skool çerezini okur, ayarları yerel olarak saklar ve yalnızca API'mizle (api.skapi.pro) konuşur. Reklam ve izleyici yok.

### nl — Nederlands
**Name:** SKapi Magic Writer
**Short:** Schrijf en plan Skool-posts met AI, GIF's en een kalender — direct binnen je community.
**Detailed:**
SKapi Magic Writer voegt een AI-schrijfassistent en een postplanner rechtstreeks toe aan skool.com — zonder tabbladen te wisselen.

✨ MAGISCHE POST — beschrijf je idee in elke taal en ontvang een kant-en-klare post met titel en alinea's.
📅 PLANNEN — kies datum en tijd (of snelle presets zoals «Morgen 9:00») — de post wordt automatisch gepubliceerd, als jij.
🎬 GIF's — voeg een GIF toe, deze gaat mee met de post.
🔔 Meldingen — systeemmelding met link zodra je geplande post live is.
🗂 Beheer — een popup met al je geplande, gepubliceerde en mislukte posts.

Werkt met je eigen Skool-sessie: geen wachtwoorden. Gratis proefperiode inbegrepen.

Privacy: de extensie leest alleen je Skool-cookie om in jouw naam te publiceren, slaat instellingen lokaal op en spreekt alleen met onze API (api.skapi.pro). Geen advertenties of trackers.

---

## Privacy policy (заготовка для skapi.pro/privacy)

SKapi Magic Writer stores your settings locally in your browser. To publish scheduled posts on your behalf, it reads your Skool `auth_token` session cookie and sends it only to our own API (api.skapi.pro) over HTTPS. We do not sell your data, do not use it for advertising, and do not share it with third parties. Scheduled post content is stored on our servers only to publish it at your chosen time and can be deleted by you at any time via the extension. Contact: [твой email].
