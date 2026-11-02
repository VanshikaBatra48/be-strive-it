import { Router, type Request, type Response } from 'express';

import userController from '../controllers/userController';
import { verifyToken } from '../middleware/authMiddleware';
import { checkFirstLogin } from '../middleware/firstLoginCheckMiddleware';

const router = Router();

// User Login (generates & returns JWT)
router.post('/users/login', userController.login);

// Current user profile (verifyToken returns current user info including firstLogin)
router.get('/users/me', verifyToken, (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
});

router.patch('/users/:id/complete-first-login', userController.completeFirstLogin);

// Change password (supports authenticated /users/change-password)
router.patch('/users/changepassword', verifyToken, userController.changePassword);

// Create a user
router.post('/users', verifyToken, checkFirstLogin, userController.createUser);

// Get all users and filtration
router.get('/users', verifyToken, checkFirstLogin, userController.getAllUsers);

// Update user (supports both /users/update/:id and /users/:id)
router.patch('/users/update/:id', verifyToken, checkFirstLogin, userController.updateUser);

// Delete user (supports both /users/delete/:id and /users/:id)
router.delete('/users/delete/:id', verifyToken, checkFirstLogin, userController.deleteUser);

export default router;