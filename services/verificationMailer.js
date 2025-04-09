// verificationMailer.js
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
 * Envía un correo electrónico con el código de verificación al usuario.
 * @param {string} to - Correo electrónico del destinatario.
 * @param {string} nombre - Nombre del destinatario.
 * @param {string} apellidoPaterno - Apellido paterno del destinatario.
 * @param {string} apellidoMaterno - Apellido materno del destinatario.
 * @param {string} verificationCode - Código de verificación a enviar.
 */
const sendVerificationCodeEmail = (to, nombre, apellidoPaterno, apellidoMaterno, verificationCode) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to,
        subject: 'Código de Verificación de Luxepet Health',
        html: `
            <h1>¡Hola, ${nombre} ${apellidoPaterno} ${apellidoMaterno}!</h1>
            <p>Gracias por registrarte en Luxepet Health. Para activar tu cuenta, utiliza el siguiente código de verificación:</p>
            <h2>Código de Verificación: <strong>${verificationCode}</strong></h2>
            <p>Por favor, ingresa este código en la aplicación para completar tu registro.</p>
            <p>Si no te registraste en nuestro sitio, ignora este correo electrónico.</p>
            <h3>¡Gracias por elegirnos!</h3>
        `,
    };

    return transporter.sendMail(mailOptions)
        .then(info => {
            console.log('Correo de verificación enviado: ' + info.response);
        })
        .catch(error => {
            console.error('Error al enviar el correo de verificación:', error);
            throw error;
        });
};

module.exports = { sendVerificationCodeEmail };
