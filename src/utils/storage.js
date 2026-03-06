const USERS_KEY = 'ci_users_v1';
const SESSION_KEY = 'ci_session_v1';
const ISSUES_KEY = 'ci_issues_v1';

export function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveUser(user) {
  const users = getUsers();
  const exists = users.find(u => u.email === user.email);
  if (exists) {
    return false;
  }
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return true;
}

export function ensureDefaultAdmin() {
  const users = getUsers();
  if (!users.find(u => u.role === 'admin')) {
    const admin = { name: 'Admin', email: 'admin@college.local', role: 'admin' };
    users.push(admin);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
}

export function setCurrentUser(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getIssues() {
  try {
    return JSON.parse(localStorage.getItem(ISSUES_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveIssue(issue) {
  const issues = getIssues();
  issues.push(issue);
  localStorage.setItem(ISSUES_KEY, JSON.stringify(issues));
}

export function updateIssue(updated) {
  const issues = getIssues().map(i => i.id === updated.id ? updated : i);
  localStorage.setItem(ISSUES_KEY, JSON.stringify(issues));
}

export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


