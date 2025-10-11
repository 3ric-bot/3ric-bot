# LearnZo — Uitgebreide platformspecificatie & sitestructuur

> Doel: een gedetailleerde blauwdruk waarmee we direct kunnen bouwen (MVP → v1), inclusief IA (informatie-architectuur), componenten, contentmodellen, API’s, data, security, SEO/performantie en operationele processen.

---

## 1. Informatie-architectuur (IA) & sitemap

### Publiek (niet ingelogd)

- `/` — Home (hero, waardepropositie, CTA’s, social proof, gratis proefles)
- `/leerwegen` — Overzicht leerpaden
- `/leerwegen/[slug]` — Detail leerpad (syllabus, duur, outcomes, FAQ)
- `/lessen/[slug]` — Openbare les-preview (1 gratis les per pad)
- `/projecten` — Showcase/projecten (met filter op niveau/stack)
- `/prijzen` — Prijs/abonnementen (Monthly/Yearly, studentkorting)
- `/about` — Over LearnZo (missie, docenten)
- `/blog` — Blog/kennisbank
- `/contact` — Contact + support-links
- Auth: `/login`, `/register`, `/wachtwoord-vergeten`
- Juridisch: `/privacy`, `/voorwaarden`, `/cookies`

### Ingelogd (student)

- `/app` — Dashboard (voortgang, ‘Verdergaan’, streaks)
- `/app/leerwegen` — Mijn leerpaden
- `/app/leerwegen/[slug]` — Leerpad-overzicht + voortgang
- `/app/lessen/[slug]` — Lesweergave (video/tekst + interactieve opdrachten)
- `/app/opdrachten/[id]` — Oefening met editor + tests + hints
- `/app/projecten/[id]` — Praktijkprojecten met rubric en inlevering
- `/app/certificaten` — Behaalde certificaten (verifieerbare link)
- `/app/profiel` — Profiel, instellingen, facturen, abonnement
- `/app/community` — Discussies per les + algemene feed
- `/app/kalender` — Persoonlijke planning/sprints

### Ingelogd (mentor/docent)

- `/mentor/reviews` — Wachtrij code-reviews/peer reviews
- `/mentor/rapporten` — Cohort-voortgang, risicoleerlingen
- `/mentor/content` — Snelle contentfixes (kopteksten, hints)

### Admin

- `/admin/overview` — Systeemborden, omzet, incidenten
- `/admin/content` — CMS: leerpaden, lessen, quizzes, projecten
- `/admin/users` — Gebruikers & rollen
- `/admin/payments` — Abonnementen, refunds
- `/admin/flags` — Feature flags/experimenten

---

## 2. Navigatie & lay-outs

- **Globale header (publiek):** logo, ‘Leerwegen’, ‘Prijzen’, ‘Blog’, CTA ‘Inloggen’/‘Start gratis’.
- **App-shell (ingelogd):** vaste sidebar (Dashboard, Leerpaden, Community, Certificaten), topbar (zoek, notificaties, profielmenu). Responsive: sidebar → tabbar mobiel.

### Lay-out types

- Marketing: Hero + 3 kolom trust + CTA band + FAQ + footer
- Catalogus: filters (niveau, taal, duur), cards-grid
- Les: 2-koloms (content links, rechterpaneel: navigatie, notities, discussies)
- Oefening: split (editor links, tests/console rechts, onderaan hints)

---

## 3. Design-system (tokens & componenten)

### Tokens

- Kleur: `--brand`, `--brand-contrast`, `--bg`, `--surface`, `--text`, `--success`, `--warning`, `--danger`
- Typografie: Inter/Geist; schaal: 12/14/16/20/24/32/40; line-height 1.5
- Spacing: 4px-grid (4, 8, 12, 16, 24, 32, 48)
- Radius: xs 6, md 12, lg 16, xl 24
- Schaduw: sm, md (elevatie), lg (modaal)

### Kerncomponenten

- Button, LinkButton, Badge, Chip, Tooltip, Modal/Drawer
- Card (media, titel, meta), EmptyState, Skeleton
- Form: Input, Select, Combobox, Checkbox, Radio, Toggle, Slider
- Table (virtueel scroll), Tabs, Accordion, Breadcrumbs
- CodeEditor (Monaco), Terminal/Console
- ProgressBar, Steps, StreakIndicator
- Alert (success/warn/error), InlineHint
- Avatar, UserMenu, NotificationBell
- MarkdownRenderer (met code-highlighting)

### A11y

- Focus states, ARIA labels, kleurcontrast ≥ 4.5:1, skip-links, toetsnav.

---

## 4. Contentmodel (CMS) & relaties

### Leerpaden

- `Path`: id, slug, titel, beschrijving, doelgroep, outcomes[], duur, niveau, heroMedia, tags[], volgorde: Modules[]
- `Module`: id, titel, overzichtstekst, leerdoelen[], tijd (min), prerequisites[]
- `Les`: id, slug, titel, type (video/tekst/live), inhoud (MDX), assets[], transcript, quizId?, opdrachten[]
- `Quiz`: id, vragen[{type: mc/sort/code], uitleg}]
- `Opdracht`: id, titel, instructies (MDX), startercode, tests (unit), hints[], tijdslimiet, taal (JS/Py), rubricId?
- `Project`: id, briefing, acceptance-criteria[], rubric, assets[], peerReview=true/false

### Kennisbank/Blog

- `Post` (SEO velden, author, ogImage)

### Community

- `Thread` (scope: les/opdracht/algemeen), `Comment`, `Reaction`

### Marketing

- `Testimonial`, `Logo`, `FAQItem`, `LandingSection`

---

## 5. Datamodel (DB) — kern tabellen

