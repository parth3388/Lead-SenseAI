const fs = require("fs");
const path = require("path");

const logsDir = path.join(__dirname, "..", "..", "logs");
const logFilePath = path.join(logsDir, "app.log");

function ensureLogDirectory() {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

function formatMessage(level, message, meta = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  });
}

function write(level, message, meta) {
  const line = formatMessage(level, message, meta);
  ensureLogDirectory();
  fs.appendFileSync(logFilePath, `${line}\n`);

  if (level === "error") {
    console.error(line);
    return;
  }

  console.log(line);
}

const logger = {
  info(message, meta) {
    write("info", message, meta);
  },
  warn(message, meta) {
    write("warn", message, meta);
  },
  error(message, meta) {
    write("error", message, meta);
  },
};

module.exports = {
  logger,
};
