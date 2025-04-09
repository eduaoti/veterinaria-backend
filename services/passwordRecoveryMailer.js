// passwordRecoveryMailer.js
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
 * Envía un correo electrónico con el código de recuperación de contraseña.
 * @param {string} to - Correo electrónico del destinatario.
 * @param {string} nombre - Nombre del destinatario.
 * @param {string} apellidoPaterno - Apellido paterno del destinatario.
 * @param {string} recoveryCode - Código de recuperación a enviar.
 */
const sendPasswordRecoveryEmail = (to, nombre, apellidoPaterno, recoveryCode) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to,
        subject: 'Código de Recuperación de Contraseña de Luxepet Health',
        html: `
            <h1>¡Hola, ${nombre} ${apellidoPaterno}!</h1>
            <p>Recibimos una solicitud para restablecer tu contraseña en Luxepet Health.</p>
            <p>Utiliza el siguiente código para completar el proceso de recuperación de contraseña:</p>
            <h2>Código de Recuperación: <strong>${recoveryCode}</strong></h2>
            <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este mensaje.</p>
            <h3>¡Gracias por confiar en nosotros!</h3>
        `,
    };

    return transporter.sendMail(mailOptions)
        .then(info => {
            console.log('Correo de recuperación de contraseña enviado: ' + info.response);
        })
        .catch(error => {
            console.error('Error al enviar el correo de recuperación:', error);
            throw error;
        });
};

module.exports = { sendPasswordRecoveryEmail };