- `users`: id, email, naam, rol, locale, avatar, aanmaak
- `profiles`: userId FK, bio, handle, voorkeuren (dark, taal)
- `subscriptions`: userId, plan, status, start, end, priceId, trialEndsAt
- `invoices`: userId, stripeInvoiceId, amount, vat, pdfUrl, status
- `paths/modules/lessons/...` (gesynchroniseerd vanuit CMS, read-only replica)
- `progress`: userId, entityType (les/opdracht/module), entityId, status (started/done), score, tijd, lastSeenAt
- `submissions`: userId, assignmentId, codeRepo/zip, score, testResults JSON, runtime, plagioScore
- `reviews`: submissionId, reviewerId, rubricScores JSON, feedback
- `discussions`: threadId, scope, ownerId, createdAt
- `comments`: threadId, authorId, body, editedAt
- `events`: userId, type, meta JSON (event tracking)
- `certificates`: userId, pathId, hash, issuedAt, publicUrl
- `feature_flags`: key, variant, targeting JSON

**Indexering** op `progress (userId, entityId)`, `events (type, createdAt)`, `submissions (assignmentId, createdAt)`.

---

## 6. API-ontwerp (REST/GraphQL-achtig)

### Auth

- `POST /auth/login` (email+magiclink/OAuth), `POST /auth/callback`, `POST /auth/logout`
- `GET /me` → profiel + abonnement + rollen

### Content

- `GET /paths` | `/paths/:slug`
- `GET /lessons/:slug` (MDX → HTML/TOC)
- `GET /assignments/:id`

### Voortgang & submissions

- `GET /progress?user=me&scope=path/:id`
- `POST /progress` (upsert)
- `POST /submissions` (code upload/commit ref)
- `GET /submissions/:id` testresultaten/logs

### Grader

- `POST /grader/run` { assignmentId, lang, code } → { passed, tests[], logs, runtimeMs }
- Webhook: `POST /webhooks/grader` (async resultaten)

### Community

- `GET/POST /threads` (scoped), `POST /comments`

### Billing

- `POST /billing/checkout` (priceId, redirectUrl)
- Webhooks: `/webhooks/stripe` (invoice.paid, customer.subscription.updated)

### Admin

- `POST /content/sync` (CMS → DB)
- `POST /flags/:key` (variant toggle)

**Rate-limiting** via key + IP; idempotency-keys voor POST.

---

## 7. Auth & rollen

- Rollen: `student`, `mentor`, `admin` (RBAC)
- OAuth (Google/GitHub) + magic link; 2FA optioneel
- Toegangsregels: lescontent openbaar/preview, opdrachten & grader → ingelogd + plan check
- Sessies: JWT (korte TTL) + refresh; device list + force logout

---

## 8. Lessen, opdrachten & grader-flow

1. Student opent les → events: `lesson_open`.
2. Start opdracht → editor laadt startercode + test suite.
3. `Run tests` → sandbox (container/VM) voert uit met CPU/ram/time-limits.
4. Resultaat inline (passed/failed), hints op basis van mislukte tests.
5. `Submit` → opslaan submission, score, eventueel plagio-check.
6. Bij project: peer review via rubric; docent kan steekproef doen.

**Taalondersteuning:** MVP JS (in-browser), v1 Python (containerised).

---

## 9. Prestaties & betrouwbaarheid

- **Budgetten:** LCP < 2.5s, TTI < 3s, CLS < 0.1, INP < 200ms.
- **Caching:** CDN cache voor marketing, ISR/SSG; app-routes met stale-while-revalidate.
- **Code-splitting:** route-based + editor lazy load.
- **Asset-optimalisatie:** afbeeldingen next/image, video via HLS (adaptive).
- **Uptime:** 99.9% target; health checks; circuit breakers bij grader.
- **Back-off & retry** voor grader/billing webhooks.

---

## 10. Analytics & meetplan

### Product events (PostHog/Amplitude)

- `signup_started`, `signup_completed`
- `lesson_open`, `lesson_complete`
- `assignment_run`, `assignment_submit`
- `hint_view`, `streak_day`
- `checkout_opened`, `payment_success`

### Kern-KPI’s

- Activatie: % dat binnen 48u een opdracht indient
- Retentie D7/D30
- Module-voltooiing per cohort
- MRR/Churn/ARPU

**Experimenten:** feature flags + A/B (onboarding, paywall, prijskaart).

---

## 11. SEO, content & growth

- **Technisch:** sitemaps, robots, schema.org (Course, FAQ, Article), canonical, hreflang (NL/EN), OpenGraph, noindex voor app-routes.
- **Content:** pilaren (JavaScript Basics, Python Intro), long-tail oefeningen (gratis), internal linking naar paden.
- **Linkbuilding:** project-showcase met deelbare demo’s.
- **Page types:** landings per skill ("Leer JavaScript", "Leer React"), compare-pages (“Codecademy vs LearnZo”).

---

## 12. Betaalstromen & plannen

- Plannen: Free (1 pad/lessen beperkt), Pro €19/m, Pro Jaar €180, Team vanaf €12/seat/m.
- Trial 7 dagen; studentkorting 30%.
- EU-BTW (land + VAT-regels), facturen PDF, SEPA/CC/Apple Pay (Stripe).
- Pauzeren/annuleren, proration, retries bij mislukte betalingen.

---

## 13. Community & support

- Inline discussies per les/opdracht, @mentions, markdown.
- Moderatie: rapporteren, shadow-ban, Profanity filter.
- Support: in-app widget, SLA tags (bug/urgent), status-pagina.
- Code of Conduct + onboarding test.

---

## 14. Toegankelijkheid & inclusie

- Ondertiteling en transcriptie auto + handmatig.
- Toetsenbord-validering voor editor (tab/shift-tab), screenreader labels op testresultaten.
- Kleurenblind-veilige paletten, prefer-reduced-motion.

---

## 15. Beveiliging, privacy & compliance (EU/GDPR)

- DPIA/Threat-model (OWASP Top-10), CSP, SSRF-bescherming grader, secret rotation.
- Dataminimalisatie; bewaartermijnen (events 12m, submissions 24m).
- Gebruikersrechten: export (JSON/CSV), verwijdering binnen 30 dagen.
- Verwerkersovereenkomsten (Stripe, hosting, e-mail).
- Auditlog voor admin-acties.

---

## 16. Observability & incidenten

- Logs (app, grader), metriken (RPS, error rate, queue time), traces.
- Alerting (SLO breaches), on-call runbook, status-pagina.
- Post-mortems met actiepunten.

---

