"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = __importDefault(require("../controllers/userController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const firstLoginCheckMiddleware_1 = require("../middleware/firstLoginCheckMiddleware");
const validate_1 = require("../middleware/validate");
const userSchema_1 = require("../schemas/userSchema");
const router = (0, express_1.Router)();
// User Login (generates access token + sets httpOnly refresh cookie)
router.post('/users/login', (0, validate_1.validate)(userSchema_1.loginSchema), userController_1.default.login);
// Refresh access token using httpOnly refresh cookie (rotates refresh token)
router.post('/users/refresh', userController_1.default.refresh);
// Logout current device (revokes cookie refresh token & clears cookie)
router.post('/users/logout', userController_1.default.logout);
// Logout from all devices (authenticated)
router.post('/users/logout-all', authMiddleware_1.verifyToken, userController_1.default.logoutAll);
// Current user profile (accessible before first-login password change completes)
router.get('/users/me', authMiddleware_1.verifyToken, userController_1.default.getMe);
// Complete first login (authenticated user themselves or admin)
// router.patch(
//   '/users/:id/complete-first-login',
//   verifyToken,
//   validate(getUserSchema),
//   userController.completeFirstLogin
// );
// Change password (accessible before first-login gate completes)
router.patch('/users/changepassword', authMiddleware_1.verifyToken, (0, validate_1.validate)(userSchema_1.changePasswordSchema), userController_1.default.changePassword);
// Create a user (Admin only)
router.post('/users', authMiddleware_1.verifyToken, firstLoginCheckMiddleware_1.checkFirstLogin, (0, authMiddleware_1.authorize)('admin'), (0, validate_1.validate)(userSchema_1.createUserSchema), userController_1.default.createUser);
// Get all users and filtration (Admin & scoped Mentor only)
router.get('/users', authMiddleware_1.verifyToken, firstLoginCheckMiddleware_1.checkFirstLogin, (0, authMiddleware_1.authorize)('admin', 'mentor'), (0, validate_1.validate)(userSchema_1.getAllUsersSchema), userController_1.default.getAllUsers);
// Update user (Admin only)
router.patch('/users/update/:id', authMiddleware_1.verifyToken, firstLoginCheckMiddleware_1.checkFirstLogin, (0, authMiddleware_1.authorize)('admin'), (0, validate_1.validate)(userSchema_1.updateUserSchema), userController_1.default.updateUser);
// Assign, change, or remove a mentor for a mentee (Admin only)
router.patch('/users/:id/assign-mentor', authMiddleware_1.verifyToken, firstLoginCheckMiddleware_1.checkFirstLogin, (0, authMiddleware_1.authorize)('admin'), (0, validate_1.validate)(userSchema_1.assignMentorSchema), userController_1.default.assignMentor);
// Delete user (Admin only - Mentors are not permitted to delete mentees)
router.delete('/users/delete/:id', authMiddleware_1.verifyToken, firstLoginCheckMiddleware_1.checkFirstLogin, (0, authMiddleware_1.authorize)('admin'), (0, validate_1.validate)(userSchema_1.getUserSchema), userController_1.default.deleteUser);
exports.default = router;
//# sourceMappingURL=userRoute.js.map