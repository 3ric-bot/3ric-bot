const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_STATE_PATH = process.env.DATA_STORE_PATH
  ? path.resolve(process.env.DATA_STORE_PATH)
  : path.join(__dirname, '..', 'data', 'state.json');

function resolveStatePath(customPath) {
  return customPath ? path.resolve(customPath) : DEFAULT_STATE_PATH;
}

function ensureDirectory(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function loadState(customPath) {
  const filePath = resolveStatePath(customPath);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Failed to load persisted state from ${filePath}: ${error.message}`);
    return null;
  }
}

function atomicWrite(filePath, data) {
  ensureDirectory(filePath);
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, data);
  fs.renameSync(tmpPath, filePath);
}

function saveState(state, customPath) {
  const filePath = resolveStatePath(customPath);
  try {
    const payload = JSON.stringify(state, null, 2);
    atomicWrite(filePath, payload);
    return filePath;
  } catch (error) {
    console.warn(`Failed to persist state to ${filePath}: ${error.message}`);
    return filePath;
  }
}

function ensureStateFile(defaultState, customPath) {
  const filePath = resolveStatePath(customPath);
  if (!fs.existsSync(filePath)) {
    saveState(defaultState, filePath);
  }
  return filePath;
}

module.exports = {
  loadState,
  saveState,
  ensureStateFile,
  resolveStatePath
};
