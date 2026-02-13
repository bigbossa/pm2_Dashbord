# Mock Admin Account

## 🔐 ข้อมูลเข้าสู่ระบบ (Development)

### Admin Account (สิทธิ์เต็ม)
```
Username: admin
Password: admin123
Email:    admin@system.local
```

**สิทธิ์:**
- ✅ จัดการผู้ใช้ (CRUD)
- ✅ จัดการ Role (CRUD)
- ✅ ดู Activity Logs
- ✅ จัดการแอพ (CRUD)
- ✅ จัดการโปรไฟล์

### Additional Test Accounts

#### Manager Account
```
Username: manager
Password: manager123
Email:    manager@system.local
```
**สิทธิ์:** จัดการผู้ใช้, ดู roles, ดู apps, ดู logs

#### Viewer Account
```
Username: viewer
Password: viewer123
Email:    viewer@system.local
```
**สิทธิ์:** ดูข้อมูลเท่านั้น (Read-only)

---

## 🚀 วิธีใช้งาน

### 1. สร้างบัญชี Admin
```bash
cd dashboard
node scripts/create-admin.js
```

### 2. เข้าสู่ระบบ
เปิดเบราว์เซอร์ไปที่: http://localhost:3000/auth/login

### 3. ใช้ Mock Credentials ใน Code
```typescript
import { MOCK_ADMIN, getAdminCredentials } from '@/lib/mock-credentials'

// Get admin credentials
const { username, password } = getAdminCredentials()

// Use in tests
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username, password })
})
```

---

## ⚠️ คำเตือน

**ห้ามใช้บัญชีเหล่านี้ใน Production!**

- Mock credentials นี้สร้างขึ้นสำหรับ Development และ Testing เท่านั้น
- ใช้สำหรับทดสอบระบบในเครื่อง Local
- ก่อน Deploy Production ต้อง:
  1. ลบบัญชี mock ทั้งหมด
  2. สร้างบัญชี admin ใหม่ด้วยรหัสผ่านที่แข็งแรง
  3. ลบไฟล์ `mock-credentials.ts` หรือไม่ import ใน production build

---

## 🔄 Script Commands

### สร้างบัญชี Admin
```bash
node scripts/create-admin.js
```

### รีเซ็ตรหัสผ่าน Admin
```bash
node scripts/create-admin.js
# Script จะตรวจสอบและอัปเดตรหัสผ่านเป็น admin123 อัตโนมัติ
```

### เพิ่มข้อมูลตัวอย่าง (Organization Hierarchy)
```bash
node scripts/run-migration.js
node scripts/add-y0-data.js
```

---

## 📝 Database Schema

บัญชี Admin เชื่อมต่อกับ:
- **Table:** users
- **Role:** Admin (จาก roles table)
- **Permissions:** ทุกสิทธิ์ (12 permissions)

---

## 🧪 Testing

สามารถใช้ mock credentials ทดสอบ:
1. Login flow
2. Permission checking
3. Role-based access control
4. API authentication
5. Protected routes

---

## 📚 Related Files

- `/lib/mock-credentials.ts` - Mock credentials constants
- `/scripts/create-admin.js` - Admin account creation script
- `/lib/auth.ts` - Authentication logic
- `/lib/auth-context.tsx` - Auth state management
