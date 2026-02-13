# ระบบควบคุมการเข้าถึงหน้า Dashboard

## 📋 สรุปการป้องกันหน้า Dashboard

### ✅ หน้าที่มี Role-Based Access Control

| หน้า | URL | Permission ที่ต้องการ | สถานะ |
|------|-----|----------------------|--------|
| Dashboard หลัก | `/dashboard` | ต้อง login | ✅ Protected |
| จัดการผู้ใช้ | `/dashboard/users` | `users:read` | ✅ Protected |
| จัดการ Role | `/dashboard/roles` | `roles:read` | ✅ Protected |
| Activity Logs | `/dashboard/activity` | `logs:read` | ✅ Protected |
| จัดการแอพ | `/dashboard/apps` | `apps:read` | ✅ Protected |
| โปรไฟล์ | `/dashboard/profile` | `profile:read` | ✅ Protected |
| Unauthorized | `/dashboard/unauthorized` | - | Public |

---

## 🔐 Permissions ทั้งหมดในระบบ

### 1. **จัดการผู้ใช้** (Users Module)
- `users:read` - ดูรายการผู้ใช้
- `users:write` - สร้าง/แก้ไขผู้ใช้
- `users:delete` - ลบผู้ใช้

### 2. **จัดการ Role** (Roles Module)
- `roles:read` - ดูรายการ Role
- `roles:write` - สร้าง/แก้ไข Role
- `roles:delete` - ลบ Role

### 3. **Activity Logs** (Logs Module)
- `logs:read` - ดู Activity Logs

### 4. **จัดการแอพ** (Apps Module)
- `apps:read` - ดูรายการแอพ
- `apps:write` - สร้าง/แก้ไขแอพ
- `apps:delete` - ลบแอพ

### 5. **โปรไฟล์** (Profile Module)
- `profile:read` - ดูโปรไฟล์ตัวเอง
- `profile:write` - แก้ไขโปรไฟล์ตัวเอง

---

## 🎯 ตัวอย่างการกำหนดสิทธิ์ตาม Role

### 👨‍💼 **Super Admin**
สิทธิ์เต็มทุกอย่าง:
```
users:read, users:write, users:delete
roles:read, roles:write, roles:delete
logs:read
apps:read, apps:write, apps:delete
profile:read, profile:write
```

### 👨‍💻 **Admin**
จัดการส่วนใหญ่ (ไม่รวมลบ Role):
```
users:read, users:write, users:delete
roles:read, roles:write
logs:read
apps:read, apps:write
profile:read, profile:write
```

### 👤 **Manager**
ดูและแก้ไขเท่านั้น:
```
users:read, users:write
roles:read
logs:read
apps:read
profile:read, profile:write
```

### 👁️ **Viewer**
ดูอย่างเดียว:
```
users:read
roles:read
logs:read
apps:read
profile:read, profile:write
```

---

## 🛡️ การทำงานของระบบ

### 1. **Page-Level Protection**
ทุกหน้า Dashboard ถูก wrap ด้วย `<ProtectedRoute>`:
```tsx
export default function UsersPage() {
  return (
    <ProtectedRoute requiredPermissions={['users:read']}>
      <UsersPageContent />
    </ProtectedRoute>
  )
}
```

### 2. **Component-Level Protection**
ใช้ `usePermission` hook ในการซ่อน/แสดงปุ่ม:
```tsx
const canEditUsers = usePermission('users:write')
const canDeleteUsers = usePermission('users:delete')

return (
  <>
    {canEditUsers && <Button>แก้ไข</Button>}
    {canDeleteUsers && <Button>ลบ</Button>}
  </>
)
```

### 3. **API-Level Protection**
API routes ตรวจสอบ session และ permissions:
```tsx
const session = await getSession()
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

---

## 🔄 Flow การเข้าถึงหน้า

```
User พยายามเข้าหน้า
    ↓
ตรวจสอบ login? 
    ↓ ไม่
    redirect → /auth/login
    ↓ ใช่
ตรวจสอบ permissions?
    ↓ ไม่มีสิทธิ์
    redirect → /dashboard/unauthorized
    ↓ มีสิทธิ์
แสดงหน้าได้
```

---

## 📝 วิธีเพิ่มหน้าใหม่ที่มี Protection

**ขั้นตอนที่ 1**: เพิ่ม permission ใหม่ใน `mock-data.ts`
```tsx
{ 
  id: 'p13', 
  name: 'reports:read', 
  description: 'ดูรายงาน', 
  module: 'reports' 
}
```

**ขั้นตอนที่ 2**: สร้างหน้าใหม่พร้อม Protection
```tsx
import { ProtectedRoute } from '@/components/protected-route'

function ReportsPageContent() {
  // ... content
}

export default function ReportsPage() {
  return (
    <ProtectedRoute requiredPermissions={['reports:read']}>
      <ReportsPageContent />
    </ProtectedRoute>
  )
}
```

**ขั้นตอนที่ 3**: เพิ่มลิงก์ใน Sidebar
```tsx
{
  name: 'รายงาน',
  href: '/dashboard/reports',
  icon: FileText,
  permission: 'reports:read',
}
```

---

## ✅ Checklist สำหรับ Admin

- [ ] สร้าง Role ใหม่ที่ `/dashboard/roles`
- [ ] เลือก Permissions ตามความเหมาะสม
- [ ] มอบหมาย Role ให้ผู้ใช้ที่ `/dashboard/users`
- [ ] ทดสอบการเข้าถึงของแต่ละ Role
- [ ] ตรวจสอบ Activity Logs ที่ `/dashboard/activity`

---

## 🔧 การแก้ไขปัญหาที่พบบ่อย

### ปัญหา: ผู้ใช้ไม่สามารถเข้าหน้าได้
**สาเหตุ**: ไม่มี permission ที่ต้องการ
**วิธีแก้**: ตรวจสอบและเพิ่ม permission ให้ Role ของผู้ใช้

### ปัญหา: ปุ่ม CRUD ไม่แสดง
**สาเหตุ**: Role มีแค่ `:read` ไม่มี `:write` หรือ `:delete`
**วิธีแก้**: เพิ่ม permission ที่จำเป็นให้ Role

### ปัญหา: Redirect ไป unauthorized ทันที
**สาเหตุ**: Session หมดอายุหรือไม่ได้ login
**วิธีแก้**: Login ใหม่อีกครั้ง

---

**อัปเดตล่าสุด**: February 11, 2026  
**เวอร์ชัน**: 1.0.0  
**Status**: ✅ System Ready
