const userService = require('../service/userService');
const { sendLoginCredentials } = require("../service/emailService");

// latest code

const userController = {

    // Create a new user
    async createUser(req, res) {
        try {
            const user = await userService.createUser(req.body);

            return res.status(201).json({
                success: true,
                message: 'User created successfully',
                data: user
            });
        } catch (error) {
            console.error('Error creating user:', error);

            if (error.message === 'A user with this email already exists') {
                return res.status(409).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to create user'
            });
        }
    },

    // Get all users
    async getAllUsers(req, res) {
        try {
            const users = await userService.filterUsers(req.query);

            return res.status(200).json({
                success: true,
                count: users.length,
                data: users
            });
        } catch (error) {
            console.error('Error fetching users:', error);

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch users'
            });
        }
    },

    // Update user details

    async updateUser(req, res) {
        try {
            const user = await userService.updateUser(
                req.params.id,
                req.body
            );

            return res.status(200).json({
                success: true,
                message: 'User updated successfully',
                data: user
            });
        } catch (error) {
            console.error('Error updating user:', error);

            if (error.message === 'User not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            if (error.message === 'A user with this email already exists') {
                return res.status(409).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to update user'
            });
        }
    },

    // Delete user

    async deleteUser(req, res) {
        try {
            const result = await userService.deleteUser(req.params.id);

            return res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            console.error('Error deleting user:', error);

            if (error.message === 'User not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to delete user'
            });
        }
    },

    // Complete first login

    async completeFirstLogin(req, res) {
        try {
            const result = await userService.completeFirstLogin(
                req.params.id
            );

            return res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            console.error('Error completing first login:', error);

            if (error.message === 'User not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to complete first login'
            });
        }
    },

    // User login & JWT generation
    async login(req, res) {
        try {
            const { email, password } = req.body;
            const result = await userService.login(email, password);

            return res.status(200).json({
                success: true,
                message: result.message,
                token: result.token,
                user: result.user,
                redirectTo: result.redirectTo
            });
        } catch (error) {
            console.error('Error logging in:', error);

            if (
                error.message === 'Invalid email or password' ||
                error.message === 'Email and password are required'
            ) {
                return res.status(401).json({
                    success: false,
                    message: error.message
                });
            }

            if (error.message.includes('inactive')) {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to log in'
            });
        }
    },

    // Change user password
    async changePassword(req, res) {
        try {
            const { newPassword } = req.body;
            const userId = req.params.id || req.user?.id;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID is required'
                });
            }

            if (!newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'New password is required'
                });
            }

            const result = await userService.changePassword(
                userId,
                newPassword
            );

            return res.status(200).json({
                success: true,
                message: result.message,
                firstLogin: result.firstLogin
            });
        } catch (error) {
            console.error('Error changing password:', error);

            if (error.message === 'User not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            if (error.message === 'New password cannot be the same as the old password') {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to change password'
            });
        }
    },
};

module.exports = userController;



// // Get users by role
// async getUsersByRole(req, res) {
//     try {
//         const users = await userService.getUsersByRole(
//             req.params.role
//         );

//         return res.status(200).json({
//             success: true,
//             count: users.length,
//             data: users
//         });
//     } catch (error) {
//         console.error('Error fetching users by role:', error);

//         if (error.message.includes('Invalid role')) {
//             return res.status(400).json({
//                 success: false,
//                 message: error.message
//             });
//         }

//         return res.status(500).json({
//             success: false,
//             message: 'Failed to fetch users by role'
//         });
//     }
// },

// // Get users by status
// async getUsersByStatus(req, res) {
//     try {
//         const users = await userService.getUsersByStatus(
//             req.params.status
//         );

//         return res.status(200).json({
//             success: true,
//             count: users.length,
//             data: users
//         });
//     } catch (error) {
//         console.error('Error fetching users by status:', error);

//         if (error.message.includes('Invalid status')) {
//             return res.status(400).json({
//                 success: false,
//                 message: error.message
//             });
//         }

//         return res.status(500).json({
//             success: false,
//             message: 'Failed to fetch users by status'
//         });
//     }
// }

// // Get user by ID
// async getUserById(req, res) {
//     try {
//         const user = await userService.getUserById(req.params.id);

//         return res.status(200).json({
//             success: true,
//             data: user
//         });
//     } catch (error) {
//         console.error('Error fetching user:', error);

//         if (error.message === 'User not found') {
//             return res.status(404).json({
//                 success: false,
//                 message: error.message
//             });
//         }

//         return res.status(500).json({
//             success: false,
//             message: 'Failed to fetch user'
//         });
//     }
// },

// // Get user by email
// async getUserByEmail(req, res) {
//     try {
//         const user = await userService.getUserByEmail(req.params.email);

//         return res.status(200).json({
//             success: true,
//             data: user
//         });
//     } catch (error) {
//         console.error('Error fetching user by email:', error);

//         if (error.message === 'User not found') {
//             return res.status(404).json({
//                 success: false,
//                 message: error.message
//             });
//         }

//         return res.status(500).json({
//             success: false,
//             message: 'Failed to fetch user'
//         });
//     }
// },