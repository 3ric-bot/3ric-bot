# Viewing LearnZo inside the Codex workspace

This guide walks through previewing the marketing site and secured API when you are working inside an OpenAI Codex container (the environment that powers this repository's exercises).

## 1. Build the static pages
```bash
node site/build.js
```
This regenerates the programmatic routes, injects the current `API_BASE_URL`, and refreshes the sitemap so every HTML file is up to date.

## 2. Preview the marketing site
```bash
cd site
python -m http.server 8000
```
Open the forwarded preview URL that Codex prints (for example `https://<preview-host>/en/index.html`) to browse the dark-theme English landing experience.

To stop the server, press `Ctrl+C`.

## 3. (Optional) Run the secured backend
If you need the API while you explore the UI:
```bash
cp backend/.env.example backend/.env
node backend/src/server.js
```
The server binds to port `4000` (or to HTTPS if you supply certificate paths) and persists state under `backend/data/state.json` by default. Login with the seeded accounts from `backend/README.md` or create new users via `/auth/register`.

## 4. Shut everything down
Press `Ctrl+C` in each terminal session. The persisted state stays on disk, so subsequent runs pick up where you left off.

---
Need a production deployment instead? Follow [`docs/deployment.md`](./deployment.md) for the Docker Compose stack with Caddy, TLS, and persistent volumes.
