const express = require("express");
const router = express.Router();

const {
    forgotPassword,
    verifyResetOTP,
    resetPassword,
} = require("../controller/passwordResetController");

router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOTP);
router.post("/reset-password", resetPassword);

module.exports = router;
