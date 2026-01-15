const SESSION_ENDPOINT = "/autopo/api/ses";
const REPORT_ENDPOINT = "/autopo/api/report/query";
const COMPAT_MODE = true; // true = ถ้าไม่มีวันที่ จะ POST {} ดึงทั้งหมด, ถ้ามีวันที่ จะ GET ด้วยช่วงวันที่

// ===== Helpers =====
async function fetchJSON(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error("HTTP_" + r.status);
  const j = await r.json();
  if (j && j.ok === false) throw new Error(j.detail || "API_NOT_OK");
  return j;
}
async function fetchSession() {
  const j = await fetchJSON(SESSION_ENDPOINT);
  return j.user || {};
}

// แปลงวันที่เป็นรูปแบบไทย
function formatThaiDate(dateStr) {
  if (!dateStr) return "-";
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const thaiMonths = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];
  
  const day = date.getDate();
  const month = thaiMonths[date.getMonth()];
  const year = String(date.getFullYear() + 543).slice(-2);
  
  return `${day} ${month} ${year}`;
}

// แปลงสถานะเป็นข้อความและสี
function getStatusBadge(hasStarted) {
  if (hasStarted) {
    return '<span class="badge bg-primary">กำลังทำ</span>';
  } else {
    return '<span class="badge bg-secondary"></span>';
  }
}

// ===== โหลดข้อมูลสาขา =====
window.BRANCH_MAP = {};
(async function loadBranches() {
  try {
    const res = await fetch("api/branches");
    const json = await res.json();
    if (json.ok && Array.isArray(json.data)) {
      json.data.forEach(b => {
        window.BRANCH_MAP[b.id] = b.name;
      });
    }
  } catch (e) {
    console.warn("Failed to load branches:", e);
  }
})();

// ===== Session (ชื่อผู้ใช้/สาขา) =====
(async function initSession() {
  try {
    const user = await fetchSession();
    const b = document.getElementById("branchName");
    if (b) b.textContent = user.branchName || user.branchId || "-";
  } catch (e) {
    console.warn(e);
  }
})();

// ===== DataTable (คอลัมน์คงที่) =====
let dt;
let RUN_COUNT = new Map(); // purch_id -> count(run_no)
function initTable() {
  if ($.fn.DataTable.isDataTable("#reportTable")) {
    $("#reportTable").DataTable().destroy();
  }

  dt = $("#reportTable").DataTable({
    data: [],
    columns: [
      {
        data: "receive_date",
        title: "วันที่สั่ง",
        className: "col-center",
        render: (v) => formatThaiDate(v),
      },
      { data: "purch_id", title: "เลขที่ PO" },
      { data: "item_name", title: "สินค้า" },
      { data: "purch_name", title: "บริษัท" },
      {
        data: "invent_site_id",
        title: "สาขา",
        className: "col-center",
        render: (v) => v || "-",
      },
      {
        data: "plant_code",
        title: "รหัสคลัง",
        className: "col-center",
        render: (v) => v || "-",
      },
      {
        data: "plant_name",
        title: "แพลนท์",
        className: "col-center",
        render: (v) => v || "-",
      },
      {
        data: "run_count",
        title: "เที่ยววิ่ง",
        className: "col-center col-num",
        render: (v) => v || "-",
      },
      { data: "driver_name", title: "คนขับ" },
      { data: "vehicle_name", title: "ทะเบียนรถ" },
      {
        data: null,
        title: "แก้ไข",
        className: "col-center",
        orderable: false,
        render: function (data, type, row) {
          return `<button class="btn btn-sm btn-warning btn-edit" data-id="${row.purch_id || ''}" data-driver="${row.driver_name || ''}" data-vehicle="${row.vehicle_name || ''}">
                    <i class="bi bi-pencil-square"></i> แก้ไข
                  </button>`;
        },
      },
      {
        data: null,
        title: "ยกเลิก",
        className: "col-center",
        orderable: false,
        render: function (data, type, row) {
          return `<button class="btn btn-sm btn-danger btn-cancel" data-id="${row.purch_id || ''}" data-driver="${row.driver_name || ''}" data-vehicle="${row.vehicle_name || ''}">
                    <i class="bi bi-x-circle"></i> ยกเลิก
                  </button>`;
        },
      },
    ],

    pageLength: 10,
    autoWidth: false,
    responsive: true,
    stripeClasses: [],

    // ✅ ภาษาไทยแบบปกติ
    language: {
      search: "ค้นหา:",
      lengthMenu: "แสดง _MENU_ รายการ",
      info: "แสดง _START_ ถึง _END_ จากทั้งหมด _TOTAL_ รายการ",
      infoEmpty: "ไม่มีข้อมูล",
      zeroRecords: "ไม่พบข้อมูลที่ค้นหา",
      paginate: {
        first: "หน้าแรก",
        last: "หน้าสุดท้าย",
        next: "ถัดไป",
        previous: "ก่อนหน้า",
      },
    },

    // ✅ เลย์เอาต์เดียวกับหน้าเกณฑ์
    dom:
      '<"row mb-2"<"col-md-6"l><"col-md-6 text-md-end"f>>' +
      "rt" +
      '<"row mt-2"<"col-md-6"i><"col-md-6 text-md-end"p>>',

    // ตัวอย่าง: ปิด sort บางคอลัมน์ (ปรับได้)
    columnDefs: [{ orderable: false, targets: [0, 2, 3, 4, 6, 9, 10, 11] }],

    order: [[0, "asc"]],
  });
}

