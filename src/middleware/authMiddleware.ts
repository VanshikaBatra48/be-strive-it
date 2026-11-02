import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import 'dotenv/config';
import User from '../models/user';
import type { UserRole } from '../models/user';

const JWT_SECRET: string =
  process.env.JWT_SECRET || 'default_jwt_secret_key_change_in_production';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '24h';

export interface TokenPayload {
  id: number;
  email: string;
  role: UserRole;
  firstLogin: boolean;
}

export interface GenerateTokenOptions {
  expiresIn?: SignOptions['expiresIn'];
}

/**
 * Sign/Generate a new JWT token for a user
 * @param payload - User data (id, email, role, firstLogin, etc.)
 * @param options - Optional JWT signing options (e.g. expiresIn)
 * @returns Signed JWT token
 */
export function generateToken(
  payload: TokenPayload,
  options: GenerateTokenOptions = {}
): string {
  const data: TokenPayload = {
    id: payload.id,
    email: payload.email,
    role: payload.role,
    firstLogin: payload.firstLogin,
  };

  return jwt.sign(data, JWT_SECRET, {
    expiresIn: options.expiresIn || (JWT_EXPIRES_IN as SignOptions['expiresIn']),
  });
}

/**
 * Express middleware to verify incoming JWT token
 * Expects 'Authorization: Bearer <token>' header
 */
export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No authorization header provided.',
      });
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        message: "Invalid token format. Format must be 'Bearer <token>'.",
      });
      return;
    }

    const token = parts[1];

    let decoded: TokenPayload;
    try {
      const result = jwt.verify(token, JWT_SECRET);
      if (typeof result === 'string') {
        res.status(403).json({
          success: false,
          message: 'Invalid token. Authentication failed.',
        });
        return;
      }
      decoded = result as unknown as TokenPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          message: 'Token has expired. Please log in again.',
        });
        return;
      }

      res.status(403).json({
        success: false,
        message: 'Invalid token. Authentication failed.',
      });
      return;
    }

    // Verify user still exists in database
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User associated with this token no longer exists.',
      });
      return;
    }

    // Attach user payload to request
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      firstLogin: user.firstLogin,
    };
    req.currentUser = user;

    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication server error.',
    });
  }
}


/**
 * Allow only users with one of the given roles.
 * Must run after verifyToken (which sets req.user).
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource.',
      });
      return;
    }

    next();
  };
}

// Alias so existing route code can use "authenticate"
export const authenticate = verifyToken;
export const signToken = generateToken; // Alias for convenience
export const authenticateToken = verifyToken; // Alias for convenience