const userService = require('../service/userService');
const { sendLoginCredentials } = require('../service/emailService');

const userController = {

async createUser(req, res) {
    let createdUser;

    try {
        // Create the user and generate a temporary password
        const result = await userService.createUser(req.body);

        const { user, temporaryPassword } = result;
        createdUser = user;

        // Send login credentials to the user's email
        await sendLoginCredentials(user, temporaryPassword);

        // Return success only after the email service succeeds
        return res.status(201).json({
            success: true,
            message: 'User created and login credentials emailed successfully.',
            data: user
        });

    } catch (error) {
        console.error('Error creating user or sending email:', error);

        if (error.message === 'A user with this email already exists') {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }

        if (error.message === 'Name, email, and role are required') {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        // The user may already exist in the database.
        if (createdUser) {
            return res.status(502).json({
                success: false,
                message: 'User created, but the login email could not be sent.',
                userCreated: true,
                userId: createdUser.id
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to create user.'
        });
    }
},


// // Create a new user and send login credentials
// async createUser(req, res) {
//     try {
//         const user = await userService.createUser(req.body);

//         return res.status(201).json({
//             success: true,
//             message: 'User created successfully. Login credentials have been sent to the registered email.',
//             data: user
//         });

//     } catch (error) {
//         console.error('Error creating user:', error.message);

//         if (error.message === 'A user with this email already exists') {
//             return res.status(409).json({
//                 success: false,
//                 message: error.message
//             });
//         }

//         if (error.message === 'User created, but the login email could not be sent') {
//             return res.status(502).json({
//                 success: false,
//                 message: error.message,
//                 userCreated: true
//             });
//         }

//         if (
//             error.message === 'Name, email, and role are required' ||
//             error.message === 'Invalid role'
//         ) {
//             return res.status(400).json({
//                 success: false,
//                 message: error.message
//             });
//         }

//         return res.status(500).json({
//             success: false,
//             message: 'Failed to create user'
//         });
//     }
// },
    // Get all users
    async getAllUsers(req, res) {
        try {
            const users = await userService.getAllUsers();

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

    // Get user by ID
    async getUserById(req, res) {
        try {
            const user = await userService.getUserById(req.params.id);

            return res.status(200).json({
                success: true,
                data: user
            });
        } catch (error) {
            console.error('Error fetching user:', error);

            if (error.message === 'User not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch user'
            });
        }
    },

    // Get user by email
    async getUserByEmail(req, res) {
        try {
            const user = await userService.getUserByEmail(req.params.email);

            return res.status(200).json({
                success: true,
                data: user
            });
        } catch (error) {
            console.error('Error fetching user by email:', error);

            if (error.message === 'User not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch user'
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

    // Change user password
    async changePassword(req, res) {
        try {
            const { newPassword } = req.body;

            if (!newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'New password is required'
                });
            }

            const result = await userService.changePassword(
                req.params.id,
                newPassword
            );

            return res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            console.error('Error changing password:', error);

            if (error.message === 'User not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to change password'
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

    // Get users by role
    async getUsersByRole(req, res) {
        try {
            const users = await userService.getUsersByRole(
                req.params.role
            );

            return res.status(200).json({
                success: true,
                count: users.length,
                data: users
            });
        } catch (error) {
            console.error('Error fetching users by role:', error);

            if (error.message.includes('Invalid role')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch users by role'
            });
        }
    },

    // Get users by status
    async getUsersByStatus(req, res) {
        try {
            const users = await userService.getUsersByStatus(
                req.params.status
            );

            return res.status(200).json({
                success: true,
                count: users.length,
                data: users
            });
        } catch (error) {
            console.error('Error fetching users by status:', error);

            if (error.message.includes('Invalid status')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch users by status'
            });
        }
    }
};

module.exports = userController;