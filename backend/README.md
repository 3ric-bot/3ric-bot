# LearnZo Secure Reference Backend

De referentie-backend levert de belangrijkste LearnZo-platformroutes met versterkingen rond authenticatie, security headers, rate limiting en WHY-georiënteerde content. Hij draait volledig op Node.js core-modules en persistente opslag op schijf, zodat je realistische flows kunt testen zonder externe services.

## Kernfeatures

- **JWT-authenticatie met refresh tokens** – `POST /auth/login` levert een kortlevende access-token (15 min) en plaatst een HttpOnly refresh-cookie (14 dagen). Gebruik `POST /auth/refresh` om sessies veilig te verlengen en `POST /auth/logout` om tokens te revoken.
- **Role-aware RBAC** – Access tokens bevatten `role` en `plan`. Alle beschermde routes gebruiken `ensureAuth` met optionele `roles`-guarding.
- **Security headers & rate limiting** – Strikte CSP, HSTS, Referrer-Policy, COOP/CORP en `WWW-Authenticate` worden standaard gezet. Elke client-IP krijgt standaard 120 requests per 60 seconden (aanpasbaar via env).
- **Body size & JSON validatie** – Payloads worden beperkt tot 512 KB en ongeldig JSON leidt tot duidelijke 400/413 responses.
- **WHY-first curriculumdata** – Paths bevatten courses met `whyItMatters`, modules hebben reflectieprompts en lessen/opdrachten registreren succescriteria, zodat responses de “waarom” naast de “hoe” communiceren.
- **Device-bound sessies & audit logging** – Refresh tokens worden aan een device-ID gekoppeld; rotatie vereist een overeenkomende header. Elke kritieke actie schrijft naar het auditlog én `POST /events` voor producttelemetrie.
- **Kalenderfeeds & privacy-workflows** – Studenten kunnen een iCal-feed genereren (`/calendar/feed.ics`), events loggen en privacyverzoeken (`/privacy/export`, `/privacy/delete`) indienen voor admins die via `/admin/privacy-requests` opvolgen.

## Snelstart

```bash
cd backend
cp .env.example .env   # pas secrets & allowed origins aan
node src/server.js
```

De server draait standaard op `http://localhost:4000`. Wanneer je `SSL_KEY_PATH` en `SSL_CERT_PATH` instelt, schakelt hij automatisch over naar `https://localhost:4000` met het opgegeven certificaat.

> ℹ️ **TLS-validatie** – zodra `SSL_KEY_PATH` en `SSL_CERT_PATH` zijn gezet, moeten de bestanden leesbaar zijn. Faalt het inladen, dan stopt het proces met een fout zodat je configuratieproblemen direct ziet.

## Productie-deploy met Docker Compose

Gebruik het `docker-compose.yml` bestand in de projectroot om backend, frontend en Caddy-proxy samen uit te rollen. Zie [`docs/deployment.md`](../docs/deployment.md) voor stap-voor-stap instructies en variabelen.

## Persistente opslag

- **Journaling JSON-store** – standaard gebruikt de server `DATA_STORE_DRIVER=journaled`. Elke write voert een fsync uit, bewaart een `.bak` snapshot en schrijft een `.sha256` checksum om corruptie te detecteren.
- **Bestandspad** – standaard schrijft de server naar `backend/data/state.json`. Gebruik `DATA_STORE_PATH` om een alternatief pad (bijv. `/var/lib/learnzo/state.json`) te kiezen.
- **Inhoud** – gebruikers, voortgang, submissions, communitythreads, kalenderitems, facturen, gamification, telemetry-events, calendar tokens en auditlog worden na elke mutatie opgeslagen.
- **Resetten** – verwijder de statebestanden of draai `npm test` (dat `resetServerState` aanroept) om de seeddata opnieuw in te laden.

### Seed-accounts

| Rol | E-mail | Wachtwoord |
| --- | --- | --- |
| Student | `ada@student.learnzo.io` | `Student123!` |
| Mentor | `mina.mentor@learnzo.io` | `Mentor123!` |
| Admin | `alex.admin@learnzo.io` | `Admin123!` |

Na inloggen stuur je requests met `Authorization: Bearer <accessToken>`.

## Belangrijkste routes

