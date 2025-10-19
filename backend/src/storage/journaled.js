const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

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

function hashPayload(payload) {
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function writeFileAtomic(filePath, data) {
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const handle = fs.openSync(tmpPath, 'w');
  try {
    fs.writeFileSync(handle, data);
    fs.fsyncSync(handle);
  } finally {
    fs.closeSync(handle);
  }
  fs.renameSync(tmpPath, filePath);
}

function readStateFile(filePath, hashPath) {
  const payload = fs.readFileSync(filePath, 'utf8');
  if (hashPath && fs.existsSync(hashPath)) {
    const expected = fs.readFileSync(hashPath, 'utf8').trim();
    const actual = hashPayload(payload);
    if (expected && expected !== actual) {
      throw new Error('State hash mismatch');
    }
  }
  return JSON.parse(payload);
}

function loadState(customPath) {
  const statePath = resolveStatePath(customPath);
  const backupPath = `${statePath}.bak`;
  const hashPath = `${statePath}.sha256`;
  if (!fs.existsSync(statePath)) {
    if (fs.existsSync(backupPath)) {
      try {
        return readStateFile(backupPath, hashPath);
      } catch (error) {
        console.warn(`Failed to parse backup state at ${backupPath}: ${error.message}`);
        return null;
      }
    }
    return null;
  }
  try {
    return readStateFile(statePath, hashPath);
  } catch (error) {
    console.warn(`Primary state file corrupt (${error.message}), attempting backup.`);
    if (fs.existsSync(backupPath)) {
      try {
        return readStateFile(backupPath, hashPath);
      } catch (backupError) {
        console.warn(`Backup state file also invalid: ${backupError.message}`);
        return null;
      }
    }
    return null;
  }
}

function saveState(state, customPath) {
  const statePath = resolveStatePath(customPath);
  const backupPath = `${statePath}.bak`;
  const hashPath = `${statePath}.sha256`;
  const payload = JSON.stringify(state, null, 2);
  ensureDirectory(statePath);
  if (fs.existsSync(statePath)) {
    try {
      fs.copyFileSync(statePath, backupPath);
    } catch (error) {
      console.warn(`Unable to create backup snapshot: ${error.message}`);
    }
  }
  writeFileAtomic(statePath, payload);
  writeFileAtomic(hashPath, `${hashPayload(payload)}\n`);
  return statePath;
}

function ensureStateFile(defaultState, customPath) {
  const statePath = resolveStatePath(customPath);
  if (!fs.existsSync(statePath)) {
    saveState(defaultState, statePath);
  }
  return statePath;
}

module.exports = {
  loadState,
  saveState,
  ensureStateFile,
  resolveStatePath
};
