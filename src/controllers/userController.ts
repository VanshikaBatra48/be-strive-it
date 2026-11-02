import type { Request, Response } from 'express';
import userService from '../service/userService';
import type { CreateUserInput, UpdateUserInput, UserFilters } from '../service/userService';

// ---------- Helpers ----------

/** Safely read the message from anything thrown in a catch block. */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Query values can be string | string[] | object; only accept plain strings. */
function queryString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

const userController = {
  // ==========================================
  // 1. Create a new user and send login credentials
  // ==========================================
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      // Call userService to create the user and send email
      const result = await userService.createUser(req.body as CreateUserInput);

      res.status(201).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      console.error('Error creating user:', error);
      const message = getErrorMessage(error);

      if (message === 'Name, email, and role are required' || message === 'Invalid role') {
        res.status(400).json({ success: false, message });
        return;
      }

      if (message === 'A user with this email already exists') {
        res.status(409).json({ success: false, message });
        return;
      }

      res.status(500).json({
        success: false,
        message: message || 'Failed to create user.',
      });
    }
  },

  // ==========================================
  // 2. Get all users with optional filters
  // Supported filters: id, email, role, status, name, assigned_to
  // ==========================================
  async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const filters: UserFilters = {
        id: queryString(req.query.id),
        email: queryString(req.query.email),
        role: queryString(req.query.role),
        status: queryString(req.query.status),
        name: queryString(req.query.name),
        assigned_to: queryString(req.query.assigned_to),
      };

      const users = await userService.filterUsers(filters);

      res.status(200).json({
        success: true,
        count: users.length,
        data: users,
      });
    } catch (error) {
      console.error('Error fetching users:', error);

      res.status(500).json({
        success: false,
        message: 'Failed to fetch users.',
      });
    }
  },


  // ==========================================
  // 5. Update user details
  // ==========================================
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
     const id = req.params.id;

      if (typeof id !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
      return;
}

const user = await userService.updateUser(
  id,
  req.body as UpdateUserInput
);
     
      res.status(200).json({
        success: true,
        message: 'User updated successfully.',
        data: user,
      });
    } catch (error) {
      console.error('Error updating user:', error);
      const message = getErrorMessage(error);

      if (message === 'User not found') {
        res.status(404).json({ success: false, message });
        return;
      }

      if (message === 'A user with this email already exists') {
        res.status(409).json({ success: false, message });
        return;
      }

      if (
        message === 'Invalid role' ||
        message === 'Invalid status' ||
        message === 'Name cannot be empty' ||
        message === 'Email cannot be empty'
      ) {
        res.status(400).json({ success: false, message });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update user.',
      });
    }
  },

  // ==========================================
  // 6. User login
  // ==========================================
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body as { email?: string; password?: string };

      const result = await userService.login(email ?? '', password ?? '');

      res.status(200).json({
        success: true,
        message: result.message,
        token: result.token,
        user: result.user,
        redirectTo: result.redirectTo,
      });
    } catch (error) {
      console.error('Error logging in:', error);
      const message = getErrorMessage(error);

      if (
        message === 'Invalid email or password' ||
        message === 'Email and password are required'
      ) {
        res.status(401).json({ success: false, message });
        return;
      }

      if (message.includes('inactive')) {
        res.status(403).json({ success: false, message });
        return;
      }

      if (message === 'JWT_SECRET is not configured') {
        res.status(500).json({
          success: false,
          message: 'Server authentication configuration is missing.',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to log in.',
      });
    }
  },

  // ==========================================
  // 7. Change user password (authenticated user)
  // ==========================================
 async changePassword(req: Request, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    // Validate required fields
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
      return;
    }

    // Validate new password length
    if (newPassword.length < 8 || newPassword.length > 72) {
      res.status(400).json({
        success: false,
        message: 'New password must be between 8 and 72 characters',
      });
      return;
    }

    // Get authenticated user's ID
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    // Call service to verify and update password
    const result = await userService.changePassword(
      userId,
      currentPassword,
      newPassword
    );

    res.status(200).json({
      success: true,
      message: result.message,
    });

  } catch (error) {
    console.error('Error changing password:', error);

    const message = getErrorMessage(error);

    if (message === 'User not found') {
      res.status(404).json({
        success: false,
        message,
      });
      return;
    }

    if (message === 'Current password is incorrect') {
      res.status(400).json({
        success: false,
        message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to change password',
    });
  }
},

//-----------------------------
// Delete user
//---------------------------------
async deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id;

    // Validate user ID
    if (typeof id !== 'string' || !id.trim()) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
      return;
    }

    // Call deleteUser service
    const result = await userService.deleteUser(id);

    res.status(200).json({
      success: true,
      message: result.message,
    });

  } catch (error) {
    console.error('Error deleting user:', error);

    const message = getErrorMessage(error);

    if (message === 'User not found') {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete user.',
    });
  }
},

  // ==========================================
  // 9. Complete first login
  // ==========================================
  async completeFirstLogin(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;

if (typeof id !== 'string') {
  res.status(400).json({
    success: false,
    message: 'Invalid user ID'
  });
  return;
}

const result = await userService.completeFirstLogin(id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error('Error completing first login:', error);
      const message = getErrorMessage(error);

      if (message === 'User not found') {
        res.status(404).json({ success: false, message });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to complete first login',
      });
    }
  },

 };

export default userController;