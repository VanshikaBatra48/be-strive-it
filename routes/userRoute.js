const express = require('express');
const router = express.Router();

const userController = require('../controller/userController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkFirstLogin } = require('../middleware/firstLoginCheckMiddleware');

// User Login (generates & returns JWT)
router.post('/users/login', userController.login);

// Create a user
router.post('/users',  userController.createUser);

// Get all users and filtration 
router.get('/users',verifyToken, checkFirstLogin, userController.getAllUsers);

// Update user
router.patch('/users/update/:id',verifyToken, checkFirstLogin, userController.updateUser);

// Delete user
router.delete('/users/delete/:id', verifyToken, checkFirstLogin,userController.deleteUser);

// Complete first login
router.patch('/users/:id/complete-first-login', userController.completeFirstLogin);

// Change password (supports both /users/:id/password and authenticated /users/change-password)

router.patch('/users/change-password', verifyToken, userController.changePassword);


// Current user profile (demonstrates verifyToken + checkFirstLogin)
router.get('/users/me', verifyToken, checkFirstLogin, (req, res) => {
    return res.status(200).json({
        success: true,
        user: req.user
    });
}); 

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