- `GET /meta/endpoints` – JSON-overzicht van alle API-methodes met categorie, authenticatie en beschrijving.
- `POST /auth/login` – inloggen met e-mail + wachtwoord (zet refresh-cookie `learnzo_refresh_token`).
- `POST /auth/register` – self-service registratie met device-bound sessies, plan-selectie en directe login.
- `POST /auth/refresh` – roteert refresh token en levert nieuwe access token.
- `POST /auth/logout` – vernietigt refresh token + cookie.
- `GET /me` – geeft geauthenticeerde gebruikerscontext terug.
- `GET /paths` / `GET /paths/:slug` – leerpadoverzichten inclusief WHY-context.
- `GET /courses` / `GET /courses/:slug` – cursusdetails met reflectieprompts en assessments.
- `GET /lessons/:slug`, `GET /assignments/:id` – lessons/opdrachten met `why`, `successCriteria` en `reflectionPrompt` velden.
- `GET /progress`, `POST /progress` – voortgang bijhouden (vereist access token).
- `POST /submissions`, `POST /grader/run` – grader simulatie met pseudocode generaties.
- `GET /events`, `POST /events` – producttelemetrie ophalen en clientevents registreren.
- `GET /mentor/reviews`, `POST /mentor/reviews/:id/claim|complete` – mentorwachtrij (role: mentor).
- `GET /admin/promotions`, `POST /admin/promotions`, `PATCH /admin/promotions/:id`, `POST /admin/promotions/:id/{activate|pause|archive}` – beheer kortingen/acties met schema-validatie, auditlogging en lifecycle-guardrails (role: admin).
- `GET /admin/flags`, `PATCH /flags/:key` – feature flags beheren (role: admin).
- `GET /app/dashboard`, `GET /app/calendar` (+ CRUD), `GET /billing/invoices`, `GET /app/certificaten`, `GET /support/status` – aanvullende platformroutes.
- `POST /subscriptions/change` – upgrade/downgrade of pauzeer abonnement (studenten zelf of admin/mentor voor andere gebruikers).
- `GET /calendar/feed-token`, `POST /calendar/feed-token` – iCal-feed ophalen of roteren (vereist login).
- `GET /calendar/feed.ics?token=<token>` – gedeelde iCal-feed (token-gebaseerde toegang).
- `POST /privacy/export`, `POST /privacy/delete` – Data Subject Requests voor export en verwijdering.
- `GET /admin/privacy-requests`, `PATCH /admin/privacy-requests/:id` – DSR-workflow voor admins.
- `GET /admin/audit-log` – laatste audit events ophalen (role: admin).
- `GET /gamification`, `POST /gamification/streak`, `POST /gamification/award` – gamificationprofielen, streak-management en mentorbadges.

Zie `src/server.js` voor de volledige routekaart.

## Omgevingsvariabelen (`.env`)

| Variabele | Default | Beschrijving |
| --- | --- | --- |
| `PORT` | `4000` | Luisterpoort. |
| `ACCESS_TOKEN_SECRET` | `development-access-secret` | HMAC geheim voor access tokens. |
| `REFRESH_TOKEN_SECRET` | `development-refresh-secret` | HMAC geheim voor refresh tokens. |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:4173` | Komma-gescheiden lijst van toegestane origins voor CORS. |
| `RATE_LIMIT_MAX` | `120` | Max requests per window per IP. |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Windowgrootte in ms. |
| `MAX_BODY_BYTES` | `524288` | Maximale payloadgrootte in bytes. |
| `DEVICE_ID_REQUIRED` | `true` | Vereist dat login/refresh een device-ID meesturen. |
| `DEVICE_ID_HEADER` | `X-Device-ID` | Headernaam waarmee clients het device-ID doorgeven. |
| `DATA_STORE_DRIVER` | `journaled` | Kies `journaled` (fsync + checksum) of `file` (backwards compatible). |
| `DATA_STORE_PATH` | `backend/data/state.json` | Hoofdpad voor persistente platformdata. |
| `SSL_KEY_PATH` | _leeg_ | Optioneel pad naar een PEM private key voor TLS. |
| `SSL_CERT_PATH` | _leeg_ | Optioneel pad naar het TLS-certificaat. |
| `SSL_CA_PATH` | _leeg_ | Optioneel pad naar CA chain voor mTLS/self-signed setups. |

Pas deze waarden aan voor productie-achtige scenario’s en plaats secrets in een secrets manager.

## Testen

Er staat een lichte integratietest-suite klaar die de belangrijkste beveiligings- en complianceflows raakt.

```bash
cd backend
npm test
```

De tests starten de server in-memory, loggen in als student en admin, maken events aan, dienen privacyrequests in en halen de kalenderfeed op. Zo weet je zeker dat device-bound auth, eventlogging en DSR-workflows blijven werken bij toekomstige wijzigingen.

## Data uitbreiden

- Voeg nieuwe cursussen of modules toe in `src/data.js` en gebruik dezelfde `whyItMatters`/`reflectionPrompts` patronen.
- Voeg extra gebruikers toe via `createPasswordRecord` (zie `src/security.js`) om veilige wachtwoorden te genereren.
- Gebruik `logAudit` hooks in `src/server.js` als referentie voor extra auditlogging.

## Bekende beperkingen

- TLS is optioneel via lokale certificaten; zonder reverse proxy ontbreken HTTP/2, OCSP stapling en automatische cert-rotatie.
- Refresh tokens worden persistente opgeslagen (inclusief revocation-state) via de journaling datastore; zorg bij multi-node deployments voor een gedeelde opslaglocatie of service zodat elke node dezelfde tokens kan valideren.
- Rate limiting is IP-gebaseerd zonder distributed store.

Deze referentie-implementatie is bedoeld voor het LearnZo productteam en kan eenvoudig uitgebreid worden met extra routes of beveiligingslagen.
