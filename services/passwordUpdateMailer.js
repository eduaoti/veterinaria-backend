// passwordUpdateMailer.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Configura el transportador de Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Envía un correo electrónico de confirmación una vez que la contraseña ha sido actualizada.
 * @param {string} to - Correo electrónico del destinatario.
 * @param {string} nombre - Nombre del destinatario.
 * @param {string} apellidoPaterno - Apellido paterno del destinatario.
 */
const sendPasswordUpdatedEmail = (to, nombre, apellidoPaterno) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to,
        subject: 'Confirmación de Actualización de Contraseña de Luxepet Health',
        html: `
            <h1>¡Hola, ${nombre} ${apellidoPaterno}!</h1>
            <p>Queremos informarte que tu contraseña en Luxepet Health ha sido actualizada exitosamente.</p>
            <p>Si no realizaste esta acción, por favor ponte en contacto con nuestro equipo de soporte de inmediato.</p>
            <h3>¡Gracias por confiar en nosotros!</h3>
        `,
    };

    return transporter.sendMail(mailOptions)
        .then(info => {
            console.log('Correo de confirmación de actualización de contraseña enviado: ' + info.response);
        })
        .catch(error => {
            console.error('Error al enviar el correo de confirmación de actualización de contraseña:', error);
            throw error;
        });
};

module.exports = { sendPasswordUpdatedEmail };
