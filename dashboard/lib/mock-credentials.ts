// Mock Admin Credentials
// ใช้สำหรับ Development และ Testing เท่านั้น
// ⚠️ ห้ามใช้ใน Production!

export const MOCK_ADMIN = {
  username: 'admin',
  password: 'admin123', // Plain text สำหรับ development
  email: 'admin@system.local',
  full_name: 'System Administrator',
  role: 'Admin',
  permissions: [
    'users:read',
    'users:write',
    'users:delete',
    'roles:read',
    'roles:write',
    'roles:delete',
    'logs:read',
    'apps:read',
    'apps:write',
    'apps:delete',
    'profile:read',
    'profile:write',
  ],
}

// Additional mock users for testing
export const MOCK_USERS = [
  {
    username: 'manager',
    password: 'manager123',
    email: 'manager@system.local',
    full_name: 'Manager User',
    role: 'Manager',
    permissions: [
      'users:read',
      'users:write',
      'roles:read',
      'apps:read',
      'logs:read',
      'profile:read',
      'profile:write',
    ],
  },
  {
    username: 'viewer',
    password: 'viewer123',
    email: 'viewer@system.local',
    full_name: 'Viewer User',
    role: 'Viewer',
    permissions: ['users:read', 'apps:read', 'logs:read', 'profile:read'],
  },
]

// Helper function to get credentials
export function getAdminCredentials() {
  return {
    username: MOCK_ADMIN.username,
    password: MOCK_ADMIN.password,
  }
}

export function getAllMockUsers() {
  return [MOCK_ADMIN, ...MOCK_USERS]
}
