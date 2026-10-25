# Chrome Web Store — submission kit (Skool Magic Writer v1.1.19)

Zip для загрузки: `skool-magic-writer-1.1.19.zip` (в корне сабмодуля).
Консоль: https://chrome.google.com/webstore/devconsole (нужен аккаунт разработчика, разовый взнос $5).

## Что заполнять в консоли

- **Upload zip** → `skool-magic-writer-1.1.19.zip`
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
**Name:** Skool Magic Writer
**Short:** Write Skool posts with a little AI help, attach GIFs and schedule them for later. All inside skool.com.
**Detailed:**
Skool Magic Writer puts two small buttons next to the composer you already use on skool.com. Everything happens right there, where you normally write.

✨ Magic Post: describe your idea in a couple of words, in any language, and you get a draft with a title and paragraphs. Tweak it, then post.
📅 Schedule: pick a time (there are quick presets like Tomorrow 9:00) and the post goes out on its own, from your account.
🎬 GIFs: attach one and it publishes together with the post.
🔔 When a scheduled post is live you get a normal system notification with a link.
🗂 The calendar button in the top bar keeps all your scheduled, published and failed posts in one list.

The extension works with the Skool session you are already logged into. No passwords, no second account. There is a free trial, after that a subscription.

On privacy: the extension reads your Skool session cookie so it can publish as you, saves your settings in your browser, and only ever talks to our own server at api.skapi.pro. No ads, no analytics, no data selling.

### ru — Русский
**Name:** Skool Magic Writer
**Short:** Пишите посты для Skool с помощью ИИ, прикрепляйте GIF и откладывайте публикацию. Всё внутри skool.com.
**Detailed:**
Skool Magic Writer ставит две кнопки рядом с полем, где вы обычно пишете посты в skool.com. Весь интерфейс живёт там же, ничего настраивать не нужно.

✨ Магический пост: опишите идею парой слов на любом языке, получите черновик с заголовком и абзацами. Поправили и опубликовали.
📅 Расписание: выберите время (есть быстрые пресеты вроде «Завтра в 9:00»), и пост выйдет сам, с вашего аккаунта.
🎬 GIF: прикрепите гифку, она уйдёт вместе с постом.
🔔 Когда отложенный пост опубликован, приходит обычное системное уведомление со ссылкой.
🗂 Кнопка календаря в шапке собирает все отложенные, опубликованные и неудавшиеся посты в один список.

Расширение работает через вашу сессию Skool. Без паролей и вторых аккаунтов. Есть бесплатный пробный период, дальше подписка.

Про приватность: расширение читает cookie сессии Skool, чтобы публиковать посты от вашего имени, хранит настройки в браузере и общается только с нашим сервером api.skapi.pro. Никакой рекламы и аналитики, данные не продаём.

### uk — Українська
**Name:** Skool Magic Writer
**Short:** Створюйте пости для Skool за допомогою ШІ, додавайте GIF і плануйте публікацію. Усе в середині skool.com.
**Detailed:**
Skool Magic Writer додає дві кнопки поруч із полем, де ви зазвичай пишете пости в skool.com. Увесь інтерфейс живе там же.

✨ Магічний пост: опишіть ідею парою слів будь-якою мовою, отримаєте чернетку із заголовком і абзацами. Виправили і опублікували.
📅 Розклад: виберіть час (є швидкі пресети на кшталт «Завтра о 9:00»), і пост вийде сам, з вашого акаунта.
🎬 GIF: додайте гіфку, вона піде разом із постом.
🔔 Коли відкладений пост опубліковано, приходить звичайне системне повідомлення з посиланням.
🗂 Кнопка календаря у шапці збирає всі відкладені, опубліковані й невдалі пости в один список.

Розширення працює через вашу сесію Skool. Без паролів і других акаунтів. Є безкоштовний пробний період, далі підписка.

Про приватність: розширення читає cookie сесії Skool, щоб публікувати пости від вашого імені, зберігає налаштування в браузері і спілкується лише з нашим сервером api.skapi.pro. Реклами й аналітики немає, дані не продаємо.

