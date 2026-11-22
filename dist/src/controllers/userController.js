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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePassword = void 0;
const userService_1 = __importStar(require("../service/userService"));
const user_1 = __importDefault(require("../models/user"));
const refreshToken_1 = __importDefault(require("../models/refreshToken"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const timeLogService_1 = require("../service/timeLogService");
const tokenService_1 = require("../service/tokenService");
const bcrypt_1 = __importDefault(require("bcrypt"));
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
            // If the account was deactivated, kill its sessions immediately
            // (the access token will also be rejected by verifyToken's status check)
            if (req.body.status && req.body.status !== 'active') {
                await (0, tokenService_1.revokeAllForUser)(Number(req.params.id));
            }
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
    // 6. User login -> access token (JSON) + refresh token (httpOnly cookie)
    // ==========================================
    async login(req, res) {
        try {
            // email and password are guaranteed strings by Zod (loginSchema)
            const { email, password } = req.body;
            // userService.login signs result.token via generateToken(), which is
            // now the short-lived access token.
            const result = await userService_1.default.login(email, password);
            const refreshToken = await (0, tokenService_1.createRefreshToken)(Number(result.user.id));
            (0, tokenService_1.setRefreshCookie)(res, refreshToken, result.user.id);
            res.status(200).json({
                success: true,
                message: result.message,
                accessToken: result.token,
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
    // 6b. Refresh: rotate refresh token, return a new access token
    // Public route (no verifyToken) - it authenticates via the cookie.
    // ==========================================
    async refresh(req, res) {
        try {
            // The frontend sends the userId in the body so we know which
            // per-user cookie to read (cookies are shared across tabs).
            const requestedUserId = req.body?.userId ? Number(req.body.userId) : undefined;
            // Look for a per-user cookie first; fall back to the legacy
            // shared cookie name for backwards compatibility.
            let rawToken;
            if (requestedUserId) {
                rawToken = req.cookies?.[(0, tokenService_1.refreshCookieName)(requestedUserId)];
            }
            // Fallback: try every refreshToken_* cookie present
            if (!rawToken && req.cookies) {
                for (const name of Object.keys(req.cookies)) {
                    if (name.startsWith(`${tokenService_1.REFRESH_COOKIE_BASE}_`)) {
                        rawToken = req.cookies[name];
                        break;
                    }
                }
            }
            if (!rawToken) {
                res.status(401).json({
                    success: false,
                    code: 'NO_REFRESH_TOKEN',
                    message: 'No refresh token provided.',
                });
                return;
            }
            const { userId, newToken } = await (0, tokenService_1.rotateRefreshToken)(rawToken);
            const user = await user_1.default.findByPk(userId, {
                attributes: { exclude: ['password'] },
            });
            if (!user || user.status !== 'active') {
                await (0, tokenService_1.revokeAllForUser)(userId);
                (0, tokenService_1.clearRefreshCookie)(res, userId);
                res.status(401).json({
                    success: false,
                    code: 'ACCOUNT_UNAVAILABLE',
                    message: 'Account no longer exists or is deactivated.',
                });
                return;
            }
            if (newToken) {
                (0, tokenService_1.setRefreshCookie)(res, newToken, userId);
            }
            const accessToken = (0, authMiddleware_1.generateAccessToken)({
                id: user.id,
                email: user.email,
                role: user.role,
                firstLogin: user.firstLogin,
            });
            const profile = await userService_1.default.getUserById(user.id);
            res.status(200).json({
                success: true,
                accessToken,
                user: profile,
            });
        }
        catch (error) {
            // We can't clear a specific cookie here because we don't know
            // which userId to target — clear all refresh cookies.
            (0, tokenService_1.clearAllRefreshCookies)(req, res);
            if (error instanceof tokenService_1.RefreshTokenError) {
                res.status(401).json({
                    success: false,
                    code: 'INVALID_REFRESH_TOKEN',
                    message: error.message,
                });
                return;
            }
            console.error('Error refreshing token:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to refresh session.',
            });
        }
    },
    // ==========================================
    // 6c. Logout (this device). Works even if the access token has expired.
    // ==========================================
    async logout(req, res) {
        try {
            // The frontend sends userId so we know which per-user cookie to clear.
            const requestedUserId = req.body?.userId ? Number(req.body.userId) : undefined;
            // Find the matching refresh cookie
            let rawToken;
            if (requestedUserId) {
                rawToken = req.cookies?.[(0, tokenService_1.refreshCookieName)(requestedUserId)];
            }
            // Fallback: search all refreshToken_* cookies
            if (!rawToken && req.cookies) {
                for (const name of Object.keys(req.cookies)) {
                    if (name.startsWith(`${tokenService_1.REFRESH_COOKIE_BASE}_`)) {
                        rawToken = req.cookies[name];
                        break;
                    }
                }
            }
            let targetUserId = requestedUserId;
            if (!targetUserId && rawToken) {
                const rt = await refreshToken_1.default.findOne({
                    where: { tokenHash: (0, tokenService_1.hashToken)(rawToken) },
                });
                if (rt?.userId) {
                    targetUserId = rt.userId;
                }
            }
            // If user is authenticated on the request
            if (!targetUserId && req.user?.id) {
                targetUserId = Number(req.user.id);
            }
            // Stop any running timer for this user upon logout
            if (targetUserId) {
                await (0, timeLogService_1.closeActiveLogForUser)(targetUserId).catch((err) => {
                    console.error('Failed to close active timer on logout:', err);
                });
            }
            if (rawToken) {
                await (0, tokenService_1.revokeRefreshToken)(rawToken);
            }
            // Clear only this user's cookie (not others)
            if (requestedUserId) {
                (0, tokenService_1.clearRefreshCookie)(res, requestedUserId);
            }
            else {
                // No userId? Clear all refresh cookies as a safety net.
                (0, tokenService_1.clearAllRefreshCookies)(req, res);
            }
            res.status(200).json({ success: true, message: 'Logged out successfully.' });
        }
        catch (error) {
            console.error('Error logging out:', error);
            (0, tokenService_1.clearAllRefreshCookies)(req, res);
            res.status(500).json({ success: false, message: 'Failed to log out.' });
        }
    },
    // ==========================================
    // 6d. Logout from all devices (authenticated)
    // ==========================================
    async logoutAll(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required.' });
                return;
            }
            await (0, timeLogService_1.closeActiveLogForUser)(req.user.id).catch((err) => {
                console.error('Failed to close active timer on logoutAll:', err);
            });
            await (0, tokenService_1.revokeAllForUser)(req.user.id);
            (0, tokenService_1.clearAllRefreshCookies)(req, res);
            res.status(200).json({ success: true, message: 'Logged out from all devices.' });
        }
        catch (error) {
            console.error('Error logging out everywhere:', error);
            res.status(500).json({ success: false, message: 'Failed to log out.' });
        }
    },
    // ==========================================
    // 7. Change user password (authenticated user)
    // Revokes every existing session, then starts a fresh one for this device.
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
            // Invalidate all old sessions (other devices), then issue a new one here
            await (0, tokenService_1.revokeAllForUser)(userId);
            const refreshToken = await (0, tokenService_1.createRefreshToken)(userId);
            (0, tokenService_1.setRefreshCookie)(res, refreshToken, userId);
            res.status(200).json({
                success: true,
                message: result.message,
                accessToken: result.token,
                user: result.user,
            });
        }
        catch (error) {
            console.error('Error changing password:', error);
            if (error instanceof userService_1.UserServiceError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
                return;
            }
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
            await (0, tokenService_1.revokeAllForUser)(Number(req.params.id));
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
    // async completeFirstLogin(
    //   req: Request<{ id: string }>,
    //   res: Response
    // ): Promise<void> {
    //   try {
    //     if (!req.user) {
    //       res.status(401).json({ success: false, message: 'Not authenticated' });
    //       return;
    //     }
    //     const targetId = Number(req.params.id);
    //     if (req.user.id !== targetId && req.user.role !== 'admin') {
    //       res.status(403).json({
    //         success: false,
    //         message: 'You can only complete first login for your own account.',
    //       });
    //       return;
    //     }
    //     // id is already validated by Zod (getUserSchema)
    //     const result = await userService.completeFirstLogin(req.params.id);
    //     res.status(200).json({
    //       success: true,
    //       message: result.message,
    //     });
    //   } catch (error) {
    //     console.error('Error completing first login:', error);
    //     const message = getErrorMessage(error);
    //     if (message === 'User not found') {
    //       res.status(404).json({ success: false, message });
    //       return;
    //     }
    //     res.status(500).json({
    //       success: false,
    //       message: 'Failed to complete first login',
    //     });
    //   }
    // },
};
const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }
        if (newPassword.length < 8 || newPassword.length > 72) {
            return res.status(400).json({ success: false, message: "New password must be between 8 and 72 characters" });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: "New password and confirm password do not match" });
        }
        if (newPassword === currentPassword) {
            return res.status(400).json({ success: false, message: "New password must be different from the current password" });
        }
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }
        const user = await user_1.default.findByPk(userId, {
            attributes: { include: ["password"] }, // same pattern as userService
        });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const isMatch = await bcrypt_1.default.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Current password is incorrect" });
        }
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 12); // same rounds as BCRYPT_ROUNDS
        await user.update({ password: hashedPassword });
        // Log out other devices, keep this one signed in
        await (0, tokenService_1.revokeAllForUser)(userId);
        const refreshToken = await (0, tokenService_1.createRefreshToken)(userId);
        (0, tokenService_1.setRefreshCookie)(res, refreshToken, userId);
        return res.json({ success: true, message: "Password changed successfully" });
    }
    catch (error) {
        console.error("updatePassword error:", error);
        return res.status(500).json({ success: false, message: "Failed to change password" });
    }
};
exports.updatePassword = updatePassword;
exports.default = userController;
//# sourceMappingURL=userController.js.map