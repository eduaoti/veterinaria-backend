const mongoose = require('mongoose');

const PlanCuidadoSchema = new mongoose.Schema({
  idMascota: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mascota',
    required: true,
  },
  dieta: { type: String, required: true },
  ejercicio: { type: String, required: true },
  visitas: [
    {
      fecha: { type: Date, required: true },
      descripcion: { type: String, required: true },
    },
  ],
  correoDueno: { type: String, required: true }, // Nuevo campo
  nombreDueno: { type: String, required: true }, // Nuevo campo
  nombreMascota: { type: String, required: true }, // Nuevo campo
});

const PlanCuidado = mongoose.model('PlanCuidado', PlanCuidadoSchema);

module.exports = PlanCuidado;
