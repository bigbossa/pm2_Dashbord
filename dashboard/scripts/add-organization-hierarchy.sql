-- Organization Hierarchy Migration
-- เพิ่มโครงสร้างองค์กร: สาขา -> แผนก -> แผนกย่อย -> ตำแหน่ง (Role)

-- ตารางสาขา (Branches)
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE,
    location VARCHAR(255),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ตารางแผนก (Departments)
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(branch_id, code)
);

-- ตารางแผนกย่อย (Sub-departments)
CREATE TABLE sub_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(department_id, code)
);

-- แก้ไขตาราง roles ให้เชื่อมกับ sub_department
ALTER TABLE roles ADD COLUMN sub_department_id UUID REFERENCES sub_departments(id) ON DELETE SET NULL;
ALTER TABLE roles ADD COLUMN level VARCHAR(50); -- 'entry', 'senior', 'manager', 'executive'
ALTER TABLE roles ADD COLUMN code VARCHAR(20);

-- Indexes
CREATE INDEX idx_branches_status ON branches(status);
CREATE INDEX idx_branches_code ON branches(code);
CREATE INDEX idx_departments_branch_id ON departments(branch_id);
CREATE INDEX idx_departments_status ON departments(status);
CREATE INDEX idx_sub_departments_department_id ON sub_departments(department_id);
CREATE INDEX idx_sub_departments_status ON sub_departments(status);
CREATE INDEX idx_roles_sub_department_id ON roles(sub_department_id);

-- Apply update triggers
CREATE TRIGGER update_branches_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sub_departments_updated_at
    BEFORE UPDATE ON sub_departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ข้อมูลตัวอย่าง (Optional)
INSERT INTO branches (name, code, location) VALUES
('สำนักงานใหญ่', 'HQ', 'กรุงเทพมหานคร'),
('สาขาเชียงใหม่', 'CNX', 'เชียงใหม่'),
('สาขาภูเก็ต', 'PKT', 'ภูเก็ต');

INSERT INTO departments (branch_id, name, code) VALUES
((SELECT id FROM branches WHERE code = 'HQ'), 'ฝ่ายบริหาร', 'ADMIN'),
((SELECT id FROM branches WHERE code = 'HQ'), 'ฝ่ายเทคโนโลยี', 'IT'),
((SELECT id FROM branches WHERE code = 'HQ'), 'ฝ่ายการเงิน', 'FIN'),
((SELECT id FROM branches WHERE code = 'HQ'), 'ฝ่ายทรัพยากรบุคคล', 'HR');

INSERT INTO sub_departments (department_id, name, code) VALUES
((SELECT id FROM departments WHERE code = 'IT'), 'แผนกพัฒนาซอฟต์แวร์', 'DEV'),
((SELECT id FROM departments WHERE code = 'IT'), 'แผนกโครงสร้างพื้นฐาน', 'INFRA'),
((SELECT id FROM departments WHERE code = 'IT'), 'แผนกรักษาความปลอดภัย', 'SEC'),
((SELECT id FROM departments WHERE code = 'HR'), 'แผนกสรรหา', 'REC'),
((SELECT id FROM departments WHERE code = 'HR'), 'แผนกฝึกอบรม', 'TRN'),
((SELECT id FROM departments WHERE code = 'FIN'), 'แผนกบัญชี', 'ACC'),
((SELECT id FROM departments WHERE code = 'FIN'), 'แผนกเงินเดือน', 'PAY');

-- อัพเดต roles ที่มีอยู่ให้เชื่อมกับ sub_department (ตัวอย่าง)
UPDATE roles SET 
    sub_department_id = (SELECT id FROM sub_departments WHERE code = 'DEV' LIMIT 1),
    level = 'manager',
    code = 'DEV-MGR'
WHERE name = 'Admin';
