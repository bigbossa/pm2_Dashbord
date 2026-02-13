-- เพิ่มข้อมูลสาขา แผนก แผนกย่อย และตำแหน่ง
-- สาขา Y0 -> แผนก เทคโนโลยีสารสนเทศ -> แผนกย่อย ทีม Dev -> ตำแหน่ง หัวหน้าแผนก

-- 1. สร้างสาขา Y0
INSERT INTO branches (name, code, location, description, status)
VALUES ('สาขา Y0', 'Y0', 'กรุงเทพมหานคร', 'สาขาหลัก Y0', 'active')
ON CONFLICT (code) DO NOTHING
RETURNING id;

-- 2. สร้างแผนก เทคโนโลยีสารสนเทศ (ใช้ CTE เพื่อรับ branch_id)
WITH branch AS (
  SELECT id FROM branches WHERE code = 'Y0'
)
INSERT INTO departments (branch_id, name, code, description, status)
SELECT branch.id, 'เทคโนโลยีสารสนเทศ', 'IT-Y0', 'แผนกเทคโนโลยีสารสนเทศ', 'active'
FROM branch
ON CONFLICT (branch_id, code) DO NOTHING
RETURNING id;

-- 3. สร้างแผนกย่อย ทีม Dev
WITH dept AS (
  SELECT d.id FROM departments d
  JOIN branches b ON d.branch_id = b.id
  WHERE b.code = 'Y0' AND d.name = 'เทคโนโลยีสารสนเทศ'
)
INSERT INTO sub_departments (department_id, name, code, description, status)
SELECT dept.id, 'ทีม Dev', 'DEV-Y0', 'ทีมพัฒนาซอฟต์แวร์', 'active'
FROM dept
ON CONFLICT (department_id, code) DO NOTHING
RETURNING id;

-- 4. สร้างตำแหน่ง หัวหน้าแผนก
WITH subdept AS (
  SELECT sd.id FROM sub_departments sd
  JOIN departments d ON sd.department_id = d.id
  JOIN branches b ON d.branch_id = b.id
  WHERE b.code = 'Y0' AND sd.name = 'ทีม Dev'
)
INSERT INTO roles (name, description, sub_department_id, level, code, permissions)
SELECT 
  'หัวหน้าแผนก Dev Y0',
  'หัวหน้าแผนกพัฒนาซอฟต์แวร์ สาขา Y0',
  subdept.id,
  'manager',
  'MGR-DEV-Y0',
  '["users:read", "users:write", "roles:read", "apps:read", "logs:read", "profile:read", "profile:write"]'::jsonb
FROM subdept
ON CONFLICT (name) DO NOTHING;

-- แสดงผลลัพธ์
SELECT 
  b.name as สาขา,
  d.name as แผนก,
  sd.name as แผนกย่อย,
  r.name as ตำแหน่ง,
  r.level as ระดับ,
  r.code as รหัส
FROM branches b
LEFT JOIN departments d ON d.branch_id = b.id
LEFT JOIN sub_departments sd ON sd.department_id = d.id
LEFT JOIN roles r ON r.sub_department_id = sd.id
WHERE b.code = 'Y0'
ORDER BY b.name, d.name, sd.name, r.name;
