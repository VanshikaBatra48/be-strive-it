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
Hello ${user.name},a

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

async function sendPasswordResetOTP(user, otp) {
    await transporter.sendMail({
        from: `"Intern Management System" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "Password Reset OTP",

        text: `
Hello ${user.name},

We received a request to reset your password.

Your OTP is: ${otp}

This OTP expires in 5 minutes.

If you did not request a password reset, please ignore this email.
        `,

        html: `
            <h2>Password Reset</h2>
            <p>Hello ${escapeHtml(user.name)},</p>
            <p>Use the following OTP to reset your password:</p>
            <h2>${escapeHtml(otp)}</h2>
            <p>This OTP expires in 5 minutes.</p>
            <p>If you did not request a reset, please ignore this email.</p>
        `,
    });
}


module.exports = {
    sendLoginCredentials,
    sendPasswordResetOTP,
};