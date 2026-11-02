import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import User from '../models/user';

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
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as {
      email?: unknown;
      password?: unknown;
    };

    // 1. Validate request data
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
      return;
    }

    // 2. Find user by email
    const user = await User.findOne({
      where: {
        email: email.trim().toLowerCase(),
      },
    });

    // 3. Check whether user exists
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // 4. Verify password
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // 5. Check first login
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

    // 6. Generate normal access token
    const accessToken = createToken({
      id: user.id,
      role: user.role,
      purpose: 'access',
    });

    // 7. Return successful login response
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