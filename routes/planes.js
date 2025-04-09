const express = require('express');
const mongoose = require('mongoose'); // Importar mongoose para verificar ObjectId
const PlanCuidado = require('../models/PlanCuidado');
const Mascota = require('../models/Mascotas');
const Cita = require('../models/Cita');
const PlanCuidadoBuilder = require('../builders/PlanCuidadoBuilder');
const router = express.Router();
router.post('/crear-plan-con-citas', async (req, res) => {
  try {
    // Extraer los datos necesarios del cuerpo de la solicitud
    const { idMascota, dieta, ejercicio, visitas, correoDueno, nombreDueno, nombreMascota } = req.body;

    // Validar que todos los campos obligatorios están presentes
    if (!idMascota || !dieta || !ejercicio || !correoDueno || !nombreDueno || !nombreMascota) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios.' }); // Respuesta de error si falta algún campo
    }

    // Validar que las visitas son un arreglo y contienen los datos necesarios
    if (!Array.isArray(visitas) || visitas.some(v => !v.fecha || !v.hora || !v.descripcion)) {
      return res.status(400).json({ message: 'Todas las visitas deben incluir fecha, hora y descripción.' }); // Error si las visitas no cumplen el formato esperado
    }

    // Crear citas para cada visita proporcionada
    const visitasConEstado = await Promise.all(
      visitas.map(async (visita) => {
        const fechaHora = new Date(`${visita.fecha}T${visita.hora}:00`); // Combina fecha y hora en un solo objeto Date

        // Crear una nueva cita con la información proporcionada
        const nuevaCita = new Cita({
          cliente: nombreDueno, // Asigna el nombre del dueño como cliente
          fechaHora, // Fecha y hora de la cita
          comentario: visita.descripcion, // Descripción de la visita
          correo: correoDueno, // Correo del dueño
          idMascota, // ID de la mascota asociada
          estado: 'visita', // Estado predeterminado para una visita
        });

        await nuevaCita.save(); // Guarda la cita en la base de datos

        // Devuelve un objeto simplificado con la información de la visita
        return { fecha: nuevaCita.fechaHora, descripcion: nuevaCita.comentario };
      })
    );

    // Construir el plan de cuidado utilizando el patrón Builder
    const planBuilder = new PlanCuidadoBuilder()
      .setIdMascota(idMascota) // Asigna el ID de la mascota
      .setDieta(dieta) // Asigna la dieta
      .setEjercicio(ejercicio) // Asigna el plan de ejercicio
      .setCorreoDueno(correoDueno) // Asigna el correo del dueño
      .setNombreDueno(nombreDueno) // Asigna el nombre del dueño
      .setNombreMascota(nombreMascota) // Asigna el nombre de la mascota
      .setVisitas(visitasConEstado); // Asigna las visitas creadas con sus estados

    // Generar el objeto del plan de cuidado final
    const planCuidado = planBuilder.build();

    // Guardar el plan de cuidado en la base de datos
    const nuevoPlan = await PlanCuidado.create(planCuidado);

    // Responder con el plan de cuidado creado
    res.status(201).json(nuevoPlan);
  } catch (error) {
    console.error('Error al crear el plan de cuidado y citas:', error); // Imprime el error en la consola para depuración
    res.status(500).json({ message: 'Error interno del servidor.' }); // Respuesta de error para fallos del servidor
  }
});


router.get('/plan-por-mascota/:idMascota', async (req, res) => {
  const { idMascota } = req.params;

  console.log('idMascota recibido:', idMascota); // Depuración

  try {
    if (!mongoose.Types.ObjectId.isValid(idMascota)) {
      return res.status(400).json({ message: 'El idMascota no es válido.' });
    }

    const plan = await PlanCuidado.findOne({ idMascota });
    if (!plan) {
      return res.status(404).json(null); // Responde con null si no hay plan
    }
    res.status(200).json(plan);
  } catch (error) {
    console.error('Error al obtener el plan de cuidado:', error);
    res.status(500).json({ message: 'Error al obtener el plan de cuidado.', error: error.message });
  }
});

router.get('/planes-por-correo', async (req, res) => {
  const { correo } = req.query;

  try {
    const planes = await PlanCuidado.find({ correoDueno: correo });

    if (!planes.length) {
      return res.status(404).json({ message: 'No se encontraron planes de cuidado.' });
    }

    res.json(planes);
  } catch (error) {
    console.error('Error al obtener los planes de cuidado:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

router.put('/actualizar-plan-con-citas/:idMascota', async (req, res) => {
  const { idMascota } = req.params;
  const { dieta, ejercicio, visitas, correoDueno, nombreDueno, nombreMascota } = req.body;

  if (!idMascota) {
    return res.status(400).json({ message: 'El idMascota es obligatorio.' });
  }

  try {
    // Eliminar citas existentes asociadas con la mascota
    await Cita.deleteMany({ idMascota, estado: 'visita' });

    // Crear nuevas citas
    const nuevasCitas = await Promise.all(
      visitas.map(async (visita) => {
        const fechaHora = new Date(`${visita.fecha}T${visita.hora}:00`);
        const nuevaCita = new Cita({
          cliente: nombreDueno,
          fechaHora,
          comentario: visita.descripcion,
          correo: correoDueno,
          idMascota,
          estado: 'visita',
        });
        await nuevaCita.save();
        return { fecha: nuevaCita.fechaHora, descripcion: nuevaCita.comentario };
      })
    );

    // Actualizar el plan de cuidado
    const planActualizado = await PlanCuidado.findOneAndUpdate(
      { idMascota },
      {
        dieta,
        ejercicio,
        visitas: nuevasCitas,
        correoDueno,
        nombreDueno,
        nombreMascota,
      },
      { new: true }
    );

    if (!planActualizado) {
      return res.status(404).json({ message: 'No se encontró un plan para actualizar.' });
    }

    res.status(200).json({ plan: planActualizado, citas: nuevasCitas });
  } catch (error) {
    console.error('Error al actualizar el plan y las citas:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});


module.exports = router;
