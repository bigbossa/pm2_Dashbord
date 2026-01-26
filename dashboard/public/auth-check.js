// auth-check.js - ไฟล์สำหรับตรวจสอบ session ในทุกหน้า
async function checkAuthAndDisplayUser(requireIT = false) {
    try {
        const response = await fetch('/api/check-session');
        const data = await response.json();
        
        if (!data.loggedIn) {
            // ถ้ายังไม่ login ให้ redirect ไปหน้า login
            window.location.href = '/login.html';
            return null;
        }
        
        // ตรวจสอบว่าต้องการสิทธิ์ IT หรือไม่
        if (requireIT && data.user.department !== 'IT') {
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะแผนก IT เท่านั้น)');
            window.location.href = '/programs.html';
            return null;
        }
        
        // แสดงข้อมูล user ที่ login
        if (data.user) {
            const userInfo = document.getElementById('userInfo');
            if (userInfo) {
                userInfo.textContent = `👤 ${data.user.usersname} (${data.user.username}) - ${data.user.department}`;
            }
        }
        
        return data.user;
    } catch (error) {
        console.error('Error checking session:', error);
        window.location.href = '/login.html';
        return null;
    }
}

// ฟังก์ชัน logout สำหรับใช้ในทุกหน้า
async function logout() {
    Notiflix.Confirm.show(
        'ออกจากระบบ',
        'ต้องการออกจากระบบใช่หรือไม่?',
        'ตกลง',
        'ยกเลิก',
        async function okCb() {
            try {
                const response = await fetch('/api/logout', {
                    method: 'POST'
                });
                
                if (response.ok) {
                    localStorage.removeItem('currentUser');
                    Notiflix.Notify.success('ออกจากระบบสำเร็จ');
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 500);
                }
            } catch (error) {
                console.error('Logout error:', error);
                window.location.href = '/login.html';
            }
        },
        function cancelCb() {
            // ยกเลิก - ไม่ทำอะไร
        }
    );
}

// เรียกใช้ฟังก์ชันนี้อัตโนมัติเมื่อโหลดหน้า
if (window.location.pathname !== '/login.html') {
    document.addEventListener('DOMContentLoaded', checkAuthAndDisplayUser);
}
