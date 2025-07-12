const express = require('express');
const Mascota = require('../models/Mascotas');
const Joi = require('joi');
const cloudinary = require('../services/cloudinaryConfig');
const multer = require('multer');
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 📌 Función para parsear campos JSON en req.body
function parseIfJson(field) {
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch {
      return field;
    }
  }
  return field;
}

// Validación con Joi
const mascotaSchema = Joi.object({
  nombreMascota: Joi.string().required(),
  dueno: Joi.object({
    nombre: Joi.string().required(),
  }).required(),
  especie: Joi.string().valid('canino', 'felino', 'reptil', 'ave', 'roedor').required(),
  raza: Joi.string().required(),
  edad: Joi.number().integer().min(0).required(),
  sexo: Joi.string().valid('macho', 'hembra').required(),
  pesoKg: Joi.number().greater(0).required(),
  fechaNacimiento: Joi.date().iso().required(),
  servicios: Joi.array().items(
    Joi.object({
      nombre: Joi.string().required(),
      precio: Joi.number().min(0).required(),
      fijo: Joi.boolean().optional(), // ✅ permitido pero opcional
      _id: Joi.string().optional()    // ✅ permitido si llega desde el frontend
    })
  ).required(),
  
  alergias: Joi.object({
    existe: Joi.boolean(),
    observaciones: Joi.string().allow(''),
  }).required(),
  alimentacion: Joi.object({
    estado: Joi.string().valid('Excelente', 'Buena', 'Regular', 'Mala').required(),
    observaciones: Joi.string().allow(''),
  }).required(),
  veterinario: Joi.object({
    nombre: Joi.string().required(),
    clinica: Joi.string().required(),
  }).required(),
  fechaIngreso: Joi.date().iso().required(),
  fotoUrl: Joi.string().allow(''),
});

async function getNextFolio() {
  const counter = await Mascota.countDocuments();
  return counter + 1;
}
router.post('/', upload.single('foto'), async (req, res) => {
  try {
    // 🔍 1) Mostrar body crudo recibido
    console.log('📦 Body recibido (crudo):', req.body);

    // 🔄 2) Parsear campos JSON que vengan como string
    req.body.dueno        = parseIfJson(req.body.dueno);
    req.body.alergias     = parseIfJson(req.body.alergias);
    req.body.alimentacion = parseIfJson(req.body.alimentacion);
    req.body.veterinario  = parseIfJson(req.body.veterinario);
    req.body.servicios    = parseIfJson(req.body.servicios);

    console.log('✅ Body parseado:', req.body);

    // 🔧 3) Validación con Joi
    const { error } = mascotaSchema.validate(req.body);
    if (error) {
      console.error('❌ Error de validación:', error.details);
      return res.status(400).json({
        message: 'Error de validación',
        error:   error.details
      });
    }

    // 🔢 4) Obtener siguiente folio
    const numeroFolio = await getNextFolio();

    // 📷 5) Si hay archivo, subirlo a Cloudinary
    let imageUrl = null;
    if (req.file) {
      imageUrl = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'mascotas', public_id: `foto_${numeroFolio}` },
          (err, result) => {
            if (err) {
              // rechazamos siempre con instancia de Error
              return reject(
                new Error('Cloudinary upload error: ' + (err.message || String(err)))
              );
            }
            resolve(result.secure_url);
          }
        );
        stream.end(req.file.buffer);
      });
    }

    // 🐾 6) Crear y guardar la nueva mascota
    const nuevaMascota = new Mascota({
      ...req.body,
      fotoUrl:      imageUrl,
      numeroFolio,
      fechaIngreso: new Date()
    });
    await nuevaMascota.save();

    console.log('🎉 Mascota guardada exitosamente:', nuevaMascota);
    return res.status(201).json(nuevaMascota);

  } catch (err) {
    // 🔥 7) Capturar y reportar errores internos
    console.error('🔥 Error en el servidor al crear la mascota:', err);
    return res.status(500).json({
      message: 'Error al crear la mascota',
      error:   err.message || String(err)
    });
  }
});

// 📌 Obtener todas las mascotas
router.get('/', async (req, res) => {
  try {
    const mascotas = await Mascota.find();
    res.status(200).json(mascotas);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener las mascotas', error: error.message });
  }
});

// 📌 Buscar mascotas por nombre o dueño
router.get('/buscar', async (req, res) => {
  const { nombreMascota, nombreDueno } = req.query;

  try {
    const query = {};
    if (nombreMascota) {
      query.nombreMascota = { $regex: new RegExp(nombreMascota, 'i') };
    }

    if (nombreDueno) {
      query['personasRelacionadas.nombre'] = { $regex: new RegExp(nombreDueno, 'i') };
    }

    const mascotas = await Mascota.find(query);
    res.status(200).json(mascotas);
  } catch (error) {
    console.error('Error al buscar mascotas:', error);
    res.status(500).json({ message: 'Error al buscar mascotas', error: error.message });
  }
});

// 📌 Obtener mascota por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const mascota = await Mascota.findById(id);
    if (!mascota) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }
    res.status(200).json(mascota);
  } catch (error) {
    console.error('Error al obtener la mascota:', error);
    res.status(500).json({ message: 'Error al obtener la mascota', error: error.message });
  }
});

// 📌 Eliminar mascota
router.delete('/:id', async (req, res) => {
  try {
    const mascotaEliminada = await Mascota.findByIdAndDelete(req.params.id);
    if (!mascotaEliminada) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }
    res.status(200).json({ message: 'Mascota eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la mascota', error: error.message });
  }
});

// 📌 Editar mascota
router.put('/:id', async (req, res) => {
  try {
    req.body.dueno = parseIfJson(req.body.dueno);
    req.body.alergias = parseIfJson(req.body.alergias);
    req.body.alimentacion = parseIfJson(req.body.alimentacion);
    req.body.veterinario = parseIfJson(req.body.veterinario);
    req.body.servicios = parseIfJson(req.body.servicios);

    const { error } = mascotaSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Error de validación', error: error.details });
    }

    const mascotaActualizada = await Mascota.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!mascotaActualizada) {
      return res.status(404).json({ message: 'Mascota no encontrada' });
    }

    res.status(200).json(mascotaActualizada);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar la mascota', error: error.message });
  }
});

module.exports = router;
