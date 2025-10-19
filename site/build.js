const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'data', 'programmatic.json');
const OUTPUT_DIR = path.join(__dirname, 'generated');
const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000';
const BASE_URL = process.env.SITE_BASE_URL || 'https://learnzo.io';
const STATIC_URLS = [
  `${BASE_URL}/`,
  `${BASE_URL}/en/`,
  `${BASE_URL}/en/pricing`,
  `${BASE_URL}/en/about`,
  `${BASE_URL}/en/contact`,
  `${BASE_URL}/en/blog`,
  `${BASE_URL}/en/learning-paths`,
  `${BASE_URL}/en/admin`,
  `${BASE_URL}/leerwegen`,
  `${BASE_URL}/prijzen`,
  `${BASE_URL}/about`,
  `${BASE_URL}/blog`,
  `${BASE_URL}/contact`,
  `${BASE_URL}/admin`,
  `${BASE_URL}/community`,
  `${BASE_URL}/support`,
  `${BASE_URL}/transparantie`,
  `${BASE_URL}/security`,
  `${BASE_URL}/privacy`,
  `${BASE_URL}/voorwaarden`,
  `${BASE_URL}/cookies`,
  `${BASE_URL}/cheatsheets`,
  `${BASE_URL}/anatomy`,
  `${BASE_URL}/microvideos`
];

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const generatedUrls = [];

