// Cargar dotenv para acceder a las variables de entorno
require('dotenv').config();

const cloudinary = require('cloudinary').v2;

// Configurar Cloudinary con las variables de entorno
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