## 17. Teststrategie & kwaliteit

- Unit (UI + utils), component tests (Playwright/RTL), contract tests voor API, end-to-end flows (signup → submit).
- Accessibility tests (axe), visuele regressie (percy/snapshots).
- Loadtest grader (concurrency spikes), chaos-tests (failover).

---

## 18. Deploy & DevOps

- Monorepo (pnpm/turborepo). CI: lint/type/test/build. Preview deploys per PR.
- Infra: FE (Vercel), BE (Fly/Render of AWS), DB (Postgres + read replica), object storage (S3), CDN.
- IaC (Terraform), secret store, blue-green/rollbacks.
- Back-ups: dagelijkse snapshots, restore-oefeningen.

---

## 19. Internationalisatie (i18n)

- NL (default), EN (v1). Hreflang, locale-router, datum/tijdformaten, valutalabels.
- Content in CMS met vertaalstatus en keys.

---

## 20. Onboarding-flow (UX spec)

1. Land op gratis les → `Start gratis` → 3-veld registratie (e-mail, naam, wachtwoord of magic link).
2. Onboarding vragen (doel, niveau, tijd per week) → personaliseert leerpad.
3. Checklist (3 stappen): profiel, eerste oefening, reminder instellen.
4. Email drip (D0, D2, D4, D7) met tips + project.

---

## 21. E-mail & notificaties (transactioneel)

- Verificatie/magic link, wachtwoord reset
- Welkom + onboarding drip
- ‘Verdergaan’ herinnering (2 dagen inactief)
- Factuur betaald/mislukt
- Certificaat behaald (met deelknop)
- Review-verzoek na project

---

## 22. Edge-cases & lege staten

- Nog geen voortgang → toon checklist + demo-opdracht
- Mislukte tests → contextuele hints + link naar theorie
- Offline modus (mini) voor theoriepagina’s; bewaar code in localStorage
- Timeouts in grader → begeleidende kop + retry/backoff

---

## 23. Roadmap naar bouwtaken (MVP 8–10 weken)

**Week 1–2**

- Design-system + marketing lay-outs
- CMS schema (paths/modules/lessons/assignments)
- Auth + profiel + abonnement skeleton

**Week 3–4**

- Lesweergave (MDX), editor + JS-tests in browser
- Voortgangs-API + dashboard
- Stripe checkout + webhooks

**Week 5–6**

- Projecten + certificaten (hash/verify page)
- Analytics events + funnels
- Community threads per les

**Week 7–8**

- Performance/SEO hardening, A11y pass
- Support + status pagina
- Launch v1 beta + bug-bash

---

## 24. Tekstsjablonen (UX microcopy)

- Empty state, error states, hints, succesmeldingen (NL/EN)
- Paywall copy: waarde, garanties, proef
- Certificaat-tekst met verificatielink

---

## 25. Openstaande beslissingen

- Sandbox: pure web (JS) vs containers (voor Python) in v1
- Forum: eigen vs Discord-bridge
- GraphQL vs REST
- Headless CMS keuze (Contentlayer/Sanity/Strapi)

---

### Bijlage A — URL-conventies & SEO

- Slugs `kebab-case`, i18n `/:locale/...`
- Canonical op NL, hreflang naar EN
- UTM op marketing CTA’s

### Bijlage B — Beveiliging checklist

- CSP strict (nonce), SameSite cookies, rate limit, dependency audit, S3 signed URLs, grader netwerk-isolatie

### Bijlage C — Tracking spec (voorbeeld)

- `assignment_run` { assignmentId, lang, testsCount, runtimeMs }
- `assignment_submit` { score, attempts, plagioScore }

---

## 26. Cheatsheets (per onderwerp & les)

- **Doel:** snelle referentie tijdens leren/coderen.

### Locaties

- Publiek: `/cheatsheets` (filter: taal, niveau, topic)
- In-app: rechterpaneel in les/opdracht (`/app/lessen/[slug]`), inline toggle.

### Componenten

- `CheatsheetCard`, `CheatsheetPanel`, `CopyBlock` (code kopiëren), `SearchInput`.

### Contentmodel

- `Cheatsheet` { id, taal (JS/Py), topics[], snippet[], voorbeelden[], anti-valkuilen[], ogImage }.

### SEO

- Schema.org `HowTo`/`TechArticle`; noindex voor in-app varianten.

### Analytics

- `cheatsheet_open`, `cheatsheet_copy`.

---

## 27. Code Language Anatomy Library

- **Doel:** "anatomie" van taalconstructies (syntax + semantiek) met interactieve annotaties.

### Locaties

- `/anatomy` en `/anatomy/[taal]/[concept]` (bv. JS → closures, hoisting; Python → list comps).

### Weergave

- Annotated code viewer (nummerde lagen: token → node → runtime gedrag).
- Toggle: *Syntax* / *Runtime* / *Pitfalls* / *Best practices*.
- Mini-interacties: highlight scopes, call-stack animatie.

### Componenten

- `AnnotatedCode`, `ScopeViz`, `ExecutionTrace`.

### Contentmodel

- `AnatomyEntry` { id, taal, concept, code, AST JSON, uitleg MDX, pitfalls[], links[] }.

### Techniek

- AST via Babel (JS) / LibCST (Py) precomputed; render client-side.

### Analytics

- `anatomy_view`, `anatomy_tab_switch`.

---

## 28. Pseudocode-knop bij elke oefening

- **Doel:** cognitieve transfer: eigen code ↔ algoritmische stappen.

### UI

- Knop *“Zet mijn code om naar pseudocode”* in `Opdracht`-view, naast `Run tests`.

### Gedrag

1. Neemt huidige editor-buffer.
2. Parser → minimale CFG/AST → generator → beknopte stappen (max ~12).
3. Toon side-paneel met bewerkbare pseudocode + `Copy`.

### Beperkingen

- Alleen ondersteunde talen (MVP: JS). Fallback: "beschrijf in 5–8 stappen".

### API

- `POST /pseudocode` { lang, code } → { steps[], complexityHint? }.

### Contentmodel (log)

- `PseudocodeDraft` { userId, assignmentId, steps[], createdAt } (optioneel, voor review/reflectie).

