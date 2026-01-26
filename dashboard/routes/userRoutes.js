// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../db'); // เรียกใช้ db จากไฟล์กลาง
const { requireAuth, requireIT } = require('../middleware/auth');

console.log('Loading userRoutes...');

// API 1: ดึงข้อมูลเริ่มต้น (GET /api/init-data)
router.get('/init-data', async (req, res) => {
    const client = await pool.connect();
    try {
        const programs = await client.query('SELECT * FROM programs ORDER BY program_id');
        const roles = await client.query('SELECT * FROM roles ORDER BY role_id');
        res.json({ programs: programs.rows, roles: roles.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// API 2: บันทึก User (POST /api/users)
router.post('/users', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { username, password, usersname, department, site, access_list } = req.body;

        // 1. สร้าง User
        const hashedPassword = await bcrypt.hash(password, 10);
        const userRes = await client.query(
            'INSERT INTO useryc (username, password, usersname, department, site) VALUES ($1, $2, $3, $4, $5) RETURNING iduser',
            [username, hashedPassword, usersname, department, site]
        );
        const newUserId = userRes.rows[0].iduser;

        // 2. บันทึกสิทธิ์
        if (access_list && access_list.length > 0) {
            for (const item of access_list) {
                await client.query(
                    'INSERT INTO user_program_auth (iduser, program_id, role_id) VALUES ($1, $2, $3)',
                    [newUserId, item.program_id, item.role_id]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ status: 'success', message: 'User created successfully' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ status: 'error', message: err.message });
    } finally {
        client.release();
    }
});

// API 3: ดึงรหัสโปรแกรมถัดไป (GET /api/programs/next-code)
router.get('/programs/next-code', async (req, res) => {
    const client = await pool.connect();
    try {
        // ดึงรหัสโปรแกรมล่าสุดที่มีรูปแบบ PROG###
        const result = await client.query(
            "SELECT program_code FROM programs WHERE program_code ~ '^PROG[0-9]+$' ORDER BY program_code DESC LIMIT 1"
        );
        
        let nextCode;
        if (result.rows.length === 0) {
            // ถ้ายังไม่มีรหัสเลย เริ่มที่ PROG001
            nextCode = 'PROG001';
        } else {
            // ดึงตัวเลขจากรหัสล่าสุดแล้วเพิ่ม 1
            const lastCode = result.rows[0].program_code;
            const lastNumber = parseInt(lastCode.substring(4)); // ตัด "PROG" ออกแล้วแปลงเป็นเลข
            const nextNumber = lastNumber + 1;
            nextCode = 'PROG' + String(nextNumber).padStart(3, '0');
        }
        
        res.json({ next_code: nextCode });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: err.message });
    } finally {
        client.release();
    }
});

// API 4: ดึงรายการโปรแกรมทั้งหมด (GET /api/programs)
router.get('/programs', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM programs ORDER BY program_code');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: err.message });
    } finally {
        client.release();
    }
});

// API 4: ดึงรายการโปรแกรมทั้งหมด (GET /api/programs)
router.get('/programs', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM programs ORDER BY program_code');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: err.message });
    } finally {
        client.release();
    }
});

