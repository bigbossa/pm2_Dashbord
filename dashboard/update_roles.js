const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'usermanagementsystem',
  user: 'postgres',
  password: '25800852'
});

async function updateRoles() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. ดึง role ปัจจุบัน
    const currentRoles = await client.query('SELECT id, name, level FROM roles ORDER BY name');
    console.log('Current roles:', currentRoles.rows);

    // 2. ดึง permissions ทั้งหมด
    const perms = await client.query('SELECT id, name FROM permissions');
    const permMap = {};
    perms.rows.forEach(p => { permMap[p.name] = p.name; });
    console.log('Available permissions:', Object.keys(permMap));

    // 3. กำหนดสิทธิ์ตาม Role ใหม่
    const rolePermissions = {
      SuperAdmin: [
        'users:read', 'users:write', 'users:delete',
        'roles:read', 'roles:write', 'roles:delete',
        'logs:read',
        'apps:read', 'apps:write', 'apps:delete',
        'profile:read', 'profile:write'
      ],
      SystemAdmin: [
        'users:read', 'users:write',
        'roles:read',
        'logs:read',
        'apps:read', 'apps:write',
        'profile:read', 'profile:write'
      ],
      BranchAdmin: [
        'users:read', 'users:write',
        'roles:read',
        'logs:read',
        'apps:read',
        'profile:read', 'profile:write'
      ],
      DepartmentHead: [
        'users:read',
        'logs:read',
        'apps:read',
        'profile:read', 'profile:write'
      ],
      Staff: [
        'apps:read',
        'profile:read', 'profile:write'
      ],
      Viewer: [
        'apps:read',
        'profile:read'
      ]
    };

    const roleDescriptions = {
      SuperAdmin: 'ผู้ดูแลระบบสูงสุด - จัดการ user, แก้ไข role, ดูทุกสาขา, override ทุกอย่าง',
      SystemAdmin: 'ผู้ดูแลระบบ IT - จัดการ user ในระบบตนเอง, ไม่ override ระบบหลัก',
      BranchAdmin: 'ผู้ดูแลสาขา - จัดการ user เฉพาะสาขา, ดูข้อมูลทั้งสาขา, อนุมัติระดับสาขา',
      DepartmentHead: 'หัวหน้าแผนก - อนุมัติเอกสารในแผนก, ดูข้อมูลทีมตัวเอง',
      Staff: 'พนักงาน - สร้าง/แก้ไขเอกสารตัวเอง, ดูข้อมูลที่เกี่ยวข้อง',
      Viewer: 'ผู้ดูอย่างเดียว - ดูข้อมูลและ export report'
    };

    const roleLevels = {
      SuperAdmin: 'superadmin',
      SystemAdmin: 'systemadmin',
      BranchAdmin: 'branchadmin',
      DepartmentHead: 'departmenthead',
      Staff: 'staff',
      Viewer: 'viewer'
    };

    // 4. อัปเดต role "Administrator" เป็น "SuperAdmin"
    const adminRole = currentRoles.rows.find(r => r.name === 'Administrator');
    if (adminRole) {
      await client.query(
        `UPDATE roles SET name = $1, description = $2, level = $3, 
         permissions = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5`,
        ['SuperAdmin', roleDescriptions.SuperAdmin, roleLevels.SuperAdmin,
         JSON.stringify(rolePermissions.SuperAdmin), adminRole.id]
      );
      console.log(`✅ Updated "Administrator" → "SuperAdmin"`);
    }

    // 5. อัปเดต "ผู้จัดการ" เป็น "DepartmentHead"
    const managerRole = currentRoles.rows.find(r => r.name === 'ผู้จัดการ');
    if (managerRole) {
      await client.query(
        `UPDATE roles SET name = $1, description = $2, level = $3,
         permissions = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5`,
        ['DepartmentHead', roleDescriptions.DepartmentHead, roleLevels.DepartmentHead,
         JSON.stringify(rolePermissions.DepartmentHead), managerRole.id]
      );
      console.log(`✅ Updated "ผู้จัดการ" → "DepartmentHead"`);
    }

    // 6. อัปเดต "ผู้บริหาร" เป็น "BranchAdmin"
    const execRole = currentRoles.rows.find(r => r.name === 'ผู้บริหาร');
    if (execRole) {
      await client.query(
        `UPDATE roles SET name = $1, description = $2, level = $3,
         permissions = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5`,
        ['BranchAdmin', roleDescriptions.BranchAdmin, roleLevels.BranchAdmin,
         JSON.stringify(rolePermissions.BranchAdmin), execRole.id]
      );
      console.log(`✅ Updated "ผู้บริหาร" → "BranchAdmin"`);
    }

    // 7. สร้าง role ที่ยังไม่มี
    const existingNames = (await client.query('SELECT name FROM roles')).rows.map(r => r.name);
    
    for (const [roleName, perms] of Object.entries(rolePermissions)) {
      if (!existingNames.includes(roleName)) {
        await client.query(
          `INSERT INTO roles (name, description, permissions, level) VALUES ($1, $2, $3, $4)`,
          [roleName, roleDescriptions[roleName], JSON.stringify(perms), roleLevels[roleName]]
        );
        console.log(`✅ Created new role: "${roleName}"`);
      }
    }

    await client.query('COMMIT');

    // 8. แสดงผลลัพธ์
    const finalRoles = await client.query('SELECT id, name, level, description FROM roles ORDER BY name');
    console.log('\n📋 Final roles:');
    finalRoles.rows.forEach(r => {
      console.log(`  - ${r.name} (${r.level}): ${r.description?.substring(0, 50)}...`);
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

updateRoles();
