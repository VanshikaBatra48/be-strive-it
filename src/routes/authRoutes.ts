import { Router } from 'express';
import type { Request, Response } from 'express';

import { login } from '../controllers/authController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

router.post('/login', login);

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