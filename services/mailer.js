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

const sendRegistrationEmail = (to, nombre, apellidoPaterno, apellidoMaterno, email, telefono) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: to,
        subject: 'Gracias por registrarte en Luxepet Health',
        html: `
            <h1>¡Gracias por registrarte, ${nombre} ${apellidoPaterno} ${apellidoMaterno}!</h1>
            <p>Tu registro ha sido exitoso.</p>
            <h2>Datos Registrados:</h2>
            <ul>
                <li><strong>Nombre:</strong> ${nombre} ${apellidoPaterno} ${apellidoMaterno}</li>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Teléfono:</strong> ${telefono}</li>
            </ul>
            <h2>Aviso de Privacidad</h2>
            <p><strong>Luxepet Health</strong> se compromete a proteger su privacidad. A continuación, se describe cómo manejamos la información personal que recopilamos de nuestros usuarios:</p>
            <h3>1. Información Recopilada</h3>
            <p>Recopilamos información personal cuando te registras en nuestro sitio, realizas una compra, o interactúas con nuestros servicios. Esto incluye, pero no se limita a, tu nombre, dirección de correo electrónico, número de teléfono, y cualquier otra información que decidas proporcionar.</p>
            
            <h3>2. Uso de la Información</h3>
            <p>Utilizamos tu información para:</p>
            <ul>
                <li>Proporcionar y gestionar nuestros servicios.</li>
                <li>Comunicarte sobre tu cuenta y transacciones.</li>
                <li>Enviarte información y promociones relacionadas con nuestros servicios.</li>
                <li>Mejorar nuestros servicios y la experiencia del usuario.</li>
            </ul>

            <h3>3. Compartición de Información</h3>
            <p>Tu información personal no será vendida ni alquilada a terceros. Sin embargo, podemos compartir tu información con proveedores de servicios que nos ayudan a operar nuestro negocio y cumplir con nuestras obligaciones legales.</p>

            <h3>4. Seguridad</h3>
            <p>Implementamos medidas de seguridad para proteger tu información personal. Sin embargo, ninguna transmisión de datos por Internet es completamente segura, y no podemos garantizar la seguridad absoluta de la información transmitida.</p>

            <h3>5. Derechos del Usuario</h3>
            <p>Tienes derecho a acceder, rectificar y eliminar tus datos personales. Si deseas ejercer alguno de estos derechos, contáctanos a través de los medios que se indican a continuación.</p>

            <h3>6. Cambios en el Aviso de Privacidad</h3>
            <p>Nos reservamos el derecho de actualizar este aviso de privacidad en cualquier momento. Cualquier cambio será publicado en este documento.</p>

            <h3>7. Contacto</h3>
            <p>Si tienes preguntas sobre este aviso de privacidad o nuestras prácticas, contáctanos a través de la dirección de correo electrónico: <a href="mailto:support@luxepethealth.com">support@luxepethealth.com</a>.</p>
        `,
        attachments: [
            {
                filename: '5.png', // Cambia esto por el nombre de tu imagen
                path: 'services/5.png' // Ruta local a tu imagen
            }
        ]
    };

    return transporter.sendMail(mailOptions)
        .then(info => {
            console.log('Correo enviado: ' + info.response);
        })
        .catch(error => {
            console.error('Error al enviar el correo:', error);
            throw error;
        });
};

module.exports = { sendRegistrationEmail };
