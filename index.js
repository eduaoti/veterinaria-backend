// server.js

const express  = require('express');
const mongoose = require('mongoose');
const dotenv   = require('dotenv');
const cors     = require('cors');
const path     = require('path');
const cron     = require('node-cron');
const helmet   = require('helmet');
const logger   = require('./config/logger');
const User     = require('./models/User');

// Importa las rutas
const authRoutes     = require('./routes/auth');
const mascotasRoutes = require('./routes/mascotas');
const citasRoutes    = require('./routes/citas');
const planesRoutes   = require('./routes/planes');
const welcomeRoutes  = require('./routes/welcome');

dotenv.config();
const app = express();

// ─── Security Headers ───
app.use(helmet());
/*
 * A09:2021 - Security Logging and Monitoring Failures
 * ---------------------------------------------------
 * ✔️ Monitoreo activo de cada request con middleware de logging (Winston/Pino).
 * ✔️ Captura centralizada de errores no manejados (Sentry desactivado).
 * ✔️ Logs estructurados de eventos críticos (login, registro, cronjobs).
 */

// ───── Sentry Init ─────
// Sentry.init({ dsn: process.env.SENTRY_DSN });

// ─── Logging Middleware ───
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    user: req.user?.id || 'anonymous',
    ip: req.ip
  });
  next();
});

// ─── Core Middleware con límites ───
app.use(cors());
// Limita bodies JSON a 100 KB
app.use(express.json({ limit: '100kb' }));
// Limita bodies urlencoded a 100 KB
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
// Sirve estáticos de /uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Monta las rutas ───
app.use('/auth', authRoutes);
app.use('/api/mascotas', mascotasRoutes);
app.use('/api/citas', citasRoutes);
app.use('/api/planes', planesRoutes);
app.use('/', welcomeRoutes);

// ─── Manejador global de errores ───
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  res.status(500).json({ message: 'Error interno. Intenta más tarde.' });
});

// ─── Conexión a MongoDB ───
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser:    true,
  useUnifiedTopology: true
})
.then(() => logger.info('Conectado a MongoDB'))
.catch(error => logger.error('Error al conectar a MongoDB', { error }));

// ─── Cronjob: limpieza de usuarios inactivos ───
cron.schedule('0 2 * * *', async () => {
  logger.info('Iniciando limpieza de usuarios inactivos');
  const haceUnMes = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  try {
    const usuariosInactivos = await User.find({
      $or: [
        { lastLogin: { $lt: haceUnMes } },
        { lastLogin: { $exists: false, createdAt: { $lt: haceUnMes } } }
      ]
    }).select('email');
    if (usuariosInactivos.length === 0) {
      logger.info('No hay usuarios inactivos para eliminar');
      return;
    }
    const emails = usuariosInactivos.map(u => u.email);
    logger.info('Usuarios a eliminar', { emails });
    const resultado = await User.deleteMany({
      _id: { $in: usuariosInactivos.map(u => u._id) }
    });
    logger.info('Usuarios eliminados', { count: resultado.deletedCount });
  } catch (err) {
    logger.error('Error en limpieza de usuarios', { error: err });
  }
});

// ─── Arranca el servidor ───
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Servidor corriendo en el puerto ${PORT}`);
});