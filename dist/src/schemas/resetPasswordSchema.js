"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordSchema = exports.verifyOtpSchema = exports.forgotPasswordSchema = void 0;
const zod_1 = require("zod");
const emailField = zod_1.z.email('Please enter a valid email address').trim().toLowerCase();
// 1. Request OTP / Forgot Password
exports.forgotPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: emailField,
    }),
});
// 2. Verify OTP
exports.verifyOtpSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: emailField,
        otp: zod_1.z.string().regex(/^\d{6}$/, 'OTP must contain exactly 6 digits'),
    }),
});
// 3. Reset Password
exports.resetPasswordSchema = zod_1.z
    .object({
    body: zod_1.z.object({
        resetToken: zod_1.z.string().min(1, 'Reset token is required'),
        newPassword: zod_1.z
            .string()
            .min(8, 'Password must contain at least 8 characters')
            .max(72, 'Password must be at most 72 characters'),
        confirmPassword: zod_1.z.string().min(1, 'Please confirm your password'),
    }),
})
    .refine((data) => data.body.newPassword === data.body.confirmPassword, {
    message: 'Passwords do not match',
    path: ['body', 'confirmPassword'],
});
//# sourceMappingURL=resetPasswordSchema.js.map