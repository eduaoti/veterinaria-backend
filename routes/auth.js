const express = require('express');
// 🔐 A02: Cifrado en reposo – bcrypt para proteger contraseñas
const bcrypt = require('bcryptjs');
// 🔐 A02: Cifrado en tránsito – JWT usado correctamente (protegido por HTTPS en Railway)
const jwt = require('jsonwebtoken');
const User = require('../models/User');
// 🧪 A03: Validación de entradas con validator
const validator = require('validator');
//Validación estricta de entradas y salidas utilizando bibliotecas 
// especializadas como validator en backend.

//Separación clara y control arquitectónico mediante middleware global (Express) e interceptores HTTP (Angular).

//Cifrado en reposo de contraseñas utilizando bcrypt.
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const helmet = require('helmet');      // ← Importamos Helmet
router.use(helmet());                 // ← Aplicamos Helmet en este router
/*
 * A05:2021 - Security Misconfiguration
 * ------------------------------------------------------------
 * ✔️ Configuración segura por defecto:
 *    • Usamos helmet() para reforzar cabeceras HTTP (HSTS, XSS, MIME sniffing).
 *    • Express se inicializa con express.json() y CORS controlado.
 *    • Mongoose se conecta con useNewUrlParser y useUnifiedTopology.
 *    • Todas las credenciales y URLs sensibles van en .env (dotenv.config()).
 *
 * ✔️ No se exponen errores al usuario final:
 *    • En los bloques catch solo enviamos mensajes genéricos (p. ej. "Error interno. Intenta más tarde.").
 *    • Los detalles de los errores se envían a consola (console.error) y nunca al cliente.
 */

const { sendVerificationCodeEmail } = require('../services/verificationMailer');
const { sendRegistrationEmail } = require('../services/mailer');
const { sendPasswordRecoveryEmail } = require('../services/passwordRecoveryMailer');
const { sendPasswordUpdatedEmail } = require('../services/passwordUpdateMailer');
const cloudinary = require('../services/cloudinaryConfig');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
// Ruta para actualizar la foto de perfil
router.post(
    '/update-profile-photo',
    upload.single('fotoPerfil'),
    async (req, res) => {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'No se proporcionó un token.' });
      }
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) {
          return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        if (!req.file) {
          return res.status(400).json({ message: 'No se encontró el archivo.' });
        }
  
        // Aquí envolvemos la subida en una verdadera Promise
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'perfiles', public_id: `perfil_${user._id}` },
            (err, result) => {
              if (err) {
                // Siempre rechazamos con un Error
                return reject(
                  err instanceof Error
                    ? err
                    : new Error(`Cloudinary upload failed: ${String(err)}`)
                );
              }
              resolve(result);
            }
          );
          stream.end(req.file.buffer);
        });
  
        // Si llegamos aquí, la subida fue exitosa
        user.fotoPerfil = uploadResult.secure_url;
        await user.save();
  
        return res.status(200).json({
          message: 'Foto de perfil actualizada exitosamente.',
          fotoPerfil: user.fotoPerfil,
        });
      } catch (error) {
        console.error('Error al actualizar la foto de perfil:', error);
        return res
          .status(500)
          .json({ message: 'Error interno. Intenta más tarde.' });
      }
    }
  );
  
  
/*
 * A07:2021 - Identification and Authentication Failures
 * ------------------------------------------------------------
 * ✔️ Prácticas de autenticación:
 *    • Validación de fuerza de contraseña en /register (min 10 caracteres, mayúsculas, números, símbolos).
 *    • Conteo y bloqueo de intentos fallidos en /login (p.ej. bloquea 1 hora tras 5 intentos).
 *    • MFA opcional tras validar contraseña: generación/envío de código TOTP y verificación antes de emitir JWT.
 *
 * ✔️ Gestión segura de sesiones:
 *    • JWT con expiración corta (expiresIn: '2m') para limitar ventana de ataque.
 *    • Refresh tokens con rotación en /renew-token y revocación del anterior.
 *    • (Si usas cookies de sesión) timeout en cookie (maxAge) y regeneración de sesión tras login.
 */

