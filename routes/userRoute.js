const express = require('express');
const router = express.Router();

const userController = require('../controller/userController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkFirstLogin } = require('../middleware/firstLoginCheckMiddleware');

// User Login (generates & returns JWT)
router.post('/users/login', userController.login);

// Current user profile (verifyToken returns current user info including firstLogin)
router.get('/users/me', verifyToken, (req, res) => {
    return res.status(200).json({
        success: true,
        user: req.user
    });
});


router.patch('/users/:id/complete-first-login', userController.completeFirstLogin);

// Change password (supports authenticated /users/change-password)
router.patch('/users/change-password', verifyToken, userController.changePassword);

// Create a user
router.post('/users', verifyToken, checkFirstLogin, userController.createUser);

// Get all users and filtration 
router.get('/users', verifyToken, checkFirstLogin, userController.getAllUsers);

// Update user (supports both /users/update/:id and /users/:id)
router.patch('/users/update/:id', verifyToken, checkFirstLogin, userController.updateUser);

// Delete user (supports both /users/delete/:id and /users/:id)
router.delete('/users/delete/:id', verifyToken, checkFirstLogin, userController.deleteUser);

module.exports = router;





// Get users by role
// router.get('/users/role/:role', userController.getUsersByRole);

// // Get users by status
// router.get('/users/status/:status', userController.getUsersByStatus);
// // 
// // Get user by email
// router.get('/users/email/:email', userController.getUserByEmail);

// Get user by ID
// router.get('/users/:id', userController.getUserById);