// API 5: เพิ่ม Program (POST /api/programs)
router.post('/programs', async (req, res) => {
    const client = await pool.connect();
    try {
        const { program_name, program_code, path, description } = req.body;
        await client.query(
            'INSERT INTO programs (program_name, program_code, path, description) VALUES ($1, $2, $3, $4)',
            [program_name, program_code, path, description]
        );
        res.json({ status: 'success', message: 'Program created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: err.message });
    } finally {
        client.release();
    }
});

// API 6: แก้ไข Program (PUT /api/programs/:id)
router.put('/programs/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { program_name, program_code, path, description } = req.body;
        await client.query(
            'UPDATE programs SET program_name = $1, program_code = $2, path = $3, description = $4 WHERE program_id = $5',
            [program_name, program_code, path, description, id]
        );
        res.json({ status: 'success', message: 'Program updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: err.message });
    } finally {
        client.release();
    }
});

// API 7: ลบ Program (DELETE /api/programs/:id)
router.delete('/programs/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        
        // ลบสิทธิ์ที่เกี่ยวข้องก่อน
        await client.query('DELETE FROM user_program_auth WHERE program_id = $1', [id]);
        
        // ลบโปรแกรม
        await client.query('DELETE FROM programs WHERE program_id = $1', [id]);
        
        res.json({ status: 'success', message: 'Program deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: err.message });
    } finally {
        client.release();
    }
});

// API 7.5: เปลี่ยนสถานะเปิด/ปิดการใช้งานโปรแกรม (PATCH /api/programs/:id/toggle)
router.patch('/programs/:id/toggle', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { active } = req.body;
        
        await client.query(
            'UPDATE programs SET active = $1 WHERE program_id = $2',
            [active, id]
        );
        
        res.json({ status: 'success', message: 'Program status updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: err.message });
    } finally {
        client.release();
    }
});

// API 8: เพิ่ม Role (POST /api/roles)
router.post('/roles', async (req, res) => {
    const client = await pool.connect();
    try {
        const { role_name } = req.body;
        await client.query(
            'INSERT INTO roles (role_name) VALUES ($1)',
            [role_name]
        );
        res.json({ status: 'success', message: 'Role created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: err.message });
    } finally {
        client.release();
    }
});

// API 9: ดึงรายชื่อ User ทั้งหมด (GET /api/users)
router.get('/users', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT iduser, username, usersname, department, site, is_active FROM useryc ORDER BY iduser');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// API 10: ดึงข้อมูล User รายคน + สิทธิ์ (GET /api/users/:id)
router.get('/users/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const userRes = await client.query('SELECT iduser, username, usersname, department, site, is_active FROM useryc WHERE iduser = $1', [id]);
        
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const permissionsRes = await client.query('SELECT program_id, role_id FROM user_program_auth WHERE iduser = $1', [id]);

        const user = userRes.rows[0];
        user.permissions = permissionsRes.rows;

        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// API 11: อัปเดตสถานะ Active (PUT /api/users/:id/status)
router.put('/users/:id/status', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { is_active } = req.body;
        await client.query('UPDATE useryc SET is_active = $1 WHERE iduser = $2', [is_active, id]);
        res.json({ status: 'success', message: 'Status updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// API 12: อัปเดตข้อมูล User และสิทธิ์ (PUT /api/users/:id)
router.put('/users/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { usersname, department, site, access_list } = req.body;

        // 1. อัปเดตข้อมูลพื้นฐาน
        await client.query(
            'UPDATE useryc SET usersname = $1, department = $2, site = $3 WHERE iduser = $4',
            [usersname, department, site, id]
        );

        // 2. ลบสิทธิ์เก่าทั้งหมดออกก่อน
        await client.query('DELETE FROM user_program_auth WHERE iduser = $1', [id]);

        // 3. เพิ่มสิทธิ์ใหม่
        if (access_list && access_list.length > 0) {
            for (const item of access_list) {
                await client.query(
                    'INSERT INTO user_program_auth (iduser, program_id, role_id) VALUES ($1, $2, $3)',
                    [id, item.program_id, item.role_id]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ status: 'success', message: 'User updated successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ status: 'error', message: err.message });
    } finally {
        client.release();
    }
});

// API 13: Login (POST /api/login)
router.post('/login', async (req, res) => {
    const client = await pool.connect();
    try {
        const { username, password } = req.body;

        // ตรวจสอบว่ามี username และ password
        if (!username || !password) {
            return res.status(400).json({ status: 'error', message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
        }

        // ดึงข้อมูล user จากฐานข้อมูล
        const result = await client.query(
            'SELECT iduser, username, password, usersname, department, site, is_active FROM useryc WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ status: 'error', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        }

        const user = result.rows[0];

        // ตรวจสอบว่า user active หรือไม่
        if (!user.is_active) {
            return res.status(401).json({ status: 'error', message: 'บัญชีผู้ใช้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' });
        }

        // ตรวจสอบรหัสผ่าน
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if (!passwordMatch) {
            return res.status(401).json({ status: 'error', message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        }

        // บันทึก session
        req.session.user = {
            iduser: user.iduser,
            username: user.username,
            usersname: user.usersname,
            department: user.department,
            site: user.site
        };

        // ส่งข้อมูล user กลับไป (ไม่รวม password)
        res.json({
            status: 'success',
            message: 'เข้าสู่ระบบสำเร็จ',
            user: {
                iduser: user.iduser,
                username: user.username,
                usersname: user.usersname,
                department: user.department,
                site: user.site
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ status: 'error', message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
    } finally {
        client.release();
    }
});

// API 14: Logout (POST /api/logout)
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ status: 'error', message: 'เกิดข้อผิดพลาดในการออกจากระบบ' });
        }
        res.clearCookie('connect.sid'); // ลบ cookie ของ session
        res.json({ status: 'success', message: 'ออกจากระบบสำเร็จ' });
    });
});

// API 15: ตรวจสอบ session (GET /api/check-session)
router.get('/check-session', (req, res) => {
    if (req.session && req.session.user) {
        res.json({
            loggedIn: true,
            user: req.session.user
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// API 16: ดึงรายการโปรแกรมที่ user มีสิทธิ์เข้าถึง (GET /api/my-programs)
router.get('/my-programs', requireAuth, async (req, res) => {
    const client = await pool.connect();
    try {
        const userId = req.session.user.iduser;
        const department = req.session.user.department;

        // ถ้าเป็น IT ให้เห็นโปรแกรมที่เปิดใช้งานเท่านั้น
        if (department === 'IT') {
            const result = await client.query(`
                SELECT 
                    p.program_id,
                    p.program_name,
                    p.program_code,
                    p.path,
                    p.active,
                    'IT' as role_name,
                    'admin' as access_type
                FROM programs p
                WHERE p.active = true OR p.active IS NULL
                ORDER BY p.program_name
            `);
            return res.json({ 
                status: 'success', 
                programs: result.rows,
                isIT: true 
            });
        }

        // ถ้าไม่ใช่ IT ให้แสดงเฉพาะโปรแกรมที่มีสิทธิ์และเปิดใช้งานเท่านั้น
        const result = await client.query(`
            SELECT 
                p.program_id,
                p.program_name,
                p.program_code,
                p.path,
                p.active,
                r.role_name,
                'user' as access_type
            FROM user_program_auth upa
            JOIN programs p ON upa.program_id = p.program_id
            JOIN roles r ON upa.role_id = r.role_id
            WHERE upa.iduser = $1 AND (p.active = true OR p.active IS NULL)
            ORDER BY p.program_name
        `, [userId]);

        res.json({ 
            status: 'success', 
            programs: result.rows,
            isIT: false 
        });
    } catch (err) {
        console.error('Error fetching programs:', err);
        res.status(500).json({ 
            status: 'error', 
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรแกรม' 
        });
    } finally {
        client.release();
    }
});

module.exports = router;