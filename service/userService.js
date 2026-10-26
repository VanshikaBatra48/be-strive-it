// const bcrypt = require('bcrypt');
// const User = require('../models/user');

// const userService = {

//     // Create a new user
//     async createUser(userData) {
//         const { name, email, password, role } = userData;

//         // Check whether the email already exists
//         const existingUser = await User.findOne({
//             where: { email }
//         });

//         if (existingUser) {
//             throw new Error('A user with this email already exists');
//         }

//         // Hash the password before saving
//         const hashedPassword = await bcrypt.hash(password, 10);

//         const user = await User.create({
//             name,
//             email,
//             password: hashedPassword,
//             role: role || 'admin',
//             firstLogin: true
//         });

//         // Never return the password
//         const { password: _, ...userWithoutPassword } = user.toJSON();

//         return userWithoutPassword;
//     },

//     // Get all users
//     async getAllUsers() {
//         return await User.findAll({
//             attributes: { exclude: ['password'] },
//             order: [['id', 'ASC']]
//         });
//     },

//     // Get a user by ID
//     async getUserById(id) {
//         const user = await User.findByPk(id, {
//             attributes: { exclude: ['password'] }
//         });

//         if (!user) {
//             throw new Error('User not found');
//         }

//         return user;
//     },

//     // Get a user by email
//     async getUserByEmail(email) {
//         const user = await User.findOne({
//             where: { email },
//             attributes: { exclude: ['password'] }
//         });

//         if (!user) {
//             throw new Error('User not found');
//         }

//         return user;
//     },

//     // Update user details
//     async updateUser(id, updateData) {
//         const user = await User.findByPk(id);

//         if (!user) {
//             throw new Error('User not found');
//         }

//         const { name, email, status } = updateData;

//         if (email && email !== user.email) {
//             const existingUser = await User.findOne({
//                 where: { email }
//             });

//             if (existingUser) {
//                 throw new Error('A user with this email already exists');
//             }
//         }

//         await user.update({
//             ...(name !== undefined && { name }),
//             ...(email !== undefined && { email }),
//             ...(status !== undefined && { status })
//         });

//         const { password: _, ...userWithoutPassword } = user.toJSON();

//         return userWithoutPassword;
//     },

//     // Change a user's password
//     async changePassword(id, newPassword) {
//         const user = await User.findByPk(id);

//         if (!user) {
//             throw new Error('User not found');
//         }

//         user.password = await bcrypt.hash(newPassword, 10);
//         await user.save();

//         return { message: 'Password updated successfully' };
//     },

//     // Delete a user
//     async deleteUser(id) {
//         const user = await User.findByPk(id);

//         if (!user) {
//             throw new Error('User not found');
//         }

//         await user.destroy();

//         return { message: 'User deleted successfully' };
//     },

//     // Mark first login as completed
//     async completeFirstLogin(id) {
//         const user = await User.findByPk(id);

//         if (!user) {
//             throw new Error('User not found');
//         }

//         if (user.firstLogin) {
//             user.firstLogin = false;
//             await user.save();
//         }

//         return { message: 'First login completed successfully' };
//     }
// };

//     //get mentor by status
//     async function getUserByStatus(status) {
//         return await User.findAll({
//             where: {
//                 status
//             }
//         });
//     }

   
//     //getting user by active or inactive filter
// async function getInternByStatus(status){
//     const intern = await User.findAll({
//         where:{
//             status: status
        
//         },
//         include: [
//             {
//                 model: User,
//                 as: 'user',
//                 attributes: ['id', 'name', 'email']
//             }
//         ]
//     });

//     if(intern.length  === 0){
//         throw new Error(`${status} intern not found`);
//     }
//     return intern;
// }

// module.exports = userService;

const bcrypt = require('bcrypt');
const crypto = require('node:crypto');
const User = require('../models/user');

