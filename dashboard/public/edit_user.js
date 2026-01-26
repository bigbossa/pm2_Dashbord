let globalRoles = [];
let currentUserId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // ตรวจสอบว่าเป็น IT หรือไม่
    await checkAuthAndDisplayUser(true); // requireIT = true
    
    const urlParams = new URLSearchParams(window.location.search);
    currentUserId = urlParams.get('id');

    if (!currentUserId) {
        alert('ไม่พบรหัสผู้ใช้งาน');
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('userId').value = currentUserId;
    await loadInitData();
    await loadUserData(currentUserId);
});

async function loadInitData() {
    try {
        const response = await fetch('/api/init-data');
        const data = await response.json();
        globalRoles = data.roles;
        renderTable(data.programs);
    } catch (error) {
        console.error('Error loading init data:', error);
    }
}

function renderTable(programs) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    programs.forEach(prog => {
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
        roleSelect.value = "";
    }
}

async function loadUserData(id) {
    try {
        const response = await fetch(`/api/users/${id}`);
        const user = await response.json();

        // Fill basic info
        document.getElementById('username').value = user.username;
        document.getElementById('usersname').value = user.usersname;
        document.getElementById('department').value = user.department;
        document.getElementById('site').value = user.site;

        // Fill permissions
        if (user.permissions) {
            user.permissions.forEach(perm => {
                const checkbox = document.querySelector(`.prog-check[data-id="${perm.program_id}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                    toggleRow(perm.program_id); // Enable select
                    const roleSelect = document.getElementById(`role-${perm.program_id}`);
                    if (roleSelect) {
                        roleSelect.value = perm.role_id;
                    }
                }
            });
        }

    } catch (error) {
        console.error('Error loading user data:', error);
        alert('ไม่สามารถโหลดข้อมูลผู้ใช้งานได้');
    }
}

async function updateUser() {
    const payload = {
        usersname: document.getElementById('usersname').value,
        department: document.getElementById('department').value,
        site: document.getElementById('site').value,
        access_list: []
    };

    const checkboxes = document.querySelectorAll('.prog-check:checked');
    for (const chk of checkboxes) {
        const id = chk.getAttribute('data-id');
        const roleId = document.getElementById(`role-${id}`).value;
        
        if (!roleId) {
            alert('กรุณาเลือกสิทธิ์ (Role) สำหรับโปรแกรมที่เลือก');
            return; // หยุดการทำงานทันที
        }

        payload.access_list.push({
            program_id: id,
            role_id: roleId
        });
    }

    try {
        const res = await fetch(`/api/users/${currentUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await res.json();
        if (result.status === 'success') {
            alert('✅ บันทึกการแก้ไขสำเร็จ!');
            window.location.href = 'index.html';
        } else {
            alert('❌ เกิดข้อผิดพลาด: ' + result.message);
        }
    } catch (err) {
        alert('เชื่อมต่อ Server ไม่ได้');
    }
}
