const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendLoginCredentials(user, temporaryPassword) {
    const loginLink = `${process.env.FRONTEND_URL}/`;

    await transporter.sendMail({
        from: `"Intern Management System" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Your Intern Management System Login Details',

        text: `
Hello ${user.name},

Your ${user.role} account has been created.

Login link: ${loginLink}
Email: ${user.email}
Temporary password: ${temporaryPassword}

For security reasons, you must change your temporary password
when you log in for the first time.

If you did not expect this email, please contact your administrator.
        `,

        html: `
            <h2>Welcome, ${escapeHtml(user.name)}!</h2>

            <p>Your ${escapeHtml(user.role)} account has been created.</p>

            <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>

            <p><strong>Temporary password:</strong>
                <code>${escapeHtml(temporaryPassword)}</code>
            </p>

            <p>You must change your password the first time you log in.</p>

            <a href="${loginLink}"
               style="display:inline-block;
                      padding:12px 20px;
                      background:#007bff;
                      color:white;
                      text-decoration:none;
                      border-radius:5px;">
                Log In to Your Account
            </a>

            <p>If you did not expect this email, please contact your administrator.</p>
        `
    });
}

function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

module.exports = { sendLoginCredentials };