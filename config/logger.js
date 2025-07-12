// config/logger.js
const { createLogger, format, transports } = require('winston');

module.exports = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message, ...meta }) => {
      // Si vienen metadatos, los serializamos a JSON:
      const metaString = Object.keys(meta).length
        ? JSON.stringify(meta)
        : '';

      // Garantizamos que timestamp siempre sea un string:
      const safeTimestamp = typeof timestamp === 'object'
        ? JSON.stringify(timestamp)
        : timestamp;

      // Y lo mismo para el mensaje:
      const safeMessage = typeof message === 'object'
        ? JSON.stringify(message)
        : message;

      // Ahora usamos las versiones "seguras" en la template literal:
      return `${safeTimestamp} [${level.toUpperCase()}] ${safeMessage} ${metaString}`;
    })
  ),
  transports: [
    new transports.Console()
  ],
});