### A11y

- Screenreader-labels; toetsenbord-shortcuts; export als tekst.

### Analytics

- `pseudocode_generate`, `pseudocode_copy`.

---

## 29. Micro-videobibliotheek (15–30s)

- **Doel:** snelle visuele uitleg voor begrippen die beter *gezien* dan gelezen worden.

### Locaties

- Publiek: `/microvideos` met categorieën (syntax, tools, debugging, Git, regex, array-methods).
- In-app: contextueel blok in les/opdracht: *“Zie het in 20s”*.

### Productie-richtlijnen

- Verticale en horizontale versies; ondertiteling + transcript verplicht.
- 1 focuspunt per video; 3–5 shots; eindkader met 1 take-away.
- Bestand: HLS + poster; max 2MB per clip (streamed), lengte 15–30s.

### Componenten

- `MicroVideoCard`, `InlineMicroVideo`, `CaptionTrack`, `TranscriptToggle`.

### Contentmodel

- `MicroVideo` { id, titel, duration, topics[], videoUrl, posterUrl, captionsVTT, transcript, relatedIds[] }.

### Koppeling

- Les/opdracht metadata veld `microVideoIds[]` voor contextuele suggesties.

### SEO

- Schema.org `VideoObject` + `Clip`; lazy load; preconnect naar CDN.

### A11y

- Captions default **aan**; keyboard controls; prefer-reduced-motion respecteren.

### Analytics

- `microvideo_play`, `microvideo_25/50/95`, `microvideo_complete`.

---

## 30. Extra IA & routes (toevoegingen, geen wijzigingen aan bestaande)

- `/cheatsheets`, `/cheatsheets/[slug]`
- `/anatomy`, `/anatomy/[taal]`, `/anatomy/[taal]/[concept]`
- `/microvideos`, `/microvideos/[slug]`

---

## 31. Datamodel (toevoegingen)

- `cheatsheets` (zie §26), `anatomy_entries` (zie §27), `microvideos` (zie §29), `pseudocode_drafts` (zie §28).
- Indexen: `microvideos(topics)`, full-text op `cheatsheets(snippets)`, `anatomy_entries(concept)`.

---

## 32. CMS & workflow

- Nieuwe collecties: Cheatsheets, Anatomy, MicroVideos.
- Velden voor lokalisatie (NL/EN) + status (draft/review/live).
- Review-checklist: correcte code, tests, audit A11y, SEO velden ingevuld.

---

## 33. Roadmap-aanvulling (impact klein → groot)

- Week 2–3: Cheatsheet paneel in les + publieke lijst.
- Week 3–4: Pseudocode-API (JS) + UI-paneel.
- Week 4–5: Micro-video componenten + opslag/CDN + eerste 20 clips.
- Week 5–6: Anatomy Library (JS: scopes, closures) met 6 entries.
- Week 6–7: Analytics events + SEO voor nieuwe secties.

---

## 34. Telemetrie & succesmetrics (nieuw)

- Cheatsheet CTR vanuit les > 20% bij fouten.
- Pseudocode gebruik door starters D7 > 35%.
- Micro-video completion rate > 60%.
- Anatomy page dwell time > 90s.

---

## 35. Edge-cases

- Pseudocode mislukte parse → humane fallback (samenvatting per blok).
- Micro-video offline → toon GIF-achtige storyboard + transcript.
- Cheatsheet conflicten per taalversie → locale-fallback.

---

## 36. Community — diepgaand ontwerp

### 36.1 Doelen & principes

- **Doelen:** snellere leercurve, peer-hulp < 30 min mediane responstijd, motivatie via zichtbare progressie.
- **Principes:** veilig, inclusief, "help first", bewijs-gebaseerd (code/snippets boven meningen), minimale frictie.

### 36.2 Structuur & kanalen

- **Contextuele threads:** per les/opdracht automatisch 1 thread (scope-label + link terug naar content).
- **Thema-ruimtes:** #beginners, #javascript, #python, #projects, #career, #showcase.
- **Vraagtypes:** Vraag, Bug, Review-verzoek, Showcase, Discussie (met icoon en formuliervelden per type).
- **Kennisbank-promotie:** gemarkeerde antwoorden kunnen ‘geëxporteerd’ worden naar de kennisbank/blog.

### 36.3 Reputatie & rollen

- **Reputatiepunten:** stemmen (+5), oplossing geaccepteerd (+15), nuttige review (+10), vlag afgewezen (-2).
- **Badges:** First Answer, 10x Helper, Bug-Hunter, Mentor of the Month, Streaks.
- **Rollen:** Student, Helper (≥500 rep), Mentor (toegewezen), Moderator, Admin.
- **Privileges:** bewerken tag, herlabelen, sluiten als duplicaat (drempels per niveau).

### 36.4 Moderatie & veiligheid

- **Flows:**
  - **Rapporteren:** in-line ‘Meld’ met categorie (spam, off-topic, agressie, NSFW, plagiaat).
  - **Queue:** mod-inbox met SLA (4h), bulkacties, auto-samenvatting.
  - **Escalatie:** soft-warn → time-out 24h → shadow-ban → accountactie.
- **Automatisch:**
  - Toxicity/spam scoring (heuristiek + regex + frequentie), link-rate limiter.
  - Plagiaat: hoge similarity submissions → auto-flag met privékanaal.
- **Code of Conduct:** duidelijke voorbeelden; 1-klik accept bij eerste post.

### 36.5 Features (UX)

- **Editor:** Markdown + codeblokken, gist-embed, “Kopieer code”.
- **Thread UI:** geaccepteerd antwoord omhoog; sorteer op ‘beste’, ‘recent’, ‘ongeantwoord’.
- **Mentor slot:** ‘Vraag review’ → wachtrij met ETA; mentor kan claimen.
- **Inline discussies:** rechterpaneel in les/opdracht toont relevante posts.
- **Tagging:** auto-tags vanuit les/opdrachttype; manual tags met suggesties.
- **Vertaling:** “Vertaal” knop (NL/EN) voor posts/snippets met automatische waarschuwing bij code-formatting.

### 36.6 Programma’s & rituelen

