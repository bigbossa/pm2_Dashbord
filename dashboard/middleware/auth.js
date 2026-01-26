// middleware/auth.js
// Middleware สำหรับตรวจสอบว่าผู้ใช้ login แล้วหรือยัง

function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        // ถ้า login แล้ว ให้ผ่านไปทำงานต่อ
        next();
    } else {
        // ถ้ายังไม่ login ส่ง error กลับไป
        res.status(401).json({ 
            status: 'error', 
            message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' 
        });
    }
}

// Middleware สำหรับตรวจสอบว่าเป็น IT หรือไม่
function requireIT(req, res, next) {
    if (req.session && req.session.user) {
        if (req.session.user.department === 'IT') {
            // ถ้าเป็น IT ให้ผ่าน
            next();
        } else {
            // ถ้าไม่ใช่ IT ส่ง error
            res.status(403).json({ 
                status: 'error', 
                message: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ (เฉพาะแผนก IT เท่านั้น)' 
            });
        }
    } else {
        // ถ้ายังไม่ login
        res.status(401).json({ 
            status: 'error', 
            message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' 
        });
    }
}

// Middleware สำหรับตรวจสอบสิทธิ์เข้าถึงโปรแกรม
function requireProgramAccess(programCode) {
    return async (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ 
                status: 'error', 
                message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' 
            });
        }

        // ถ้าเป็น IT ให้ผ่านทันที
        if (req.session.user.department === 'IT') {
            return next();
        }

        // ตรวจสอบสิทธิ์จากฐานข้อมูล
        const pool = require('../db');
        const client = await pool.connect();
        try {
            const result = await client.query(`
                SELECT COUNT(*) as count
                FROM user_program_auth upa
                JOIN programs p ON upa.program_id = p.program_id
                WHERE upa.iduser = $1 AND p.program_code = $2
            `, [req.session.user.iduser, programCode]);

            if (result.rows[0].count > 0) {
                next();
            } else {
                res.status(403).json({ 
                    status: 'error', 
                    message: 'คุณไม่มีสิทธิ์เข้าถึงโปรแกรมนี้' 
                });
            }
        } catch (err) {
            console.error('Error checking program access:', err);
            res.status(500).json({ 
                status: 'error', 
                message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' 
            });
        } finally {
            client.release();
        }
    };
}

module.exports = { requireAuth, requireIT, requireProgramAccess };