const userService = {

    // // Create a new user
    // async createUser(userData) {
    //     const { name, email, password, role } = userData;

    //     const existingUser = await User.findOne({
    //         where: { email }
    //     });

    //     if (existingUser) {
    //         throw new Error('A user with this email already exists');
    //     }
    //      // Generate a random temporary password.
    // const temporaryPassword =
    //     crypto.randomBytes(12).toString('base64url');

    // // Hash the password before saving it.
    // const hashedPassword = await bcrypt.hash(
    //     temporaryPassword,
    //     12
    // );

    //     //const hashedPassword = await bcrypt.hash(password, 10);

    //     const user = await User.create({
    //         name,
    //         email,
    //         password: hashedPassword,
    //         role: role || 'admin',
    //         firstLogin: true
    //     });

    //     const { password: _, ...userWithoutPassword } = user.toJSON();

    //     return userWithoutPassword;
    // },

async createUser(userData) {
    const { name, email, role } = userData;

    // Validate required fields
    if (!name || !email || !role) {
        throw new Error('Name, email, and role are required');
    }

    // Check whether the email already exists
    const existingUser = await User.findOne({
        where: { email }
    });

    if (existingUser) {
        throw new Error('A user with this email already exists');
    }

    // Generate a temporary password
    const temporaryPassword =
        crypto.randomBytes(12).toString('base64url');

    // Hash the temporary password
    const hashedPassword = await bcrypt.hash(
        temporaryPassword,
        12
    );

    // Save the user in PostgreSQL
    const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role,
        firstLogin: true
    });

    // Remove the password hash from the returned user object
    const userWithoutPassword = user.toJSON();
    delete userWithoutPassword.password;

    // Return the user and temporary password separately
    return {
        user: userWithoutPassword,
        temporaryPassword
    };
},


    // // Get all users
    async getAllUsers() {
        return await User.findAll({
            attributes: { exclude: ['password'] },
            order: [['id', 'ASC']]
        });
    },

    // Get a user by ID
    async getUserById(id) {
        const user = await User.findByPk(id, {
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    },

    // Get a user by email
    async getUserByEmail(email) {
        const user = await User.findOne({
            where: { email },
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    },

    // Update user details
    async updateUser(id, updateData) {
        const user = await User.findByPk(id);

        if (!user) {
            throw new Error('User not found');
        }

        const { name, email, status } = updateData;

        if (email && email !== user.email) {
            const existingUser = await User.findOne({
                where: { email }
            });

            if (existingUser) {
                throw new Error('A user with this email already exists');
            }
        }

        await user.update({
            ...(name !== undefined && { name }),
            ...(email !== undefined && { email }),
            ...(status !== undefined && { status })
        });

        const { password: _, ...userWithoutPassword } = user.toJSON();

        return userWithoutPassword;
    },

    // Change a user's password
    async changePassword(id, newPassword) {
        const user = await User.findByPk(id);

        if (!user) {
            throw new Error('User not found');
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        return { message: 'Password updated successfully' };
    },

    // Delete a user
    async deleteUser(id) {
        const user = await User.findByPk(id);

        if (!user) {
            throw new Error('User not found');
        }

        await user.destroy();

        return { message: 'User deleted successfully' };
    },

    // Mark first login as completed
    async completeFirstLogin(id) {
        const user = await User.findByPk(id);

        if (!user) {
            throw new Error('User not found');
        }

        if (user.firstLogin) {
            user.firstLogin = false;
            await user.save();
        }

        return { message: 'First login completed successfully' };
    },

    // Get users by role
    async getUsersByRole(role) {
        const allowedRoles = ['admin', 'mentor', 'intern'];

        if (!allowedRoles.includes(role)) {
            throw new Error('Invalid role');
        }

        return await User.findAll({
            where: { role },
            attributes: { exclude: ['password'] },
            order: [['id', 'ASC']]
        });
    },

    // Get users by status
    async getUsersByStatus(status) {
        const allowedStatuses = ['active', 'inactive'];

        if (!allowedStatuses.includes(status)) {
            throw new Error('Invalid status');
        }

        return await User.findAll({
            where: { status },
            attributes: { exclude: ['password'] },
            order: [['id', 'ASC']]
        });
    },


async getUsersByRole(role) {
    const allowedRoles = ['admin', 'intern', 'mentor'];

    if (!allowedRoles.includes(role)) {
        throw new Error('Invalid role. Use admin, intern, or mentor');
    }

    const users = await User.findAll({
        where: {
            role: role
        },
        attributes: {
            exclude: ['password']
        },
        order: [['id', 'ASC']]
    });

    return users;
},
};

module.exports = userService;