initTable();

// ===== โหลดข้อมูลจาก backend (ใช้ columns คงที่ด้านบน) =====
async function fetchReport(start, end) {
  if (COMPAT_MODE && (!start || !end)) {
    // POST ดึงทั้งหมด
    const j = await fetchJSON(REPORT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({}),
    });
    return Array.isArray(j.data) ? j.data : [];
  } else {
    // GET ช่วงวันที่
    const url = `${REPORT_ENDPOINT}?start_date=${encodeURIComponent(
      start
    )}&end_date=${encodeURIComponent(end)}`;
    const j = await fetchJSON(url);
    return Array.isArray(j.data) ? j.data : [];
  }
}

async function loadData() {
  const start = document.getElementById("start_date").value;
  const end = document.getElementById("end_date").value;
  try {
    const rows = await fetchReport(start, end);
    dt.clear().rows.add(rows).draw();
    document.getElementById("rowCount").textContent =
      rows.length.toLocaleString();
  } catch (e) {
    console.error(e);
    const box = document.getElementById("errorBox");
    box.classList.remove("d-none");
    box.textContent = e.message || String(e);
  }
}

// ===== UI events =====
// เมื่อเปลี่ยนวันที่เริ่ม ให้ set min ของวันที่สิ้นสุด
document.getElementById("start_date").addEventListener("change", (e) => {
  const endDateInput = document.getElementById("end_date");
  if (e.target.value) {
    endDateInput.min = e.target.value;
    // ถ้าวันสิ้นสุดน้อยกว่าวันเริ่ม ให้ล้างวันสิ้นสุด
    if (endDateInput.value && endDateInput.value < e.target.value) {
      endDateInput.value = "";
    }
  } else {
    endDateInput.min = "";
  }
});

document.getElementById("btnLoad").addEventListener("click", loadData);

document.getElementById("btnClearDate").addEventListener("click", () => {
  document.getElementById("start_date").value = "";
  document.getElementById("end_date").value = "";
  document.getElementById("end_date").min = ""; // ล้าง min ด้วย
  loadData(); // โหลดข้อมูลทั้งหมด
});

// ===== Default: รอให้โหลดสาขาเสร็จก่อน แล้วค่อยดึงข้อมูล =====
(async function () {
  // รอให้ BRANCH_MAP โหลดเสร็จ
  let retries = 0;
  while (Object.keys(window.BRANCH_MAP).length === 0 && retries < 20) {
    await new Promise(r => setTimeout(r, 100));
    retries++;
  }
  loadData();
})();

