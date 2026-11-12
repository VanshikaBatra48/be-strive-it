"use strict";
// // Alias for backwards compatibility
// export const requirePasswordChangeIfFirstLogin = checkFirstLogin;
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePasswordChangeIfFirstLogin = exports.checkFirstLogin = void 0;
const user_1 = __importDefault(require("../models/user"));
/**
 * Middleware to check whether the authenticated user
 * has firstLogin set to true.
 *
 * If true, the user must change their password.
 * Otherwise, the request continues.
 */
const checkFirstLogin = async (req, res, next) => {
    try {
        // Use the already-loaded user if available.
        let user = req.currentUser ?? null;
        // If the user is not loaded, fetch them using the authenticated user ID.
        if (!user) {
            const userId = req.user?.id;
            if (typeof userId !== 'string' &&
                typeof userId !== 'number') {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required. Please provide a valid token.',
                });
                return;
            }
            user = await user_1.default.findByPk(userId);
        }
        // Check whether the user exists.
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found.',
            });
            return;
        }
        // Store the fetched user in the request.
        req.currentUser = user;
        // Check whether the user is logging in for the first time.
        if (user.firstLogin === true) {
            // For normal browser navigation requests.
            if (req.accepts('html') && !req.accepts('json') && !req.xhr) {
                res.redirect('/changePassword');
                return;
            }
            // For API, AJAX, and Fetch requests.
            res.status(403).json({
                success: false,
                code: 'FIRST_LOGIN_PASSWORD_CHANGE_REQUIRED',
                firstLogin: true,
                redirectTo: '/changePassword',
                message: 'First login detected. Please change your password to continue.',
            });
            return;
        }
        // If firstLogin is false, allow the request.
        next();
    }
    catch (error) {
        console.error('First login check middleware error:', error);
        next(error);
    }
};
exports.checkFirstLogin = checkFirstLogin;
// Alias for backward compatibility.
exports.requirePasswordChangeIfFirstLogin = exports.checkFirstLogin;
//# sourceMappingURL=firstLoginCheckMiddleware.js.map