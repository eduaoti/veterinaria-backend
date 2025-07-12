// config/logger.js
const { createLogger, format, transports } = require('winston');

module.exports = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message, ...meta }) => {
      // Serializamos los metadatos si existen
      const metaString = Object.keys(meta).length
        ? JSON.stringify(meta)
        : '';

      // Aseguramos que timestamp y message sean strings:
      const safeTimestamp = String(timestamp);
      const safeMessage   = String(message);

      // Y componemos la línea con un template literal:
      return `${safeTimestamp} [${level.toUpperCase()}] ${safeMessage} ${metaString}`;
    })
  ),
  transports: [
    new transports.Console()
  ],
});
