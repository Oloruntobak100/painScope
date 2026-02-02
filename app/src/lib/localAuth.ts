// Local authentication using localStorage (for development without Supabase)

export interface LocalUser {
  id: string;
  email: string;
  name: string;
  password: string; // In production, this would be hashed
  avatar?: string;
  company?: string;
  industry?: string;
  isVerified: boolean;
  createdAt: string;
}

interface LocalSession {
  userId: string;
  email: string;
  expiresAt: string;
}

const USERS_KEY = 'painscope_local_users';
const SESSION_KEY = 'painscope_local_session';

// Get all users from localStorage
function getUsers(): LocalUser[] {
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
}

// Save users to localStorage
function saveUsers(users: LocalUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// Get current session
function getSession(): LocalSession | null {
  const data = localStorage.getItem(SESSION_KEY);
  if (!data) return null;
  const session: LocalSession = JSON.parse(data);
  // Check if session expired
  if (new Date(session.expiresAt) < new Date()) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  return session;
}

// Save session
function saveSession(session: LocalSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

// Clear session
function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

// Generate a simple ID
function generateId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Register a new user
export function localRegister(email: string, password: string, name: string): { success: boolean; error?: string; user?: LocalUser } {
  const users = getUsers();
  
  // Check if user already exists
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, error: 'Email already registered' };
  }

  const newUser: LocalUser = {
    id: generateId(),
    email,
    name,
    password, // In production, hash this
    isVerified: true, // Auto-verify for local dev
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  // Auto-login: create session
  const session: LocalSession = {
    userId: newUser.id,
    email: newUser.email,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  };
  saveSession(session);

  return { success: true, user: newUser };
}

// Login
export function localLogin(email: string, password: string): { success: boolean; error?: string; user?: LocalUser } {
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return { success: false, error: 'Invalid email or password' };
  }

  if (user.password !== password) {
    return { success: false, error: 'Invalid email or password' };
  }

  // Create session
  const session: LocalSession = {
    userId: user.id,
    email: user.email,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
  saveSession(session);

  return { success: true, user };
}

// Logout
export function localLogout(): void {
  clearSession();
}

// Get current user from session
export function localGetCurrentUser(): LocalUser | null {
  const session = getSession();
  if (!session) return null;

  const users = getUsers();
  return users.find(u => u.id === session.userId) || null;
}

// Update user profile
export function localUpdateUser(userId: string, updates: Partial<Omit<LocalUser, 'id' | 'email' | 'password' | 'createdAt'>>): { success: boolean; error?: string } {
  const users = getUsers();
  const index = users.findIndex(u => u.id === userId);

  if (index === -1) {
    return { success: false, error: 'User not found' };
  }

  users[index] = { ...users[index], ...updates };
  saveUsers(users);

  return { success: true };
}

// Check if local auth is enabled (when not on production)
export function isLocalAuthEnabled(): boolean {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}
