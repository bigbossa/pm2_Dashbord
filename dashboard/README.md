# Dashboard Management System

ระบบจัดการผู้ใช้งาน โครงสร้างองค์กร และแอพพลิเคชัน

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **UI:** Tailwind CSS + shadcn/ui (Radix UI)
- **Database:** PostgreSQL (pg)
- **Auth:** JWT (jose) + bcrypt + httpOnly Cookie
- **Process Manager:** PM2

## โครงสร้างโปรเจกต์

```
dashboard/
├── app/
│   ├── (auth)/              # หน้า Login / Register
│   ├── api/                 # API Routes (REST)
│   │   ├── apps/            # CRUD แอพ
│   │   ├── auth/            # Login / Logout / Session
│   │   ├── branches/        # CRUD สาขา
│   │   ├── departments/     # CRUD แผนก
│   │   ├── roles/           # CRUD ตำแหน่ง (Role)
│   │   └── users/           # CRUD ผู้ใช้
│   ├── auth/                # Auth pages
│   └── dashboard/           # หน้า Dashboard
│       ├── activity/        # Activity Log
│       ├── apps/            # จัดการแอพ
│       ├── profile/         # โปรไฟล์ผู้ใช้
│       ├── roles/           # โครงสร้างองค์กร & ตำแหน่ง
│       ├── unauthorized/    # หน้าไม่มีสิทธิ์
│       └── users/           # จัดการผู้ใช้
├── components/              # React Components (shadcn/ui)
├── hooks/                   # Custom React Hooks
├── lib/                     # Utilities & Config
│   ├── api-hooks.ts         # Data fetching hooks
│   ├── auth.ts              # JWT Auth utilities
│   ├── auth-context.tsx     # Auth Context Provider
│   ├── db.ts                # PostgreSQL connection pool
│   ├── mock-data.ts         # Permission definitions
│   └── types.ts             # TypeScript interfaces
├── scripts/                 # Database migration & setup
├── public/                  # Static files
└── styles/                  # Global styles
```

## ฟีเจอร์หลัก

### 1. ระบบจัดการผู้ใช้ (Users)
- CRUD ผู้ใช้ (สร้าง/ดู/แก้ไข/ลบ)
- กำหนด Role ด้วย Cascading Dropdown (สาขา → แผนก → ตำแหน่ง)
- จัดการสถานะ (active / inactive / suspended)

### 2. โครงสร้างองค์กร & ตำแหน่ง (Roles)
- **สาขา (Branch)** → **แผนก (Department)** → **ตำแหน่ง (Role)**
- Drill-down navigation พร้อม Breadcrumb
- กำหนดสิทธิ์ (Permissions) ให้แต่ละ Role
- ระดับตำแหน่ง: Entry / Senior / Manager / Executive

### 3. ระบบสิทธิ์ (Permissions)
- 12 permissions ใน 5 modules: users, roles, logs, apps, profile
- รูปแบบ: `module:action` (เช่น `users:read`, `roles:write`)
- Wildcard `["*"]` สำหรับ Administrator (สิทธิ์ทุกอย่าง)
- Protected Routes ตรวจสอบสิทธิ์อัตโนมัติ

### 4. จัดการแอพ (Apps)
- ลงทะเบียนแอพพลิเคชันในระบบ
- กำหนด Role ที่เข้าถึงแอพได้
- สถานะ: active / inactive / maintenance

### 5. Activity Log
- บันทึกกิจกรรมทั้งหมด (login, CRUD operations)
- ตรวจสอบย้อนหลังได้

## การติดตั้ง

### 1. ติดตั้ง Dependencies

```bash
pnpm install
```

### 2. ตั้งค่า Environment Variables

สร้างไฟล์ `.env.local`:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/usermanagementsystem
JWT_SECRET=your-super-secret-jwt-key
```

### 3. สร้างฐานข้อมูล

```bash
pnpm db:init
```

### 4. รันโปรเจกต์

```bash
# Development
pnpm dev

# Production (PM2)
pm2 start ecosystem.config.js
```

เปิด [http://localhost:3010](http://localhost:3010)

## Database

| ตาราง | รายละเอียด |
|-------|-----------|
| `users` | ข้อมูลผู้ใช้งาน |
| `roles` | ตำแหน่ง + permissions + department_id |
| `branches` | สาขา |
| `departments` | แผนก (สังกัดสาขา) |
| `sub_departments` | แผนกย่อย (legacy, ไม่ใช้แล้ว) |
| `apps` | แอพพลิเคชัน + allowed_roles |
| `activity_logs` | บันทึกกิจกรรม |

## Default Admin

```
Username: admin
Role: Administrator (permissions: ["*"])
```
