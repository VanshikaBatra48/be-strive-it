import { Router } from 'express';
import type { Request, Response } from 'express';

import { login } from '../controllers/authController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';          // NEW
import { loginSchema } from '../schemas/userSchema';        // NEW

const router = Router();

router.post('/login', validate(loginSchema), login);        // CHANGED

router.get('/me', authenticate, (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Authenticated successfully',
    user: req.user,
  });
});

// Example: only mentors and admins can access this route
router.get(
  '/mentor-area',
  authenticate,
  authorize('mentor', 'admin'),
  (_req: Request, res: Response) => {
    res.json({
      message: 'Welcome to the mentor area',
    });
  }
);

export default router;