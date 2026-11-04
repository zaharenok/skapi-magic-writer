# Chrome Web Store — submission kit (Skool Magic Writer v1.1.41)

Zip для загрузки: `skool-magic-writer-1.1.41.zip` (в корне сабмодуля).
Консоль: https://chrome.google.com/webstore/devconsole (нужен аккаунт разработчика, разовый взнос $5).

## Что заполнять в консоли

- **Upload zip** → `skool-magic-writer-1.1.41.zip`
- **Store listing → Locale**: добавить языки ниже (Add locale), в каждый вставить Name / Short description / Detailed description из своего раздела.
- **Category**: Productivity.
- **Screenshots**: 1–5 штук 1280×800. Советую снять: диалог ✨ Magic Post, окно 📅 Schedule post с пресетами, попап со списком отложенных постов.
- **Promo images**: small 440×280 (обязательная), marquee 1400×560 (по желанию).
- **Icon**: 128×128 уже в zip, для витрины загрузить `icons/icon128.png`.
- **Privacy tab**:
  - Single purpose: `Write, improve and schedule posts on skool.com, and notify the user when they publish.`
  - Оправдания разрешений:
    - `storage` — "Saves user settings (default community, notify toggle, dialog position) locally in the browser."
    - `cookies` — "Reads the Skool auth_token cookie so posts publish through the user's own Skool session. The token is never shown to the user or sent anywhere except our API."
    - `notifications` — "Shows a system notification when a scheduled post goes out."
    - `host_permissions *.skool.com` — "The whole editor UI lives inside skool.com pages, next to the composer."
    - `host_permissions api.skapi.pro` — "Saves scheduled posts and generates text through our own API. No other servers are contacted."
  - Data usage: данные не продаются, для рекламы не используются.
  - **Privacy policy URL** обязателен при host_permissions. Заготовка текста в конце файла, повесить на `https://skapi.pro/privacy` (или подобное).
- **Distribution**: Public, все страны.
- Submit for review. С cookies и host_permissions ревью обычно занимает 1–5 дней.

---

## Переводы витрины (Name ≤45 · Short ≤132 · Detailed)

### en — English
**Name:** Skool Magic Writer — AI Writer & Scheduler
**Short:** AI writer for Skool: generate posts, attach GIFs and schedule them in a built-in post scheduler. All inside skool.com.
**Detailed:**
Skool Magic Writer is a Chrome extension for Skool community owners. It adds two small buttons next to the composer you already use on skool.com — everything happens right there, where you normally write.

✨ Magic Post: an AI post generator built into Skool. Describe your idea in a couple of words, in any language, and the AI writer drafts a post with a title and paragraphs. Tweak it, then post.
📅 Schedule: a simple post scheduler. Pick a time (quick presets like Tomorrow 9:00) and the post goes out on its own, from your account.
🎬 GIFs: attach one and it publishes together with the post.
🔔 When a scheduled post is live you get a normal system notification with a link.
🗂 The calendar button in the top bar keeps all your scheduled, published and failed posts in one list — a small content calendar for your community.

Built for Skool admins and community managers who publish regularly: the writing and scheduling routine is on us, growing the community is on you.

The extension works with the Skool session you are already logged into. No passwords, no second account. There is a free trial, after that a subscription.

On privacy: the extension reads your Skool session cookie so it can publish as you, saves your settings in your browser, and only ever talks to our own server at api.skapi.pro. No ads, no third-party trackers, no data selling — we only count which features you use, on our own server.

### ru — Русский
**Name:** Skool Magic Writer — ИИ-посты и расписание
**Short:** ИИ-писатель для Skool: генерируйте посты, прикрепляйте GIF и планируйте их во встроенном планировщике. Всё внутри skool.com.
**Detailed:**
Skool Magic Writer — расширение Chrome для владельцев сообществ Skool. Оно добавляет две кнопки рядом с полем, где вы обычно пишете посты в skool.com, — весь интерфейс живёт там же, ничего настраивать не нужно.

✨ Магический пост: генератор постов с ИИ прямо в Skool. Опишите идею парой слов на любом языке — ИИ-писатель набросает черновик с заголовком и абзацами. Поправили и опубликовали.
📅 Расписание: простой планировщик постов. Выберите время (есть быстрые пресеты вроде «Завтра в 9:00»), и пост выйдет сам, с вашего аккаунта.
🎬 GIF: прикрепите гифку, она уйдёт вместе с постом.
🔔 Когда отложенный пост опубликован, приходит обычное системное уведомление со ссылкой.
🗂 Кнопка календаря в шапке собирает все отложенные, опубликованные и неудавшиеся посты в один список — мини контент-календарь вашего сообщества.

