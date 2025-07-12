// config/logger.js
const { createLogger, format, transports } = require('winston');

module.exports = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message, ...meta }) => {
      const metaString = Object.keys(meta).length
        ? JSON.stringify(meta)
        : '';
      // ← Aquí usamos backticks para la template literal:
      return `${timestamp} [${level.toUpperCase()}] ${message} ${metaString}`;
    })
  ),
  transports: [
    new transports.Console()
  ],
});
