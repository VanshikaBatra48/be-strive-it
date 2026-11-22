"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passwordResetController_1 = require("../controllers/passwordResetController");
const validate_1 = require("../middleware/validate");
const resetPasswordSchema_1 = require("../schemas/resetPasswordSchema");
const router = (0, express_1.Router)();
router.post('/forgot-password', (0, validate_1.validate)(resetPasswordSchema_1.forgotPasswordSchema), passwordResetController_1.forgotPassword);
router.post('/verify-reset-otp', (0, validate_1.validate)(resetPasswordSchema_1.verifyOtpSchema), passwordResetController_1.verifyResetOTP);
router.post('/reset-password', (0, validate_1.validate)(resetPasswordSchema_1.resetPasswordSchema), passwordResetController_1.resetPassword);
exports.default = router;
//# sourceMappingURL=passwordResetRoutes.js.map