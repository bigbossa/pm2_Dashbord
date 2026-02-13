import type { Permission } from './types'

// Permissions - รายการสิทธิ์ที่ใช้ในระบบ (จัดเรียงตามหมวดหมู่และลำดับความสำคัญ)
export const mockPermissions: Permission[] = [
  // จัดการผู้ใช้
  { id: 'p1', name: 'users:read', description: 'ดูรายการผู้ใช้', module: 'users' },
  { id: 'p2', name: 'users:write', description: 'สร้าง/แก้ไขผู้ใช้', module: 'users' },
  { id: 'p3', name: 'users:delete', description: 'ลบผู้ใช้', module: 'users' },
  
  // จัดการ Role
  { id: 'p4', name: 'roles:read', description: 'ดูรายการ Role', module: 'roles' },
  { id: 'p5', name: 'roles:write', description: 'สร้าง/แก้ไข Role', module: 'roles' },
  { id: 'p6', name: 'roles:delete', description: 'ลบ Role', module: 'roles' },
  
  // Activity Logs
  { id: 'p7', name: 'logs:read', description: 'ดู Activity Logs', module: 'logs' },
  
  // จัดการแอพ
  { id: 'p8', name: 'apps:read', description: 'ดูรายการแอพ', module: 'apps' },
  { id: 'p9', name: 'apps:write', description: 'สร้าง/แก้ไขแอพ', module: 'apps' },
  { id: 'p10', name: 'apps:delete', description: 'ลบแอพ', module: 'apps' },
  
  // โปรไฟล์
  { id: 'p11', name: 'profile:read', description: 'ดูโปรไฟล์ตัวเอง', module: 'profile' },
  { id: 'p12', name: 'profile:write', description: 'แก้ไขโปรไฟล์ตัวเอง', module: 'profile' },
]
