document.addEventListener('DOMContentLoaded', async () => {
    // ตรวจสอบว่าเป็น IT หรือไม่
    await checkAuthAndDisplayUser(true); // requireIT = true
    await loadUsers();
});

async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const users = await response.json();
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';

        users.forEach(user => {
            const tr = document.createElement('tr');
            const statusClass = user.is_active ? 'status-active' : 'status-inactive';
            const statusText = user.is_active ? 'Active' : 'Inactive';
            const toggleBtnText = user.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน';
            const toggleBtnClass = user.is_active ? 'btn-danger' : 'btn-success';

            tr.innerHTML = `
                <td>${user.iduser}</td>
                <td>${user.username}</td>
                <td>${user.usersname}</td>
                <td>${user.department || '-'}</td>
                <td>${user.site || '-'}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn-edit" onclick="location.href='edit_user.html?id=${user.iduser}'">แก้ไข</button>
                    <button class="${toggleBtnClass}" onclick="toggleStatus(${user.iduser}, ${user.is_active})">${toggleBtnText}</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error:', error);
        alert('ไม่สามารถโหลดข้อมูลผู้ใช้งานได้');
    }
}

async function toggleStatus(id, currentStatus) {
    if (!confirm(`ต้องการเปลี่ยนสถานะผู้ใช้งาน ID ${id} ใช่หรือไม่?`)) return;

    try {
        const response = await fetch(`/api/users/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: !currentStatus })
        });

        if (response.ok) {
            loadUsers();
        } else {
            alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('เชื่อมต่อ Server ไม่ได้');
    }
}