Сделано для админов и комьюнити-менеджеров Skool, которые публикуют регулярно: рутина написания и планирования постов — на нас, рост сообщества — на вас.

Расширение работает через вашу сессию Skool. Без паролей и вторых аккаунтов. Есть бесплатный пробный период, дальше подписка.

Про приватность: расширение читает cookie сессии Skool, чтобы публиковать посты от вашего имени, хранит настройки в браузере и общается только с нашим сервером api.skapi.pro. Никакой рекламы и сторонних трекеров, данные не продаём — мы лишь считаем на собственном сервере, какие функции используются.

### uk — Українська
**Name:** Skool Magic Writer — ШІ-письменник і розклад
**Short:** ШІ-письменник для Skool: створюйте пости, додавайте GIF і плануйте їх у вбудованому планувальнику. Усе в середині skool.com.
**Detailed:**
Skool Magic Writer — розширення Chrome для власників спільнот Skool. Воно додає дві кнопки поруч із полем, де ви зазвичай пишете пости в skool.com, — увесь інтерфейс живе там само.

✨ Магічний пост: генератор постів зі ШІ просто в Skool. Опишіть ідею парою слів будь-якою мовою — ШІ-письменник підготує чернетку із заголовком і абзацами. Виправили й опублікували.
📅 Розклад: простий планувальник публікацій. Виберіть час (є швидкі пресети на кшталт «Завтра о 9:00»), і пост вийде сам, з вашого акаунта.
🎬 GIF: додайте гіфку, вона піде разом із постом.
🔔 Коли відкладений пост опубліковано, приходить звичайне системне повідомлення з посилання.
🗂 Кнопка календаря у шапці збирає всі відкладені, опубліковані й невдалі пости в один список — міні контент-календар вашої спільноти.

Створено для адмінів і ком'юніті-менеджерів Skool, які публікують регулярно: рутину написання й планування беремо на себе, а зростання спільноти — на вас.

Розширення працює через вашу сесію Skool. Без паролів і других акаунтів. Є безкоштовний пробний період, далі підписка.

Про приватність: розширення читає cookie сесії Skool, щоб публікувати пости від вашого імені, зберігає налаштування в браузері і спілкується лише з нашим сервером api.skapi.pro. Реклами й сторонніх трекерів немає, дані не продаємо — ми лише рахуємо на власному сервері, які функції використовуються.

### de — Deutsch
**Name:** Skool Magic Writer — KI-Texter & Planer
**Short:** KI-Texter für Skool: Posts generieren, GIFs anhängen und im eingebauten Post-Planer terminieren. Alles in skool.com.
**Detailed:**
Skool Magic Writer ist eine Chrome-Erweiterung für Skool-Community-Owner. Sie setzt zwei kleine Buttons neben das Eingabefeld, das du auf skool.com eh schon benutzt — alles passiert genau dort.