### de — Deutsch
**Name:** Skool Magic Writer
**Short:** Schreibe Skool-Beiträge mit etwas KI-Unterstützung, hänge GIFs an und plane sie für später. Alles in skool.com.
**Detailed:**
Skool Magic Writer setzt zwei kleine Buttons neben das Eingabefeld, das du auf skool.com eh schon benutzt. Alles passiert genau dort, wo du normalerweise schreibst.

✨ Magic Post: beschreibe deine Idee in ein paar Wörtern, in beliebiger Sprache, und du bekommst einen Entwurf mit Titel und Absätzen. Kurz überarbeiten, fertig.
📅 Planen: Datum und Uhrzeit wählen (Schnellvorlagen wie „Morgen 9:00" inklusive), und der Beitrag geht von selbst raus, von deinem Konto.
🎬 GIFs: eins anhängen, es erscheint zusammen mit dem Beitrag.
🔔 Wenn ein geplanter Beitrag live ist, bekommst du eine normale Systembenachrichtigung mit Link.
🗂 Der Kalender-Button in der Kopfzeile sammelt alle geplanten, veröffentlichten und fehlgeschlagenen Beiträge an einem Ort.

Die Erweiterung nutzt die Skool-Sitzung, in der du schon eingeloggt bist. Keine Passwörter, kein zweites Konto. Es gibt eine kostenlose Testphase, danach ein Abo.

Zum Datenschutz: Die Erweiterung liest deinen Skool-Session-Cookie, um in deinem Namen zu veröffentlichen, speichert Einstellungen im Browser und spricht nur mit unserem eigenen Server api.skapi.pro. Keine Werbung, keine Tracker, kein Datenverkauf.

### es — Español
**Name:** Skool Magic Writer
**Short:** Escribe posts para Skool con ayuda de IA, adjunta GIFs y publícalos cuando quieras. Todo dentro de skool.com.
**Detailed:**
Skool Magic Writer coloca dos botones pequeños junto al cuadro donde ya escribes en skool.com. Todo pasa ahí mismo, donde normalmente escribes.

✨ Magic Post: describe tu idea en un par de palabras, en cualquier idioma, y recibes un borrador con título y párrafos. Lo ajustas y publicas.
📅 Programar: eliges fecha y hora (hay presets rápidos como «Mañana 9:00») y el post sale solo, desde tu cuenta.
🎬 GIFs: adjunta uno y se publica junto con el post.
🔔 Cuando un post programado sale a la luz recibes una notificación normal del sistema con su enlace.
🗂 El botón de calendario en la barra superior guarda todos tus posts programados, publicados y fallidos en una sola lista.

La extensión funciona con la sesión de Skool en la que ya estás. Sin contraseñas ni cuentas nuevas. Hay prueba gratis y luego una suscripción.

Sobre la privacidad: la extensión lee tu cookie de sesión de Skool para publicar en tu nombre, guarda los ajustes en tu navegador y solo habla con nuestro servidor api.skapi.pro. Sin anuncios, sin analítica, no vendemos datos.

### fr — Français
**Name:** Skool Magic Writer
**Short:** Rédigez vos posts Skool avec un coup de main de l'IA, joignez des GIF et publiez plus tard. Tout dans skool.com.
**Detailed:**
Skool Magic Writer ajoute deux petits boutons à côté de la zone où vous écrivez déjà sur skool.com. Tout se passe là, dans votre flux de travail habituel.

✨ Magic Post : décrivez votre idée en quelques mots, dans n'importe quelle langue, et vous recevez un brouillon avec titre et paragraphes. Vous ajustez, puis vous publiez.
📅 Planifier : choisissez date et heure (des préréglages rapides comme « Demain 9:00 » sont inclus) et le post part tout seul, depuis votre compte.
🎬 GIF : joignez-en un, il part avec le post.
🔔 Quand un post planifié est publié, vous recevez une notification système classique avec un lien.
🗂 Le bouton calendrier en haut de page garde tous vos posts planifiés, publiés et échoués dans une seule liste.

L'extension fonctionne avec votre session Skool existante. Pas de mot de passe, pas de deuxième compte. Essai gratuit puis abonnement.

Côté vie privée : l'extension lit votre cookie de session Skool pour publier en votre nom, garde vos réglages dans le navigateur et ne parle qu'à notre serveur api.skapi.pro. Pas de pub, pas de trackers, pas de revente de données.

### it — Italiano
**Name:** Skool Magic Writer
**Short:** Scrivi post per Skool con un aiuto dall'IA, allega GIF e pubblicali quando vuoi. Tutto dentro skool.com.
**Detailed:**
Skool Magic Writer aggiunge due piccoli pulsanti accanto alla casella dove già scrivi su skool.com. Tutto succede lì, dove di solito lavori.

✨ Magic Post: descrivi la tua idea in un paio di parole, in qualsiasi lingua, e ottieni una bozza con titolo e paragrafi. Sistemi e pubblichi.
📅 Programma: scegli data e ora (ci sono preset rapidi come «Domani 9:00») e il post esce da solo, dal tuo account.
🎬 GIF: alleghane una e viene pubblicata insieme al post.
🔔 Quando un post programmato va online ricevi una normale notifica di sistema con il link.
🗂 Il pulsante calendario in alto tiene tutti i post programmati, pubblicati e non riusciti in un'unica lista.

L'estensione usa la sessione Skool a cui sei già collegato. Niente password, niente secondo account. C'è una prova gratuita, poi un abbonamento.

Sulla privacy: l'estensione legge il cookie di sessione Skool per pubblicare per conto tuo, salva le impostazioni nel browser e parla solo con il nostro server api.skapi.pro. Niente pubblicità, niente tracker, nessuna vendita di dati.

### pt_BR — Português (Brasil)
**Name:** Skool Magic Writer
**Short:** Escreva posts para o Skool com ajuda de IA, anexe GIFs e publique quando quiser. Tudo dentro do skool.com.
**Detailed:**
O Skool Magic Writer coloca dois botões pequenos ao lado da caixa onde você já escreve no skool.com. Tudo acontece ali mesmo, no seu fluxo de sempre.

✨ Magic Post: descreva sua ideia em algumas palavras, em qualquer idioma, e receba um rascunho com título e parágrafos. Ajusta e publica.
📅 Agendar: escolha data e hora (tem presets rápidos como «Amanhã 9:00») e o post sai sozinho, da sua conta.
🎬 GIFs: anexe um e ele vai junto com o post.
🔔 Quando um post agendado é publicado você recebe uma notificação normal do sistema com o link.
🗂 O botão de calendário no topo guarda todos os posts agendados, publicados e que falharam numa lista só.

A extensão funciona com a sessão do Skool em que você já está. Sem senhas, sem conta nova. Tem teste grátis e depois assinatura.

Sobre privacidade: a extensão lê o cookie de sessão do Skool para publicar em seu nome, guarda as configurações no navegador e conversa apenas com o nosso servidor api.skapi.pro. Sem anúncios, sem rastreadores, não vendemos dados.

### pl — Polski
**Name:** Skool Magic Writer
**Short:** Pisz posty do Skool z pomocą AI, dodawaj GIF-y i publikuj, kiedy chcesz. Wszystko w skool.com.
**Detailed:**
Skool Magic Writer dodaje dwa małe przyciski obok pola, w którym już piszesz na skool.com. Wszystko dzieje się na miejscu, w twoim normalnym rytmie pracy.

✨ Magic Post: opisz pomysł kilkoma słowami, w dowolnym języku, a dostaniesz szkic z tytułem i akapitami. Poprawiłeś i opublikowałeś.
📅 Harmonogram: wybierz datę i godzinę (są szybkie presety, np. „Jutro 9:00”), a post opublikuje się sam, z twojego konta.
🎬 GIF-y: dodaj jeden, opublikuje się razem z postem.
🔔 Gdy zaplanowany post wyjdzie, dostajesz zwykłe powiadomienie systemowe z linkiem.
🗂 Przycisk kalendarza na górze trzyma wszystkie zaplanowane, opublikowane i nieudane posty w jednej liście.

Rozszerzenie działa na twojej bieżącej sesji Skool. Bez haseł i drugiego konta. Jest darmowy okres próbny, potem subskrypcja.

Prywatność: rozszerzenie czyta ciasteczko sesji Skool, żeby publikować w twoim imieniu, zapisuje ustawienia w przeglądarce i rozmawia wyłącznie z naszym serwerem api.skapi.pro. Bez reklam, bez trackerów, nie sprzedajemy danych.

### tr — Türkçe
**Name:** Skool Magic Writer
**Short:** Skool için yapay zekâ desteğiyle gönderiler yazın, GIF ekleyin ve zamanlayın. Hepsi skool.com içinde.
**Detailed:**
Skool Magic Writer, skool.com'da zaten yazı yazdığınız kutunun yanına iki küçük düğme ekler. Her şey orada, alıştığınız yerde olur.

✨ Magic Post: fikrinizi birkaç kelimeyle, istediğiniz dilde anlatın; başlığı ve paragrafları hazır bir taslak alın. Düzeltin, yayınlayın.
📅 Zamanla: tarih ve saat seçin («Yarın 9:00» gibi hızlı ön ayarlar var), gönderi kendi hesabınızdan kendiliğinden çıkar.
🎬 GIF: bir tane ekleyin, gönderiyle birlikte yayınlanır.
🔔 Zamanlanmış gönderi yayınlandığında bağlantılı normal bir sistem bildirimi alırsınız.
🗂 Üstteki takvim düğmesi tüm zamanlanmış, yayınlanmış ve başarısız gönderileri tek listede tutar.

Uzantı, içinde zaten oturum açık olan Skool hesabınızla çalışır. Şifre yok, ikinci hesap yok. Ücretsiz deneme var, sonrasında abonelik.

Gizlilik hakkında: uzantı sizin adınıza yayınlayabilmek için Skool oturum çerezinizi okur, ayarları tarayıcınızda saklar ve yalnızca kendi sunucumuz api.skapi.pro ile konuşur. Reklam yok, izleyici yok, veri satışı yok.

### nl — Nederlands
**Name:** Skool Magic Writer
**Short:** Schrijf Skool-posts met een beetje hulp van AI, voeg GIF's toe en plan ze voor later. Alles in skool.com.
**Detailed:**
Skool Magic Writer zet twee kleine knoppen naast het veld waar je op skool.com toch al schrijft. Alles gebeurt daar, in je gewone werkstroom.

✨ Magic Post: omschrijf je idee in een paar woorden, in elke taal, en je krijgt een concept met titel en alinea's. Even bijwerken en plaatsen.
📅 Plannen: kies datum en tijd (snelle presets zoals «Morgen 9:00» zitten erbij) en de post gaat vanzelf de lucht in, vanaf jouw account.
🎬 GIF's: voeg er een toe, die wordt samen met de post gepubliceerd.
🔔 Als een geplande post live is, krijg je een normale systeemmelding met link.
🗂 De kalenderknop bovenaan houdt al je geplande, gepubliceerde en mislukte posts in één lijst bij.

De extensie werkt met de Skool-sessie waarin je al ingelogd bent. Geen wachtwoorden, geen tweede account. Er is een gratis proefperiode, daarna een abonnement.

Over privacy: de extensie leest je Skool-sessiecookie om in jouw naam te publiceren, bewaart instellingen in je browser en spreekt alleen met onze eigen server api.skapi.pro. Geen advertenties, geen trackers, geen gegevensverkoop.

---

## Privacy policy (заготовка для страницы на skapi.pro)

Skool Magic Writer stores your settings locally in your browser. To publish scheduled posts on your behalf, it reads your Skool auth_token session cookie and sends it only to our own API at api.skapi.pro over HTTPS. We do not sell your data, do not use it for advertising and do not share it with third parties. Scheduled post content is stored on our servers only so it can be published at the time you chose, and you can delete it at any time from the extension. Questions: [твой email].
