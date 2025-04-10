// routes/citas.js
const express = require('express');
const mongoose = require('mongoose');
const moment = require('moment-timezone');
const Cita = require('../models/Cita');
const User = require('../models/User');
const PlanCuidado = require('../models/PlanCuidado');
const Mascota = require('../models/Mascotas');
const router = express.Router();
const emailService = require('../services/emailService');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

router.post('/agendar', async (req, res) => {
  const { cliente, fecha, hora, comentario, correo, mascotaNombre } = req.body;

  if (!cliente || !fecha || !hora || !correo) {
    return res.status(400).json({ message: 'Datos de cita incompletos.' });
  }

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
    servicios: req.body.servicios || [],
    cliente,
    fechaHora: fechaHoraCita,
    comentario,
    correo,
    mascota: mascotaNombre,
    idMascota,
    estado: 'en espera de atención'
  });

  try {
    await nuevaCita.save();
    try {
      await emailService.sendConfirmationEmail(correo, nuevaCita);
    } catch (emailError) {
      console.error('Error al enviar el correo de confirmación:', emailError);
    }
    res.status(201).json(nuevaCita);
  } catch (error) {
    console.error('Error al agendar la cita:', error);
    res.status(500).json({ message: 'Error al agendar la cita', error: error.message });
  }
});
router.put('/editar/:id', async (req, res) => {
    const { id } = req.params;
    const { cliente, fecha, hora, comentario, correo, servicios = [] } = req.body;

    console.log('Datos recibidos para edición:', req.body);

    // Validaciones básicas de los campos
    if (!cliente) return res.status(400).json({ message: 'El nombre del cliente es requerido.' });
    if (!fecha) return res.status(400).json({ message: 'La fecha es requerida.' });
    if (!hora) return res.status(400).json({ message: 'La hora es requerida.' });
    if (!correo) return res.status(400).json({ message: 'El correo electrónico es requerido.' });

    // Validación de formato de correo electrónico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) return res.status(400).json({ message: 'El formato del correo electrónico no es válido.' });

    // Ajuste de la fecha y hora con la zona horaria de México
    const fechaHora = moment.tz(`${fecha} ${hora}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City');
    const fechaCompleta = fechaHora.toDate();

    if (isNaN(fechaCompleta.getTime()) || fechaHora.isBefore(moment())) {
        return res.status(400).json({ message: 'Fecha y hora no válidas o en el pasado' });
    }

    // Convertir a UTC para guardarlo en la base de datos
    const fechaEnUTC = moment(fechaCompleta).utc().toDate();

    try {
        // Verificar si la cita existe en la base de datos
        const citaAnterior = await Cita.findById(id);
        if (!citaAnterior) {
            return res.status(404).json({ message: `Cita con ID ${id} no encontrada` });
        }

        // Actualizar la cita con los nuevos datos
        const citaActualizada = await Cita.findByIdAndUpdate(
            id,
            {
                cliente,
                fechaHora: fechaEnUTC, // Guardar la fecha y hora en UTC
                comentario,
                correo,
                servicios, // Servicios agregados
                estado: citaAnterior.estado, // Mantener el estado anterior
            },
            { new: true }
        );

        // Enviar correo de confirmación de edición
        try {
            await emailService.sendEditEmail(correo, {
                cliente,
                citaAnterior: {
                    fechaHora: citaAnterior.fechaHora.toISOString(),
                    comentario: citaAnterior.comentario,
                },
                citaNueva: {
                    fechaHora: citaActualizada.fechaHora.toISOString(),
                    comentario: comentario,
                },
            });
            console.log('Correo de confirmación de edición enviado.');
        } catch (emailError) {
            console.error('Error al enviar el correo de confirmación:', emailError);
        }

        // Responder con la cita actualizada
        return res.status(200).json(citaActualizada);
    } catch (error) {
        console.error('Error al editar la cita:', error);
        return res.status(500).json({ message: 'Error al editar la cita', error: error.message });
    }
});

router.get('/atendidas', async (req, res) => {
  try {
    const citas = await Cita.find({ estado: 'atendida' });
    res.status(200).json(citas);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener citas atendidas', error: error.message });
  }
});

router.get('/por-fecha', async (req, res) => {
  const { fecha } = req.query;
  try {
    const citas = await Cita.find({
      fechaHora: {
        $gte: new Date(`${fecha}T00:00:00`),
        $lt: new Date(`${fecha}T23:59:59`)
      }
    });
    res.status(200).json(citas);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener las citas', error });
  }
});

router.get('/disponibilidad', async (req, res) => {
  const { fecha } = req.query;
  if (!fecha) {
    return res.status(400).json({ message: 'La fecha es requerida.' });
  }
  try {
    const citas = await Cita.find({
      fechaHora: {
        $gte: new Date(`${fecha}T00:00:00`),
        $lt: new Date(`${fecha}T23:59:59`)
      }
    });
    const horasDisponibles = Array.from({ length: 9 }, (_, i) => i + 9);
    const horasOcupadas = citas.map((cita) => cita.fechaHora.getHours());
    const horasLibres = horasDisponibles.filter((hora) => !horasOcupadas.includes(hora));
    res.status(200).json({ fecha, horasDisponibles: horasLibres });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la disponibilidad.', error: error.message });
  }
});

router.get('/email/:email', async (req, res) => {
  const email = req.params.email;
  try {
    const usuario = await User.findOne({ email });
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });
    const citas = await Cita.find({ correo: email });
    if (citas.length === 0) return res.status(404).json({ message: 'No se encontraron citas' });
    return res.status(200).json(citas);
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener las citas', error: error.message });
  }
});

router.delete('/eliminar/:id', async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID no válido' });
  try {
    const cita = await Cita.findByIdAndDelete(id);
    if (!cita) return res.status(404).json({ message: 'Cita no encontrada' });
    await emailService.sendCancellationEmail(cita.correo, {
      cliente: cita.cliente,
      fechaHora: cita.fechaHora.toISOString(),
      comentario: cita.comentario,
      fechaEliminacion: new Date().toISOString(),
    });
    res.status(200).json({ message: 'Cita eliminada con éxito' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la cita', error: error.message });
  }
});

router.get('/todas', async (req, res) => {
  try {
    const citas = await Cita.find().populate('idMascota', 'nombreMascota');
    res.status(200).json(citas);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener todas las citas', error });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID no válido' });
  try {
    const cita = await Cita.findById(id);
    if (!cita) return res.status(404).json({ message: 'Cita no encontrada' });
    return res.status(200).json(cita);
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener la cita', error: error.message });
  }
});

router.put('/iniciar-atencion/:id', async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID no válido' });
  try {
    const cita = await Cita.findByIdAndUpdate(id, { estado: 'en proceso de atención' }, { new: true });
    if (!cita) return res.status(404).json({ message: 'Cita no encontrada' });
    return res.status(200).json(cita);
  } catch (error) {
    return res.status(500).json({ message: 'Error al actualizar estado', error: error.message });
  }
});

router.put('/finalizar-atencion/:id', async (req, res) => {
  const { id } = req.params;
  const { estado, mascota } = req.body;
  if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID no válido' });
  try {
    const cita = await Cita.findByIdAndUpdate(id, { estado, mascota }, { new: true });
    if (!cita) return res.status(404).json({ message: 'Cita no encontrada' });
    return res.status(200).json(cita);
  } catch (error) {
    return res.status(500).json({ message: 'Error al finalizar atención', error: error.message });
  }
});

router.put('/editar-estado/:id', async (req, res) => {
  const { id } = req.params;
  let { estado, idMascota } = req.body;
  if (!isValidObjectId(id)) return res.status(400).json({ message: 'ID no válido' });
  if (!idMascota) idMascota = null;
  try {
    const cita = await Cita.findByIdAndUpdate(id, { estado, idMascota }, { new: true });
    if (!cita) return res.status(404).json({ message: 'Cita no encontrada' });
    if (estado === 'atendida') {
      try {
        await emailService.sendAttendedEmail(cita.correo, cita.cliente);
      } catch (error) {
        console.error('Error al enviar correo de mascota atendida:', error);
      }
    }
    return res.status(200).json(cita);
  } catch (error) {
    return res.status(500).json({ message: 'Error al actualizar estado', error: error.message });
  }
});

module.exports = router;
