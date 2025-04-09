const express = require('express');
const mongoose = require('mongoose'); // Importa mongoose aquí
const Cita = require('../models/Cita');
const User = require('../models/User'); // Asegúrate de que la ruta sea correcta
const PlanCuidado = require('../models/PlanCuidado'); // Importa el modelo de planes de cuidado
const Mascota = require('../models/Mascotas'); // Importa el modelo de mascotas
const router = express.Router();
const emailService = require('../services/emailService'); // Importa tu servicio de correo

// Función para verificar si un valor es un ObjectId válido
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

router.post('/agendar', async (req, res) => {
  const { cliente, fecha, hora, comentario, correo, mascotaNombre } = req.body;

  if (!cliente || !fecha || !hora || !correo) {
    return res.status(400).json({ message: 'Datos de cita incompletos.' });
  }

  // ✅ Combina fecha y hora en horario local (no UTC)
  const [year, month, day] = fecha.split('-').map(Number);
  const [hour, minute] = hora.split(':').map(Number);
  const fechaHoraCita = new Date(year, month - 1, day, hour, minute);

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

// Ruta para obtener citas atendidas
router.get('/atendidas', async (req, res) => {
    try {
        const citas = await Cita.find({ estado: 'atendida' });
        res.status(200).json(citas);
    } catch (error) {
        console.error('Error al obtener todas las citas atendidas:', error);
        res.status(500).json({ message: 'Error al obtener citas atendidas', error: error.message });
    }
});

// Ruta para obtener citas por fecha
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

// Ruta para obtener la disponibilidad de horas para una fecha
router.get('/disponibilidad', async (req, res) => {
    const { fecha } = req.query;
  
    if (!fecha) {
      return res.status(400).json({ message: 'La fecha es requerida.' });
    }
  
    try {
      const citas = await Cita.find({
        fechaHora: {
          $gte: new Date(`${fecha}T00:00:00`),
          $lt: new Date(`${fecha}T23:59:59`),
        },
      });
  
      const horasDisponibles = Array.from({ length: 9 }, (_, i) => i + 9); // Horas de 9:00 a 17:00
      const horasOcupadas = citas.map((cita) => cita.fechaHora.getHours());
      const horasLibres = horasDisponibles.filter((hora) => !horasOcupadas.includes(hora));
  
      res.status(200).json({ fecha, horasDisponibles: horasLibres });
    } catch (error) {
      console.error('Error al obtener la disponibilidad de horas:', error);
      res.status(500).json({ message: 'Error al obtener la disponibilidad.', error: error.message });
    }
  });
  
// Ruta para obtener citas por correo electrónico
router.get('/email/:email', async (req, res) => {
    const email = req.params.email;
    console.log('Buscando citas para el email:', email);

    try {
        const usuario = await User.findOne({ email: email });
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const citas = await Cita.find({ correo: email });

        if (citas.length === 0) {
            return res.status(404).json({ message: 'No se encontraron citas para este usuario.' });
        }

        return res.status(200).json(citas);
    } catch (error) {
        console.error('Error al obtener las citas:', error);
        return res.status(500).json({ message: 'Error al obtener las citas', error: error.message });
    }
});

// Ruta para eliminar una cita
router.delete('/eliminar/:id', async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'ID de cita no válido' });
    }

    try {
        const citaEliminada = await Cita.findByIdAndDelete(id);
        if (!citaEliminada) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        await emailService.sendCancellationEmail(citaEliminada.correo, {
            cliente: citaEliminada.cliente,
            fechaHora: citaEliminada.fechaHora.toISOString(),
            comentario: citaEliminada.comentario,
            fechaEliminacion: new Date().toISOString(),
        });

        res.status(200).json({ message: 'Cita eliminada con éxito' });
    } catch (error) {
        console.error('Error al eliminar la cita:', error);
        res.status(500).json({ message: 'Error al eliminar la cita', error: error.message });
    }
});
router.put('/editar/:id', async (req, res) => {
    const { id } = req.params;
    const { cliente, fecha, hora, comentario, correo, servicios = [] } = req.body;

    console.log('Datos recibidos para edición:', req.body);

    if (!cliente) return res.status(400).json({ message: 'El nombre del cliente es requerido.' });
    if (!fecha) return res.status(400).json({ message: 'La fecha es requerida.' });
    if (!hora) return res.status(400).json({ message: 'La hora es requerida.' });
    if (!correo) return res.status(400).json({ message: 'El correo electrónico es requerido.' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) return res.status(400).json({ message: 'El formato del correo electrónico no es válido.' });

    const fechaCompleta = new Date(`${fecha}T${hora}:00`);
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
                servicios, // 👈 Aquí agregamos los servicios
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
                comentario: comentario,
            },
        });

        return res.status(200).json(citaActualizada);
    } catch (error) {
        console.error('Error al editar la cita:', error);
        return res.status(500).json({ message: 'Error al editar la cita', error: error.message });
    }
});