function prefixFor(relativePath) {
  const parts = relativePath.split('/');
  const directories = Math.max(parts.length - 1, 0);
  if (directories === 0) {
    return '';
  }
  return '../'.repeat(directories);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

function renderNav(prefix) {
  return `  <header>\n    <nav>\n      <a href="${prefix}index.html" aria-label="LearnZo home" class="tagline">LearnZo</a>\n      <div class="nav-links" role="list">\n        <a href="${prefix}leerwegen.html">Leerwegen</a>\n        <a href="${prefix}prijzen.html">Prijzen</a>\n        <a href="${prefix}about.html">Over ons</a>\n        <a href="${prefix}blog.html">Blog</a>\n        <a href="${prefix}contact.html">Contact</a>\n        <a href="${prefix}admin.html">Beheer</a>\n      </div>\n      <div class="nav-actions">\n        <a class="button secondary" href="${prefix}login.html" data-track-event="nav.login">Inloggen</a>\n        <a class="button" href="${prefix}register.html" data-track-event="nav.start" data-track-meta="{&quot;source&quot;:&quot;nav&quot;}">Start gratis</a>\n      </div>\n    </nav>\n  </header>`;
}

function renderFooter(prefix) {
  return `  <footer>\n    <div class="footer-bottom" style="max-width:960px; margin:0 auto; padding:24px 0; border-top:1px solid rgba(15,23,42,0.08); color:var(--text-muted);">\n      <span>© <span id="year">${new Date().getFullYear()}</span> LearnZo.</span>\n      <a href="${prefix}privacy.html">Privacy</a>\n      <a href="${prefix}voorwaarden.html">Voorwaarden</a>\n    </div>\n  </footer>`;
}

function baseTemplate({ relativePath, prefix: providedPrefix, lang = 'nl', title, description, canonical, alternate = [], structuredData = [], mainContent }) {
  const prefix = providedPrefix ?? prefixFor(relativePath);
  const alternateLinks = alternate
    .map((entry) => `  <link rel="alternate" hreflang="${entry.hreflang}" href="${entry.href}" />`)
    .join('\n');
  const schemaScripts = structuredData
    .map((schema) => `  <script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n  </script>`)
    .join('\n');
  return `<!DOCTYPE html>\n<html lang="${lang}">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${title}</title>\n  <meta name="description" content="${description}" />\n  <link rel="canonical" href="${canonical}" />\n${alternateLinks ? `${alternateLinks}\n` : ''}  <link rel="preconnect" href="https://fonts.googleapis.com">\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">\n  <link rel="stylesheet" href="${prefix}styles.css" />\n${schemaScripts ? `${schemaScripts}\n` : ''}</head>\n<body data-api-base="${API_BASE}">\n  <a class="skip-link" href="#main">Ga naar hoofdinhoud</a>\n${renderNav(prefix)}\n  <main id="main">\n${mainContent}\n  </main>\n${renderFooter(prefix)}\n  <script src="${prefix}analytics.js" defer></script>\n  <script src="${prefix}main.js"></script>\n</body>\n</html>`;
}

function writePage(relativePath, html) {
  const fullPath = path.join(OUTPUT_DIR, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, html, 'utf8');
}

function updateSitemap(urls) {
  const sitemapPath = path.join(__dirname, 'sitemap.xml');
  const entries = Array.from(new Set([...STATIC_URLS, ...urls])).sort();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
    .map((url) => `  <url>\n    <loc>${url}</loc>\n  </url>`)
    .join('\n')}\n</urlset>\n`;
  fs.writeFileSync(sitemapPath, xml, 'utf8');
  console.log(`Updated sitemap.xml with ${entries.length} URLs.`);
}

function metaAttribute(meta) {
  return escapeAttribute(JSON.stringify(meta));
}

// Generate exercise pages
for (const topic of data.exerciseTopics) {
  for (const level of topic.levels) {
    const relativePath = path.join('oefeningen', topic.slug, level.level, 'index.html');
    const prefix = prefixFor(relativePath);
    const canonical = `${BASE_URL}/oefeningen/${topic.slug}/${level.level}`;
    const structuredData = [
      {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: `${topic.title} — ${level.title}`,
        description: level.description,
        totalTime: level.estimatedTime,
        step: level.outcomes.map((outcome, index) => ({
          '@type': 'HowToStep',
          position: index + 1,
          name: outcome,
          text: outcome
        })),
        tool: level.keywords,
        supply: ['VS Code', 'Node.js LTS']
      }
    ];
    const meta = { source: 'oefeningen', topic: topic.slug, level: level.level };
    const mainContent = `    <section class="page-hero">\n      <p class="tagline">${topic.summary}</p>\n      <h1>${topic.title}</h1>\n      <p class="lead">${level.description}</p>\n      <div class="cta-row">\n        <a class="button" href="${prefix}register.html" data-track-event="cta.programmatic" data-track-meta="${metaAttribute(meta)}">${level.ctaCopy}</a>\n        <a class="button secondary" href="${prefix}prijzen.html" data-track-event="cta.programmatic_pricing" data-track-meta="${metaAttribute(meta)}">Bekijk plannen</a>\n      </div>\n    </section>\n    <section class="section">\n      <h2>Waarom dit telt</h2>\n      <p>${level.whyItMatters}</p>\n      <div class="cards-grid">\n        ${level.outcomes
          .map(
            (outcome) => `
        <article class="card">\n          <h3>${outcome}</h3>\n          <p>Gebruik dit als meetpunt voor jouw voortgang en de volgende coachingsessie.</p>\n        </article>`
          )
          .join('\n        ')}\n      </div>\n    </section>\n    <section class="section muted">\n      <h2>Wat je gaat ervaren</h2>\n      <ul class="checklist">\n        <li>Contextuele opdrachten met directe feedback</li>\n        <li>Reflectie prompts die je dwingen het waarom uit te leggen</li>\n        <li>Mentor-hints gebaseerd op je foutpatronen</li>\n      </ul>\n      <p class="note">Gemiddelde doorlooptijd: ${level.estimatedTime.replace('PT', '').toLowerCase()} • Keywords: ${level.keywords.join(', ')}</p>\n    </section>`;

    const html = baseTemplate({
      relativePath,
      prefix,
      lang: 'nl',
      title: `${topic.title} — ${level.title}`,
      description: level.description,
      canonical,
      structuredData,
      mainContent
    });
    writePage(relativePath, html);
    generatedUrls.push(canonical);
  }
}

// Generate anatomy pages
for (const entry of data.anatomyEntries) {
  const relativePath = path.join('anatomy', entry.language, entry.slug, 'index.html');
  const prefix = prefixFor(relativePath);
  const canonical = `${BASE_URL}/anatomy/${entry.language}/${entry.slug}`;
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: entry.title,
      description: entry.summary,
      inLanguage: 'nl-NL',
      about: entry.concept,
      keywords: entry.pitfalls
    }
  ];
  const meta = { source: 'anatomy', concept: entry.concept, language: entry.language };
  const insights = entry.runtimeInsights
    .map((insight) => `<li>${insight}</li>`)
    .join('');
  const pitfalls = entry.pitfalls
    .map((pitfall) => `<li>${pitfall}</li>`)
    .join('');
  const mainContent = `    <section class="page-hero">\n      <p class="tagline">Anatomie bibliotheek</p>\n      <h1>${entry.title}</h1>\n      <p class="lead">${entry.summary}</p>\n      <div class="cta-row">\n        <a class="button" href="${prefix}register.html" data-track-event="cta.anatomy" data-track-meta="${metaAttribute(meta)}">Bekijk het volledige leerpad</a>\n      </div>\n    </section>\n    <section class="section">\n      <h2>Waarom het belangrijk is</h2>\n      <p>${entry.whyItMatters}</p>\n    </section>\n    <section class="section muted">\n      <div class="two-column">\n        <div>\n          <h3>Runtime inzichten</h3>\n          <ul>${insights}</ul>\n        </div>\n        <div>\n          <h3>Veelgemaakte valkuilen</h3>\n          <ul>${pitfalls}</ul>\n        </div>\n      </div>\n    </section>`;
  const html = baseTemplate({
    relativePath,
    prefix,
    lang: 'nl',
    title: `${entry.title} | LearnZo Anatomy`,
    description: entry.summary,
    canonical,
    structuredData,
    mainContent
  });
  writePage(relativePath, html);
  generatedUrls.push(canonical);
}

// Generate cheatsheet pages
for (const sheet of data.cheatsheets) {
  const relativePath = path.join('cheatsheets', sheet.slug, 'index.html');
  const prefix = prefixFor(relativePath);
  const canonical = `${BASE_URL}/cheatsheets/${sheet.slug}`;
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: `${sheet.title} | Cheatsheet`,
      description: sheet.description,
      tool: ['VS Code', 'Terminal'],
      step: sheet.snippets.map((snippet, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: snippet.title,
        text: snippet.explanation
      }))
    }
  ];
  const mainContent = `    <section class="page-hero">\n      <p class="tagline">Cheatsheet bibliotheek</p>\n      <h1>${sheet.title}</h1>\n      <p class="lead">${sheet.description}</p>\n    </section>\n    <section class="section">\n      <h2>Waarom dit relevant is</h2>\n      <p>${sheet.whyItMatters}</p>\n    </section>\n    <section class="section muted">\n      <div class="code-grid">\n        ${sheet.snippets
          .map(
            (snippet) => `
        <article class="card">\n          <h3>${snippet.title}</h3>\n          <pre><code>${escapeHtml(snippet.code)}</code></pre>\n          <p>${snippet.explanation}</p>\n        </article>`
          )
          .join('\n        ')}\n      </div>\n    </section>`;
  const html = baseTemplate({
    relativePath,
    prefix,
    lang: 'nl',
    title: `${sheet.title} | LearnZo Cheatsheets`,
    description: sheet.description,
    canonical,
    structuredData,
    mainContent
  });
  writePage(relativePath, html);
  generatedUrls.push(canonical);
}

updateSitemap(generatedUrls);
console.log(`Generated ${generatedUrls.length} programmatic pages.`);
console.log(generatedUrls.join('\n'));
