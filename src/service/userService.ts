import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { Op } from 'sequelize';
import type { WhereAttributeHash, WhereOptions } from 'sequelize';
import User from '../models/user';
import type { UserAttributes, UserRole, UserStatus } from '../models/user';
import { generateToken } from '../middleware/authMiddleware';
import { sendLoginCredentials } from './emailService';

// ---------- Types ----------

export type PublicUser = Omit<UserAttributes, 'password'>;

export interface CreateUserInput {
  name: string;
  email: string;
  role?: string;
  assigned_to?: string | null;
  assignedMentees?: Array<string | number>;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  status?: string;
  role?: string;
  assigned_to?: string | null;
  password?: string;
}

export interface UserFilters {
  id?: string | number;
  email?: string;
  role?: string;
  status?: string;
  name?: string;
  assigned_to?: string;
}

export interface LoginResult {
  message: string;
  token: string;
  user: PublicUser;
  redirectTo: string;
}

const ALLOWED_ROLES: UserRole[] = ['admin', 'mentee', 'mentor'];
const ALLOWED_STATUSES: UserStatus[] = ['active', 'inactive'];

// ---------- Helpers ----------

/** Lowercase the role and map 'intern' -> 'mentee'. Returns null if invalid. */
function normalizeRole(role: string): UserRole | null {
  let normalized = role.trim().toLowerCase();
  if (normalized === 'intern') normalized = 'mentee';
  return ALLOWED_ROLES.includes(normalized as UserRole) ? (normalized as UserRole) : null;
}

function normalizeStatus(status: string): UserStatus | null {
  const normalized = status.trim().toLowerCase();
  return ALLOWED_STATUSES.includes(normalized as UserStatus)
    ? (normalized as UserStatus)
    : null;
}

// ---------- Service ----------

