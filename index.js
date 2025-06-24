const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors'); // Importa CORS
const path = require('path'); // Importa path
const cron = require('node-cron');
const User = require('./models/User'); // Ajusta la ruta si tu modelo está en otra carpeta


// Importa las rutas
const authRoutes = require('./routes/auth'); // Rutas de autenticación
const mascotasRoutes = require('./routes/mascotas'); // Rutas de mascotas
const citasRoutes = require('./routes/citas'); // Importa las rutas de citas
const planesRoutes = require('./routes/planes'); // Rutas de planes de cuidado

// Cargar variables de entorno desde el archivo .env
dotenv.config(); 

// Inicializa la aplicación de Express
const app = express(); 

// Middleware
app.use(cors()); // Habilita CORS para permitir solicitudes desde el frontend
app.use(express.json()); // Middleware para parsear JSON

// Servir archivos estáticos desde la carpeta 'uploads'
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Usar rutas
app.use('/auth', authRoutes); // Rutas de autenticación
app.use('/api/mascotas', mascotasRoutes); // Rutas de mascotas
app.use('/api/citas', citasRoutes); // Ruta para las citas
app.use('/api/planes', planesRoutes); // Ruta para planes de cuidado

// Conexión a la base de datos MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Conectado a MongoDB'))
.catch(error => console.error('Error al conectar a MongoDB:', error));

// Configuración del puerto
const PORT = process.env.PORT || 3000;

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});

// Cronjob: borra usuarios que no han iniciado sesión en 1 mes
cron.schedule('0 2 * * *', async () => {
    const haceUnMes = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    try {
        const resultado = await User.deleteMany({
            $or: [
                { lastLogin: { $lt: haceUnMes } },
                { lastLogin: { $exists: false }, createdAt: { $lt: haceUnMes } }
            ]
        });
        if (resultado.deletedCount > 0) {
            console.log(`🗑️ Usuarios eliminados por inactividad: ${resultado.deletedCount}`);
        }
    } catch (err) {
        console.error('Error eliminando usuarios inactivos:', err);
    }
});
