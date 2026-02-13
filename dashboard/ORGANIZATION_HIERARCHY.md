# Organization Hierarchy Management System

## โครงสร้างองค์กร

ระบบนี้จัดการโครงสร้างองค์กรแบบ 4 ระดับ:

```
สาขา (Branch)
  └── แผนก (Department)
       └── แผนกย่อย (Sub-department)
            └── ตำแหน่ง (Position/Role)
```

## Database Schema

### 1. Branches (สาขา)
- `id` - UUID primary key
- `name` - ชื่อสาขา
- `code` - รหัสสาขา (unique)
- `location` - ที่ตั้ง
- `description` - รายละเอียด
- `status` - สถานะ (active/inactive)

### 2. Departments (แผนก)
- `id` - UUID primary key
- `branch_id` - FK → branches(id)
- `name` - ชื่อแผนก
- `code` - รหัสแผนก (unique per branch)
- `description` - รายละเอียด
- `status` - สถานะ

### 3. Sub-departments (แผนกย่อย)
- `id` - UUID primary key
- `department_id` - FK → departments(id)
- `name` - ชื่อแผนกย่อย
- `code` - รหัสแผนกย่อย (unique per department)
- `description` - รายละเอียด
- `status` - สถานะ

### 4. Roles (ตำแหน่ง) - แก้ไขจากเดิม
เพิ่มฟิลด์:
- `sub_department_id` - FK → sub_departments(id) [nullable]
- `level` - ระดับตำแหน่ง (entry/senior/manager/executive)
- `code` - รหัสตำแหน่ง
- `permissions` - สิทธิ์การใช้งานระบบ

## การติดตั้ง

### 1. รัน Migration

**Windows:**
```bash
cd dashboard/scripts
run-org-migration.bat
```

**Mac/Linux:**
```bash
cd dashboard/scripts
psql -U postgres -d dashboard_db -f add-organization-hierarchy.sql
```

### 2. ตรวจสอบข้อมูลตัวอย่าง

หลังรัน migration จะได้ข้อมูลตัวอย่าง:

**สาขา:**
- สำนักงานใหญ่ (HQ)
- สาขาเชียงใหม่ (CNX)
- สาขาภูเก็ต (PKT)

**แผนก (ภายใต้สำนักงานใหญ่):**
- ฝ่ายบริหาร (ADMIN)
- ฝ่ายเทคโนโลยี (IT)
- ฝ่ายการเงิน (FIN)
- ฝ่ายทรัพยากรบุคคล (HR)

**แผนกย่อย:**
- แผนกพัฒนาซอฟต์แวร์ (DEV)
- แผนกโครงสร้างพื้นฐาน (INFRA)
- แผนกรักษาความปลอดภัย (SEC)
- แผนกสรรหา (REC)
- แผนกฝึกอบรม (TRN)
- แผนกบัญช (ACC)
- แผนกเงินเดือน (PAY)

## API Endpoints

### Branches API
- `GET /api/organization/branches` - ดึงรายการสาขาทั้งหมด
- `POST /api/organization/branches` - สร้างสาขาใหม่
- `PATCH /api/organization/branches` - แก้ไขสาขา
- `DELETE /api/organization/branches?id={id}` - ลบสาขา

### Departments API
- `GET /api/organization/departments` - ดึงรายการแผนกทั้งหมด
- `GET /api/organization/departments?branch_id={id}` - ดึงแผนกตามสาขา
- `POST /api/organization/departments` - สร้างแผนกใหม่
- `PATCH /api/organization/departments` - แก้ไขแผนก
- `DELETE /api/organization/departments?id={id}` - ลบแผนก

### Sub-departments API
- `GET /api/organization/sub-departments` - ดึงรายการแผนกย่อยทั้งหมด
- `GET /api/organization/sub-departments?department_id={id}` - ดึงแผนกย่อยตามแผนก
- `POST /api/organization/sub-departments` - สร้างแผนกย่อยใหม่
- `PATCH /api/organization/sub-departments` - แก้ไขแผนกย่อย
- `DELETE /api/organization/sub-departments?id={id}` - ลบแผนกย่อย

### Roles API (แก้ไขเดิม)
- `GET /api/roles` - ดึงรายการ roles พร้อมข้อมูล hierarchy
- `POST /api/roles` - สร้าง role ใหม่ (รองรับ sub_department_id, level, code)
- `PATCH /api/roles` - แก้ไข role
- `DELETE /api/roles?id={id}` - ลบ role

## UI - หน้าจัดการ

เข้าที่: `http://localhost:3000/dashboard/roles`

**Tabs:**
1. **สาขา** - จัดการ branches
2. **แผนก** - จัดการ departments (แยกตามสาขา)
3. **แผนกย่อย** - จัดการ sub-departments (แยกตามแผนก)
4. **ตำแหน่ง/Role** - จัดการ roles พร้อมกำหนด permissions