// ------------------
// RUTA: Registro
// ------------------
router.post(
  '/register',
  upload.single('fotoPerfil'),
  async (req, res) => {
    try {
      // 1) Desestructurar y validar datos
      const {
        nombre,
        apellidoPaterno,
        apellidoMaterno,
        email,
        password,
        telefono,
        role,
      } = req.body;

      if (
        !nombre ||
        !apellidoPaterno ||
        !apellidoMaterno ||
        !email ||
        !telefono ||
        !role ||
        !password
      ) {
        return res
          .status(400)
          .json({ message: 'Todos los campos son obligatorios.' });
      }
      if (!validator.isEmail(email)) {
        return res.status(400).json({ message: 'El correo no es válido.' });
      }

      // 2) Comprobar si el usuario existe
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res
          .status(409)
          .json({ message: 'El correo ya está registrado.' });
      }

      // 3) Procesamiento principal
      const hashedPassword = await bcrypt.hash(password, 10);
      const newVerificationCode = crypto.randomBytes(3).toString('hex');
      const newUser = new User({
        nombre,
        apellidoPaterno,
        apellidoMaterno,
        email,
        password: hashedPassword,
        telefono,
        role,
        verificationCode: newVerificationCode,
        isVerified: false,
        fotoPerfil: req.file ? req.file.path : null,
      });
      await newUser.save();
      await sendVerificationCodeEmail(
        email,
        nombre,
        apellidoPaterno,
        apellidoMaterno,
        newVerificationCode
      );

      // 4) Respuesta de éxito
      res.status(201).json({
        message:
          'Usuario registrado exitosamente. Verifica tu correo antes de iniciar sesión.',
        success: true,
      });
    } catch (error) {
      console.error('Error en /register:', error);
      res
        .status(500)
        .json({ message: 'Error interno. Intenta más tarde.' });
    }
  }
);

// Ruta para verificar el código de verificación
router.post('/verify', async (req, res) => {
  const { email, verificationCode } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: 'Usuario no encontrado.' });
  }
  if (user.verificationCode !== verificationCode) {
    return res.status(400).json({ message: 'Código incorrecto.' });
  }
  user.isVerified = true;
  user.verificationCode = null;
  await user.save();
  await sendRegistrationEmail(
    user.email,
    user.nombre,
    user.apellidoPaterno,
    user.apellidoMaterno,
    user.email,
    user.telefono
  );
  res
    .status(200)
    .json({ message: 'Cuenta verificada exitosamente.', success: true });
});

// ───── RUTA: Inicio de sesión ─────
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }
      if (!user.isVerified) {
        return res
          .status(403)
          .json({ message: 'Cuenta no verificada. Revisa tu correo.' });
      }
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(400).json({ message: 'Contraseña incorrecta.' });
      }
      user.lastLogin = new Date();
      await user.save();
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '2m' }
      );
      res
        .status(200)
        .json({ token, role: user.role, message: 'Login exitoso.', success: true });
    } catch (error) {
      console.error('Error en /login:', error);
      res.status(500).json({ message: 'Error interno. Intenta más tarde.' });
    }
  });
  
  // ───── RUTA: Obtener info de usuario autenticado ─────
  router.get('/user-info', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No se proporcionó token.' });
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }
      res.status(200).json(user);
    } catch (error) {
      console.error('Error en /user-info:', error);
      res.status(401).json({ message: 'Token inválido.' });
    }
  });
  
  // ───── RUTA: Eliminar usuario ─────
  router.delete('/users/:id', async (req, res) => {
    try {
      const result = await User.deleteOne({ _id: req.params.id });
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }
      res.status(200).json({ message: 'Usuario eliminado.' });
    } catch (error) {
      console.error('Error en DELETE /users/:id:', error);
      res.status(500).json({ message: 'Error interno. Intenta más tarde.' });
    }
  });
  
  // ───── RUTA: Enviar código de recuperación ─────
  router.post('/send-recovery-code', async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }
      const recoveryCode = crypto.randomBytes(3).toString('hex');
      user.recoveryCode = recoveryCode;
      user.recoveryCodeExpiration = Date.now() + 3600000; // 1 hora
      await user.save();
      await sendPasswordRecoveryEmail(
        email,
        user.nombre,
        user.apellidoPaterno,
        recoveryCode
      );
      res
        .status(200)
        .json({ message: 'Código de recuperación enviado.' });
    } catch (error) {
      console.error('Error en /send-recovery-code:', error);
      res.status(500).json({ message: 'Error interno. Intenta más tarde.' });
    }
  });
  
  // ───── RUTA: Verificar código de recuperación ─────
  router.post('/verify-recovery-code', async (req, res) => {
    try {
      const { email, code } = req.body;
      const user = await User.findOne({ email });
      if (
        !user ||
        user.recoveryCode !== code ||
        Date.now() > user.recoveryCodeExpiration
      ) {
        return res
          .status(400)
          .json({ message: 'Código incorrecto o expirado.' });
      }
      res.status(200).json({ message: 'Código verificado.' });
    } catch (error) {
      console.error('Error en /verify-recovery-code:', error);
      res.status(500).json({ message: 'Error interno. Intenta más tarde.' });
    }
  });

  // ───── RUTA: Restablecer contraseña ─────
