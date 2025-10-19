# LearnZo launch readiness checklist

Dit overzicht vat samen welke stappen je moet zetten voordat je de LearnZo-stack publiek uitrolt. Elke sectie verwijst naar de bestaande handleidingen zodat je gericht kunt aftikken wat er nog ontbreekt.

## 1. Domein, TLS en infrastructuur
- Reserveer een domein, wijs het naar je host en vul `APP_DOMAIN`, `API_BASE_URL` en `SITE_BASE_URL` in de `.env` bestanden in voordat je de stack bouwt. Zo krijgen alle pagina's de juiste canonical en API-verwijzingen. Zie de deployment-handleiding voor de exacte variabelen en vereisten.【F:docs/deployment.md†L1-L33】
- Start de Docker Compose stack (`proxy`, `frontend`, `backend`) zodat Caddy automatisch TLS-certificaten ophaalt en reverse proxying regelt. Controleer daarna of de health-endpoint (`/api/support/status`) en auditlog (`/api/admin/audit-log`) bereikbaar zijn.【F:docs/deployment.md†L22-L44】

## 2. Secrets, tokens en netwerkbeveiliging
- Vervang alle standaard secrets in `backend/.env` door waarden uit een secrets manager en houd ze gescheiden per omgeving. De hardening-lijst adviseert tools zoals Doppler of 1Password CLI.【F:docs/deployment.md†L76-L78】
- Plaats de stack achter een productie-grade reverse proxy of WAF (bijv. Cloudflare) voor DDoS-bescherming en automatisch certificaatbeheer.【F:docs/deployment.md†L76-L80】
- Beslis hoe je refresh tokens wilt delen tussen meerdere nodes. De referentie-backend schrijft tokens en revocation-events nu weg naar de persistente datastore; voor horizontale schaal heb je nog steeds een gedeelde locatie (NFS, database of secrets manager) nodig zodat alle nodes dezelfde state lezen.【F:backend/README.md†L113-L118】

## 3. Monitoring, logging en back-ups
- Koppel de `/metrics` output van de backend aan je Prometheus/Grafana stack en stream Caddy/backend logs naar een centrale collector voor incidentrespons.【F:docs/deployment.md†L39-L44】【F:docs/deployment.md†L76-L79】
- Automatiseer back-ups van het `learnzo_state` volume en test regelmatig een restore, zodat je voldoet aan de RPO/RTO-doelen uit de roadmap.【F:docs/deployment.md†L46-L55】

## 4. Compliance en operations
- Activeer periodieke audits via het `/api/admin/audit-log` en de privacy-request endpoints, en bevestig dat je intern runbooks hebt voor export/verwijder flows.【F:docs/deployment.md†L39-L44】【F:backend/README.md†L56-L71】
- Documenteer wie toegang krijgt tot de seedaccounts of maak eigen productie-accounts door `createPasswordRecord` te gebruiken, zodat wachtwoorden niet in plain text worden gedeeld.【F:backend/README.md†L38-L46】【F:backend/README.md†L107-L111】

## 5. Content en analytics
- Loop de WHY-first curriculumdata na en vul eigen content/assessments aan in `src/data.js` voordat je live gaat; seeds zijn bedoeld als referentie en moeten op jouw leerdoelen aansluiten.【F:backend/README.md†L31-L37】【F:backend/README.md†L107-L110】
- Configureer je analytics-pipeline door `/events` en de structured telemetry te koppelen aan je product-analytics platform, zodat dashboards echte gebruikersdata tonen vanaf dag één.【F:backend/README.md†L61-L71】

Wanneer alle punten hierboven zijn afgevinkt kun je de stack veilig publiek maken, met TLS, bewaakte storage, audit trails en WHY-first leercontent die aansluit op je doelgroep.