- **Weekly Challenge:** nieuw mini-project op maandag; top-inzendingen op vrijdag.
- **Office Hours (live):** 2× p/w 45 min met mentor; Q&A wordt samengevat.
- **Peer Review Friday:** review-ruil; je krijgt review nadat je er 1 geeft.
- **Show & Tell:** maandelijkse demo; badge + blog spotlight.

### 36.7 Integraties

- **Discord-bridge (optioneel):** read-only push van highlights; deep-link terug naar platform.
- **GitHub:** project-repo koppeling; PR-review tips.
- **Status-pagina:** incident posts gesynchroniseerd.

### 36.8 Technisch ontwerp

- **Datamodel aanvullingen:**
  - `votes` { userId, postId, value }
  - `accepted_answers` { threadId, commentId }
  - `reputation_ledger` { userId, delta, reason, refId }
  - `moderation_flags` { postId, type, status, modId?, notes }
- **Indexen:** `threads(scope, updatedAt)`, `comments(threadId, score)`.
- **API:**
  - `POST /threads`, `GET /threads?scope=lesson:...`, `POST /comments`
  - `POST /votes`, `POST /accept`, `POST /flags`
  - `GET /leaderboard?period=weekly`
- **Realtime:** websockets voor nieuwe reacties en typ-indicatoren.
- **Search:** full-text + BM25, boost geaccepteerde antwoorden.

### 36.9 Onboarding & educatie

- **Eerste post-wizard:** voorbeeld met goede vraag (MCVE), automatische template.
- **Guides:** korte micro-video’s “Hoe stel je een goede vraag?” (15–20s).
- **Nudge:** als iemand 2× code plakt zonder formattering → tooltip met fix.

### 36.10 Metrics & doelen

- **Kern:** tijd tot eerste reactie (<30 min p50), % vragen met geaccepteerd antwoord (>70%), 7-dagen terugkeer van vraagstellers (>40%).
- **Kwaliteit:** downvote-ratio < 10%, mod-ingrepen per 100 posts.
- **Gezondheid:** unieke helpers/week, responstijd mentors, spam rate.

### 36.11 Launchplan (0 → 90 dagen)

- **Fase 1 (0–30d):** Beta met ‘Vraag’ + inline discussies; 5 helpers gerekruteerd; CoC live.
- **Fase 2 (30–60d):** Reputatie + badges; Weekly Challenge; mod-tools v1.
- **Fase 3 (60–90d):** Mentor wachtrij, leaderboard, Discord-highlights, export naar kennisbank.

### 36.12 Risico’s & mitigatie

- **Lage respons:** seed 100 Q&A’s, office hours, notificaties.
- **Toxic gedrag:** strakke CoC, snellere mod-SLA, tooling.
- **Laag signaal/ruis:** thread-templates, tag-suggestie, duplicate-detectie.

---

## 37. Aanvullingen (geaccordeerd, geen wijzigingen aan eerdere secties)

### 37.1 Kalender-koppeling (Google/Apple/Outlook)

- **Functie:** studieplanner, deadlines, herinneringen (iCal feed + OAuth sync).
- **Routes:** `/app/kalender`, `/api/calendar/feed.ics`, `/api/calendar/oauth/*`.
- **Features:** push van module-deadlines, persoonlijke studieblokken, reminder-e-mails.
- **Privacy:** opt-in, read/write scopes per provider, revoke in instellingen.

### 37.2 AI-hints met guardrails

- **Scope:** contextuele hints en vraagherformuleringen; **geen volledige oplossingen**.
- **Guardrails:** rate-limit, expliciete policy in UI, detectie van “geef volledige oplossing” → weiger met educatieve tip.
- **UI:** Hint-knop naast tests; “Waarom faalt test X?”; logboek van geraadpleegde hints.

### 37.3 Content-versioning + “Wat is nieuw”

- **Per les/opdracht:** semver (major/minor/patch), changelog, diff-weergave.
- **API:** `GET /content/:id?version=`, `GET /changelog/:entityId`.
- **Migratie:** markeer voortgang als “herzien” bij major-wijziging met zachte nudge.

### 37.4 LTI/SCORM & SSO (SAML/OIDC) + SCIM provisioning

- **LTI 1.3 Advantage:** deep links, Assignment & Grade Services (score terug), Names & Roles.
- **SCORM:** import/export voor klanten die dit vereisen (SCORM 1.2 + 2004 3rd).
- **SSO:** SAML/OIDC providers (Okta, Azure AD, Google); Just-In-Time provisioning.
- **SCIM:** automatische user lifecycle sync; mappings voor rol/cohort.
- **Security:** nonces, state, JWKs rotatie, issuer-whitelist; auditlog.

### 37.5 Career hub

- **Onderdelen:** portfolio-hosting (project deploys + badges), cv-generator, job board met skill-tags en niveau.
- **Employer view:** verifieerbare certificaten/badges, kandidaatprofielen (opt-in), apply-via-portfolio.

### 37.6 Open Badges (verifieerbare micro-credentials)

- **Standaard:** IMS Open Badges 2.0; JSON-bewijs + verificatie-URL.
- **Issuance:** bij pad/project; deelknoppen (LinkedIn, X, PDF).

### 37.7 RPO/RTO doelen

- **Targets:** **RPO 1h**, **RTO 4h**.
- **Maatregelen:** PITR voor DB, dagelijkse restore-tests, runbook + warm standby.

### 37.8 A/B & feature-gating policy

- **Experimenten:** hypothese → metriek → variant → guardrail-metrics (retentie, klachten, supportload).
- **Gating:** feature-flags per cohort/plan; kill-switch; ethics checklist (geen dark patterns).

### 37.9 Affiliate/ambassador programma

- **Tracking:** UTM-governance, unieke codes/links, first-touch/last-touch attributie.
- **Payouts:** drempel, fraudedetectie, transparante dashboard.

### 37.10 Beurzen & gifting

- **Flows:** sponsor codes, geschenk-licenties, scholierenkorting met verificatie.
- **Rapportage:** seats gebruikt, impact stories.

### 37.11 Transparantie-rapport (kwartaal)