const userService = {
  // Create a new user
  async createUser(userData: CreateUserInput): Promise<PublicUser & { message: string }> {
    const { name, email, role, assigned_to, assignedMentees } = userData;

    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      throw new Error('A user with this email already exists');
    }

    // Generate a temporary password
    const temporaryPassword = crypto.randomBytes(12).toString('base64url');
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    const normalizedRole = normalizeRole(role || 'admin');
    if (!normalizedRole) {
      throw new Error('Invalid role');
    }

    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: normalizedRole,
      assigned_to: assigned_to || 'admin',
      firstLogin: true,
    });

    // If creating a mentor with assigned mentees, update those mentees in database
    if (
      normalizedRole === 'mentor' &&
      Array.isArray(assignedMentees) &&
      assignedMentees.length > 0
    ) {
      const menteeIds = assignedMentees.map(Number).filter((id) => !isNaN(id) && id > 0);
      const menteeNames = assignedMentees.filter(
        (item): item is string =>
          typeof item === 'string' && isNaN(Number(item)) && item.trim().length > 0
      );

      const conditions: WhereOptions<UserAttributes>[] = [];
      if (menteeIds.length > 0) conditions.push({ id: { [Op.in]: menteeIds } });
      if (menteeNames.length > 0) conditions.push({ name: { [Op.in]: menteeNames } });

      if (conditions.length > 0) {
        await User.update(
          { assigned_to: user.name },
          {
            where: {
              [Op.and]: [{ [Op.or]: conditions }, { role: 'mentee' }],
            },
          }
        );
      }
    }

    // Send login credentials to the user's email
    await sendLoginCredentials(user, temporaryPassword);

    // Remove the password hash from the response
    const { password: _password, ...userWithoutPassword } = user.toJSON();

    return {
      ...userWithoutPassword,
      message: 'User created and login credentials emailed successfully',
    };
  },

  // Filter users by ID, email, role, status, name, or assigned_to
  // No query parameters means all users
  async filterUsers(
    filters: UserFilters = {}
  ): Promise<Array<PublicUser & { password: string }>> {
    const { id, email, role, status, name, assigned_to } = filters;

    const where: WhereAttributeHash<UserAttributes> = {};

    // Filter by user ID
    if (id !== undefined && id !== '') {
      const numericId = Number(id);
      if (isNaN(numericId)) return [];
      where.id = numericId;
    }

    // Filter by email (case-insensitive)
    if (email) {
      where.email = { [Op.iLike]: email.trim() };
    }

    // Filter by role (normalize lowercase and map 'intern' -> 'mentee')
    if (role) {
      const normalizedRole = normalizeRole(role);
      if (!normalizedRole) {
        return []; // Return empty array safely without causing a Postgres enum error
      }
      where.role = normalizedRole;
    }

    // Filter by status (normalize lowercase e.g. "Active" -> "active")
    if (status) {
      const normalizedStatus = normalizeStatus(status);
      if (!normalizedStatus) {
        return []; // Return empty array safely without causing a Postgres enum error
      }
      where.status = normalizedStatus;
    }

    // Filter by assigned_to (case-insensitive)
    if (assigned_to) {
      where.assigned_to = { [Op.iLike]: assigned_to.trim() };
    }

    // Filter by partial, case-insensitive name
    if (name) {
      // Escape special characters used by SQL LIKE
      const escapedName = name.trim().replace(/[\\%_]/g, '\\$&');
      where.name = { [Op.iLike]: `%${escapedName}%` };
    }

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['id', 'ASC']],
    });

    // Any mentee whose assigned mentor does not exist gets assigned_to = null
    const activeMentors = await User.findAll({
      where: { role: 'mentor' },
      attributes: ['name'],
    });
    const activeMentorNames = new Set(
      activeMentors.map((m) => m.name.toLowerCase().trim())
    );

    return users.map((u) => {
      const { password: _password, ...userObj } = u.toJSON();

      if (userObj.role === 'mentee') {
        const assignedLower = userObj.assigned_to?.toLowerCase().trim();
        if (
          !assignedLower ||
          assignedLower === 'admin' ||
          assignedLower === 'unassigned' ||
          !activeMentorNames.has(assignedLower)
        ) {
          userObj.assigned_to = null;
        }
      }

      // NOTE: placeholder passwords kept from the original code (see notes)
      const placeholderPassword =
        userObj.role === 'admin'
          ? 'Admin@123'
          : userObj.role === 'mentor'
            ? 'Mentor@123'
            : 'Mentee@123';

      return { ...userObj, password: placeholderPassword };
    });
  },

  // Get a single user by ID (without the password)
  async getUserById(id: number | string): Promise<PublicUser> {
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user.toJSON();
  },

  // Get a single user by email (without the password)
  async getUserByEmail(email: string): Promise<PublicUser> {
    const user = await User.findOne({
      where: { email: email.trim().toLowerCase() },
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user.toJSON();
  },

  // Get all users with a given role
  async getUsersByRole(role: string): Promise<PublicUser[]> {
    const normalizedRole = normalizeRole(role);
    if (!normalizedRole) {
      throw new Error('Invalid role');
    }

    const users = await User.findAll({
      where: { role: normalizedRole },
      attributes: { exclude: ['password'] },
      order: [['id', 'ASC']],
    });

    return users.map((u) => u.toJSON());
  },

  // Get all users with a given status
  async getUsersByStatus(status: string): Promise<PublicUser[]> {
    const normalizedStatus = normalizeStatus(status);
    if (!normalizedStatus) {
      throw new Error('Invalid status');
    }

    const users = await User.findAll({
      where: { status: normalizedStatus },
      attributes: { exclude: ['password'] },
      order: [['id', 'ASC']],
    });

    return users.map((u) => u.toJSON());
  },

  // Update user details
  async updateUser(
    id: number | string,
    updateData: UpdateUserInput
  ): Promise<PublicUser & { password: string }> {
    const user = await User.findByPk(id);

    if (!user) {
      throw new Error('User not found');
    }

    const { name, email, status, role, assigned_to, password } = updateData;

    if (email && email !== user.email) {
      const existingUser = await User.findOne({
        where: {
          email,
          id: { [Op.ne]: user.id },
        },
      });

      if (existingUser) {
        throw new Error('A user with this email already exists');
      }
    }

    let normalizedRole: UserRole | undefined;
    if (role !== undefined) {
      const parsedRole = normalizeRole(role);
      if (!parsedRole) throw new Error('Invalid role');
      normalizedRole = parsedRole;
    }

    let normalizedStatus: UserStatus | undefined;
    if (status !== undefined) {
      const parsedStatus = normalizeStatus(status);
      if (!parsedStatus) throw new Error('Invalid status');
      normalizedStatus = parsedStatus;
    }

    // If a mentor is renamed, update assigned_to for all their mentees
    if (user.role === 'mentor' && name && name.trim() !== user.name) {
      await User.update(
        { assigned_to: name.trim() },
        {
          where: {
            assigned_to: { [Op.iLike]: user.name.trim() },
          },
        }
      );
    }

    const updates: Partial<UserAttributes> = {};
    if (name !== undefined) updates.name = name.trim();
    if (email !== undefined) updates.email = email.trim().toLowerCase();
    if (normalizedStatus !== undefined) updates.status = normalizedStatus;
    if (normalizedRole !== undefined) updates.role = normalizedRole;
    if (assigned_to !== undefined) {
      updates.assigned_to = assigned_to ? assigned_to.trim() : null;
    }
    if (password && typeof password === 'string' && password.trim().length >= 6) {
      updates.password = await bcrypt.hash(password.trim(), 10);
    }

    await user.update(updates);

    const { password: _password, ...userWithoutPassword } = user.toJSON();

    return {
      ...userWithoutPassword,
      password: '',
    };
  },

  // User login & JWT signing
  async login(email: string, password: string): Promise<LoginResult> {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const user = await User.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (user.status === 'inactive') {
      throw new Error('Account is inactive. Please contact administrator.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      firstLogin: user.firstLogin,
    });

    const { password: _password, ...userWithoutPassword } = user.toJSON();

    return {
      message: 'Login successful',
      token,
      user: userWithoutPassword,
      redirectTo: user.firstLogin ? '/changePassword' : '/dashboard',
    };
  },

  // Change a user's password
async changePassword(
  userId: string | number,
  currentPassword: string,
  newPassword: string
) {
  // Find user in database
  const user = await User.findByPk(userId);

  if (!user) {
    throw new Error('User not found');
  }

  // Compare entered current password with stored hashed password
  const isPasswordCorrect = await bcrypt.compare(
    currentPassword,
    user.password
  );

  // Reject if current password does not match
  if (!isPasswordCorrect) {
    throw new Error('Current password is incorrect');
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Update password in database
  await user.update({
    password: hashedPassword,
    firstLogin: false,
  });

  return {
    message: 'Password changed successfully',
  };
},

  // Delete a user
  async deleteUser(id: number | string): Promise<{ message: string }> {
    const user = await User.findByPk(id);

    if (!user) {
      throw new Error('User not found');
    }

    const deletedName = user.name;
    const deletedRole = user.role;

    // If the deleted user is a mentor, unassign all mentees assigned to them
    if (deletedRole === 'mentor') {
      await User.update(
        { assigned_to: null },
        {
          where: {
            assigned_to: { [Op.iLike]: deletedName.trim() },
          },
        }
      );
    }

    await user.destroy();

    return { message: 'User deleted successfully' };
  },

  // Mark first login as completed
  async completeFirstLogin(id: number | string): Promise<{ message: string }> {
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
};

export default userService;
