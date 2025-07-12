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

      // Nos aseguramos de que timestamp sea string
      const safeTimestamp = typeof timestamp === 'object'
        ? JSON.stringify(timestamp)
        : timestamp;

      // Y lo mismo para el mensaje
      const safeMessage = typeof message === 'object'
        ? JSON.stringify(message)
        : message;

      // Forzamos la llamada a toString() para que Sonar no lo trate como
      // “stringificación implícita de objeto”
      return `${safeTimestamp.toString()} [${level.toUpperCase()}] ${safeMessage.toString()} ${metaString}`;
    })
  ),
  transports: [
    new transports.Console()
  ],
});
