"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendLoginCredentials = sendLoginCredentials;
exports.sendPasswordResetOTP = sendPasswordResetOTP;
require("dotenv/config");
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
const HTML_ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};
function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}
async function sendLoginCredentials(user, temporaryPassword) {
    const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const loginLink = `${frontendBase}/`;
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
    `,
    });
}
async function sendPasswordResetOTP(user, otp) {
    await transporter.sendMail({
        from: `"Intern Management System" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Password Reset OTP',
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
//# sourceMappingURL=emailService.js.map