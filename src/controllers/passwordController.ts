import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import User from '../models/user';
import { createToken } from './authController';

/** Shape of the short-lived token issued for the first-login password change. */
interface ChangePasswordTokenPayload {
  id: number;
  purpose?: string;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const { newPassword } = req.body as { newPassword?: unknown };

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      res.status(400).json({
        message: 'Password must contain at least 8 characters.',
      });
      return;
    }

    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      res.status(401).json({
        message: 'Authentication token is required.',
      });
      return;
    }

    const token = authorization.slice(7);

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('Change password error: JWT_SECRET is not configured');
      res.status(500).json({
        message: 'Unable to change password.',
      });
      return;
    }

    let decoded: ChangePasswordTokenPayload;

    try {
      const result = jwt.verify(token, secret);

      if (typeof result === 'string') {
        res.status(401).json({
          message: 'Invalid or expired password-change token. Please log in again.',
        });
        return;
      }

      decoded = result as unknown as ChangePasswordTokenPayload;
    } catch {
      res.status(401).json({
        message: 'Invalid or expired password-change token. Please log in again.',
      });
      return;
    }

    if (decoded.purpose !== 'change_password') {
      res.status(403).json({
        message: 'This token cannot be used to change the initial password.',
      });
      return;
    }

    const user = await User.findByPk(decoded.id);

    if (!user || user.firstLogin !== true) {
      res.status(400).json({
        message: 'Password change is not required or the account was not found.',
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Save the new password and complete first login.
    await user.update({
      password: hashedPassword,
      firstLogin: false,
    });

    // Issue a normal access token after the password changes.
    const accessToken = createToken({
      id: user.id,
      role: user.role,
      purpose: 'access',
    });

    res.status(200).json({
      message: 'Password changed successfully. You are now logged in.',
      firstLogin: false,
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Change password error:', getErrorMessage(error));

    res.status(500).json({
      message: 'Unable to change password.',
    });
  }
}