// programs.js - จัดการหน้าเลือกโปรแกรม

// โหลดข้อมูลเมื่อเปิดหน้า
window.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadPrograms();
});

// ตรวจสอบการ login
async function checkAuth() {
    try {
        const response = await fetch('/api/check-session');
        const data = await response.json();
        
        if (!data.loggedIn) {
            window.location.href = '/login.html';
            return;
        }
        
        // แสดงข้อมูล user
        document.getElementById('userName').textContent = data.user.usersname || data.user.username;
        document.getElementById('userDept').textContent = data.user.department || '-';
        
        // ถ้าเป็น IT แสดงปุ่มจัดการผู้ใช้
        if (data.user.department === 'IT') {
            document.getElementById('adminBtn').style.display = 'inline-block';
        }
    } catch (error) {
        console.error('Error checking auth:', error);
        window.location.href = '/login.html';
    }
}

// โหลดรายการโปรแกรม
async function loadPrograms() {
    const loadingEl = document.getElementById('loading');
    const gridEl = document.getElementById('programsGrid');
    const noProgramsEl = document.getElementById('noPrograms');
    const errorEl = document.getElementById('errorMsg');
    
    try {
        const response = await fetch('/api/my-programs');
        const data = await response.json();
        
        loadingEl.style.display = 'none';
        
        if (data.status === 'error') {
            errorEl.textContent = data.message;
            errorEl.style.display = 'block';
            return;
        }
        
        if (data.programs.length === 0) {
            noProgramsEl.style.display = 'block';
            return;
        }
        
        // แสดงรายการโปรแกรม
        gridEl.style.display = 'grid';
        gridEl.innerHTML = data.programs.map(program => {
            const isIT = data.isIT;
            // ใช้ path จาก database ถ้ามี ถ้าไม่มีให้ใช้ fallback
            const url = program.path || getProgramUrl(program.program_code);
            
            // Debug: แสดง program info
            console.log('Rendering program:', {
                name: program.program_name,
                code: program.program_code,
                path: program.path,
                url: url
            });
            
            return `
                <a href="${url}" class="program-card">
                    ${isIT ? '<div class="admin-badge">👑 IT Admin</div>' : ''}
                    <h3>${program.program_name}</h3>
                    <div class="role">🔑 ${program.role_name}</div>
                </a>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading programs:', error);
        loadingEl.style.display = 'none';
        errorEl.textContent = 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
        errorEl.style.display = 'block';
    }
}

// แปลง program code เป็น URL
function getProgramUrl(programCode) {
    // แปลงเป็นตัวพิมพ์ใหญ่เพื่อ match แน่นอน
    const code = String(programCode).toUpperCase().trim();
    
    const urlMap = {
        // Standard codes
        'HOMECARE': '/homecare',
        'REPAIR': '/repair',
        'AUTOPO': '/autopo/login',
        'YCSALES': '/ycsalescrm',
        'YCSALESCRM': '/ycsalescrm',
        
        // Custom program codes from database
        'PROG003': '/autopo/login',    // autoPO
        'PRG1': '/homecare',           // Sample Program 1
        'PRG2': '/repair',             // Sample Program 2
        'PROGOM1': '/ycsalescrm',      // ปราสาท
        'PROGOM2': '/homecare'         // เช็คเปเซล์
    };
    
    const url = urlMap[code];
    
    if (!url) {
        console.warn(`Unknown program code: ${programCode} (converted to ${code})`);
        return '#';
    }
    
    console.log(`Program: ${programCode} -> URL: ${url}`);
    return url;
}

// ออกจากระบบ
async function logout() {
    Notiflix.Confirm.show(
        'ออกจากระบบ',
        'ต้องการออกจากระบบหรือไม่?',
        'ตกลง',
        'ยกเลิก',
        async function okCb() {
            try {
                const response = await fetch('/api/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const data = await response.json();
                
                if (data.status === 'success') {
                    Notiflix.Notify.success('ออกจากระบบสำเร็จ');
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 500);
                } else {
                    Notiflix.Notify.failure('เกิดข้อผิดพลาดในการออกจากระบบ');
                }
            } catch (error) {
                console.error('Logout error:', error);
                Notiflix.Notify.failure('เกิดข้อผิดพลาดในการออกจากระบบ');
            }
        },
        function cancelCb() {
            // ยกเลิก - ไม่ทำอะไร
        }
    );
}

// ไปหน้าจัดการผู้ใช้
function goToAdmin() {
    window.location.href = '/index.html';
}