// ===== Event handlers สำหรับปุ่มแก้ไขและยกเลิก =====
$(document).on("click", ".btn-edit", async function () {
  const purchId = $(this).data("id");
  const driverName = $(this).data("driver");
  const vehicleName = $(this).data("vehicle");
  
  // ดึงรายละเอียดรอบทั้งหมดของ PO นี้จาก API
  let runs = [];
  try {
    const response = await fetch(`api/report/runs?purch_id=${encodeURIComponent(purchId)}`);
    const data = await response.json();
    if (data.ok && Array.isArray(data.data)) {
      // กรองเฉพาะรอบที่ตรงกับคนขับ/รถที่กดแก้ไข
      runs = data.data.filter(r => 
        r.driver_name === driverName && r.vehicle_name === vehicleName
      );
    }
  } catch (e) {
    console.error("Failed to load runs:", e);
    Swal.fire({
      title: "เกิดข้อผิดพลาด",
      text: "ไม่สามารถโหลดข้อมูลรอบวิ่งได้",
      icon: "error",
      confirmButtonColor: "#d33",
    });
    return;
  }
  
  if (runs.length === 0) {
    Swal.fire({
      title: "ไม่พบข้อมูล",
      text: "ไม่พบเที่ยววิ่งของ PO นี้",
      icon: "warning",
      confirmButtonColor: "#5b8cd8",
    });
    return;
  }
  
  // ถ้ามีหลายรอบ ให้เลือกรอบที่จะแก้ไข
  let selectedRunNo;
  if (runs.length > 1) {
    const runOptions = runs
      .map(r => `
        <div class="form-check mb-2">
          <input class="form-check-input" type="radio" name="selectRun" id="run${r.run_no}" value="${r.run_no}" ${r.run_no === runs[0].run_no ? 'checked' : ''}>
          <label class="form-check-label" for="run${r.run_no}">
            เที่ยวที่ ${r.run_no} ${getStatusBadge(r.has_started)}
          </label>
        </div>
      `)
      .join("");
    
    const allRunsOption = `
      <div class="form-check mb-2">
        <input class="form-check-input" type="radio" name="selectRun" id="editAllRuns" value="all_runs">
        <label class="form-check-label" for="editAllRuns">
          แก้ไขทุกเที่ยว
        </label>
      </div>
    `;
    
    const { value: selected } = await Swal.fire({
      title: "เลือกเที่ยวที่จะแก้ไข",
      html: `
        <p class="mb-3">PO: ${purchId} มี ${runs.length} เที่ยววิ่ง</p>
        <div class="text-start">
          ${runOptions}
          <hr class="my-3">
          ${allRunsOption}
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#5b8cd8",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "ถัดไป",
      cancelButtonText: "ยกเลิก",
      preConfirm: () => {
        const selected = document.querySelector('input[name="selectRun"]:checked');
        return selected ? selected.value : null;
      }
    });
    
    if (!selected) return;
    selectedRunNo = selected === 'all_runs' ? null : selected;
  } else {
    selectedRunNo = runs[0].run_no;
  }
  
  // หาข้อมูลรอบที่เลือก (ถ้าเลือกทุกรอบให้ใช้รอบแรก)
  const selectedRun = selectedRunNo 
    ? runs.find(r => r.run_no == selectedRunNo)
    : runs[0];
  const currentDriver = selectedRun?.driver_name || "";
  const currentVehicle = selectedRun?.vehicle_name || "";
  const currentDate = selectedRun?.receive_date || "";
  
  // ดึงรายการคนขับและรถจาก API
  let drivers = [];
  let vehicles = [];
  
  try {
    const [driversRes, vehiclesRes] = await Promise.all([
      fetch("api/drivers?limit=500"),
      fetch("api/vehicles?limit=500")
    ]);
    
    const driversData = await driversRes.json();
    const vehiclesData = await vehiclesRes.json();
    
    if (driversData.ok) drivers = driversData.data || [];
    if (vehiclesData.ok) vehicles = vehiclesData.data || [];
  } catch (e) {
    console.error("Failed to load drivers/vehicles:", e);
  }
  
  // สร้าง options สำหรับ dropdown
  const driverOptions = drivers
    .map(d => `<option value="${d.id}" ${d.name === currentDriver ? 'selected' : ''}>${d.name} (${d.id})</option>`)
    .join("");
  
  const vehicleOptions = vehicles
    .map(v => `<option value="${v.id}" ${v.plate === currentVehicle ? 'selected' : ''}>${v.plate}</option>`)
    .join("");
  
  const runInfoText = selectedRunNo 
    ? `<p class="mb-1">เที่ยวที่: ${selectedRunNo}</p>`
    : `<p class="mb-1 text-danger">แก้ไขทุกเที่ยว </p>`;
  
  Swal.fire({
    title: "แก้ไขข้อมูล",
    html: `
      <div class="text-start mb-3">
        <p class="mb-1">PO: ${purchId}</p>
        ${runInfoText}
      </div>
      <div class="text-start mb-3">
        <label class="form-label fw-bold">วันที่:</label>
        <input type="date" id="edit-date" class="form-control" value="${currentDate}" />
      </div>
      <div class="text-start mb-3">
        <label class="form-label fw-bold">คนขับ:</label>
        <select id="edit-driver" class="form-select" style="width: 100%">
          <option value="">-- เลือกคนขับ --</option>
          ${driverOptions}
        </select>
      </div>
      <div class="text-start">
        <label class="form-label fw-bold">ทะเบียนรถ:</label>
        <select id="edit-vehicle" class="form-select" style="width: 100%">
          <option value="">-- เลือกทะเบียนรถ --</option>
          ${vehicleOptions}
        </select>
      </div>
    `,
    icon: "info",
    showCancelButton: true,
    confirmButtonText: "บันทึก",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#5b8cd8",
    cancelButtonColor: "#6c757d",
    didOpen: () => {
      // เปิดใช้งาน Select2 สำหรับ dropdown
      $("#edit-driver").select2({
        theme: "bootstrap-5",
        width: "100%",
        placeholder: "-- เลือกคนขับ --",
        allowClear: false,
        dropdownParent: $(".swal2-popup"),
        language: {
          noResults: () => "ไม่พบข้อมูล",
          searching: () => "กำลังค้นหา..."
        }
      });
      
      $("#edit-vehicle").select2({
        theme: "bootstrap-5",
        width: "100%",
        placeholder: "-- เลือกทะเบียนรถ --",
        allowClear: false,
        dropdownParent: $(".swal2-popup"),
        language: {
          noResults: () => "ไม่พบข้อมูล",
          searching: () => "กำลังค้นหา..."
        }
      });
    },
    preConfirm: () => {
      const receiveDate = document.getElementById("edit-date").value;
      const driverId = document.getElementById("edit-driver").value;
      const vehicleId = document.getElementById("edit-vehicle").value;
      
      if (!receiveDate) {
        Swal.showValidationMessage("กรุณาเลือกวันที่");
        return false;
      }
      
      if (!driverId || !vehicleId) {
        Swal.showValidationMessage("กรุณาเลือกคนขับและทะเบียนรถ");
        return false;
      }
      
      return { receiveDate, driverId, vehicleId };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const { receiveDate, driverId, vehicleId } = result.value;
        
        const requestBody = {
          purch_id: purchId,
          receive_date: receiveDate,
          driver_id: driverId,
          vehicle_id: vehicleId,
        };
        
        // ถ้ามี run_no ให้แก้ไขเฉพาะรอบ ถ้าไม่มีจะแก้ไขทุกรอบ
        if (selectedRunNo) {
          requestBody.run_no = selectedRunNo;
        }
        
        const response = await fetch("api/report/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });
        
        const data = await response.json();
        
        if (data.ok) {
          Swal.fire({
            title: "บันทึกสำเร็จ!",
            text: "แก้ไขข้อมูลเรียบร้อยแล้ว",
            icon: "success",
            confirmButtonColor: "#5b8cd8",
          });
          loadData(); // โหลดข้อมูลใหม่
        } else {
          throw new Error(data.detail || "ไม่สามารถบันทึกได้");
        }
      } catch (error) {
        Swal.fire({
          title: "เกิดข้อผิดพลาด",
          text: error.message || "ไม่สามารถบันทึกข้อมูลได้",
          icon: "error",
          confirmButtonColor: "#d33",
        });
      }
    }
  });
});

$(document).on("click", ".btn-cancel", async function () {
  const purchId = $(this).data("id");
  const driverName = $(this).data("driver");
  const vehicleName = $(this).data("vehicle");
  
  // ดึงรายละเอียดรอบทั้งหมดของ PO นี้จาก API
  let runs = [];
  try {
    const response = await fetch(`api/report/runs?purch_id=${encodeURIComponent(purchId)}`);
    const data = await response.json();
    if (data.ok && Array.isArray(data.data)) {
      // กรองเฉพาะรอบที่ตรงกับคนขับ/รถที่กดยกเลิก
      runs = data.data.filter(r => 
        r.driver_name === driverName && r.vehicle_name === vehicleName
      );
    }
  } catch (e) {
    console.error("Failed to load runs:", e);
    Swal.fire({
      title: "เกิดข้อผิดพลาด",
      text: "ไม่สามารถโหลดข้อมูลเที่ยววิ่งได้",
      icon: "error",
      confirmButtonColor: "#d33",
    });
    return;
  }
  
  const totalRuns = runs.length;
  
  if (totalRuns === 0) {
    Swal.fire({
      title: "ไม่พบข้อมูล",
      text: "ไม่พบเที่ยววิ่งของ PO นี้",
      icon: "warning",
      confirmButtonColor: "#5b8cd8",
    });
    return;
  }
  
  // ถ้ามีมากกว่า 1 เที่ยว ให้เลือกว่าจะยกเลิกเฉพาะรอบนี้หรือทุกรอบ
  let cancelOption = 'this_run'; // default
  let selectedRunNo = runs[0].run_no;
  
  if (totalRuns > 1) {
    const runOptions = runs
      .map(r => `
        <div class="form-check mb-2">
          <input class="form-check-input" type="radio" name="cancelRun" id="cancelRun${r.run_no}" value="${r.run_no}" ${r.run_no === runs[0].run_no ? 'checked' : ''}>
          <label class="form-check-label" for="cancelRun${r.run_no}">
            ยกเลิกเที่ยวที่ ${r.run_no} ${getStatusBadge(r.has_started)}
          </label>
        </div>
      `)
      .join("");
      
    const allRunsOption = `
      <div class="form-check mb-2">
        <input class="form-check-input" type="radio" name="cancelRun" id="cancelAllRuns" value="all_runs">
        <label class="form-check-label" for="cancelAllRuns">
          ยกเลิกทั้งหมด
        </label>
      </div>
    `;
    
    const { value: selected } = await Swal.fire({
      title: "เลือกวิธีการยกเลิก",
      html: `
        <p class="mb-3">PO: ${purchId} มี ${totalRuns} เที่ยววิ่ง</p>
        <div class="text-start">
          ${runOptions}
          <hr class="my-3">
          ${allRunsOption}
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "ยืนยันการยกเลิก",
      cancelButtonText: "ไม่ยกเลิก",
      preConfirm: () => {
        const selected = document.querySelector('input[name="cancelRun"]:checked');
        return selected ? selected.value : null;
      }
    });
    
    if (!selected) return;
    
    if (selected === 'all_runs') {
      cancelOption = 'all_runs';
    } else {
      cancelOption = 'this_run';
      selectedRunNo = selected;
    }
  }
  
  // แสดง confirmation ก่อนยกเลิกจริง
  const confirmText = cancelOption === 'all_runs' 
    ? `ยกเลิกทุกเที่ยวของ PO: ${purchId}`
    : `ยกเลิกเที่ยวที่ ${selectedRunNo} ของ PO: ${purchId}`;
  
  const { isConfirmed } = await Swal.fire({
    title: "ยืนยันการยกเลิก",
    html: `<p>${confirmText}</p>`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "ใช่, ยกเลิก",
    cancelButtonText: "ไม่ยกเลิก",
  });
  
  if (isConfirmed) {
    try {
      // เรียก API ยกเลิก
      const body = cancelOption === 'all_runs' 
        ? { purch_id: purchId }  // ไม่ส่ง run_no = ยกเลิกทั้งหมด
        : { purch_id: purchId, run_no: selectedRunNo };  // ส่ง run_no = ยกเลิกเฉพาะรอบ
      
      const response = await fetch(`api/report/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      
      if (data.ok) {
        Swal.fire({
          title: "ยกเลิกสำเร็จ!",
          html: data.message || "รายการถูกยกเลิกแล้ว",
          icon: "success",
          confirmButtonColor: "#5b8cd8",
        });
        loadData(); // โหลดข้อมูลใหม่
      } else {
        throw new Error(data.detail || "ไม่สามารถยกเลิกได้");
      }
    } catch (error) {
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: error.message || "ไม่สามารถยกเลิกรายการได้",
        icon: "error",
        confirmButtonColor: "#d33",
      });
    }
  }
});

function confirmLogout(event) {
  event.preventDefault();
  Swal.fire({
    title: "ออกจากระบบ?",
    text: "คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#5b8cd8",
    cancelButtonColor: "#d33",
    confirmButtonText: "ใช่, ออกจากระบบ",
    cancelButtonText: "ยกเลิก",
  }).then((r) => {
    if (r.isConfirmed) window.location.href = "logout";
  });
}
window.confirmLogout = confirmLogout;