## Custom Hooks

```typescript
// Branches
const { branches, loading, error, fetchBranches, createBranch, updateBranch, deleteBranch } = useBranches()

// Departments
const { departments, loading, error, fetchDepartments, createDepartment, updateDepartment, deleteDepartment } = useDepartments(branchId?)

// Sub-departments
const { subDepartments, loading, error, fetchSubDepartments, createSubDepartment, updateSubDepartment, deleteSubDepartment } = useSubDepartments(departmentId?)

// Roles (แก้ไขเดิม - รองรับ organization hierarchy)
const { roles, loading, error, fetchRoles, createRole, updateRole, deleteRole } = useRoles()
```

## การใช้งาน

### 1. สร้างโครงสร้างองค์กร
1. สร้างสาขา (Branch) เช่น "สำนักงานใหญ่", "สาขาภูเก็ต"
2. สร้างแผนก (Department) ภายใต้สาขา เช่น "ฝ่ายเทคโนโลยี"
3. สร้างแผนกย่อย (Sub-department) ภายใต้แผนก เช่น "แผนกพัฒนาซอฟต์แวร์"

### 2. สร้างตำแหน่ง (Role)
1. สร้าง role เช่น "Software Engineer"
2. เลือกแผนกย่อยที่ตำแหน่งนี้สังกัด
3. กำหนดระดับ (entry/senior/manager/executive)
4. กำหนดสิทธิ์การใช้งานระบบ (permissions)

### 3. มอบหมายตำแหน่งให้ผู้ใช้
- เมื่อสร้าง/แก้ไขผู้ใช้ สามารถเลือก role ที่มี organization hierarchy แล้ว
- ระบบจะแสดงว่าผู้ใช้สังกัดสาขา/แผนก/แผนกย่อยใด

## Activity Logging

ระบบจะบันทึก activity logs สำหรับ:
- `branches` module - สร้าง/แก้ไข/ลบสาขา
- `departments` module - สร้าง/แก้ไข/ลบแผนก
- `sub_departments` module - สร้าง/แก้ไข/ลบแผนกย่อย
- `roles` module - สร้าง/แก้ไข/ลบตำแหน่ง

ดูได้ที่: `http://localhost:3000/dashboard/activity`

## การลบข้อมูล (Cascade Rules)

**ระวัง:** การลบมีข้อกำหนด:

- ❌ ลบสาขาที่มีแผนก → **ไม่ได้** (ต้องลบแผนกก่อน)
- ❌ ลบแผนกที่มีแผนกย่อย → **ไม่ได้** (ต้องลบแผนกย่อยก่อน)
- ❌ ลบแผนกย่อยที่มีตำแหน่ง → **ไม่ได้** (ต้องลบตำแหน่งหรือย้ายก่อน)
- ❌ ลบตำแหน่งที่มีผู้ใช้ → **ไม่ได้** (ต้องย้ายผู้ใช้ก่อน)

**Database Cascade:**
- ลบสาขา → CASCADE ลบแผนกทั้งหมดภายใต้สาขานั้น (ถ้าไม่มีแผนกย่อย)
- ลบแผนก → CASCADE ลบแผนกย่อยทั้งหมดภายใต้แผนกนั้น (ถ้าไม่มีตำแหน่ง)

## ตัวอย่าง Query

```sql
-- ดูโครงสร้างองค์กรแบบเต็ม
SELECT 
  b.name as branch,
  d.name as department,
  sd.name as sub_department,
  r.name as role,
  r.level,
  COUNT(u.id) as user_count
FROM branches b
LEFT JOIN departments d ON d.branch_id = b.id
LEFT JOIN sub_departments sd ON sd.department_id = d.id
LEFT JOIN roles r ON r.sub_department_id = sd.id
LEFT JOIN users u ON u.role_id = r.id
GROUP BY b.name, d.name, sd.name, r.name, r.level
ORDER BY b.name, d.name, sd.name, r.name;
```

## TODO

- [ ] เพิ่ม UI สำหรับ Department Management tab
- [ ] เพิ่ม UI สำหรับ Sub-department Management tab  
- [ ] แก้ไข Position/Role Management tab ให้รองรับ organization hierarchy
- [ ] เพิ่ม Tree View แสดงโครงสร้างแบบ hierarchy
- [ ] เพิ่ม Drag & Drop สำหรับย้ายแผนก/แผนกย่อย
- [ ] Export organization chart เป็น PDF
- [ ] Import/Export organization data เป็น CSV/Excel

## สรุป

ระบบนี้ช่วยให้สามารถ:
- จัดการโครงสร้างองค์กรแบบลำดับชั้น
- กำหนดสิทธิ์ตามตำแหน่ง (Role-Based Access Control)
- ติดตามว่าพนักงานสังกัดหน่วยงานใด
- จัดการสิทธิ์การเข้าถึงแบบละเอียด

