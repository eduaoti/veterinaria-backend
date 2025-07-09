const express = require('express');
// 🔐 A02: Cifrado en reposo – bcrypt para proteger contraseñas
const bcrypt = require('bcryptjs');
// 🔐 A02: Cifrado en tránsito – JWT usado correctamente (protegido por HTTPS en Railway)
const jwt = require('jsonwebtoken');
const User = require('../models/User');
// 🧪 A03: Validación de entradas con validator
const validator = require('validator');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { sendVerificationCodeEmail } = require('../services/verificationMailer');
const { sendRegistrationEmail } = require('../services/mailer');
const { sendPasswordRecoveryEmail } = require('../services/passwordRecoveryMailer');
const { sendPasswordUpdatedEmail } = require('../services/passwordUpdateMailer');
const cloudinary = require('../services/cloudinaryConfig');


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
// Ruta para actualizar la foto de perfil
router.post('/update-profile-photo', upload.single('fotoPerfil'), async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No se proporcionó un token.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        if (req.file) {
            // Subir la imagen a Cloudinary usando el buffer en lugar de un archivo
            const result = await cloudinary.uploader.upload_stream(
                { folder: 'perfiles', public_id: `perfil_${userId}` },
                (error, result) => {
                    if (error) {
                        console.error('Error al subir a Cloudinary:', error);
                        return res.status(500).json({ message: 'Error al subir a Cloudinary', error });
                    }
                    user.fotoPerfil = result.secure_url; // URL segura de Cloudinary
                    user.save();

                    res.status(200).json({ message: 'Foto de perfil actualizada exitosamente.', fotoPerfil: user.fotoPerfil });
                }
            ).end(req.file.buffer); // Termina la carga con el buffer del archivo
        } else {
            res.status(400).json({ message: 'No se encontró el archivo.' });
        }
    } catch (error) {
        console.error('Error al actualizar la foto de perfil:', error);
        res.status(500).json({ message: 'Error al actualizar la foto de perfil.', error: error.message });
    }
});

// ------------------
// RUTA: Registro
// ------------------
router.post('/register', upload.single('fotoPerfil'), async (req, res) => {
    try {
      // -------------------------------
      // 1) Desestructurar y validar datos
      // -------------------------------
      const {
        nombre,
        apellidoPaterno,
        apellidoMaterno,
        email,
        password,
        telefono,
        role
      } = req.body;
  
      // Validación de campos obligatorios
      if (
        !nombre ||
        !apellidoPaterno ||
        !apellidoMaterno ||
        !email ||
        !telefono ||
        !role ||
        !password
      ) {
        // 400 Bad Request si falta algún campo
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
      }
  
      // Validación de formato de email
      if (!validator.isEmail(email)) {
        return res.status(400).json({ message: 'El correo electrónico no es válido.' });
      }
  
      // -------------------------------
      // 2) Comprobar si el usuario existe
      // -------------------------------
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        // 409 Conflict si el email ya está registrado
        return res.status(409).json({ message: 'El correo electrónico ya está registrado.' });
      }
  
      // -------------------------------
      // 3) Procesamiento principal
      // -------------------------------
      // Hashear contraseña
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Generar código de verificación
      const newVerificationCode = crypto.randomBytes(3).toString('hex');
  
      // Crear documento Mongoose
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
        fotoPerfil: req.file ? req.file.path : null
      });
  
      // Guardar en MongoDB
      await newUser.save();
  
      // Enviar correo de verificación
      await sendVerificationCodeEmail(
        email,
        nombre,
        apellidoPaterno,
        apellidoMaterno,
        newVerificationCode
      );
  
      // -------------------------------
      // 4) Respuesta de éxito
      // -------------------------------
      res.status(201).json({
        message: 'Usuario registrado exitosamente. Verifique su correo electrónico.',
        success: true
      });
  
    } catch (error) {
      // -------------------------------
      // MANEJO DE ERRORES (Tarjeta 3)
      // -------------------------------
      // Cualquier excepción en el bloque try (findOne, hash, save, envío de mail, etc.)
      // es capturada aquí y se responde con 500 Internal Server Error.
      console.error('Error en /register:', error);
      res.status(500).json({
        message: 'Error al registrar el usuario.',
        error: error.message
      });
    }
  });
  
