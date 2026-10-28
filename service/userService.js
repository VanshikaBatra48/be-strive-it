const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const User = require("../models/user");
const { generateToken } = require("../middleware/authMiddleware");
const {sendLoginCredentials} = require("../service/emailService");
const crypto = require('node:crypto');


const userService = {
    // Create a new user
    async createUser(userData) {
        const {
            name,
            email,
            role,
            assigned_to,
            assignedMentees
        } = userData;

        const existingUser = await User.findOne({
            where: { email }
        });

        if (existingUser) {
            throw new Error("A user with this email already exists");
        }
        // Generate a temporary password
        const temporaryPassword =
            crypto.randomBytes(12).toString('base64url');

        const hashedPassword = await bcrypt.hash(
            temporaryPassword,
            12
        );


        let normalizedRole = (role || "admin").trim().toLowerCase();
        if (normalizedRole === "intern") normalizedRole = "mentee";

        const user = await User.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            role: normalizedRole,
            assigned_to: assigned_to || "admin",
            firstLogin: true
        });

        // If creating a mentor with assigned mentees, update those mentees in database
        if (normalizedRole === "mentor" && Array.isArray(assignedMentees) && assignedMentees.length > 0) {
            const menteeIds = assignedMentees.map(Number).filter(id => !isNaN(id) && id > 0);
            const menteeNames = assignedMentees.filter(item => typeof item === 'string' && isNaN(Number(item)) && item.trim().length > 0);
            const conditions = [];
            if (menteeIds.length > 0) conditions.push({ id: { [Op.in]: menteeIds } });
            if (menteeNames.length > 0) conditions.push({ name: { [Op.in]: menteeNames } });
            if (conditions.length > 0) {
                await User.update(
                    { assigned_to: user.name },
                    {
                        where: {
                            [Op.and]: [
                                { [Op.or]: conditions },
                                { role: "mentee" }
                            ]
                        }
                    }
                );
            }
        }

    // Send login credentials to the user's email
    await sendLoginCredentials(user, temporaryPassword);

    // Remove the password hash from the response
    const { password: _, ...userWithoutPassword } =
        user.toJSON();

    // Return user details without the password
    return {
        ...userWithoutPassword,
        message: 'User created and login credentials emailed successfully'
    };

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

        // Ensure that any mentee whose assigned mentor does not exist in the database has assigned_to set to null
        const activeMentors = await User.findAll({
            where: { role: "mentor" },
            attributes: ["name"]
        });
        const activeMentorNames = new Set(activeMentors.map((m) => m.name.toLowerCase().trim()));

        return users.map((u) => {
            const userObj = u.toJSON ? u.toJSON() : { ...u };
            if (userObj.role === "mentee") {
                if (
                    !userObj.assigned_to ||
                    userObj.assigned_to.toLowerCase() === "admin" ||
                    userObj.assigned_to.toLowerCase() === "unassigned" ||
                    !activeMentorNames.has(userObj.assigned_to.toLowerCase().trim())
                ) {
                    userObj.assigned_to = null;
                }
            }
            userObj.password = userObj.raw_password || (userObj.role === "admin" ? "Admin@123" : userObj.role === "mentor" ? "Mentor@123" : "Mentee@123");
            return userObj;
        });
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
            assigned_to,
            password
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

        let normalizedRole = role !== undefined ? role.trim().toLowerCase() : undefined;
        if (normalizedRole === "intern") normalizedRole = "mentee";
        let normalizedStatus = status !== undefined ? status.trim().toLowerCase() : undefined;

        // If a mentor is renamed, update assigned_to for all their mentees
        if (user.role === "mentor" && name && name.trim() !== user.name) {
            await User.update(
                { assigned_to: name.trim() },
                {
                    where: {
                        assigned_to: {
                            [Op.iLike]: user.name.trim()
                        }
                    }
                }
            );
        }

        const passwordUpdates = {};
        if (password && typeof password === "string" && password.trim().length >= 6) {
            passwordUpdates.password = await bcrypt.hash(password.trim(), 10);
            passwordUpdates.raw_password = password.trim();
        }

        await user.update({
            ...(name !== undefined && { name: name.trim() }),
            ...(email !== undefined && { email: email.trim().toLowerCase() }),
            ...(normalizedStatus !== undefined && { status: normalizedStatus }),
            ...(normalizedRole !== undefined && { role: normalizedRole }),
            ...(assigned_to !== undefined && { assigned_to: assigned_to ? assigned_to.trim() : null }),
            ...passwordUpdates
        });

        const { password: _, ...userWithoutPassword } = user.toJSON();

        return {
            ...userWithoutPassword,
            password: user.raw_password || ""
        };
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
            redirectTo: user.firstLogin ? "/changePassword" : "/dashboard"
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
        // user.raw_password = newPassword.trim();
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

        const deletedName = user.name;
        const deletedRole = user.role;

        // If the deleted user is a mentor, set assigned_to to null for all mentees assigned to this mentor
        if (deletedRole === "mentor") {
            await User.update(
                { assigned_to: null },
                {
                    where: {
                        assigned_to: {
                            [Op.iLike]: deletedName.trim()
                        }
                    }
                }
            );
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





