// login.js
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    // ตรวจสอบว่ามี session อยู่แล้วหรือไม่
    checkSession();

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        // Validate input
        if (!username || !password) {
            Notiflix.Notify.warning('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                Notiflix.Notify.success('เข้าสู่ระบบสำเร็จ!');
                
                // เก็บข้อมูล user ใน localStorage (optional)
                if (data.user) {
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                }

                // Redirect to programs page
                setTimeout(() => {
                    window.location.href = '/programs.html';
                }, 1000);
            } else {
                Notiflix.Notify.failure(data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
            }
        } catch (error) {
            console.error('Login error:', error);
            Notiflix.Notify.failure('เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่');
        }
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
    }

    function hideMessages() {
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
    }

    async function checkSession() {
        try {
            const response = await fetch('/api/check-session');
            const data = await response.json();
            
            if (data.loggedIn) {
                // ถ้า login อยู่แล้ว redirect ไปหน้าเลือกโปรแกรม
                window.location.href = '/programs.html';
            }
        } catch (error) {
            console.log('No active session');
        }
    }
});
