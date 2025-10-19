const driver = (process.env.DATA_STORE_DRIVER || 'journaled').toLowerCase();

let adapter;
if (driver === 'journaled' || driver === 'durable') {
  adapter = require('./journaled');
} else if (driver === 'file' || driver === 'json') {
  adapter = require('./file');
} else {
  console.warn(
    `Unknown DATA_STORE_DRIVER "${driver}" provided. Falling back to journaled JSON storage.`
  );
  adapter = require('./journaled');
}

module.exports = adapter;
