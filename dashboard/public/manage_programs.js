// manage_programs.js
let programs = [];
let editingProgramId = null;

// โหลดข้อมูลโปรแกรมทั้งหมด
async function loadPrograms() {
    try {
        const response = await fetch('/api/programs');
        if (!response.ok) throw new Error('Failed to load programs');
        
        programs = await response.json();
        renderPrograms();
    } catch (error) {
        console.error('Error loading programs:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
}

// แสดงรายการโปรแกรม
function renderPrograms() {
    const container = document.getElementById('programsList');
    
    if (programs.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">ยังไม่มีโปรแกรมในระบบ</p>';
        return;
    }
    
    container.innerHTML = programs.map(program => {
        const isActive = program.active !== false; // default เป็น true ถ้าไม่มีค่า
        const statusClass = isActive ? 'active' : 'inactive';
        const statusBadge = isActive 
            ? '<span class="status-badge status-active">✓ ใช้งาน</span>'
            : '<span class="status-badge status-inactive">✕ ปิดใช้งาน</span>';
        
        return `
        <div class="program-card ${statusClass}">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <h3>${program.program_name}</h3>
                ${statusBadge}
            </div>
            <div class="program-info">
                <strong>รหัส:</strong> ${program.program_code}
            </div>
            <div class="program-info">
                <strong>Path:</strong> ${program.path || '<span style="color: #dc3545;">ยังไม่ได้กำหนด</span>'}
            </div>
            ${program.description ? `
                <div class="program-info">
                    <strong>คำอธิบาย:</strong> ${program.description}
                </div>
            ` : ''}
            <div class="toggle-container">
                <span style="font-weight: 500; color: #666;">สถานะการใช้งาน:</span>
                <label class="toggle-switch">
                    <input type="checkbox" ${isActive ? 'checked' : ''} 
                           onchange="toggleProgramStatus(${program.program_id}, this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="btn-group">
                <button class="btn btn-edit" onclick="editProgram(${program.program_id})">
                    ✏️ แก้ไข
                </button>

            </div>
        </div>
    `;
    }).join('');
}

// เปิด Modal สำหรับเพิ่มโปรแกรม
async function openAddModal() {
    editingProgramId = null;
    document.getElementById('modalTitle').textContent = 'เพิ่มโปรแกรมใหม่';
    document.getElementById('programForm').reset();
    
    // ดึงรหัสโปรแกรมถัดไป
    try {
        const response = await fetch('/api/programs/next-code');
        const data = await response.json();
        document.getElementById('programCode').value = data.next_code;
        document.getElementById('programCode').readOnly = true;
    } catch (error) {
        console.error('Error getting next code:', error);
    }
    
    document.getElementById('programModal').style.display = 'block';
}

// แก้ไขโปรแกรม
function editProgram(programId) {
    const program = programs.find(p => p.program_id === programId);
    if (!program) return;
    
    editingProgramId = programId;
    document.getElementById('modalTitle').textContent = 'แก้ไขโปรแกรม';
    document.getElementById('programId').value = program.program_id;
    document.getElementById('programCode').value = program.program_code;
    document.getElementById('programCode').readOnly = true;
    document.getElementById('programName').value = program.program_name;
    document.getElementById('programPath').value = program.path || '';
    document.getElementById('programDescription').value = program.description || '';
    
    document.getElementById('programModal').style.display = 'block';
}

// ปิด Modal
function closeModal() {
    document.getElementById('programModal').style.display = 'none';
    document.getElementById('programForm').reset();
    editingProgramId = null;
}

// บันทึกโปรแกรม (เพิ่มหรือแก้ไข)
document.getElementById('programForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const programData = {
        program_code: document.getElementById('programCode').value,
        program_name: document.getElementById('programName').value,
        path: document.getElementById('programPath').value,
        description: document.getElementById('programDescription').value
    };
    
    try {
        let response;
        if (editingProgramId) {
            // แก้ไข
            response = await fetch(`/api/programs/${editingProgramId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(programData)
            });
        } else {
            // เพิ่มใหม่
            response = await fetch('/api/programs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(programData)
            });
        }
        
        const result = await response.json();
        
        if (result.status === 'success') {
            alert(editingProgramId ? 'แก้ไขโปรแกรมสำเร็จ' : 'เพิ่มโปรแกรมสำเร็จ');
            closeModal();
            loadPrograms(); // โหลดข้อมูลใหม่
        } else {
            alert('เกิดข้อผิดพลาด: ' + result.message);
        }
    } catch (error) {
        console.error('Error saving program:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
});

// ลบโปรแกรม
async function deleteProgram(programId, programName) {
    Notiflix.Confirm.show(
        'ลบโปรแกรม',
        `คุณต้องการลบโปรแกรม "${programName}" ใช่หรือไม่?\n\nการลบจะส่งผลกับผู้ใช้ที่มีสิทธิ์ในโปรแกรมนี้`,
        'ยืนยัน',
        'ยกเลิก',
        async function okCb() {
            try {
                const response = await fetch(`/api/programs/${programId}`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (result.status === 'success') {
                    Notiflix.Notify.success('ลบโปรแกรมสำเร็จ');
                    loadPrograms();
                } else {
                    Notiflix.Notify.failure('เกิดข้อผิดพลาด: ' + result.message);
                }
            } catch (error) {
                console.error('Error deleting program:', error);
                Notiflix.Notify.failure('เกิดข้อผิดพลาดในการลบข้อมูล');
            }
        },
        function cancelCb() {
            // ยกเลิก
        }
    );
}

// ฟังก์ชัน Logout
function logout() {
    Notiflix.Confirm.show(
        'ออกจากระบบ',
        'ต้องการออกจากระบบหรือไม่?',
        'ตกลง',
        'ยกเลิก',
        function okCb() {
            fetch('/api/logout', { method: 'POST' })
                .then(() => {
                    Notiflix.Notify.success('ออกจากระบบสำเร็จ');
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 500);
                })
                .catch(err => {
                    console.error('Logout error:', err);
                    window.location.href = '/login.html';
                });
        },
        function cancelCb() {
            // ยกเลิก - ไม่ทำอะไร
        }
    );
}

// ปิด Modal เมื่อคลิกนอก Modal
window.onclick = function(event) {
    const modal = document.getElementById('programModal');
    if (event.target === modal) {
        closeModal();
    }
}

// เปลี่ยนสถานะเปิด/ปิดการใช้งานโปรแกรม
async function toggleProgramStatus(programId, isActive) {
    try {
        const response = await fetch(`/api/programs/${programId}/toggle`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: isActive })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            Notiflix.Notify.success(isActive ? 'เปิดใช้งานโปรแกรมแล้ว' : 'ปิดใช้งานโปรแกรมแล้ว');
            loadPrograms(); // โหลดข้อมูลใหม่
        } else {
            Notiflix.Notify.failure('เกิดข้อผิดพลาด: ' + result.message);
            loadPrograms(); // โหลดข้อมูลกลับเพื่อ revert สถานะ
        }
    } catch (error) {
        console.error('Error toggling program status:', error);
        Notiflix.Notify.failure('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
        loadPrograms(); // โหลดข้อมูลกลับเพื่อ revert สถานะ
    }
}

// โหลดข้อมูลเมื่อเปิดหน้า
loadPrograms();
