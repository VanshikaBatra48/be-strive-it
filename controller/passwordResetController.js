const passwordResetService = require("../service/passwordResetService");

async function forgotPassword(req, res) {
    try {
        const { email } = req.body;

        if (
            typeof email !== "string" ||
            !email.trim() ||
            email.length > 254
        ) {
            return res.status(400).json({
                message: "Please provide a valid email address.",
            });
        }

        await passwordResetService.requestPasswordReset(email);

        return res.status(200).json({
            message:
                "If an account exists for this email, an OTP will be sent.",
        });
    } catch (error) {
        console.error("Forgot password error:", error.message);

        return res.status(500).json({
            message: "Unable to process your request. Please try again later.",
        });
    }
}

async function verifyResetOTP(req, res) {
    try {
        const { email, otp } = req.body;
        const sanitizedOtp = typeof otp === "number" ? String(otp) : (typeof otp === "string" ? otp.trim() : "");

        if (
            typeof email !== "string" ||
            !email.trim() ||
            !/^\d{6}$/.test(sanitizedOtp)
        ) {
            return res.status(400).json({
                message: "Please provide a valid email and 6-digit OTP.",
            });
        }

        const result = await passwordResetService.verifyResetOTP(email.trim(), sanitizedOtp);

        return res.status(200).json({
            message: "OTP verified successfully. You can now reset your password.",
            resetToken: result.resetToken,
        });
    } catch (error) {
        let statusCode = 500;
        let message = "Unable to verify OTP. Please try again.";

        switch (error.message) {
            case "INVALID_OTP":
                statusCode = 400;
                message = "Invalid OTP or email.";
                break;

            case "OTP_EXPIRED":
                statusCode = 400;
                message = "Your OTP has expired. Please request a new one.";
                break;

            case "OTP_ALREADY_VERIFIED":
                statusCode = 400;
                message = "OTP already verified. Continue with password reset.";
                break;

            case "TOO_MANY_ATTEMPTS":
                statusCode = 429;
                message = "Too many incorrect attempts. Please request a new OTP.";
                break;
        }

        if (statusCode === 500) {
            console.error("Verify OTP error:", error.message);
        }

        return res.status(statusCode).json({ message });
    }
}

async function resetPassword(req, res) {
    try {
        const { resetToken, newPassword, confirmPassword } = req.body;

        if (
            typeof resetToken !== "string" ||
            !resetToken.trim() ||
            typeof newPassword !== "string" ||
            typeof confirmPassword !== "string"
        ) {
            return res.status(400).json({
                message: "Please provide all required fields.",
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                message: "Passwords do not match.",
            });
        }

        if (newPassword.length < 8 || newPassword.length > 72) {
            return res.status(400).json({
                message: "Password must be between 8 and 72 characters.",
            });
        }

        const result = await passwordResetService.resetPassword(
            resetToken.trim(),
            newPassword
        );

        return res.status(200).json(result);
    } catch (error) {
        if (
            error.message === "INVALID_RESET_TOKEN" ||
            error.message === "RESET_TOKEN_EXPIRED"
        ) {
            return res.status(400).json({
                message: "Invalid or expired reset token. Please verify your email again.",
            });
        }

        if (error.message === "USER_NOT_FOUND") {
            return res.status(404).json({
                message: "User not found.",
            });
        }

        console.error("Password reset error:", error.message);

        return res.status(500).json({
            message: "Unable to reset password. Please try again later.",
        });
    }
}


module.exports = {
    forgotPassword,
    verifyResetOTP,
    resetPassword,
};
