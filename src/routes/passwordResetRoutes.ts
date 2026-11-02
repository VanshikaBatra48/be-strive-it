import { Router } from 'express';

import {
  forgotPassword,
  verifyResetOTP,
  resetPassword,
} from '../controllers/passwordResetController';

const router = Router();

router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password', resetPassword);

export default router;