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
        const safeMessage = typeof message === 'object'
    ? JSON.stringify(message)
    : message;
      // ← Aquí usamos backticks para la template literal:
      return `${timestamp} [${level.toUpperCase()}] ${safeMessage} ${metaString}`;
    })
  ),
  transports: [
    new transports.Console()
  ],
});