// Ruta para verificar el código de verificación
router.post('/verify', async (req, res) => {
    const { email, verificationCode } = req.body;

    console.log('Email recibido:', email);
    console.log('Código de verificación recibido:', verificationCode);

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // Verifica que el código de verificación sea correcto
    if (user.verificationCode !== verificationCode) {
        return res.status(400).json({ message: 'Código de verificación incorrecto.' });
    }

    // Si el código es correcto, actualiza el estado del usuario
    user.isVerified = true;
    user.verificationCode = null; // Limpiar el código de verificación
    await user.save();

    // Enviar correo de agradecimiento con los datos correctos
    await sendRegistrationEmail(user.email, user.nombre, user.apellidoPaterno, user.apellidoMaterno, user.email, user.telefono);

    res.status(200).json({ message: 'Cuenta verificada exitosamente.', success: true });
});


// Ruta para el inicio de sesión// Ruta para el inicio de sesión
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        if (!user.isVerified) {
            return res.status(403).json({ message: 'La cuenta no está verificada. Verifica tu correo electrónico primero.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Contraseña incorrecta.' });
        }

        // ACTUALIZA FECHA DE ÚLTIMO LOGIN
        user.lastLogin = new Date();
        await user.save();

        const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '2m'
        });

        res.status(200).json({ token, role: user.role, message: 'Inicio de sesión exitoso.', success: true });
    } catch (error) {
        res.status(500).json({ message: 'Error al iniciar sesión.' });
    }
});



// Ruta para obtener información del usuario autenticado
router.get('/user-info', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]; // Obtener el token del encabezado

    if (!token) {
        return res.status(401).json({ message: 'No se proporcionó un token.' });
    }

    try {
        // Verificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        // Buscar al usuario en la base de datos
        const user = await User.findById(userId).select('-password'); // No devolver la contraseña

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        res.status(200).json(user); // Retornar la información del usuario
    } catch (error) {
        res.status(401).json({ message: 'Token no válido.' });
    }
});

// Ruta para eliminar un usuario por ID
router.delete('/users/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        // Verificar si el usuario existe y eliminarlo
        const result = await User.deleteOne({ _id: userId });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        res.status(200).json({ message: 'Usuario eliminado exitosamente.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el usuario.' });
    }
});
// Ruta para enviar el código de recuperación de contraseña
router.post('/send-recovery-code', async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    try {
        // Generar el código de recuperación
        const recoveryCode = crypto.randomBytes(3).toString('hex');
        user.recoveryCode = recoveryCode;
        user.recoveryCodeExpiration = Date.now() + 3600000; // Código válido por 1 hora
        await user.save();

        // Enviar el código de recuperación al correo del usuario
        await sendPasswordRecoveryEmail(email, user.nombre, user.apellidoPaterno, recoveryCode);

        res.status(200).json({ message: 'Código de recuperación enviado al correo electrónico.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al enviar el código de recuperación.', error: error.message });
    }
});


// Ruta para verificar el código de recuperación de contraseña
router.post('/verify-recovery-code', async (req, res) => {
    const { email, code } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // Verificar si el código es correcto y si aún es válido
    if (user.recoveryCode !== code || Date.now() > user.recoveryCodeExpiration) {
        return res.status(400).json({ message: 'Código de recuperación incorrecto o expirado.' });
    }

    res.status(200).json({ message: 'Código de recuperación verificado.' });
});

