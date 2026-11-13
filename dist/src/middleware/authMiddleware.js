"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = exports.authenticate = exports.signToken = exports.generateToken = void 0;
exports.generateAccessToken = generateAccessToken;
exports.verifyToken = verifyToken;
exports.authorize = authorize;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
require("dotenv/config");
const user_1 = __importDefault(require("../models/user"));
const jwtSecretEnv = process.env.JWT_SECRET?.trim();
if (!jwtSecretEnv) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set.');
}
const JWT_SECRET = jwtSecretEnv;
// Access tokens are now short-lived. Refresh tokens (see service/tokenService.ts)
// are what keep the user logged in.
// Falls back to the old JWT_EXPIRES_IN name only if it is set to something short;
// otherwise default to 15 minutes. Make sure your .env no longer says 24h.
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '15m';
/**
 * Sign a short-lived ACCESS token for a user.
 */
function generateAccessToken(payload, options = {}) {
    const data = {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        firstLogin: payload.firstLogin,
    };
    return jsonwebtoken_1.default.sign(data, JWT_SECRET, {
        expiresIn: options.expiresIn || ACCESS_TOKEN_EXPIRES_IN,
    });
}
/**
 * Express middleware to verify incoming ACCESS token
 * Expects 'Authorization: Bearer <token>' header
 *
 * On expiry it responds 401 with code 'TOKEN_EXPIRED' so the frontend
 * knows to call the refresh endpoint instead of logging the user out.
 */
async function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({
                success: false,
                code: 'NO_TOKEN',
                message: 'Access denied. No authorization header provided.',
            });
            return;
        }
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            res.status(401).json({
                success: false,
                code: 'INVALID_TOKEN',
                message: "Invalid token format. Format must be 'Bearer <token>'.",
            });
            return;
        }
        const token = parts[1];
        let decoded;
        try {
            const result = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            if (typeof result === 'string') {
                res.status(401).json({
                    success: false,
                    code: 'INVALID_TOKEN',
                    message: 'Invalid token. Authentication failed.',
                });
                return;
            }
            decoded = result;
        }
        catch (err) {
            if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
                res.status(401).json({
                    success: false,
                    code: 'TOKEN_EXPIRED',
                    message: 'Access token has expired.',
                });
                return;
            }
            res.status(401).json({
                success: false,
                code: 'INVALID_TOKEN',
                message: 'Invalid token. Authentication failed.',
            });
            return;
        }
        // Verify user still exists in database and is active
        const user = await user_1.default.findByPk(decoded.id, {
            attributes: { exclude: ['password'] },
        });
        if (!user) {
            res.status(401).json({
                success: false,
                code: 'USER_NOT_FOUND',
                message: 'User associated with this token no longer exists.',
            });
            return;
        }
        if (user.status !== 'active') {
            res.status(401).json({
                success: false,
                code: 'ACCOUNT_DEACTIVATED',
                message: 'Account is deactivated. Please contact an administrator.',
            });
            return;
        }
        // Attach user payload to request
        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            firstLogin: user.firstLogin,
            mentor_id: user.mentor_id ?? null,
            assigned_to: user.assigned_to ?? null,
            assignedMentees: Array.isArray(user.assignedMentees)
                ? user.assignedMentees
                    .map(Number)
                    .filter((id) => Number.isInteger(id) && id > 0)
                : [],
        };
        req.currentUser = user;
        next();
    }
    catch (error) {
        console.error('JWT verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication server error.',
        });
    }
}
/**
 * Allow only users with one of the given roles.
 * Must run after verifyToken (which sets req.user).
 */
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required.',
            });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: 'You do not have permission to access this resource.',
            });
            return;
        }
        next();
    };
}
// Aliases so existing code (routes, userService) keeps working unchanged
exports.generateToken = generateAccessToken;
exports.signToken = generateAccessToken;
exports.authenticate = verifyToken;
exports.authenticateToken = verifyToken;
//# sourceMappingURL=authMiddleware.js.map