- **Inhoud:** uptime, incidenten + lessons learned, dataverzoeken, beveiligingsupdates.
- **Publicatie:** `/transparantie` + RSS.

### 37.12 Uitgesteld (later te plannen – alleen toevoegen, geen wijzigingen)

- **PWA & offline modus**: lessen/cheatsheets lokaal, “streak freeze”.
- **Mobile-first editor shortcuts**: aangepaste toetsen, snippets.
- **Bug bounty & pentest-cadans**: responsible disclosure, halfjaarlijks pentest.

---

## 38. Security & privacy — verdieping

- **Threat modeling:** STRIDE per domein (auth, grader, payments). Jaarlijks review.
- **Secrets & keys:** central secret store (AWS KMS/HashiCorp Vault), rotatie 90d, no secrets in env vars voor clients.
- **Encryptie:** TLS 1.3 overal; at-rest (Postgres TDE of disk), field-level encryptie voor PII; S3 SSE-KMS; backups encrypted.
- **AuthN/Z:** device-bound sessions, refresh-token rotatie, RBAC + ABAC (plan/role). Admin-toegang via just-in-time + MFA.
- **Rate limiting & bot-defense:** IP + user + route; exponential backoff; CAPTCHA alleen bij verdachte patronen.
- **Headers:** HSTS, CSP (nonce), X-Frame-Options deny, Referrer-Policy strict-origin-when-cross-origin.
- **Input-validatie:** centralized schema (Zod) aan edge + backend.
- **SBOM & dependencies:** generate SBOM per release; dependabot + `npm audit` gating; blok op bekende CVE’s.
- **Supply chain:** verifieer builds (Sigstore/cosign), provenance (SLSA v2→v3 roadmap).
- **Email security:** SPF, DKIM, DMARC **reject**, BIMI optioneel.
- **Privacy by design:** dataminimalisatie, purpose binding, toggles voor tracking; CMP voor cookies; DSR-flow (export/delete binnen 30d).

---

## 39. Backend-architectuur — verdieping

- **Patronen:** DDD bounded contexts (Learning, Community, Billing, Grader), outbox-pattern + event bus (Kafka/Redpanda/NATS).
- **Idempotency:** idempotency-keys op POST (checkout, submissions).
- **Queues & jobs:** retries met jitter; DLQ; idempotente workers.
- **Consistentie:** eventual consistency tussen services; saga voor meerstaps transacties (bv. aankoop → toegang → factuur).
- **API contracten:** OpenAPI + contract testing; versiebeleid (v1/v2) en deprecationschema.
- **Paginering & filters:** cursor-based standaard; limieten; veilig sorteren.
- **Search:** OpenSearch/Meilisearch voor lessen/community met synonym sets.
- **Caching:** edge (CDN), app (Redis), DB (materialized views voor analytics).
- **Media:** presigned URLs; antivirus-scan; image/video transcoding pipeline.

---

## 40. CI/CD & kwaliteit — verdieping

- **Branch protection:** verplichte reviews, status checks, signed commits.
- **Pipelines:** build → unit → integration → e2e → security scans → deploy; canary + auto-rollback op SLO breach.
- **Infra-as-Code:** Terraform met drift-detectie; policy-as-code (OPA) voor changes.
- **Testdata:** synthetische datasets; masking voor pre-prod.
- **Release governance:** changelog automatisering; feature flags per cohort.

---

## 41. Observability & SRE

- **Metrics:** RED + USE; SLO’s per service (bv. API success rate 99.9%, p95 latency < 300ms). Error budgets en release-policy.
- **Tracing:** OpenTelemetry end-to-end (web → API → grader → DB).
- **Logging:** structured JSON; PII-scrubbing; SIEM-alerts voor auth-anomalieën.
- **Chaos & DR:** game days; region-failover tests; RPO/RTO oefeningen per kwartaal.
- **Runbooks:** per incidenttype; on-call rotatie; post-mortem sjablonen.

---

## 42. Content operations

- **Stijl-gids:** toon, terminologie, inclusieve taal; code-stijlen per taal.
- **Editorial calendar:** release-cadans (wekelijks microvideo, 2×/m blog, maandelijks project).
- **L10n QA:** vertaalstatus, pseudolocalization test, RTL-check.
- **Glossary:** begrippenlijst in-app; tooltips gekoppeld aan termen.
- **Peer review:** 2-oog principe op nieuwe lessen/opdrachten; rubrics voor kwaliteit.

---

## 43. Compliance & certificeringen (roadmap)

- **ISO 27001 readiness:** asset register, risk treatment plan, policies (Access, Crypto, Change, Backup, Incident).
- **DPIA templates:** per nieuwe feature met PII; bewaartermijnen vastgelegd.
- **Vendor management:** verwerkerslijst + DPA’s; jaarlijkse evaluatie.

---

## 44. Data & analytics — verdieping

- **Warehouse/ELT:** events → Kafka → object storage → dbt → warehouse (BigQuery/Snowflake/Postgres).
- **Privacyvriendelijk:** server-side tracking waar mogelijk; sampled events; IP truncation.
- **Governance:** data catalog, schema-evolutie, PII-tagging, access via roles.
- **ML-voorbereiding:** features store (progress tempo, hint-afhankelijkheid) met duidelijke opt-out.

---

## 45. Performance & kostenbeheer

- **Budgets:** CPU/mem per service; p95 queries/route; bundle size budget (≤ 180KB gzipped voor kritieke route).
- **Profiling:** real user monitoring + back-end profiler; slow query log + automatische index-suggesties.
- **FinOps:** kosten dashboards per service; alerts op spend spikes.

---

## 46. Frontend UX details

- **Skeuomorfische loading:** skeletons met voorspelbare layout; optimistic UI bij voortgangsopslaan.
- **Error states:** herstelacties, support-link met context ID; retries met exponential backoff.
- **Keyboard-first:** volledige navigatie, command palette (`Cmd/Ctrl+K`).
- **Forms:** inline validation, debounced autosave, undo (client-history) voor tekstvelden.

---

## 47. Support & SLA’s