// Ruta para restablecer la contraseña
router.post('/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    try {
        // Hashear la nueva contraseña
        user.password = await bcrypt.hash(newPassword, 10);
        user.recoveryCode = null; // Eliminar el código de recuperación
        user.recoveryCodeExpiration = null; // Limpiar la expiración

        await user.save();

        // Enviar correo de confirmación de cambio de contraseña
        await sendPasswordUpdatedEmail(user.email, user.nombre, user.apellidoPaterno);

        res.status(200).json({ message: 'Contraseña restablecida exitosamente.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al restablecer la contraseña.', error: error.message });
    }
});

router.post('/renew-token', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No se proporcionó un token.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true }); // Ignorar expiración temporalmente
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        const newToken = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '2m' // Renovar por 2 minutos más
        });

        res.status(200).json({ token: newToken });
    } catch (error) {
        res.status(401).json({ message: 'No se pudo renovar el token.' });
    }
});
// PUT /update-profile
router.put('/update-profile', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { nombre, apellidoPaterno, apellidoMaterno, telefono } = req.body;

        // Busca usuario
        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

        // Actualiza campos
        if (nombre) user.nombre = nombre;
        if (apellidoPaterno) user.apellidoPaterno = apellidoPaterno;
        if (apellidoMaterno) user.apellidoMaterno = apellidoMaterno;
        if (telefono) user.telefono = telefono;

        await user.save();

        res.status(200).json({ message: 'Perfil actualizado.' });
    } catch (err) {
        res.status(500).json({ message: 'Error actualizando perfil.', error: err.message });
    }
});
router.post('/request-email-change', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { newEmail } = req.body;

        if (!validator.isEmail(newEmail)) {
            return res.status(400).json({ message: 'Correo nuevo no válido.' });
        }

        // Checa si el nuevo correo ya existe
        const existing = await User.findOne({ email: newEmail });
        if (existing) {
            return res.status(409).json({ message: 'Este correo ya está registrado.' });
        }

        // Busca usuario y genera código
        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

        const code = crypto.randomBytes(3).toString('hex');
        user.emailChangeCode = code;
        user.pendingNewEmail = newEmail;
        user.emailChangeCodeExpires = Date.now() + 15 * 60 * 1000; // 15 minutos

        await user.save();

        // Manda el código al correo actual del usuario
        await sendVerificationCodeEmail(user.email, user.nombre, user.apellidoPaterno, user.apellidoMaterno, code);

        res.status(200).json({ message: 'Código enviado al correo actual.' });
    } catch (err) {
        res.status(500).json({ message: 'Error solicitando cambio de correo.', error: err.message });
    }
});
router.post('/confirm-email-change', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { code } = req.body;

        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

        if (
            !user.emailChangeCode ||
            user.emailChangeCode !== code ||
            Date.now() > user.emailChangeCodeExpires
        ) {
            return res.status(400).json({ message: 'Código inválido o expirado.' });
        }

        // Cambia el correo
        user.email = user.pendingNewEmail;
        user.pendingNewEmail = null;
        user.emailChangeCode = null;
        user.emailChangeCodeExpires = null;

        await user.save();

        res.status(200).json({ message: 'Correo actualizado correctamente.' });
    } catch (err) {
        res.status(500).json({ message: 'Error al confirmar código.', error: err.message });
    }
});
router.post('/change-password', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Contraseña actual incorrecta.' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        await sendPasswordUpdatedEmail(user.email, user.nombre, user.apellidoPaterno);

        res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
    } catch (err) {
        res.status(500).json({ message: 'Error al cambiar contraseña.', error: err.message });
    }
});
router.get('/users', async (req, res) => {
    try {
      const { nombre } = req.query;
      if (!nombre) {
        return res
          .status(400)
          .json({ message: 'Falta el parámetro "nombre" en la query.' });
      }
  
      // Equivalente a: SELECT * FROM users WHERE nombre = '…'
      const usuarios = await User.find({ nombre });
  
      return res.json(usuarios);
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ message: 'Error buscando usuarios', error: err.message });
    }
  });

// Exportar el router
module.exports = router;
