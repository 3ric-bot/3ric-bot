const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000';

// Vervang alle {{API_BASE_URL}} placeholders in HTML-bestanden zodat build-artifacts
// het juiste endpoint aanspreken (bijv. https://learnzo.example.com/api).

function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      const original = fs.readFileSync(fullPath, 'utf8');
      const updated = original.replace(/\{\{API_BASE_URL\}\}/g, API_BASE);
      if (original !== updated) {
        fs.writeFileSync(fullPath, updated);
      }
    }
  }
}

processDirectory(ROOT);
