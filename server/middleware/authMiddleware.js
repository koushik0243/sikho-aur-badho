import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { trackActiveDay } from '../user_activity/track_active_day.js';
dotenv.config();

const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {

    try {
      token = req.headers.authorization.split(' ')[1];

      // Decode token and attach user id to request object.
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      trackActiveDay(decoded); // daily active users (reports)
      next();

    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

/**
 * Use after `protect`: only super admins may continue (e.g. changing the
 * master lists that every organization's dropdowns use).
 */
export const requireSuperAdmin = (req, res, next) => {
  if (req.user?.user_type === 'superadmin') return next();
  return res.status(403).json({ status: 403, message: 'Only a super admin can do this.' });
};

export default protect;
