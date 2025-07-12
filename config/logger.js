// config/logger.js
const { createLogger, format, transports } = require('winston');

/**
 * Custom printf formatter que evita la stringificación por defecto:
 *  - timestamp: si es string lo dejamos, si es Date usamos toISOString(), si no JSON.stringify.
 *  - message: si es string/number/boolean lo dejamos o convertimos con toString(),
 *             si es Error usamos error.message,
 *             en cualquier otro caso JSON.stringify.
 *  - meta: siempre JSON.stringify(meta).
 */
const customFormat = format.printf(({ timestamp, level, message, ...meta }) => {
  // 1) Meta como JSON si existe
  const metaString = Object.keys(meta).length
    ? ' ' + JSON.stringify(meta)
    : '';

  // 2) Timestamp seguro
  let safeTimestamp;
  if (typeof timestamp === 'string') {
    safeTimestamp = timestamp;
  } else if (timestamp instanceof Date) {
    safeTimestamp = timestamp.toISOString();
  } else {
    safeTimestamp = JSON.stringify(timestamp);
  }

  // 3) Message seguro
  let safeMessage;
  if (message instanceof Error) {
    safeMessage = message.message;
  } else if (typeof message === 'string') {
    safeMessage = message;
  } else if (typeof message === 'number' || typeof message === 'boolean') {
    safeMessage = message.toString();
  } else {
    safeMessage = JSON.stringify(message);
  }

  // 4) Componer línea de log
  return `${safeTimestamp} [${level.toUpperCase()}] ${safeMessage}${metaString}`;
});

module.exports = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),  // Por defecto produce un ISO string
    customFormat
  ),
  transports: [
    new transports.Console()
  ],
});