- **Kanalen:** in-app tickets, e-mail; prioriteiten P0–P3 met doelresponstijden.
- **Macros & kennisbank:** auto-suggest bij ticket aanmaken.
- **Feedbackloop:** “Was dit nuttig?” op hints/cheatsheets → content backlog.

---

## 48. Legal & beleid

- **ToS/Privacy:** versiebeheer + compare; changelog mails bij updates.
- **Kinderen/jongeren:** leeftijdscheck; ouderlijke toestemming waar nodig.
- **Content licenties:** CC-BY voor voorbeelden? (beslispunt); third-party asset tracking.

---

## 49. Device & quality matrix

- **Testmatrix:** top browsers + devices (iOS/Android, low-end Android), netwerkniveaus (3G/4G/5G), zoom/OS-settings.
- **Fallbacks:** low-spec modus (uitgeschakelde animaties, simplere editor).

---

## 50. Roadmap-aanvulling (security/ops)

- Maand 1–2: SBOM + headers + rate limiting; OTel tracing; runbooks v1.
- Maand 3–4: SSO/LTI pilot, DR oefening, chaos test.
- Maand 5–6: ISO27001 readiness docs, SIEM alerts, supply-chain signing.

---

## 51. Curriculum framework — paden, cursussen, lessen (verdieping)

### 51.1 Taxonomie

- **Path (Leerpad/Career Path):** doelrol (bv. *Junior Front-end Developer*), duur (8–16 weken), instapniveau, eindcompetenties.
- **Course (Cursus/Modulecluster):** 3–6 thematische modules binnen een path (bv. *Modern JavaScript*, *React Foundations*).
- **Module:** 4–8 lessen rond 1 leerdoelcluster (bv. *Array-methoden & immutability*).
- **Lesson (Les):** 5–8 minuten micro-content + 1–2 oefeningen + 1 mini-quiz.

### 51.2 Competentie-model (voorbeeld)

- **Core Tech:** HTML/CSS, JS/TS, Git, HTTP/API, tests.
- **Frameworks:** React + router + state mgmt.
- **Software skills:** debugging, code reviews, teamwork.
- **Career skills:** cv/portfolio, communicatie, interview.
- **Rubric niveaus:** *Novice → Competent → Proficient → Job-ready* met concrete gedragingen.

### 51.3 Paden (voorbeeldindeling)

- **Frontend Path (12–16 wkn):**
  1. Web Basics → 2) JS Core → 3) JS Advanced → 4) React → 5) Projecten → 6) Sollicitatie-prep
- **Backend (Node) Path (12–16 wkn):**
  1. JS Core → 2) Node & APIs → 3) Databases → 4) Auth & Security → 5) Projecten → 6) Prep
- **Data Analyst (Py) Path (12–16 wkn, v1.1):**
  1. Python Basics → 2) Pandas → 3) Viz → 4) SQL → 5) Projecten → 6) Prep

---

## 52. Lesontwerp — sjabloon & kwaliteitscriteria

### 52.1 Les-sjabloon (eerste release)

1. **Hook (30–60s)**: mini-video of scenario.
2. **Doel**: 1–2 concrete leerdoelen (Bloom: *apply/understand*).
3. **Uitleg**: korte tekst/visual, 1 codevoorbeeld.
4. **Guided Practice**: 1 interactieve oefening met hints.
5. **Check**: 3–5 quiz-vragen (met uitleg per fout).
6. **Reflectie**: “Wat heb je vandaag gedaan?” + link naar cheatsheet/anatomy.
7. **Verder**: suggestie naar volgende les of micro-video (15–30s).

### 52.2 Kwaliteitseisen

- Leesniveau B1-B2, actieve taal, anti-valkuilen blok.
- A11y: transcript/ondertiteling, toetsnav, contrast OK.
- Meten: `lesson_complete` ≥ 75%, gemiddelde tijd 5–10 min.

---

## 53. Oefeningen & beoordeling — structuur

### 53.1 Oefeningentypen

- **Code kata** (één functie, pure input/output).
- **Bug hunt** (vind & fix 3 fouten; tests falen gericht).
- **Refactor** (zelfde output, betere leesbaarheid/complexiteit).
- **Project slice** (klein onderdeel uit groter project).

### 53.2 Autograder-criteria

- Functionaliteit (tests) 70%, Stijl/Best practices 20% (linters, simpele heuristiek), Efficiëntie 10% (inputgroottes).
- **Hints** op basis van mislukte testcategorieën.
- **Pseudocode-knop** verplicht beschikbaar per oefening (zie §28).

### 53.3 Peer & mentor review

- **Rubric**: Correctheid, Leesbaarheid, Tests, Communicatie in PR.
- 1 peer review verplicht per project; mentor steekproef 10–20%.

---

## 54. Career paths & job readiness — verdieping

### 54.1 Portfolio-lijn

- Elk path levert **3 artefacten**: 2 guided projects + 1 capstone.
- **Capstone**: 2 weken, realistisch scenario (API, auth, deploy), publieke demo + README + postmortem.

### 54.2 Skills-transcript

- JSON + mensleesbaar certificaat: leerdoelen → bewijs (submissions, reviews, scores).
- **Open Badges** koppeling (zie §37.6) per mijlpaal.

### 54.3 Job board & matching

- **Tags**: skills, niveau, regio/remote, taal.
- **Eligibility**: projecten beoordeeld ≥ 80% + soft-skills lespakket afgerond.

### 54.4 Interview-prep

- **Technisch**: 30 katas (DS&A light), system design light voor web.
- **Gedrag**: STAR-antwoorden bibliotheek + mock interview script.
- **Warm-ups**: 10 minuten pre-interview micro-video's.

---

## 55. Progressie, gating & personalisatie

- **Milestones**: afsluittoets per course; toegang tot capstone na ≥ 70%.
- **Adaptive tips**: op basis van foutenpatroon → aanbevolen micro-video of anatomy-entry.
- **Pacing**: flex (2–8 u/week) met kalenderkoppeling (zie §37.1), streaks, “freeze” optioneel later (PWA, §37.12).
- **Remediation**: bij herhaald falen testcategorie X → remedial micro-les + mini-quiz.

---

