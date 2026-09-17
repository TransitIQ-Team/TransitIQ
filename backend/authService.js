import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'transitiq_super_secret_jwt_key_2026_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Ensure data directory exists
const dataDir = path.dirname(USERS_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Helper to read users array from disk
function readUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, 'utf-8');
      return JSON.parse(content || '[]');
    }
  } catch (err) {
    console.error('[AuthService] Error reading users.json:', err);
  }
  return [];
}

// Helper to write users array to disk
function writeUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('[AuthService] Error writing users.json:', err);
  }
}

// Auto-seed default demo users for the 3 TransitIQ roles: passenger, conductor, admin
export async function initAuthService() {
  let users = readUsers();
  
  // Filter out any non-standard roles if previous dev runs had them, or seed fresh
  const allowedRoles = ['passenger', 'conductor', 'admin'];
  const hasInvalidRoles = users.some(u => !allowedRoles.includes(u.role));

  if (users.length === 0 || hasInvalidRoles) {
    console.log('[AuthService] Initializing clean seed demo accounts for TransitIQ (Passenger, Bus Conductor, Admin)...');
    
    const seedAccounts = [
      {
        full_name: 'TransitIQ Admin',
        email: 'admin@example.com',
        username: 'admin',
        rawPassword: 'admin123',
        role: 'admin'
      },
      {
        full_name: 'Bus Conductor',
        email: 'conductor@example.com',
        username: 'conductor',
        rawPassword: 'conductor123',
        role: 'conductor'
      },
      {
        full_name: 'Transit Passenger',
        email: 'passenger@example.com',
        username: 'passenger',
        rawPassword: 'passenger123',
        role: 'passenger'
      }
    ];

    const seededUsers = [];
    const now = new Date().toISOString();

    for (const acc of seedAccounts) {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(acc.rawPassword, salt);
      seededUsers.push({
        id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        full_name: acc.full_name,
        email: acc.email.toLowerCase(),
        username: acc.username.toLowerCase(),
        password_hash,
        role: acc.role,
        is_active: true,
        created_at: now,
        updated_at: now
      });
    }

    writeUsers(seededUsers);
    console.log(`[AuthService] Successfully seeded ${seededUsers.length} TransitIQ demo users.`);
  }
}

// Format safe user object for API responses (stripping password_hash)
export function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

// Generate JWT token containing ID, email, username, and role
export function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token signature and expiration
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Find user by email or username
export function findUserByLoginIdentifier(identifier) {
  if (!identifier) return null;
  const users = readUsers();
  const lower = identifier.trim().toLowerCase();
  return users.find(u => u.email === lower || u.username === lower) || null;
}

// Find user by ID
export function findUserById(id) {
  const users = readUsers();
  return users.find(u => u.id === id) || null;
}

// Register a new user (role must be passenger, conductor, or admin)
export async function registerUser({ full_name, email, username, password, role }) {
  const users = readUsers();
  const cleanEmail = email.trim().toLowerCase();
  const cleanUsername = username.trim().toLowerCase();

  const allowedRoles = ['passenger', 'conductor', 'admin'];
  const userRole = allowedRoles.includes(role ? role.toLowerCase() : '') ? role.toLowerCase() : 'passenger';

  // Check email uniqueness
  if (users.some(u => u.email === cleanEmail)) {
    const error = new Error('Email is already registered.');
    error.statusCode = 409;
    throw error;
  }

  // Check username uniqueness
  if (users.some(u => u.username === cleanUsername)) {
    const error = new Error('Username already exists.');
    error.statusCode = 409;
    throw error;
  }

  // Password hashing
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  const now = new Date().toISOString();
  const newUser = {
    id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    full_name: full_name.trim(),
    email: cleanEmail,
    username: cleanUsername,
    password_hash,
    role: userRole,
    is_active: true,
    created_at: now,
    updated_at: now
  };

  users.push(newUser);
  writeUsers(users);

  return sanitizeUser(newUser);
}

// Authenticate user login
export async function loginUser(identifier, password) {
  const user = findUserByLoginIdentifier(identifier);
  if (!user) {
    const error = new Error('Invalid email/username or user does not exist.');
    error.statusCode = 404;
    throw error;
  }

  if (!user.is_active) {
    const error = new Error('Account is disabled or inactive.');
    error.statusCode = 403;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Incorrect password. Please verify your credentials.');
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user);
  return {
    user: sanitizeUser(user),
    token
  };
}
