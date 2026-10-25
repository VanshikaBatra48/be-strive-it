const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const User = require("../models/user");
const { generateToken } = require("../middleware/authMiddleware");

const userService = {
    // Create a new user
    async createUser(userData) {
        const {
            name,
            email,
            password,
            role,
            assigned_to
        } = userData;

        const existingUser = await User.findOne({
            where: { email }
        });

        if (existingUser) {
            throw new Error("A user with this email already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role || "admin",
            assigned_to: assigned_to || "admin",
            firstLogin: true
        });

        const { password: _, ...userWithoutPassword } = user.toJSON();

        return userWithoutPassword;
    },

    // Filter users by ID, email, role, status, name, or assigned_to
    // No query parameters means all users
    async filterUsers(filters = {}) {
        const { id, email, role, status, name, assigned_to } = filters;

        const where = {};

        // Filter by user ID
        if (id !== undefined && id !== "") {
            where.id = id;
        }

        // Filter by email (case-insensitive)
        if (email) {
            where.email = {
                [Op.iLike]: email.trim()
            };
        }

        // Filter by role (normalize lowercase and map 'intern' -> 'mentee')
        if (role) {
            let normalizedRole = role.trim().toLowerCase();
            if (normalizedRole === "intern") normalizedRole = "mentee";

            const allowedRoles = ["admin", "mentee", "mentor"];
            if (!allowedRoles.includes(normalizedRole)) {
                return []; // Return empty array safely without causing a Postgres enum error
            }
            where.role = normalizedRole;
        }

        // Filter by status (normalize lowercase e.g. "Active" -> "active")
        if (status) {
            const normalizedStatus = status.trim().toLowerCase();
            const allowedStatuses = ["active", "inactive"];
            if (!allowedStatuses.includes(normalizedStatus)) {
                return []; // Return empty array safely without causing a Postgres enum error
            }
            where.status = normalizedStatus;
        }

        // Filter by assigned_to (case-insensitive)
        if (assigned_to) {
            where.assigned_to = {
                [Op.iLike]: assigned_to.trim()
            };
        }

        // Filter by partial, case-insensitive name
        if (name) {
            // Escape special regex-like characters used by SQL LIKE
            const escapedName = name.trim().replace(/[\\%_]/g, "\\$&");

            where.name = {
                [Op.iLike]: `%${escapedName}%`
            };
        }

        const users = await User.findAll({
            where,
            attributes: {
                exclude: ["password"]
            },
            order: [["id", "ASC"]]
        });

        return users;
    },

    // Update user details
    async updateUser(id, updateData) {
        const user = await User.findByPk(id);

        if (!user) {
            throw new Error("User not found");
        }

        const {
            name,
            email,
            status,
            role,
            assigned_to
        } = updateData;

        if (email && email !== user.email) {
            const existingUser = await User.findOne({
                where: {
                    email,
                    id: { [Op.ne]: id }
                }
            });

            if (existingUser) {
                throw new Error("A user with this email already exists");
            }
        }

        await user.update({
            ...(name !== undefined && { name }),
            ...(email !== undefined && { email }),
            ...(status !== undefined && { status }),
            ...(role !== undefined && { role }),
            ...(assigned_to !== undefined && { assigned_to })
        });

        const { password: _, ...userWithoutPassword } = user.toJSON();

        return userWithoutPassword;
    },

    // User login & JWT signing
    async login(email, password) {
        if (!email || !password) {
            throw new Error("Email and password are required");
        }

        const user = await User.findOne({
            where: { email: email.trim().toLowerCase() }
        });

        if (!user) {
            throw new Error("Invalid email or password");
        }

        if (user.status === "inactive") {
            throw new Error("Account is inactive. Please contact administrator.");
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error("Invalid email or password");
        }

        const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role,
            firstLogin: user.firstLogin
        });

        const { password: _, ...userWithoutPassword } = user.toJSON();

        return {
            message: "Login successful",
            token,
            user: userWithoutPassword,
            redirectTo: user.firstLogin ? "/forget-password" : "/dashboard"
        };
    },

    // Change a user's password
    async changePassword(id, newPassword) {
        const user = await User.findByPk(id);

        if (!user) {
            throw new Error("User not found");
        }

        // Validate that new password is not the same as the old password
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            throw new Error("New password cannot be the same as the old password");
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.firstLogin = false; // Successfully changed password sets firstLogin to false
        await user.save();

        return {
            message: "Password updated successfully",
            firstLogin: user.firstLogin
        };
    },

    // Delete a user
    async deleteUser(id) {
        const user = await User.findByPk(id);

        if (!user) {
            throw new Error("User not found");
        }

        await user.destroy();

        return {
            message: "User deleted successfully"
        };
    },

    // Mark first login as completed
    async completeFirstLogin(id) {
        const user = await User.findByPk(id);

        if (!user) {
            throw new Error("User not found");
        }

        if (user.firstLogin) {
            user.firstLogin = false;
            await user.save();
        }

        return {
            message: "First login completed successfully"
        };
    }
};

module.exports = userService;





