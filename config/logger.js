// config/logger.js

const { createLogger, format, transports } = require('winston');

/**
 * Custom printf formatter que:
 * 1) Llama siempre a toString() en timestamp y message.
 * 2) Si message es un objeto que no tiene toString específico, lo JSON.stringify.
 * 3) Serializa meta con JSON.stringify.
 */
const customFormat = format.printf(({ timestamp, level, message, ...meta }) => {
  // 1) Meta como JSON si existe
  const metaString = Object.keys(meta).length > 0
    ? ' ' + JSON.stringify(meta)
    : '';

  // 2) Timestamp seguro: llamamos a toString(), asumiendo que es Date o string
  const safeTimestamp = timestamp != null && typeof timestamp.toString === 'function'
    ? timestamp.toString()
    : '';

  // 3) Message seguro:
  let safeMessage;
  if (message instanceof Error) {
    // Para errores aprovechamos message.message
    safeMessage = message.message;
  } else if (message != null && typeof message.toString === 'function' && message.toString !== Object.prototype.toString) {
    // Si tiene toString “propio”, lo usamos
    safeMessage = message.toString();
  } else if (typeof message === 'object') {
    // Objeto plano sin toString custom → JSON
    safeMessage = JSON.stringify(message);
  } else {
    // Primitivo (string, number, etc.)
    safeMessage = message != null
      ? message.toString()
      : '';
  }

  // 4) Componer salida
  return `${safeTimestamp} [${level.toUpperCase()}] ${safeMessage}${metaString}`;
});

module.exports = createLogger({
  level: 'info',
  format: format.combine(
    // Winston por defecto crea timestamp como ISO string, o bien un Date si personalizas
    format.timestamp(),
    customFormat
  ),
  transports: [
    new transports.Console()
  ],
});
