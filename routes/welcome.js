// routes/welcome.js
const express = require('express');
const { escape } = require('validator');
const router = express.Router();

/**
 * Ruta de ejemplo para demostrar protección contra XSS.
 * Aplica validator.escape() para sanitizar el parámetro 'nombre'.
 */
router.get('/welcome', (req, res) => {
  // 1) Obtener el valor crudo desde la query string (o fallback)
  const nombreRaw = req.query.nombre || 'invitado';

  // 2) Escapar cualquier caracter peligroso para prevenir XSS
  const nombreSeguro = escape(nombreRaw);

  // 3) Enviar HTML con la variable ya sanitizada
  res.send(`<h1>Bienvenido ${nombreSeguro}</h1>`);
});

module.exports = router;