const express = require('express');
const router = express.Router();

const { login } = require('../controller/authController');

const {authenticate, authorize} = require('../middleware/authMiddleware');

router.post('/login', login);

router.get('/me', authenticate, (req, res) => {
    res.status(200).json({
        message: 'Authenticated successfully',
        user: req.user
    });
});

// Example: only mentors and admins can access this route
router.get('/mentor-area', authenticate, authorize('mentor', 'admin'), 
        (req, res) => {
        res.json({
            message: 'Welcome to the mentor area'
        });
    }
);



module.exports = router;
