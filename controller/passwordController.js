const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const { createToken } = require('./authController');

async function changePassword(req, res) {
    try {
        const { newPassword } = req.body;

        if (
            typeof newPassword !== 'string' ||
            newPassword.length < 8
        ) {
            return res.status(400).json({
                message: 'Password must contain at least 8 characters.'
            });
        }

        const authorization = req.headers.authorization;

        if (!authorization || !authorization.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Authentication token is required.'
            });
        }

        const token = authorization.slice(7);

        let decoded;

        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            return res.status(401).json({
                message: 'Invalid or expired password-change token. Please log in again.'
            });
        }

        if (decoded.purpose !== 'change_password') {
            return res.status(403).json({
                message: 'This token cannot be used to change the initial password.'
            });
        }

        const user = await User.findByPk(decoded.id);

        if (!user || user.firstLogin !== true) {
            return res.status(400).json({
                message: 'Password change is not required or the account was not found.'
            });
        }

        const hashedPassword = await bcrypt.hash(
            newPassword,
            12
        );

        // Save the new password and complete first login.
        await user.update({
            password: hashedPassword,
            firstLogin: false
        });

        // Issue a normal access token after the password changes.
        const accessToken = createToken({
            id: user.id,
            role: user.role,
            purpose: 'access'
        });

        return res.status(200).json({
            message: 'Password changed successfully. You are now logged in.',
            firstLogin: false,
            accessToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Change password error:', error.message);

        return res.status(500).json({
            message: 'Unable to change password.'
        });
    }
}

module.exports = { changePassword };