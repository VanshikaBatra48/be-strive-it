"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestPasswordReset = requestPasswordReset;
exports.verifyResetOTP = verifyResetOTP;
exports.resetPassword = resetPassword;
const node_crypto_1 = __importDefault(require("node:crypto"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const user_1 = __importDefault(require("../models/user"));
const resetPassword_1 = __importDefault(require("../models/resetPassword"));
const emailService_1 = require("./emailService");
const tokenService_1 = require("./tokenService");
const OTP_EXPIRY_MS = 5 * 60 * 1000;
const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
function hashOTP(otp) {
    const secret = process.env.RESET_OTP_SECRET;
    if (!secret) {
        throw new Error('RESET_OTP_SECRET is not configured');
    }
    return node_crypto_1.default.createHmac('sha256', secret).update(String(otp)).digest('hex');
}
function hashResetToken(token) {
    return node_crypto_1.default.createHash('sha256').update(token).digest('hex');
}
async function requestPasswordReset(email) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await user_1.default.findOne({
        where: { email: normalizedEmail },
    });
    // Keep the response the same whether the email exists or not.
    if (!user) {
        return;
    }
    const otp = node_crypto_1.default.randomInt(100000, 1000000).toString();
    // Invalidate any previous reset requests for this user.
    await resetPassword_1.default.destroy({
        where: { userId: user.id },
    });
    const resetRequest = await resetPassword_1.default.create({
        userId: user.id,
        otpHash: hashOTP(otp),
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    });
    try {
        await (0, emailService_1.sendPasswordResetOTP)(user, otp);
    }
    catch (error) {
        // Don't leave an active OTP when email delivery fails.
        await resetPassword_1.default.destroy({
            where: { id: resetRequest.id },
        });
        throw error;
    }
}
async function verifyResetOTP(email, submittedOTP) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await user_1.default.findOne({
        where: { email: normalizedEmail },
    });
    if (!user) {
        throw new Error('INVALID_OTP');
    }
    const resetRequest = await resetPassword_1.default.findOne({
        where: { userId: user.id },
        order: [['createdAt', 'DESC']],
    });
    if (!resetRequest || resetRequest.usedAt) {
        throw new Error('INVALID_OTP');
    }
    if (resetRequest.expiresAt.getTime() <= Date.now()) {
        await resetRequest.destroy();
        throw new Error('OTP_EXPIRED');
    }
    if (resetRequest.verifiedAt) {
        throw new Error('OTP_ALREADY_VERIFIED');
    }
    if (resetRequest.attempts >= MAX_ATTEMPTS) {
        await resetRequest.destroy();
        throw new Error('TOO_MANY_ATTEMPTS');
    }
    const submittedHash = hashOTP(submittedOTP);
    const storedHash = resetRequest.otpHash;
    const isMatch = submittedHash.length === storedHash.length &&
        node_crypto_1.default.timingSafeEqual(Buffer.from(submittedHash, 'hex'), Buffer.from(storedHash, 'hex'));
    if (!isMatch) {
        resetRequest.attempts += 1;
        await resetRequest.save();
        if (resetRequest.attempts >= MAX_ATTEMPTS) {
            await resetRequest.destroy();
            throw new Error('TOO_MANY_ATTEMPTS');
        }
        throw new Error('INVALID_OTP');
    }
    const resetToken = node_crypto_1.default.randomBytes(32).toString('hex');
    resetRequest.verifiedAt = new Date();
    resetRequest.resetTokenHash = hashResetToken(resetToken);
    resetRequest.resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
    await resetRequest.save();
    return { resetToken };
}
async function resetPassword(resetToken, newPassword) {
    const resetTokenHash = hashResetToken(resetToken);
    const transaction = await database_1.sequelize.transaction();
    try {
        const resetRequest = await resetPassword_1.default.findOne({
            where: {
                resetTokenHash,
                verifiedAt: {
                    [sequelize_1.Op.ne]: null,
                },
                usedAt: null,
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!resetRequest) {
            throw new Error('INVALID_RESET_TOKEN');
        }
        if (!resetRequest.resetTokenExpiresAt ||
            resetRequest.resetTokenExpiresAt.getTime() <= Date.now()) {
            throw new Error('RESET_TOKEN_EXPIRED');
        }
        const user = await user_1.default.findByPk(resetRequest.userId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!user) {
            throw new Error('USER_NOT_FOUND');
        }
        // Validate that the new password is not the same as the old password
        const isSamePassword = await bcrypt_1.default.compare(newPassword, user.password);
        if (isSamePassword) {
            throw new Error('New password cannot be the same as the old password');
        }
        // Hash the new password before saving it.
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 12);
        user.password = hashedPassword;
        user.firstLogin = false; // Successfully resetting password clears firstLogin flag
        await user.save({ transaction });
        // Consume the reset token so it cannot be reused.
        resetRequest.usedAt = new Date();
        resetRequest.resetTokenHash = null;
        resetRequest.resetTokenExpiresAt = null;
        await resetRequest.save({ transaction });
        await transaction.commit();
        // Revoke all active refresh token sessions after a password reset
        await (0, tokenService_1.revokeAllForUser)(user.id);
        return { message: 'Password reset successfully' };
    }
    catch (error) {
        await transaction.rollback();
        throw error;
    }
}
//# sourceMappingURL=passwordResetService.js.map