// ตัวแปรเก็บข้อมูล Roles เพื่อใช้ซ้ำตอนสร้าง Dropdown
let globalRoles = [];

// 1. ทำงานทันทีเมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', async () => {
    await loadInitData();
});

// ฟังก์ชันดึงข้อมูลจาก Server มาสร้างตาราง
async function loadInitData() {
    try {
        const response = await fetch('/api/init-data');
        const data = await response.json();
        
        globalRoles = data.roles; // เก็บ Roles ไว้ใช้
        renderTable(data.programs);
    } catch (error) {
        console.error('Error loading data:', error);
        alert('ไม่สามารถดึงข้อมูลระบบได้');
    }
}

// ฟังก์ชันวาดตาราง HTML
function renderTable(programs) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = ''; // เคลียร์ของเก่า

    programs.forEach(prog => {
        // สร้าง Dropdown Role HTML
        let roleOptions = `<option value="">-- เลือก Role --</option>`;
        globalRoles.forEach(r => {
            roleOptions += `<option value="${r.role_id}">${r.role_name}</option>`;
        });

        const row = `
            <tr id="row-${prog.program_id}">
                <td style="text-align:center;">
                    <input type="checkbox" class="prog-check" data-id="${prog.program_id}" onchange="toggleRow('${prog.program_id}')">
                </td>
                <td>${prog.program_name} (${prog.program_code})</td>
                <td>
                    <select id="role-${prog.program_id}" class="disabled" disabled>
                        ${roleOptions}
                    </select>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// ฟังก์ชันเปิด/ปิด Row เมื่อติ๊ก Checkbox
function toggleRow(id) {
    const checkbox = document.querySelector(`.prog-check[data-id="${id}"]`);
    const row = document.getElementById(`row-${id}`);
    const roleSelect = document.getElementById(`role-${id}`);

    if (checkbox.checked) {
        row.classList.add('active-row');
        roleSelect.disabled = false;
        roleSelect.classList.remove('disabled');
    } else {
        row.classList.remove('active-row');
        roleSelect.disabled = true;
        roleSelect.classList.add('disabled');
        roleSelect.value = ""; // เคลียร์ค่า
    }
}

// ฟังก์ชันบันทึกข้อมูล
async function submitData() {
    // 1. เก็บข้อมูล User
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        alert("กรุณากรอก Username และ Password");
        return;
    }

    const payload = {
        username: username,
        password: password,
        usersname: document.getElementById('usersname').value,
        department: document.getElementById('department').value,
        site: document.getElementById('site').value,
        access_list: []
    };

    // 2. เก็บข้อมูลสิทธิ์ (เฉพาะที่ติ๊ก)
    const checkboxes = document.querySelectorAll('.prog-check:checked');
    for (const chk of checkboxes) {
        const id = chk.getAttribute('data-id');
        const roleId = document.getElementById(`role-${id}`).value;

        if (!roleId) {
            alert('กรุณาเลือกสิทธิ์ (Role) สำหรับโปรแกรมที่เลือก');
            return;
        }

        payload.access_list.push({
            program_id: id,
            role_id: roleId
        });
    }

    // 3. ยิง API
    try {
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await res.json();
        if (result.status === 'success') {
            alert('✅ บันทึกข้อมูลสำเร็จ!');
            window.location.reload();
        } else {
            alert('❌ เกิดข้อผิดพลาด: ' + result.message);
        }
    } catch (err) {
        alert('เชื่อมต่อ Server ไม่ได้');
    }
}