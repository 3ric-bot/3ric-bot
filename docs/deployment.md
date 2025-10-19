# LearnZo productie-deployment

Deze handleiding beschrijft hoe je de statische marketing-site en de geharde backend als productieklare stack uitrolt met Docker Compose en Caddy (reverse proxy + TLS).

## Voorwaarden
- Docker 24+ en Docker Compose Plugin 2.20+
- DNS-record dat naar je host verwijst (bijv. `learnzo.example.com`)
- TLS-certificaat wordt automatisch door Caddy opgehaald (Let’s Encrypt) zodra de domeinnaam publiek bereikbaar is.

## 1. Omgevingsvariabelen instellen
Maak een `.env` bestand in de projectroot (voor lokale demo kun je `learnzo.localhost` gebruiken en deze in `/etc/hosts` op `127.0.0.1` laten wijzen):

```env
APP_DOMAIN=learnzo.example.com
API_BASE_URL=https://learnzo.example.com/api
SITE_BASE_URL=https://learnzo.example.com
CADDY_ADMIN_EMAIL=ops@example.com
```

Pas `backend/.env` aan met unieke secrets en zet `DATA_STORE_PATH=/data/state.json`.

## 2. Stack opstarten

```bash
docker compose up -d --build
```

Services:
- **proxy** – Caddy reverse proxy (poorten 80/443)
- **frontend** – Nginx met statische LearnZo-site
- **backend** – Node.js API met journaled opslag (`/data/state.json`)

Tijdens de build vervangt `site/scripts/inject-config.js` automatisch alle `{{API_BASE_URL}}` placeholders in de HTML door de waarde van `API_BASE_URL`, zodat de marketing-site correct naar `/api` verwijst.

## 3. Persistente opslag
- De volume `learnzo_state` bewaart `state.json`, `.bak` en `.sha256` voor crash recovery.
- `caddy_data` en `caddy_config` bewaren certificaten en state van Caddy.

## 4. Health-checks & beheer
- Backend health: `https://<domein>/api/support/status`
- Audit log: `https://<domein>/api/admin/audit-log` (vereist admin token)
- Privacy requests: `https://<domein>/api/admin/privacy-requests`

Gebruik `docker compose logs -f proxy|backend` voor realtime logging.

## 5. Back-ups
Plan een cronjob die het volume `learnzo_state` exporteert:

```bash
docker run --rm \
  -v learnzo_state:/data \
  -v $(pwd)/backups:/backups \
  alpine tar czf /backups/learnzo-state-$(date +%F).tar.gz -C /data .
```

## 6. Upgrades

```bash
git pull
docker compose pull
docker compose build --no-cache
docker compose up -d
```

Caddy herlaadt configuraties automatisch wanneer `deploy/caddy/Caddyfile` wijzigt.

## 7. Belangrijke variabelen
| Variabele | Beschrijving |
| --- | --- |
| `APP_DOMAIN` | Domein dat door Caddy wordt bediend. |
| `API_BASE_URL` | URL die in HTML’s wordt geïnjecteerd voor API-calls (`/api`). |
| `SITE_BASE_URL` | Canonical basis-URL voor SEO-routes. |
| `DATA_STORE_DRIVER` | `journaled` (fsync+checksum) of `file` (backwards compatible). |
| `DATA_STORE_PATH` | Pad binnen container, standaard `/data/state.json`. |

## 8. Hardening-checklist
- Voeg een secrets manager toe (bijv. Doppler, 1Password CLI) om `.env` te templaten.
- Richt monitoring in (Prometheus/SIGsnooze) op de Caddy- en backend-logs.
- Configureer automatische back-ups en test restore-scenario’s (RPO 1h / RTO 4h).
- Activeer Web Application Firewall (bijv. Cloudflare) voor DDoS-preventie.

Met deze stack kun je de LearnZo-ervaring volledig online hosten met TLS, rollbackvriendelijke opslag en duidelijke operationele runbooks.
