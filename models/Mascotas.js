const mongoose = require('mongoose');

const servicioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  precio: { type: Number, required: true }
});

const mascotaSchema = new mongoose.Schema({
  numeroFolio: { type: Number, required: true, unique: true },
  idMascota: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  nombreMascota: { type: String, required: true },
  especie: { type: String, required: true },
  raza: { type: String, required: true },
  edad: { type: Number, required: true, min: 0 },
  sexo: { type: String, required: true },
  pesoKg: { type: Number, required: true },
  fechaIngreso: { type: Date, required: true },
  fechaNacimiento: { type: Date, required: true }, // Nuevo campo
  servicios: [servicioSchema],
  alergias: {
    existe: { type: Boolean, default: false },
    observaciones: { type: String, default: '' },
  },
  alimentacion: {
    estado: { type: String, default: '' },
    observaciones: { type: String, default: '' },
  },
  personasRelacionadas: [
    {
      nombre: { type: String, required: true },
      relacion: { type: String, required: true, default: 'dueño' },
    },
  ],
  veterinario: {
    nombre: { type: String, required: true },
    clinica: { type: String, default: 'Luxepet Health' },
  },
  fotoUrl: { type: String, default: '' },
});

// Crear el modelo
const Mascota = mongoose.model('Mascota', mascotaSchema);

module.exports = Mascota;
