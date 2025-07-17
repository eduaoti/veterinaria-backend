const mongoose = require('mongoose');

const CitaSchema = new mongoose.Schema({
  idMascota: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mascota',
    required: false, // Asegúrate de que sea obligatorio
  },
  cliente: {
    type: String,
    required: true,
    
  },
  correo: {
    type: String,
    required: [true, 'El correo es obligatorio.'],
  },
  fechaHora: {
    type: Date,
    
    required: true,
  },
  comentario: {
    type: String,
  },
  estado: {
    type: String,
    enum: ['en espera de atención', 'en proceso de atención', 'atendida', 'visita'],
    default: 'en espera de atención',
  },
  servicios: [
    {
      nombre: String,
      precio: Number,
      fijo: Boolean
    }
  ],
  
});
const Cita = mongoose.model('Cita', CitaSchema);

module.exports = Cita;
