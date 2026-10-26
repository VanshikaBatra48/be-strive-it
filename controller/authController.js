
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const  User  = require('../models/user');

// POST /api/auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validate request data
        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // 2. Find user by email
        const user = await User.findOne({
            where: {
                email: email.trim().toLowerCase()
            }
        });

        // 3. Check whether user exists
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // 4. Verify password against stored bcrypt hash
        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // 5. Ensure JWT secret is configured
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not configured');

            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }

        // 6. Generate access token
        const token = jwt.sign(
            {},
            process.env.JWT_SECRET,
            {
                subject: String(user.id),
                expiresIn: process.env.JWT_EXPIRES_IN || '9h'
            }
        );

        // 7. Return safe user information
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login controller error:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

module.exports = { login };
