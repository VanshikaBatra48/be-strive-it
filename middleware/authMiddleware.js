const jwt = require("jsonwebtoken");
const User = require("../models/user");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_key_change_in_production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

/**
 * Sign/Generate a new JWT token for a user
 * @param {Object} payload - User data payload (id, email, role, firstLogin, etc.)
 * @param {Object} [options] - Optional JWT signing options (e.g. expiresIn)
 * @returns {string} Signed JWT token
 */
function generateToken(payload, options = {}) {
    const data = {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        firstLogin: payload.firstLogin
    };

    return jwt.sign(data, JWT_SECRET, {
        expiresIn: options.expiresIn || JWT_EXPIRES_IN
    });
}

/**
 * Express middleware to verify incoming JWT token
 * Expects 'Authorization: Bearer <token>' header
 */
async function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No authorization header provided."
            });
        }

        const parts = authHeader.split(" ");
        if (parts.length !== 2 || parts[0] !== "Bearer") {
            return res.status(401).json({
                success: false,
                message: "Invalid token format. Format must be 'Bearer <token>'."
            });
        }

        const token = parts[1];

        jwt.verify(token, JWT_SECRET, async (err, decoded) => {
            if (err) {
                if (err.name === "TokenExpiredError") {
                    return res.status(401).json({
                        success: false,
                        message: "Token has expired. Please log in again."
                    });
                }

                return res.status(403).json({
                    success: false,
                    message: "Invalid token. Authentication failed."
                });
            }

            // Verify user still exists in database
            const user = await User.findByPk(decoded.id, {
                attributes: { exclude: ["password"] }
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User associated with this token no longer exists."
                });
            }

            // Attach user payload to request
            req.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                firstLogin: user.firstLogin
            };
            req.currentUser = user;

            next();
        });
    } catch (error) {
        console.error("JWT verification error:", error);
        return res.status(500).json({
            success: false,
            message: "Authentication server error."
        });
    }
}

module.exports = {
    generateToken,
    signToken: generateToken, // Alias for convenience
    verifyToken,
    authenticateToken: verifyToken // Alias for convenience
};
 