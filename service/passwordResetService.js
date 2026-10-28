const crypto = require("crypto");
const User = require("../models/user");
const PasswordReset = require("../models/resetPassword");
const { sendPasswordResetOTP } = require("../service/emailService");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");

const OTP_EXPIRY_MS = 5 * 60 * 1000;

function hashOTP(otp) {
    const secret = process.env.RESET_OTP_SECRET;

    if (!secret) {
        throw new Error("RESET_OTP_SECRET is not configured");
    }

    return crypto
        .createHmac("sha256", secret)
        .update(String(otp))
        .digest("hex");
}

async function requestPasswordReset(email) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
        where: { email: normalizedEmail },
    });

    // Keep the response the same whether the email exists or not.
    if (!user) {
        return;
    }

    const otp = crypto
        .randomInt(100000, 1000000)
        .toString();

    // Invalidate any previous reset requests for this user.
    await PasswordReset.destroy({
        where: { userId: user.id },
    });

    const resetRequest = await PasswordReset.create({
        userId: user.id,
        otpHash: hashOTP(otp),
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    });

    try {
        await sendPasswordResetOTP(user, otp);
    } catch (error) {
        // Don't leave an active OTP when email delivery fails.
        await PasswordReset.destroy({
            where: { id: resetRequest.id },
        });

        throw error;
    }
}
async function verifyResetOTP(email, submittedOTP) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
        where: { email: normalizedEmail },
    });

    if (!user) {
        throw new Error("INVALID_OTP");
    }

    const resetRequest = await PasswordReset.findOne({
        where: { userId: user.id },
        order: [["createdAt", "DESC"]],
    });

    if (!resetRequest || resetRequest.usedAt) {
        throw new Error("INVALID_OTP");
    }

    if (resetRequest.expiresAt.getTime() <= Date.now()) {
        await resetRequest.destroy();
        throw new Error("OTP_EXPIRED");
    }

    if (resetRequest.verifiedAt) {
        // If already verified and token has not expired or been used, re-issue a valid reset token
        if (
            resetRequest.resetTokenExpiresAt &&
            resetRequest.resetTokenExpiresAt.getTime() > Date.now() &&
            !resetRequest.usedAt
        ) {
            const resetToken = crypto.randomBytes(32).toString("hex");
            resetRequest.resetTokenHash = crypto
                .createHash("sha256")
                .update(resetToken)
                .digest("hex");
            resetRequest.resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
            await resetRequest.save();
            return { resetToken };
        }
        throw new Error("OTP_ALREADY_VERIFIED");
    }

    if (resetRequest.attempts >= 5) {
        await resetRequest.destroy();
        throw new Error("TOO_MANY_ATTEMPTS");
    }

    const submittedHash = hashOTP(submittedOTP);
    const storedHash = resetRequest.otpHash;
    const isMatch =
        submittedHash.length === storedHash.length &&
        crypto.timingSafeEqual(
            Buffer.from(submittedHash, "hex"),
            Buffer.from(storedHash, "hex")
        );

    if (!isMatch) {
        resetRequest.attempts += 1;
        await resetRequest.save();

        if (resetRequest.attempts >= 5) {
            await resetRequest.destroy();
            throw new Error("TOO_MANY_ATTEMPTS");
        }

        throw new Error("INVALID_OTP");
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    resetRequest.verifiedAt = new Date();
    resetRequest.resetTokenHash = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
    resetRequest.resetTokenExpiresAt =
        new Date(Date.now() + 15 * 60 * 1000);

    await resetRequest.save();

    return { resetToken };
}

async function resetPassword(resetToken, newPassword) {
    const resetTokenHash = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    const transaction = await User.sequelize.transaction();

    try {
        const resetRequest = await PasswordReset.findOne({
            where: {
                resetTokenHash,
                verifiedAt: {
                    [Op.ne]: null,
                },
                usedAt: null,
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!resetRequest) {
            throw new Error("INVALID_RESET_TOKEN");
        }

        if (
            !resetRequest.resetTokenExpiresAt ||
            resetRequest.resetTokenExpiresAt.getTime() <= Date.now()
        ) {
            throw new Error("RESET_TOKEN_EXPIRED");
        }

        const user = await User.findByPk(resetRequest.userId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!user) {
            throw new Error("USER_NOT_FOUND");
        }

        // Hash the new password before saving it.
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Validate that new password is not the same as the old password
        const isSamePassword = await bcrypt.compare(hashedPassword, user.password);
        if (isSamePassword) {
            throw new Error("New password cannot be the same as the old password");
        }

        user.password = hashedPassword;
        user.firstLogin = false; // Successfully resetting password clears firstLogin flag
        await user.save({ transaction });

        // Consume the reset token so it cannot be reused.
        resetRequest.usedAt = new Date();
        resetRequest.resetTokenHash = null;
        resetRequest.resetTokenExpiresAt = null;

        await resetRequest.save({ transaction });

        await transaction.commit();

        return { message: "Password reset successfully" };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}


module.exports = {
    requestPasswordReset,
    verifyResetOTP,
    resetPassword
};
