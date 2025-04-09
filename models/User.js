const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const UserSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    apellidoPaterno: { type: String, required: true },
    apellidoMaterno: { type: String, required: true },
    email: { type: String, required: true, unique: true, validate: { validator: (v) => validator.isEmail(v), message: props => `${props.value} no es un correo electrónico válido!` }},
    password: { type: String, required: true },
    telefono: { type: String, required: true, validate: { validator: (v) => /^[0-9]{10}$/.test(v), message: props => `${props.value} no es un número de teléfono válido!` }},
    role: { type: String, enum: ['cliente', 'veterinario'], default: 'cliente' },
    verificationCode: { type: String },
    isVerified: { type: Boolean, default: false },
    recoveryCode: { type: String },  // Código de recuperación
    recoveryCodeExpiration: { type: Date }, // Expiración del código de recuperación
    fotoPerfil: { type: String } // Nuevo campo para la foto de perfil
}, { timestamps: true });

// Middleware para encriptar la contraseña antes de guardar el usuario
UserSchema.methods.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', UserSchema);

module.exports = User;
