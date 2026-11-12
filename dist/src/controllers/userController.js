"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const userService_1 = __importStar(require("../service/userService"));
// ---------- Helpers ----------
/** Safely read the message from anything thrown in a catch block. */
function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
/** Query values can be string | string[] | object; only accept plain strings. */
function queryString(value) {
    return typeof value === 'string' ? value : undefined;
}
const userController = {
    // ==========================================
    // 1. Create a new user and send login credentials
    // ==========================================
    async createUser(req, res) {
        try {
            // Body is already validated by Zod (createUserSchema)
            const result = await userService_1.default.createUser(req.body);
            res.status(201).json({
                success: true,
                message: result.message,
                data: result,
            });
        }
        catch (error) {
            console.error('Error creating user:', error);
            if (error instanceof userService_1.UserServiceError) {
                res.status(error.statusCode).json({ success: false, message: error.message });
                return;
            }
            const message = getErrorMessage(error);
            if (message === 'Name, email, and role are required' ||
                message === 'Invalid role' ||
                message === 'Invalid status' ||
                message === 'Assigned mentor not found') {
                res.status(400).json({ success: false, message });
                return;
            }
            if (message === 'A user with this email already exists') {
                res.status(409).json({ success: false, message });
                return;
            }
            if (message.startsWith('Failed to send login credentials email')) {
                res.status(502).json({ success: false, message });
                return;
            }
            res.status(500).json({
                success: false,
                message: message || 'Failed to create user.',
            });
        }
    },
    // ==========================================
    // 2. Get all users with optional filters
    // Query is validated by Zod (getAllUsersSchema)
    // ==========================================
    async getAllUsers(req, res) {
        try {
            const q = req.validatedQuery ?? req.query;
            const filters = {
                id: queryString(q.id),
                email: queryString(q.email),
                role: queryString(q.role),
                status: queryString(q.status),
                name: queryString(q.name),
                assigned_to: queryString(q.assigned_to),
                mentor_id: queryString(q.mentor_id),
                mentorScope: req.user?.role === 'mentor'
                    ? {
                        id: req.user.id,
                        name: req.user.name,
                        assignedMentees: req.user.assignedMentees,
                    }
                    : undefined,
            };
            const users = await userService_1.default.filterUsers(filters);
            res.status(200).json({
                success: true,
                count: users.length,
                data: users,
            });
        }
        catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch users.',
            });
        }
    },
    // ==========================================
    // 3. Get current authenticated user profile
    // ==========================================
    async getMe(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required.',
                });
                return;
            }
            const profile = await userService_1.default.getUserById(req.user.id);
            res.status(200).json({
                success: true,
                user: profile,
            });
        }
        catch (error) {
            console.error('Error fetching current user profile:', error);
            const message = getErrorMessage(error);
            if (message === 'User not found') {
                res.status(401).json({ success: false, message });
                return;
            }
            res.status(500).json({
                success: false,
                message: 'Failed to fetch profile.',
            });
        }
    },
    // ==========================================
    // 5. Update user details
    // ==========================================
    async updateUser(req, res) {
        try {
            // id and body are already validated by Zod (updateUserSchema)
            const user = await userService_1.default.updateUser(req.params.id, req.body);
            res.status(200).json({
                success: true,
                message: 'User updated successfully.',
                data: user,
            });
        }
        catch (error) {
            console.error('Error updating user:', error);
            if (error instanceof userService_1.UserServiceError) {
                res.status(error.statusCode).json({ success: false, message: error.message });
                return;
            }
            const message = getErrorMessage(error);
            if (message === 'User not found') {
                res.status(404).json({ success: false, message });
                return;
            }
            if (message === 'A user with this email already exists') {
                res.status(409).json({ success: false, message });
                return;
            }
            if (message === 'Invalid role' ||
                message === 'Invalid status' ||
                message === 'Name cannot be empty' ||
                message === 'Email cannot be empty' ||
                message === 'Assigned mentor not found' ||
                message === 'Password must be at least 8 characters') {
                res.status(400).json({ success: false, message });
                return;
            }
            res.status(500).json({
                success: false,
                message: 'Failed to update user.',
            });
        }
    },
    // ==========================================
    // 5b. Assign, change, or remove a mentor for a mentee (Admin only)
    // ==========================================
    async assignMentor(req, res) {
        try {
            const result = await userService_1.default.assignMentorToMentee(req.params.id, req.body.mentor_id ?? null);
            res.status(200).json({
                success: true,
                action: result.action,
                message: result.message,
                data: result.user,
            });
        }
        catch (error) {
            console.error('Error assigning mentor:', error);
            if (error instanceof userService_1.UserServiceError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
                return;
            }
            res.status(500).json({
                success: false,
                message: 'Failed to update mentor assignment.',
            });
        }
    },
    // ==========================================
    // 6. User login
    // ==========================================
    async login(req, res) {
        try {
            // email and password are guaranteed strings by Zod (loginSchema)
            const { email, password } = req.body;
            const result = await userService_1.default.login(email, password);
            res.status(200).json({
                success: true,
                message: result.message,
                token: result.token,
                user: result.user,
                redirectTo: result.redirectTo,
            });
        }
        catch (error) {
            console.error('Error logging in:', error);
            const message = getErrorMessage(error);
            if (message === 'Invalid email or password') {
                res.status(401).json({ success: false, message });
                return;
            }
            if (message.includes('inactive')) {
                res.status(403).json({ success: false, message });
                return;
            }
            if (message === 'JWT_SECRET is not configured') {
                res.status(500).json({
                    success: false,
                    message: 'Server authentication configuration is missing.',
                });
                return;
            }
            res.status(500).json({
                success: false,
                message: 'Failed to log in.',
            });
        }
    },
    // ==========================================
    // 7. Change user password (authenticated user)
    // ==========================================
    async changePassword(req, res) {
        try {
            const { newPassword } = req.body;
            if (!newPassword) {
                res.status(400).json({
                    success: false,
                    message: 'New password is required',
                });
                return;
            }
            if (newPassword.length < 8 || newPassword.length > 72) {
                res.status(400).json({
                    success: false,
                    message: 'New password must be between 8 and 72 characters',
                });
                return;
            }
            // Get authenticated user's ID
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Not authenticated',
                });
                return;
            }
            // Call service to verify and update password
            const result = await userService_1.default.changePassword(userId, newPassword);
            res.status(200).json({
                success: true,
                message: result.message,
                token: result.token,
                user: result.user,
            });
        }
        catch (error) {
            console.error('Error changing password:', error);
            const message = getErrorMessage(error);
            if (message === 'New password cannot be the same as the old password') {
                res.status(400).json({
                    success: false,
                    message,
                });
                return;
            }
            if (message === 'User not found') {
                res.status(404).json({
                    success: false,
                    message,
                });
                return;
            }
            res.status(500).json({
                success: false,
                message: 'Failed to change password',
            });
        }
    },
    // ==========================================
    // 8. Delete user
    // ==========================================
    async deleteUser(req, res) {
        try {
            // id is already validated by Zod (getUserSchema)
            const actor = req.user
                ? {
                    id: req.user.id,
                    name: req.user.name,
                    role: req.user.role,
                    assignedMentees: req.user.assignedMentees,
                }
                : undefined;
            const result = await userService_1.default.deleteUser(req.params.id, actor);
            res.status(200).json({
                success: true,
                message: result.message,
                deletedTasksCount: result.deletedTasksCount,
            });
        }
        catch (error) {
            console.error('Error deleting user:', error);
            const message = getErrorMessage(error);
            if (message === 'User not found') {
                res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
                return;
            }
            if (message.startsWith('FORBIDDEN:')) {
                res.status(403).json({
                    success: false,
                    message: message.replace(/^FORBIDDEN:/, ''),
                });
                return;
            }
            if (message === 'You cannot delete your own account') {
                res.status(400).json({
                    success: false,
                    message,
                });
                return;
            }
            if (message.startsWith('Cannot delete user with existing assigned tasks')) {
                res.status(409).json({
                    success: false,
                    message,
                });
                return;
            }
            res.status(500).json({
                success: false,
                message: 'Failed to delete user.',
            });
        }
    },
    // ==========================================
    // 9. Complete first login
    // ==========================================
    async completeFirstLogin(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Not authenticated' });
                return;
            }
            const targetId = Number(req.params.id);
            if (req.user.id !== targetId && req.user.role !== 'admin') {
                res.status(403).json({
                    success: false,
                    message: 'You can only complete first login for your own account.',
                });
                return;
            }
            // id is already validated by Zod (getUserSchema)
            const result = await userService_1.default.completeFirstLogin(req.params.id);
            res.status(200).json({
                success: true,
                message: result.message,
            });
        }
        catch (error) {
            console.error('Error completing first login:', error);
            const message = getErrorMessage(error);
            if (message === 'User not found') {
                res.status(404).json({ success: false, message });
                return;
            }
            res.status(500).json({
                success: false,
                message: 'Failed to complete first login',
            });
        }
    },
};
exports.default = userController;
//# sourceMappingURL=userController.js.map