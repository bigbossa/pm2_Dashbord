// login.js - จัดการ Login Form และแจ้งเตือนด้วย SweetAlert2

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  const usernameInput = form.querySelector('input[name="username"]');
  const passwordInput = form.querySelector('input[name="password"]');
  const rememberMeCheckbox = document.getElementById('rememberMe');

  // โหลดข้อมูลที่จำไว้
  loadRememberedCredentials();

  function loadRememberedCredentials() {
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    const rememberedPassword = localStorage.getItem('rememberedPassword');
    
    if (rememberedUsername && rememberedPassword) {
      usernameInput.value = rememberedUsername;
      passwordInput.value = rememberedPassword;
      rememberMeCheckbox.checked = true;
    }
  }

  function saveCredentials(username, password) {
    if (rememberMeCheckbox.checked) {
      localStorage.setItem('rememberedUsername', username);
      localStorage.setItem('rememberedPassword', password);
    } else {
      localStorage.removeItem('rememberedUsername');
      localStorage.removeItem('rememberedPassword');
    }
  }
  
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const username = usernameInput.value.trim();
      const password = passwordInput.value.trim();
      
      // ตรวจสอบข้อมูล
      if (!username || !password) {
        return Swal.fire({
          icon: 'warning',
          title: 'แจ้งเตือน',
          text: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน',
          confirmButtonText: 'ตกลง',
        });
      }
      
      // ส่งข้อมูล
      try {
        const response = await fetch('login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        });
        
        // ถ้า redirect (ไม่ใช่ JSON) = สำเร็จ
        const contentType = response.headers.get('content-type');
        
        if (response.redirected || response.status === 302) {
          // redirect สำเร็จ - บันทึกข้อมูลถ้าเลือกจำรหัสผ่าน
          saveCredentials(username, password);
          window.location.href = response.url;
          return;
        }
        
        // ถ้าเป็น HTML ที่มี alert/script (error case)
        if (contentType?.includes('text/html')) {
          const html = await response.text();
          
          // แยกข้อความ error จาก alert
          const alertMatch = html.match(/alert\(['"](.+?)['"]\)/);
          let errorMsg = 'เข้าสู่ระบบไม่สำเร็จ';
          
          if (alertMatch) {
            errorMsg = alertMatch[1];
          }
          
          return Swal.fire({
            icon: 'error',
            title: 'เข้าสู่ระบบไม่สำเร็จ',
            text: errorMsg,
            confirmButtonText: 'ตกลง',
          });
        }
        
        // กรณีอื่นๆ
        if (!response.ok) {
          throw new Error('เข้าสู่ระบบไม่สำเร็จ');
        }
        
        // สำเร็จ
        saveCredentials(username, password);
        await Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          text: 'เข้าสู่ระบบสำเร็จ',
          timer: 1500,
          showConfirmButton: false,
        });
        
        window.location.href = 'manage';
        
      } catch (error) {
        console.error('Login error:', error);
        Swal.fire({
          icon: 'error',
          title: 'ข้อผิดพลาด',
          text: error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
          confirmButtonText: 'ตกลง',
        });
      }
    });
  }
  
  // กด Enter ในฟิลด์ password
  if (passwordInput) {
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        form.dispatchEvent(new Event('submit'));
      }
    });
  }

  // Toggle แสดง/ซ่อนรหัสผ่าน
  const togglePassword = document.getElementById('togglePassword');
  const passwordField = document.getElementById('password');
  const eyeIcon = document.getElementById('eyeIcon');

  if (togglePassword && passwordField && eyeIcon) {
    togglePassword.addEventListener('click', () => {
      const type = passwordField.type === 'password' ? 'text' : 'password';
      passwordField.type = type;

      // เปลี่ยนไอคอน
      if (type === 'text') {
        eyeIcon.innerHTML = `
          <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7 7 0 0 0-2.79.588l.77.771A6 6 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755q-.247.248-.517.486z"/>
          <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829"/>
          <path d="M3.35 5.47q-.27.24-.518.487A13 13 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7 7 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12z"/>
        `;
      } else {
        eyeIcon.innerHTML = `
          <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/>
          <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/>
        `;
      }
    });
  }
});
