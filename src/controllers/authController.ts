import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import User from '../models/user';
import type { LoginBody } from '../schemas/userSchema';

// Reusable JWT token generation function
export const createToken = (
  payload: {
    id: number;
    role?: string;
    purpose?: string;
  },
  expiresIn?: SignOptions['expiresIn']
): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(payload, secret, {
    expiresIn: expiresIn || (process.env.JWT_EXPIRES_IN || '9h') as SignOptions['expiresIn'],
  });
};

// POST /api/auth/login
export const login = async (
  req: Request<{}, {}, LoginBody>,
  res: Response
): Promise<void> => {
  try {
    // Already validated and normalized (trimmed, lowercased) by Zod (loginSchema)
    const { email, password } = req.body;

    // 1. Find user by email
    const user = await User.findOne({
      where: { email },
    });

    // 2. Check whether user exists
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // 4. Check first login
    if (user.firstLogin === true) {
      // Generate short-lived password-change token
      const passwordToken = createToken(
        {
          id: user.id,
          purpose: 'change_password',
        },
        '15m'
      );

      res.status(200).json({
        success: true,
        message: 'Please change your temporary password.',
        firstLogin: true,
        token: passwordToken,
        redirectTo: '/forget-password',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });

      return;
    }

    // 5. Generate normal access token
    const accessToken = createToken({
      id: user.id,
      role: user.role,
      purpose: 'access',
    });

    // 6. Return successful login response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      firstLogin: false,
      token: accessToken,
      redirectTo: '/dashboard',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login controller error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};