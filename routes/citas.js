const express = require('express');
const mongoose = require('mongoose');
const moment = require('moment-timezone'); // 🕐 CORRECTO: usamos moment-timezone
const Cita = require('../models/Cita');
const User = require('../models/User');
const PlanCuidado = require('../models/PlanCuidado');
const Mascota = require('../models/Mascotas');
const router = express.Router();
const emailService = require('../services/emailService');

// Función para verificar si un ObjectId es válido
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ✅ AGENDAR CITA
router.post('/agendar', async (req, res) => {
  const { cliente, fecha, hora, comentario, correo, mascotaNombre, servicios = [] } = req.body;

  if (!cliente || !fecha || !hora || !correo) {
    return res.status(400).json({ message: 'Datos de cita incompletos.' });
  }

  // CORRECTO: Generamos fecha con zona horaria local
  const fechaHoraCita = moment.tz(`${fecha} ${hora}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City').toDate();
  if (isNaN(fechaHoraCita.getTime())) {
    return res.status(400).json({ message: 'Fecha y hora no válidas' });
  }

  let idMascota = null;
  if (mascotaNombre) {
    const mascota = await Mascota.findOne({ nombreMascota: mascotaNombre });
    if (mascota) idMascota = mascota._id;
  }

  const nuevaCita = new Cita({
    cliente,
    fechaHora: fechaHoraCita,
    comentario,
    correo,
    mascota: mascotaNombre,
    idMascota,
    estado: 'en espera de atención',
    servicios
  });

  try {
    await nuevaCita.save();

    try {
      await emailService.sendConfirmationEmail(correo, nuevaCita);
      console.log('Correo de confirmación enviado.');
    } catch (emailError) {
      console.error('Error al enviar el correo de confirmación:', emailError);
    }

    res.status(201).json(nuevaCita);
  } catch (error) {
    console.error('Error al agendar la cita:', error);
    res.status(500).json({ message: 'Error al agendar la cita', error: error.message });
  }
});

// ✅ EDITAR CITA
router.put('/editar/:id', async (req, res) => {
  const { id } = req.params;
  const { cliente, fecha, hora, comentario, correo, servicios = [] } = req.body;

  if (!cliente || !fecha || !hora || !correo) {
    return res.status(400).json({ message: 'Datos de edición incompletos.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(correo)) {
    return res.status(400).json({ message: 'Formato de correo inválido.' });
  }

  const fechaCompleta = moment.tz(`${fecha} ${hora}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City').toDate();
  if (isNaN(fechaCompleta.getTime()) || fechaCompleta < new Date()) {
    return res.status(400).json({ message: 'Fecha y hora no válidas o en el pasado' });
  }

  try {
    const citaAnterior = await Cita.findById(id);
    if (!citaAnterior) return res.status(404).json({ message: 'Cita no encontrada' });

    const citaActualizada = await Cita.findByIdAndUpdate(
      id,
      {
        cliente,
        fechaHora: fechaCompleta,
        comentario,
        correo,
        servicios,
        estado: citaAnterior.estado
      },
      { new: true }
    );

    await emailService.sendEditEmail(correo, {
      cliente,
      citaAnterior: {
        fechaHora: citaAnterior.fechaHora.toISOString(),
        comentario: citaAnterior.comentario,
      },
      citaNueva: {
        fechaHora: citaActualizada.fechaHora.toISOString(),
        comentario,
      },
    });

    return res.status(200).json(citaActualizada);
  } catch (error) {
    console.error('Error al editar la cita:', error);
    return res.status(500).json({ message: 'Error al editar la cita', error: error.message });
  }
});

// ✅ AGREGAR VISITA
router.post('/visitas/agregar', async (req, res) => {
  const { idMascota, fecha, hora, descripcion, nombreDueno, correo } = req.body;

  if (!idMascota || !fecha || !hora || !descripcion || !nombreDueno || !correo) {
    return res.status(400).json({ message: 'Todos los campos son requeridos.' });
  }

  const fechaHora = moment.tz(`${fecha} ${hora}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City').toDate();
  if (isNaN(fechaHora.getTime())) {
    return res.status(400).json({ message: 'Fecha y hora no válidas' });
  }

  try {
    const citaExistente = await Cita.findOne({ fechaHora, idMascota });
    if (citaExistente) {
      return res.status(400).json({ message: 'Ya existe una cita en esa fecha y hora.' });
    }

    const nuevaCita = new Cita({
      cliente: nombreDueno,
      fechaHora,
      comentario: descripcion,
      idMascota,
      estado: 'visita',
      correo,
    });

    await nuevaCita.save();
    res.status(201).json(nuevaCita);
  } catch (error) {
    res.status(500).json({ message: 'Error al agregar la visita', error: error.message });
  }
});

module.exports = router;
