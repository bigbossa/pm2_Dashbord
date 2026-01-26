// โหลดรหัสโปรแกรมอัตโนมัติเมื่อเปิดหน้า
window.addEventListener('DOMContentLoaded', async () => {
    // ตรวจสอบว่าเป็น IT หรือไม่
    await checkAuthAndDisplayUser(true); // requireIT = true
    await loadNextProgramCode();
});

async function loadNextProgramCode() {
    try {
        const response = await fetch('/api/programs/next-code');
        const result = await response.json();
        if (response.ok) {
            document.getElementById('programCode').value = result.next_code;
            document.getElementById('displayProgramCode').textContent = result.next_code;
        }
    } catch (error) {
        console.error(error);
        document.getElementById('displayProgramCode').textContent = 'เกิดข้อผิดพลาด';
    }
}

async function addProgram() {
    const name = document.getElementById('programName').value.trim();
    const code = document.getElementById('programCode').value.trim();
    const path = document.getElementById('programPath').value.trim();
    const description = document.getElementById('programDescription').value.trim();

    if (!name) {
        Notiflix.Notify.warning('กรุณากรอกชื่อโปรแกรม');
        return;
    }

    if (!path) {
        Notiflix.Notify.warning('กรุณากรอก Path (URL)');
        return;
    }

    if (!code) {
        Notiflix.Notify.failure('ไม่สามารถสร้างรหัสโปรแกรมได้');
        return;
    }

    try {
        const response = await fetch('/api/programs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                program_name: name, 
                program_code: code,
                path: path,
                description: description || null
            })
        });

        const result = await response.json();
        if (response.ok) {
            Notiflix.Notify.success('บันทึกโปรแกรมสำเร็จ');
            document.getElementById('programName').value = '';
            document.getElementById('programPath').value = '';
            document.getElementById('programDescription').value = '';
            // โหลดรหัสถัดไปสำหรับการเพิ่มครั้งต่อไป
            await loadNextProgramCode();
        } else {
            Notiflix.Notify.failure('Error: ' + result.message);
        }
    } catch (error) {
        console.error(error);
        Notiflix.Notify.failure('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
}

async function addRole() {
    const name = document.getElementById('roleName').value;

    if (!name) {
        alert('กรุณากรอกชื่อสิทธิ์');
        return;
    }

    try {
        const response = await fetch('/api/roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role_name: name })
        });

        const result = await response.json();
        if (response.ok) {
            alert('บันทึกสิทธิ์สำเร็จ');
            document.getElementById('roleName').value = '';
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error(error);
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
}