router.get('/todas', async (req, res) => {
    try {
      const citas = await Cita.find().populate('idMascota', 'nombreMascota'); // Popula el campo relacionado
      res.status(200).json(citas);
    } catch (error) {
      console.error('Error al obtener todas las citas:', error);
      res.status(500).json({ message: 'Error al obtener todas las citas', error });
    }
  });
  

// Ruta para obtener una cita por ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'ID de cita no válido' });
    }

    try {
        const cita = await Cita.findById(id);
        if (!cita) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }
        return res.status(200).json(cita);
    } catch (error) {
        console.error('Error al obtener la cita:', error);
        return res.status(500).json({ message: 'Error al obtener la cita', error: error.message });
    }
});

// Ruta para iniciar la atención de una cita
router.put('/iniciar-atencion/:id', async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'ID de cita no válido' });
    }

    try {
        const citaActualizada = await Cita.findByIdAndUpdate(
            id,
            { estado: 'en proceso de atención' },
            { new: true }
        );

        if (!citaActualizada) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        return res.status(200).json(citaActualizada);
    } catch (error) {
        console.error('Error al iniciar atención de la cita:', error);
        return res.status(500).json({ message: 'Error al iniciar atención de la cita', error: error.message });
    }
});

// Ruta para finalizar la atención de una cita y actualizar el campo de mascota
router.put('/finalizar-atencion/:id', async (req, res) => {
    const { id } = req.params;
    const { estado, mascota } = req.body;

    console.log('Mascota recibida:', mascota);
    console.log('Estado recibido:', estado);

    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'ID de cita no válido' });
    }

    try {
        const citaActualizada = await Cita.findByIdAndUpdate(
            id,
            { estado, mascota },
            { new: true }
        );

        if (!citaActualizada) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        return res.status(200).json(citaActualizada);
    } catch (error) {
        console.error('Error al finalizar atención de la cita:', error);
        return res.status(500).json({ message: 'Error al finalizar atención de la cita', error: error.message });
    }
});

// Ruta para editar el estado de una cita
router.put('/editar-estado/:id', async (req, res) => {
    const { id } = req.params;
    let { estado, idMascota } = req.body;

    if (!isValidObjectId(id)) {
        return res.status(400).json({ message: 'ID de cita no válido' });
    }

    if (!idMascota) {
        idMascota = null;
    }

    try {
        const citaActualizada = await Cita.findByIdAndUpdate(
            id,
            { estado, idMascota },
            { new: true }
        );

        if (!citaActualizada) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        // Enviar correo si el estado es "atendida"
        if (estado === 'atendida') {
            const { correo, cliente } = citaActualizada;

            try {
                await emailService.sendAttendedEmail(correo, cliente);
                console.log('Correo de mascota atendida enviado.');
            } catch (error) {
                console.error('Error al enviar el correo de mascota atendida:', error);
            }
        }

        return res.status(200).json(citaActualizada);
    } catch (error) {
        console.error('Error al actualizar la cita:', error);
        return res.status(500).json({ message: 'Error al actualizar la cita', error: error.message });
    }
});

// Ruta para agregar una visita a un plan
router.post('/visitas/agregar', async (req, res) => {
    const { idMascota, fecha, hora, descripcion, nombreDueno, correo } = req.body; // Incluye correo aquí

    if (!idMascota || !fecha || !hora || !descripcion || !nombreDueno || !correo) {
        return res.status(400).json({ message: 'Todos los campos son requeridos.' });
    }

    const fechaHora = new Date(`${fecha}T${hora}:00`);
    if (isNaN(fechaHora.getTime())) {
        return res.status(400).json({ message: 'Fecha y hora no válidas' });
    }

    try {
        const citaExistente = await Cita.findOne({ fechaHora, idMascota });
        if (citaExistente) {
            return res.status(400).json({ message: 'Ya existe una cita en la misma fecha y hora.' });
        }

        // Crear nueva cita con el correo
        const nuevaCita = new Cita({
            cliente: nombreDueno,
            fechaHora,
            comentario: descripcion,
            idMascota,
            estado: 'visita',
            correo, // Guardar el correo en la base de datos
        });

        await nuevaCita.save();
        res.status(201).json(nuevaCita);
    } catch (error) {
        res.status(500).json({ message: 'Error al agregar la visita', error: error.message });
    }
});


// Exportar las rutas
module.exports = router;