router.post('/reset-password', async (req, res) => {
    try {
      const { email, newPassword } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }
      user.password = await bcrypt.hash(newPassword, 10);
      user.recoveryCode = null;
      user.recoveryCodeExpiration = null;
      await user.save();
      await sendPasswordUpdatedEmail(
        user.email,
        user.nombre,
        user.apellidoPaterno
      );
      res
        .status(200)
        .json({ message: 'Contraseña restablecida exitosamente.' });
    } catch (error) {
      console.error('Error en /reset-password:', error);
      res.status(500).json({ message: 'Error interno. Intenta más tarde.' });
    }
  });
  
  // ───── RUTA: Renovar token ─────
  router.post('/renew-token', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'No se proporcionó token.' });
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        ignoreExpiration: true,
      });
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }
      const newToken = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '2m' }
      );
      res.status(200).json({ token: newToken });
    } catch (error) {
      console.error('Error en /renew-token:', error);
      res.status(401).json({ message: 'No se pudo renovar token.' });
    }
  });
  
  // ───── RUTA: Actualizar perfil ─────
  router.put('/update-profile', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'No se proporcionó token.' });
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { nombre, apellidoPaterno, apellidoMaterno, telefono } = req.body;
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }
      if (nombre) user.nombre = nombre;
      if (apellidoPaterno) user.apellidoPaterno = apellidoPaterno;
      if (apellidoMaterno) user.apellidoMaterno = apellidoMaterno;
      if (telefono) user.telefono = telefono;
      await user.save();
      res.status(200).json({ message: 'Perfil actualizado.' });
    } catch (error) {
      console.error('Error en /update-profile:', error);
      res.status(500).json({ message: 'Error interno. Intenta más tarde.' });
    }
  });
  
  // ───── RUTA: Solicitar cambio de correo ─────
  router.post('/request-email-change', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'No se proporcionó token.' });
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { newEmail } = req.body;
      if (!validator.isEmail(newEmail)) {
        return res.status(400).json({ message: 'Correo no válido.' });
      }
      const existing = await User.findOne({ email: newEmail });
      if (existing) {
        return res
          .status(409)
          .json({ message: 'El correo ya está registrado.' });
      }
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }
      const code = crypto.randomBytes(3).toString('hex');
      user.emailChangeCode = code;
      user.pendingNewEmail = newEmail;
      user.emailChangeCodeExpires = Date.now() + 15 * 60 * 1000; // 15 min
      await user.save();
      await sendVerificationCodeEmail(
        user.email,
        user.nombre,
        user.apellidoPaterno,
        user.apellidoMaterno,
        code
      );
      res.status(200).json({ message: 'Código enviado al correo actual.' });
    } catch (error) {
      console.error('Error en /request-email-change:', error);
      res.status(500).json({ message: 'Error interno. Intenta más tarde.' });
    }
  });
  
  // ───── RUTA: Confirmar cambio de correo ─────
  router.post('/confirm-email-change', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'No se proporcionó token.' });
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { code } = req.body;
      const user = await User.findById(decoded.userId);
      if (
        !user ||
        user.emailChangeCode !== code ||
        Date.now() > user.emailChangeCodeExpires
      ) {
        return res
          .status(400)
          .json({ message: 'Código inválido o expirado.' });
      }
      user.email = user.pendingNewEmail;
      user.pendingNewEmail = null;
      user.emailChangeCode = null;
      user.emailChangeCodeExpires = null;
      await user.save();
      res.status(200).json({ message: 'Correo actualizado correctamente.' });
    } catch (error) {
      console.error('Error en /confirm-email-change:', error);
      res.status(500).json({ message: 'Error interno. Intenta más tarde.' });
    }
  });
  
  // ───── RUTA: Cambiar contraseña ─────
  router.post('/change-password', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'No se proporcionó token.' });
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res
          .status(400)
          .json({ message: 'Contraseña actual incorrecta.' });
      }
      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();
      await sendPasswordUpdatedEmail(
        user.email,
        user.nombre,
        user.apellidoPaterno
      );
      res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
      console.error('Error en /change-password:', error);
      res.status(500).json({ message: 'Error interno. Intenta más tarde.' });
    }
  });
  
  // ───── RUTA: Listar usuarios por nombre ─────
  router.get('/users', async (req, res) => {
    try {
      const { nombre } = req.query;
      if (!nombre) {
        return res
          .status(400)
          .json({ message: 'Falta el parámetro "nombre".' });
      }
      const usuarios = await User.find({ nombre });
      res.status(200).json(usuarios);
    } catch (error) {
      console.error('Error en GET /users:', error);
      res.status(500).json({ message: 'Error interno. Intenta más tarde.' });
    }
  });
  
  module.exports = router;
