import express from 'express';
import {
  registerUser,
  loginUser,
  verifyToken,
  findUserById,
  sanitizeUser
} from './authService.js';

const router = express.Router();

// Middleware: Authenticate Bearer Token
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Authentication token missing.' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }

  const user = findUserById(decoded.id);
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'User account no longer exists or is inactive.' });
  }

  req.user = sanitizeUser(user);
  next();
}

// Middleware: Require specific TransitIQ role(s)
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: Access restricted to [${roles.join(', ')}] roles. Your role is '${req.user.role}'.`
      });
    }
    next();
  };
}

// POST /api/v1/auth/register
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, username, password, confirm_password, role } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(422).json({ error: 'Please enter your email or full name.' });
    }

    if (!email || !email.trim()) {
      return res.status(422).json({ error: 'Please enter your email.' });
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(422).json({ error: 'Invalid email address.' });
    }

    if (!username || !username.trim()) {
      return res.status(422).json({ error: 'Username is required.' });
    }

    if (!password) {
      return res.status(422).json({ error: 'Password is required.' });
    }

    if (password.length < 8) {
      return res.status(422).json({ error: 'Password must contain at least 8 characters.' });
    }

    if (confirm_password !== undefined && password !== confirm_password) {
      return res.status(422).json({ error: 'Passwords do not match.' });
    }

    // Role validation: ONLY passenger, conductor, admin
    const validRoles = ['passenger', 'conductor', 'admin'];
    const requestedRole = role ? role.toLowerCase() : 'passenger';
    if (!validRoles.includes(requestedRole)) {
      return res.status(400).json({ error: 'Role must be one of: Passenger, Bus Conductor, or Admin.' });
    }

    const newUser = await registerUser({
      full_name,
      email,
      username,
      password,
      role: requestedRole
    });

    return res.status(201).json({
      message: 'Registration successful.',
      user: newUser
    });
  } catch (err) {
    console.error('[AuthRoutes] Register Error:', err.message);
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({ error: err.message || 'Internal server error during registration.' });
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  try {
    const { identifier, email, username, password } = req.body;
    const loginId = identifier || email || username;

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Please enter your Email or Username and Password.' });
    }

    const { user, token } = await loginUser(loginId, password);

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user
    });
  } catch (err) {
    console.error('[AuthRoutes] Login Error:', err.message);
    const statusCode = err.statusCode || 401;
    return res.status(statusCode).json({ error: err.message || 'Authentication failed.' });
  }
});

// GET /api/v1/auth/me
router.get('/me', authenticateToken, (req, res) => {
  return res.status(200).json({
    user: req.user
  });
});

// POST /api/v1/auth/logout
router.post('/logout', (req, res) => {
  return res.status(200).json({ message: 'Logged out successfully.' });
});

export default router;
