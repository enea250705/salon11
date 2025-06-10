import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: string;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.id,
      username: decoded.username,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    return null;
  }
}

export function getTokenFromRequest(req: any): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Also check cookies for browser requests
  const token = req.cookies?.auth_token;
  return token || null;
}

export function requireAuth(handler: any) {
  return async (req: any, res: any) => {
    const token = getTokenFromRequest(req);
    
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const user = verifyToken(token);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    // Attach user to request
    req.user = user;
    
    return handler(req, res);
  };
}

export function requireAdmin(handler: any) {
  return requireAuth(async (req: any, res: any) => {
    const user = req.user;
    
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    return handler(req, res);
  });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}