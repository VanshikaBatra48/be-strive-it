const express = require('express');
const router = express.Router();

const userController = require('../controller/userController');

// Create a user
router.post('/users', userController.createUser);

// Get all users
router.get('/users', userController.getAllUsers);

// Get users by role
router.get('/users/role/:role', userController.getUsersByRole);

// Get users by status
router.get('/users/status/:status', userController.getUsersByStatus);

// Get user by email
router.get('/users/email/:email', userController.getUserByEmail);

// Complete first login
router.patch('/users/:id/complete-first-login', userController.completeFirstLogin);

// Change password
router.patch('/users/:id/password', userController.changePassword);

// Get user by ID
router.get('/users/:id', userController.getUserById);

// Update user
router.patch('/users/:id', userController.updateUser);

// Delete user
router.delete('/users/:id', userController.deleteUser);

const {
    createUserController
} = require('../controller/userController');

const {
    login
} = require('../controller/authController');

const {
    changePassword
} = require('../controller/passwordController');

// // Create a mentor or mentee
// router.post('/users', createUserController);

// Login
router.post('/login', login);

// Change initial password
router.post('/change-password', changePassword);

module.exports = router;