## 56. Certificaten & badges — mapping

- **Course Certificate**: alle modules voltooid + toets ≥ 70%.
- **Path Certificate (Job-ready)**: alle courses + capstone ≥ 80% + 1 peer review gegeven.
- **Open Badges** uitgifte: *JS Arrays*, *React State*, *API Design*, *Capstone Completed*.

---

## 57. Data/CMS aanvullingen (curriculum)

- **CMS**: `Course` entiteit tussen Path ↔ Module; `Milestone` (type: toets/capstone).
- **DB**: `courses`, `milestones`, `skill_tags`, `transcripts`.
- **API**: `GET /paths/:id/courses`, `GET /courses/:id/modules`, `POST /milestones/:id/submit`.

---

## 58. Content-roadmap (voorbeeld 0–12 weken)

- Wk 1–2: Frontend Path — Web Basics (8 lessen) + JS Core (8).
- Wk 3–4: JS Advanced (8) + 12 katas + 6 micro-video’s.
- Wk 5–6: React Foundations (8) + Project slice (2) + capstone briefing.
- Wk 7–8: Capstone assets + mentor rubric; Career skills 1 (cv/portfolio).
- Wk 9–10: Backend mini-course (APIs) als keuzevak.
- Wk 11–12: Interview-prep pack + job board seed.

---

## 59. SEO — strategie & uitvoering (NL/EN)

### 59.1 Doelen & KPI’s

- Organisch verkeer +60% in 6 mnd, demo-aanmeldingen +30%, DR/autoriteit ↑.
- KPI’s: clicks/impressies (Search Console), top-10 keywords, CR naar signup, CWV pass-rate.

### 59.2 Technisch (must-haves)

- **CWV targets:** LCP < 2.5s, INP < 200ms, CLS < 0.1 (marketing-routes SSG/ISR; app noindex).
- **Indexatie:** XML sitemaps (content/blog/video), robots.txt, canonical, hreflang (nl/en), trailing-slash policy.
- **Structured data:** Organization, Course, ItemList, FAQ, BreadcrumbList, VideoObject, Article, HowTo.
- **Routes noindex:** `/app/*`, `/checkout`, zoekresultaten, paginatie > p1 indien nodig.
- **Assets:** next/image, WebP/AVIF, responsive sizes, lazy-load; preconnect naar CDN.
- **Links:** rel="nofollow sponsored" voor affiliate; 301’s bij slug-wijziging; 410 voor verwijderde content.

### 59.3 Inhoudsstrategie (pilaren → clusters)

- **Pilaren:** *Leer JavaScript*, *Leer Python*, *Front-end Developer worden*, *React voor beginners*, *Git & GitHub*, *Regex*, *APIs & HTTP*.
- **Clusters (voor elk):** how-to’s, foutmeldingen, cheatsheets, micro-video samenvattingen, oefenopgaven.
- **Programmatic SEO:** `/oefeningen/[topic]/[niveau]`, `/cheatsheets/[onderwerp]`, `/anatomy/[taal]/[concept]` met uniforme sjablonen + schema.

### 59.4 Paginasjablonen (marketing)

- **Landing (skill):** hero + outcomes + syllabus snippet + CTA + FAQ (FAQ schema).
- **Vergelijk:** “Codecademy vs LearnZo”, “Bootcamp vs zelfstudie” (pros/cons schema), intent hoog.
- **Career:** “Junior Front-end worden” (Course + JobPosting schema indien van toepassing).
- **Gratis les:** indexeerbare preview (VideoObject + Clip).

### 59.5 Keyword-map (voorbeeld NL)

- *leer programmeren* (hub/home), *leer javascript*, *javascript oefeningen*, *react cursus*, *python voor beginners*, *git tutorial*, *regex uitleg*, *frontend developer worden*, *portfolio developer voorbeelden*.
- Long-tails: “array methods uitleg”, “fetch api voorbeeld”, “promise vs async await”, “css grid voorbeelden”, “sql joins uitleg”.

### 59.6 On-page best practices

- H1 uniek; H2’s als vragen; max 70-karakter title, 155-karakter meta.
- Interne links: van lessen → paden → aanmelding; breadcrumbs + schema.
- Toegankelijke tabellen/code; alt-teksten met doel, geen keyword stuffing.

### 59.7 Content-cadans (90 dagen)

- **Wekelijks:** 2 blogposts (how-to + foutmelding-fix), 1 cheatsheet, 4 micro-video’s.
- **Maandelijks:** 1 pillar update + 1 vergelijking + 1 case study/project spotlight.
- **Republishing:** update top 10 posts (nieuwe voorbeelden/links), voeg FAQ-blok toe.

### 59.8 Linkbuilding & PR

- Gastposts (edu/dev blogs), universiteiten/codestudenten verenigingen, open-source projectreadme’s met “Built on LearnZo”, interviews/podcasts.
- Deelbare projecten (live demos) → natuurlijke links.

### 59.9 Monitoring & tooling

- Google Search Console, Bing Webmaster, schema validator, log-analyse (crawl budget), sitemap gezondheid.
- Rank tracking op 50 kernkeywords; dashboards in GA4 + Looker/Datastudio.

### 59.10 Governance

- Content-briefs met zoekintentie; redactie-review; anti-plagiaat; update-policy (±6 mnd).
- I18n SEO: aparte slugs per taal, `hreflang`, vertaalde meta’s, locale-specifieke voorbeelden.

---

## 60. SEO sjablonen & componenten

- `SEOHead` (title, meta, canonicals, open graph, twitter), `Breadcrumbs` + schema, `FAQBlock` + schema, `CourseSchema`, `VideoSchema` (voor micro-video’s), `AuthorBlock`.
- CTA varianten met experiment-hooks (A/B).

---

## 61. Keyword seedlijst (NL/EN — compact)

- **NL:** leer programmeren; programmeer cursus; javascript cursus; javascript oefeningen; react cursus; python cursus; git tutorial; regex uitleg; frontend developer worden; portfolio developer.
- **EN (voor later):** learn to code; javascript tutorial; react course; python for beginners; git guide; regex cheatsheet; frontend developer path; coding portfolio examples.

