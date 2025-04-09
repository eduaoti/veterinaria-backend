const nodemailer = require('nodemailer');
const path = require('path'); // Para manejar rutas de archivos
require('dotenv').config(); // Asegúrate de que dotenv está instalado y cargado

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // Cambia esto por el servidor SMTP de Gmail
    port: 587,
    secure: false, // true para el puerto 465, false para otros
    auth: {
        user: process.env.EMAIL_USER, // Tu dirección de correo
        pass: process.env.EMAIL_PASS, // Tu contraseña de correo
    },
});

// Función para formatear la fecha y hora
const formatDateTime = (fechaHora) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
    return new Date(fechaHora).toLocaleString('es-ES', options);
};

const sendConfirmationEmail = (to, cita) => {
    const { cliente, fechaHora, comentario } = cita;
    const formattedDateTime = formatDateTime(fechaHora); // Formatear la fecha y hora

    // Formato de fecha para el archivo .ics
    const startDateTime = new Date(fechaHora).toISOString().replace(/-|:|\.\d\d\d/g, ''); // 20240101T120000Z
    const endDateTime = new Date(new Date(fechaHora).getTime() + 60 * 60 * 1000).toISOString().replace(/-|:|\.\d\d\d/g, ''); // +1 hora

    // Enlaces para agregar al calendario
    const googleCalendarLink = `https://calendar.google.com/calendar/r/eventedit?text=Cita&dates=${startDateTime}/${endDateTime}&details=${encodeURIComponent(comentario)}`;

    const mailOptions = {
        from: `"Luxepet Health" <${process.env.EMAIL_USER}>`, // Usa la variable de entorno para el remitente
        to,
        subject: 'Cita Agendada con Éxito',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                <h1 style="font-size: 24px; color: #4CAF50;">Cita Agendada</h1>
                <p style="font-size: 18px;">Hola <strong>${cliente}</strong>,</p>
                <p style="font-size: 18px;">Tu cita ha sido agendada con éxito.</p>
                <p style="font-size: 18px;"><strong>Fecha:</strong> ${formattedDateTime.split(',')[0]}</p>
                <p style="font-size: 18px;"><strong>Hora:</strong> ${formattedDateTime.split(',')[1]}</p>
                <p style="font-size: 18px;"><strong>Comentario:</strong> ${comentario}</p>
                <p style="font-size: 18px;">Puedes añadir tu cita a tu calendario haciendo clic en el siguiente enlace:</p>
                <ul>
                    <li><a href="${googleCalendarLink}" style="color: #4CAF50;">Agregar al Calendario de Google</a></li>
                </ul>
            </div>
        `,
        attachments: [
            {
                filename: 'logoluxepet.png', // Cambia esto al nombre de tu imagen
                path: 'services/logoluxepet.png', // Cambia la ruta a la ubicación de tu imagen
                cid: 'logo', // Un identificador para usar en el HTML
            },
        ],
    };

    return transporter.sendMail(mailOptions);
};

// Función para enviar correo de cancelación
const sendCancellationEmail = (to, cita) => {
    const { cliente, fechaHora, comentario, fechaEliminacion } = cita;
    const formattedDateTime = formatDateTime(fechaHora);
    const formattedEliminacion = formatDateTime(fechaEliminacion);

    const mailOptions = {
        from: `"Luxepet Health" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Cita Eliminada',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                <h1 style="font-size: 24px; color: #f44336;">Cita Eliminada</h1>
                <p style="font-size: 18px;">Hola <strong>${cliente}</strong>,</p>
                <p style="font-size: 18px;">Tu cita programada para el <strong>${formattedDateTime}</strong> ha sido eliminada.</p>
                <p style="font-size: 18px;"><strong>Comentario:</strong> ${comentario}</p>
                <p style="font-size: 18px;">Fecha y hora de eliminación: ${formattedEliminacion}</p>
                <p style="font-size: 18px;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
            </div>
        `,
        attachments: [
            {
                filename: 'logoluxepet.png', // Cambia esto al nombre de tu imagen
                path: 'services/logoluxepet.png', // Cambia la ruta a la ubicación de tu imagen
                cid: 'logo', // Un identificador para usar en el HTML
            },
        ],
    };

    return transporter.sendMail(mailOptions);
};

// Función para enviar correo de edición
const sendEditEmail = (to, datos) => {
    const { cliente, citaAnterior, citaNueva } = datos;
    const formattedAnterior = formatDateTime(citaAnterior.fechaHora);
    const formattedNueva = formatDateTime(citaNueva.fechaHora);

    const mailOptions = {
        from: `"Luxepet Health" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Cita reagendada con Exito',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                <h1 style="font-size: 24px; color: #4CAF50;">Cita reagendada</h1>
                <p style="font-size: 18px;">Hola <strong>${cliente}</strong>,</p>
                <p style="font-size: 18px;">Tu cita ha sido Reagendada.</p>
                <p style="font-size: 18px;"><strong>Cita anterior:</strong> ${formattedAnterior} - Comentario: ${citaAnterior.comentario}</p>
                <p style="font-size: 18px;"><strong>Nueva cita:</strong> ${formattedNueva} - Comentario: ${citaNueva.comentario}</p>
                <p style="font-size: 18px;">¡Te esperamos!</p>
            </div>
        `,
        attachments: [
            {
                filename: 'logoluxepet.png', // Cambia esto al nombre de tu imagen
                path: 'services/logoluxepet.png', // Cambia la ruta a la ubicación de tu imagen
                cid: 'logo', // Un identificador para usar en el HTML
            },
        ],
    };

    return transporter.sendMail(mailOptions);
};
const sendAttendedEmail = (to, cliente) => {
    const mailOptions = {
        from: `"Luxepet Health" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Su mascota ha sido atendida',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                <h1 style="font-size: 24px; color: #4CAF50;">Su mascota ha sido atendida</h1>
                <p style="font-size: 18px;">Hola <strong>${cliente}</strong>,</p>
                <p style="font-size: 18px;">Nos complace informarle que su mascota ha sido atendida y está lista para ser recogida.</p>
                <p style="font-size: 18px;">Si tiene alguna duda, no dude en contactarnos.</p>
                <p style="font-size: 18px;">¡Gracias por confiar en nosotros!</p>
            </div>
        `,
        attachments: [
            {
                filename: 'logoluxepet.png',
                path: 'services/logoluxepet.png',
                cid: 'logo',
            },
        ],
    };

    return transporter.sendMail(mailOptions);
};

module.exports = {
    sendConfirmationEmail,
    sendCancellationEmail,
    sendEditEmail,
    sendAttendedEmail,  // Exporta la nueva función

};
