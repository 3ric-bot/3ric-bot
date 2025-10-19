# LearnZo API Usage Ideas

The LearnZo API surface was designed to support more than the core web app. Below are project ideas that take advantage of the available endpoints documented in [`backend/README.md`](../backend/README.md) and the machine-readable catalog exposed at `GET /meta/endpoints`.

## 1. Personalized Learning Dashboards
- **Goal:** Give students an always-on overview of their streaks, XP, achievements, and upcoming milestones.
- **Key endpoints:**
  - `GET /progress?user=me&scope=...` for real-time completion states.
  - `GET /gamification/profile` for streak, badge, and XP insights.
  - `GET /calendar/feed.ics` or `GET /calendar/events` to highlight deadlines.
- **Why it matters:** Reinforces the WHY-first learning approach by connecting day-to-day activity with long-term outcomes and evidence of mastery.

## 2. Mentor & Cohort Command Center
- **Goal:** Equip mentors with a queue of submissions, risk alerts, and discussion hotspots.
- **Key endpoints:**
  - `GET /mentor/reviews` to view pending reviews and claim work.
  - `GET /mentor/insights` for cohort risk scoring and engagement metrics.
  - `GET /threads?scope=lesson:...` to surface conversations needing intervention.
- **Why it matters:** Accelerates timely feedback loops and keeps the “help-first” community culture healthy.

## 3. Enterprise Reporting & Compliance Portal
- **Goal:** Give administrators exportable reports on billing, certificates, audit logs, and feature flag status.
- **Key endpoints:**
  - `GET /admin/audit-log` for security and compliance monitoring.
  - `GET /admin/payments` and `GET /admin/subscriptions` to reconcile revenue.
  - `GET /admin/flags` / `POST /admin/flags/:key` to orchestrate experiments.
- **Why it matters:** Supports transparency requirements and ISO/GDPR readiness while enabling safe feature rollout.

## 4. Learning Content Companion Apps
- **Goal:** Build lightweight mobile or desktop tools focused on cheatsheets, anatomy explorations, or micro-videos.
- **Key endpoints:**
  - `GET /cheatsheets`, `GET /anatomy` and `GET /microvideos` for content retrieval.
  - `POST /pseudocode` to generate guided pseudocode summaries of learner code.
- **Why it matters:** Extends the WHY-first pedagogy beyond the core app, making just-in-time support available across devices.

## 5. Growth & Affiliate Analytics Board
- **Goal:** Track campaign performance, affiliate payouts, and conversion funnels.
- **Key endpoints:**
  - `GET /growth/affiliates` for partner metrics.
  - `GET /analytics/events` with filters to analyze signups, lesson completion, and checkout success.
  - `GET /support/tickets` to correlate campaign spikes with support load.
- **Why it matters:** Ensures marketing experiments respect guardrail KPIs and keeps communication aligned with learner outcomes.

## 6. Career Hub Integrations
- **Goal:** Provide employers and learners with verifiable, shareable achievement profiles.
- **Key endpoints:**
  - `GET /certificates` and `GET /badges` to list credentials.
  - `GET /career/jobs` and `POST /career/applications` to bridge job board interactions.
  - `GET /transcripts/:id` for machine-readable skill transcripts.
- **Why it matters:** Reinforces the WHY by tying coursework to tangible career opportunities and proof of competence.

---

These ideas can be mixed and matched. For example, a partner dashboard might combine cohort insights with billing snapshots, while a student mobile app could fuse streak tracking with micro-video recommendations. Use the API catalog endpoint to discover the exact payloads, required auth scopes, and rate limits before implementation.