✨ Magic Post: ein KI-Post-Generator direkt in Skool. Beschreibe deine Idee in ein paar Wörtern, in beliebiger Sprache, und der KI-Texter schreibt einen Entwurf mit Titel und Absätzen. Kurz überarbeiten, fertig.
📅 Planen: ein einfacher Post-Planer. Datum und Uhrzeit wählen (Schnellvorlagen wie „Morgen 9:00" inklusive), und der Beitrag geht von selbst raus, von deinem Konto.
🎬 GIFs: eins anhängen, es erscheint zusammen mit dem Beitrag.
🔔 Wenn ein geplanter Beitrag live ist, bekommst du eine normale Systembenachrichtigung mit Link.
🗂 Der Kalender-Button in der Kopfzeile sammelt alle geplanten, veröffentlichten und fehlgeschlagenen Beiträge an einem Ort — ein kleiner Content-Kalender für deine Community.

Gemacht für Skool-Admins und Community-Manager, die regelmäßig posten: Routine beim Schreiben und Planen übernehmen wir, das Community-Wachstum liegt bei dir.

Die Erweiterung nutzt die Skool-Sitzung, in der du schon eingeloggt bist. Keine Passwörter, kein zweites Konto. Es gibt eine kostenlose Testphase, danach ein Abo.

Zum Datenschutz: Die Erweiterung liest deinen Skool-Session-Cookie, um in deinem Namen zu veröffentlichen, speichert Einstellungen im Browser und spricht nur mit unserem eigenen Server api.skapi.pro. Keine Werbung, keine Tracker von Dritten, kein Datenverkauf — wir zählen nur auf unserem eigenen Server, welche Funktionen genutzt werden.

### es — Español
**Name:** Skool Magic Writer — Redactor IA y agenda
**Short:** Redactor IA para Skool: genera posts, adjunta GIF y prográmalos en el planificador de posts incluido. Todo dentro de skool.com.
**Detailed:**
Skool Magic Writer es una extensión de Chrome para dueños de comunidades de Skool. Coloca dos botones pequeños junto al cuadro donde ya escribes en skool.com; todo pasa ahí mismo.

✨ Magic Post: un generador de posts con IA dentro de Skool. Describe tu idea en un par de palabras, en cualquier idioma, y el redactor IA te devuelve un borrador con título y párrafos. Lo ajustas y publicas.
📅 Programar: un planificador de posts sencillo. Eliges fecha y hora (hay presets rápidos como «Mañana 9:00») y el post sale solo, desde tu cuenta.
🎬 GIFs: adjunta uno y se publica junto con el post.
🔔 Cuando un post programado sale a la luz recibes una notificación normal del sistema con su enlace.
🗂 El botón de calendario en la barra superior guarda todos tus posts programados, publicados y fallidos en una sola lista: un mini calendario de contenidos para tu comunidad.

Pensado para administradores y community managers de Skool que publican con regularidad: la rutina de escribir y programar la llevamos nosotros, hacer crecer la comunidad te toca a ti.

La extensión funciona con la sesión de Skool en la que ya estás. Sin contraseñas ni cuentas nuevas. Hay prueba gratis y luego una suscripción.

Sobre la privacidad: la extensión lee tu cookie de sesión de Skool para publicar en tu nombre, guarda los ajustes en tu navegador y solo habla con nuestro servidor api.skapi.pro. Sin anuncios, sin rastreadores de terceros, no vendemos datos — solo contamos en nuestro propio servidor qué funciones se usan.

### fr — Français
**Name:** Skool Magic Writer — Rédacteur IA & agenda
**Short:** Rédacteur IA pour Skool : générez des posts, ajoutez des GIF et programmez-les dans le planificateur intégré. Tout dans skool.com.
**Detailed:**
Skool Magic Writer est une extension Chrome pour les propriétaires de communautés Skool. Elle ajoute deux petits boutons à côté de la zone où vous écrivez déjà sur skool.com ; tout se passe là.

✨ Magic Post : un générateur de posts par IA intégré à Skool. Décrivez votre idée en quelques mots, dans n'importe quelle langue, et le rédacteur IA vous livre un brouillon avec titre et paragraphes. Vous ajustez, puis vous publiez.
📅 Planifier : un planificateur de posts simple. Choisissez date et heure (des préréglages rapides comme « Demain 9:00 » sont inclus) et le post part tout seul, depuis votre compte.
🎬 GIF : joignez-en un, il part avec le post.
🔔 Quand un post planifié est publié, vous recevez une notification système classique avec un lien.
🗂 Le bouton calendrier en haut de page garde tous vos posts planifiés, publiés et échoués dans une seule liste — un mini calendrier éditorial pour votre communauté.

Pensé pour les admins et community managers Skool qui publient régulièrement : la routine d'écriture et de planification, c'est nous ; faire grandir la communauté, c'est vous.

L'extension fonctionne avec votre session Skool existante. Pas de mot de passe, pas de deuxième compte. Essai gratuit puis abonnement.

Côté vie privée : l'extension lit votre cookie de session Skool pour publier en votre nom, garde vos réglages dans le navigateur et ne parle qu'à notre serveur api.skapi.pro. Pas de pub, pas de traceurs tiers, pas de revente de données — nous comptons seulement sur notre serveur quelles fonctions sont utilisées.

### it — Italiano
**Name:** Skool Magic Writer — Scrittore IA e agenda
**Short:** Scrittore IA per Skool: genera post, allega GIF e programmali nel pianificatore integrato. Tutto dentro skool.com.
**Detailed:**
Skool Magic Writer è un'estensione Chrome per i proprietari di community Skool. Aggiunge due piccoli pulsanti accanto alla casella dove già scrivi su skool.com; tutto succede lì.

✨ Magic Post: un generatore di post con IA dentro Skool. Descrivi la tua idea in un paio di parole, in qualsiasi lingua, e lo scrittore IA prepara una bozza con titolo e paragrafi. Sistemi e pubblichi.
📅 Programma: un pianificatore di post semplice. Scegli data e ora (preset rapidi come «Domani 9:00») e il post esce da solo, dal tuo account.
🎬 GIF: alleghane una e viene pubblicata insieme al post.
🔔 Quando un post programmato va online ricevi una normale notifica di sistema con il link.
🗂 Il pulsante calendario in alto tiene tutti i post programmati, pubblicati e non riusciti in un'unica lista — un mini calendario editoriale per la tua community.

Pensato per amministratori e community manager Skool che pubblicano con regolarità: la routine di scrittura e pianificazione è affar nostro, far crescere la community è affar tuo.

L'estensione usa la sessione Skool a cui sei già collegato. Niente password, niente secondo account. C'è una prova gratuita, poi un abbonamento.

Sulla privacy: l'estensione legge il cookie di sessione Skool per pubblicare per conto tuo, salva le impostazioni nel browser e parla solo con il nostro server api.skapi.pro. Niente pubblicità, niente tracker di terze parti, nessuna vendita di dati — contiamo solo sul nostro server quali funzioni vengono usate.

### pt_BR — Português (Brasil)
**Name:** Skool Magic Writer — Redator IA e agenda
**Short:** Redator IA para o Skool: gere posts, anexe GIFs e agende no planejador de posts embutido. Tudo dentro do skool.com.
**Detailed:**
O Skool Magic Writer é uma extensão do Chrome para donos de comunidades Skool. Ele coloca dois botões pequenos ao lado da caixa onde você já escreve no skool.com; tudo acontece ali mesmo.

✨ Magic Post: um gerador de posts com IA dentro do Skool. Descreva sua ideia em algumas palavras, em qualquer idioma, e o redator IA devolve um rascunho com título e parágrafos. Ajusta e publica.
📅 Agendar: um planejador de posts simples. Escolha data e hora (tem presets rápidos como «Amanhã 9:00») e o post sai sozinho, da sua conta.
🎬 GIFs: anexe um e ele vai junto com o post.
🔔 Quando um post agendado é publicado você recebe uma notificação normal do sistema com o link.
🗂 O botão de calendário no topo guarda todos os posts agendados, publicados e que falharam numa lista só — um mini calendário de conteúdo para a sua comunidade.

Feito para admins e community managers do Skool que publicam com frequência: a rotina de escrever e agendar é com a gente, crescer a comunidade é com você.

A extensão funciona com a sessão do Skool em que você já está. Sem senhas, sem conta nova. Tem teste grátis e depois assinatura.

Sobre privacidade: a extensão lê o cookie de sessão do Skool para publicar em seu nome, guarda as configurações no navegador e conversa apenas com o nosso servidor api.skapi.pro. Sem anúncios, sem rastreadores de terceiros, não vendemos dados — apenas contamos no nosso próprio servidor quais funções são usadas.

### pl — Polski
**Name:** Skool Magic Writer — Pisarz AI i planer
**Short:** Pisarz AI dla Skool: generuj posty, dodawaj GIF-y i planuj je we wbudowanym planerze postów. Wszystko w skool.com.
**Detailed:**
Skool Magic Writer to rozszerzenie Chrome dla właścicieli społeczności Skool. Dodaje dwa małe przyciski obok pola, w którym już piszesz na skool.com — wszystko dzieje się na miejscu.

✨ Magic Post: generator postów z AI wbudowany w Skool. Opisz pomysł kilkoma słowami, w dowolnym języku, a pisarz AI przygotuje szkic z tytułem i akapitami. Poprawiłeś i opublikowałeś.
📅 Harmonogram: prosty planer postów. Wybierz datę i godzinę (są szybkie presety, np. „Jutro 9:00”), a post opublikuje się sam, z twojego konta.
🎬 GIF-y: dodaj jeden, opublikuje się razem z postem.
🔔 Gdy zaplanowany post wyjdzie, dostajesz zwykłe powiadomienie systemowe z linkiem.
🗂 Przycisk kalendarza na górze trzyma wszystkie zaplanowane, opublikowane i nieudane posty w jednej liście — mini kalendarz treści dla twojej społeczności.

Stworzone dla adminów i community managerów Skool, którzy publikują regularnie: rutynę pisania i planowania bierzemy na siebie, rozwój społeczności zostawiamy tobie.

Rozszerzenie działa na twojej bieżącej sesji Skool. Bez haseł i drugiego konta. Jest darmowy okres próbny, potem subskrypcja.

Prywatność: rozszerzenie czyta ciasteczko sesji Skool, żeby publikować w twoim imieniu, zapisuje ustawienia w przeglądarce i rozmawia wyłącznie z naszym serwerem api.skapi.pro. Bez reklam, bez trackerów stron trzecich, bez sprzedaży danych — liczymy tylko na własnym serwerze, które funkcje są używane.

### tr — Türkçe
**Name:** Skool Magic Writer — YZ yazarı ve planlayıcı
**Short:** Skool için YZ yazarı: gönderi oluşturun, GIF ekleyin ve yerleşik gönderi planlayıcıda zamanlayın. Hepsi skool.com içinde.
**Detailed:**
Skool Magic Writer, Skool topluluk sahipleri için bir Chrome uzantısıdır. skool.com'da zaten yazdığınız kutunun yanına iki küçük düğme ekler; her şey orada olur.

✨ Magic Post: Skool'un içine gömülü bir YZ gönderi üreticisi. Fikrinizi birkaç kelimeyle, istediğiniz dilde anlatın; YZ yazarı başlığı ve paragrafları hazır bir taslak yazar. Düzeltin, yayınlayın.
📅 Zamanla: basit bir gönderi planlayıcı. Tarih ve saat seçin («Yarın 9:00» gibi hızlı ön ayarlar var), gönderi kendi hesabınızdan kendiliğinden çıkar.
🎬 GIF: bir tane ekleyin, gönderiyle birlikte yayınlanır.
🔔 Zamanlanmış gönderi yayınlandığında bağlantılı normal bir sistem bildirimi alırsınız.
🗂 Üstteki takvim düğmesi tüm zamanlanmış, yayınlanmış ve başarısız gönderileri tek listede tutar — topluluğunuz için küçük bir içerik takvimi.

Düzenli yayınlayan Skool yöneticileri ve topluluk yöneticileri için yapıldı: yazma ve planlama rutini bizde, topluluğu büyütme sizde.

Uzantı, içinde zaten oturum açık olan Skool hesabınızla çalışır. Şifre yok, ikinci hesap yok. Ücretsiz deneme var, sonrasında abonelik.

Gizlilik hakkında: uzantı sizin adınıza yayınlayabilmek için Skool oturum çerezinizi okur, ayarları tarayıcınızda saklar ve yalnızca kendi sunucumuz api.skapi.pro ile konuşur. Reklam yok, üçüncü taraf izleyici yok, veri satışı yok — hangi işlevlerin kullanıldığını yalnızca kendi sunucumuzda sayıyoruz.

### nl — Nederlands
**Name:** Skool Magic Writer — AI-schrijver & planner
**Short:** AI-schrijver voor Skool: genereer posts, voeg GIF's toe en plan ze in de ingebouwde post-planner. Alles in skool.com.
**Detailed:**
Skool Magic Writer is een Chrome-extensie voor eigenaren van Skool-community's. Hij zet twee kleine knoppen naast het veld waar je op skool.com toch al schrijft; alles gebeurt daar.

✨ Magic Post: een AI-postgenerator in Skool zelf. Omschrijf je idee in een paar woorden, in elke taal, en de AI-schrijver maakt een concept met titel en alinea's. Even bijwerken en plaatsen.
📅 Plannen: een eenvoudige post-planner. Kies datum en tijd (snelle presets zoals «Morgen 9:00» zitten erbij) en de post gaat vanzelf de lucht in, vanaf jouw account.
🎬 GIF's: voeg er een toe, die wordt samen met de post gepubliceerd.
🔔 Als een geplande post live is, krijg je een normale systeemmelding met link.
🗂 De kalenderknop bovenaan houdt al je geplande, gepubliceerde en mislukte posts in één lijst — een mini-contentkalender voor je community.

Gemaakt voor Skool-admins en communitymanagers die regelmatig posten: het schrijf- en planwerk doen wij, de community laten groeien doe jij.

De extensie werkt met de Skool-sessie waarin je al ingelogd bent. Geen wachtwoorden, geen tweede account. Er is een gratis proefperiode, daarna een abonnement.

Over privacy: de extensie leest je Skool-sessiecookie om in jouw naam te publiceren, bewaart instellingen in je browser en spreekt alleen met onze eigen server api.skapi.pro. Geen advertenties, geen trackers van derden, geen gegevensverkoop — we tellen alleen op onze eigen server welke functies worden gebruikt.

---

## Privacy policy (заготовка для страницы на skapi.pro)

Skool Magic Writer stores your settings locally in your browser. To publish scheduled posts on your behalf, it reads your Skool auth_token session cookie and sends it only to our own API at api.skapi.pro over HTTPS. We do not sell your data, do not use it for advertising and do not share it with third parties. We also log two basic feature-usage events (first time the extension runs on skool.com, first time the Magic Post dialog is opened) together with the extension version, on this same server, solely to understand which features are used; this data is never shared with third parties. Scheduled post content is stored on our servers only so it can be published at the time you chose, and you can delete it at any time from the extension. Questions: [твой email].
