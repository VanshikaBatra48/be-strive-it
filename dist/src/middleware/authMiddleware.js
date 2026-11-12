"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = exports.signToken = exports.authenticate = void 0;
exports.generateToken = generateToken;
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
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
/**
 * Sign/Generate a new JWT token for a user
 * @param payload - User data (id, email, role, firstLogin, etc.)
 * @param options - Optional JWT signing options (e.g. expiresIn)
 * @returns Signed JWT token
 */
function generateToken(payload, options = {}) {
    const data = {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        firstLogin: payload.firstLogin,
    };
    return jsonwebtoken_1.default.sign(data, JWT_SECRET, {
        expiresIn: options.expiresIn || JWT_EXPIRES_IN,
    });
}
/**
 * Express middleware to verify incoming JWT token
 * Expects 'Authorization: Bearer <token>' header
 */
async function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({
                success: false,
                message: 'Access denied. No authorization header provided.',
            });
            return;
        }
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            res.status(401).json({
                success: false,
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
                    message: 'Token has expired. Please log in again.',
                });
                return;
            }
            res.status(401).json({
                success: false,
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
                message: 'User associated with this token no longer exists.',
            });
            return;
        }
        if (user.status !== 'active') {
            res.status(401).json({
                success: false,
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
// Alias so existing route code can use "authenticate"
exports.authenticate = verifyToken;
exports.signToken = generateToken; // Alias for convenience
exports.authenticateToken = verifyToken; // Alias for convenience
//# sourceMappingURL=authMiddleware.js.map