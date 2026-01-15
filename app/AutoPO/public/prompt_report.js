const SESSION_ENDPOINT = "/autopo/api/ses";
const PROMPT_ENDPOINT = "/autopo/api/success_report";

async function fetchJSON(url, opts) {
  const r = await fetch(url, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j?.ok === false)
    throw new Error(j?.detail || `HTTP_${r.status}`);
  return j;
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

async function fetchSession() {
  try {
    const j = await fetchJSON(SESSION_ENDPOINT, {
      credentials: "include",
    });
    return j.user || {};
  } catch {
    return {};
  }
}

/* ========= คำนวณ diff ไมล์ ========= */
function calcMileDiff(row) {
  const start = Number(row.mile_start) || 0;
  const end = Number(row.mile_end) || 0;

  if (!start || !end) return { hasData: false };

  const diff = end - start;
  return {
    hasData: true,
    diff,
    // color: diff > 14 ? "text-danger" : "text-dark",
    diffStr: diff.toLocaleString(),
  };
}

let dataTable;

function initTable() {
  if ($.fn.DataTable.isDataTable("#promptTable")) {
    $("#promptTable").DataTable().destroy();
  }

  dataTable = $("#promptTable").DataTable({
    pageLength: 25,
    autoWidth: false,
    responsive: true,
    order: [[1, "asc"]],
    stripeClasses: [],

    language: {
      search: "ค้นหา:",
      lengthMenu: "แสดง _MENU_ รายการ",
      info: "แสดง _START_ ถึง _END_ จากทั้งหมด _TOTAL_ รายการ",
      zeroRecords: "ไม่พบข้อมูล",
      paginate: {
        first: "หน้าแรก",
        last: "หน้าสุดท้าย",
        next: "ถัดไป",
        previous: "ก่อนหน้า",
      },
    },
    dom:
      '<"row mb-2"<"col-md-6"l><"col-md-6 text-md-end"f>>' +
      "rt" +
      '<"row mt-2"<"col-md-6"i><"col-md-6 text-md-end"p>>',

    columnDefs: [
      { orderable: false, targets: [0, 3, 4, 5, 6] },
      { width: "40px", targets: [9, 10, 11, 12] },
      { width: "30px", targets: [13, 14] },
    ],

    columns: [
      {
        data: null,
        render: (v, t, row) => {
          // ปิด checkbox ถ้ายืนยันแล้ว
          const disabled = row.prompt_confirmed ? 'disabled' : '';
          return `<input type="checkbox" class="chkRow" data-id="${row.rec_id}" ${disabled}>`;
        },
      },
      {
        data: "saved_date",
        render: (v) => formatThaiDate(v),
      },
      { data: "purch_id" },
      { data: "item_name" },
      { data: "purch_name" },
      {
        data: "invent_site_id",
        // render: (v) => window.BRANCH_MAP?.[v] || v || "-",
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
      { data: "driver_name" },
      { data: "vehicle_name" },
      { data: "billnumber_out", render: (v) => v || "-" },
      {
        data: "net_origin_kg",
        className: "col-num",
        render: (v) => (v ? Number(v).toLocaleString() : "-"),
      },

      { data: "mile_start", className: "col-num" },
      { data: "mile_end", className: "col-num" },
      {
        data: null,
        className: "col-num", // ⬅ ชิดขวา
        render: (x) => {
          const m = calcMileDiff(x);
          return m.hasData
            ? `<span class="${m.color}">${m.diffStr}</span>`
            : "-";
        },
      },
      {
        data: "start_datetime",
        render: function (data) {
          if (!data) return "-";
          return new Date(data).toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
        },
      },
      {
        data: "end_datetime",
        render: function (data) {
          if (!data) return "-";
          return new Date(data).toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
        },
      },

      {
        data: "remark",
        render: (v) => (v && v.trim() !== "" ? v : "-"),
      },
      {
        data: null,
        orderable: false,
        className: "text-center",
        render: (v, t, row) => {
          return `
            <button 
              class="btn btn-sm btn-info"
              onclick="viewImages('${row.rec_id}', '${row.purch_id}')">
              <i class="bi bi-images"></i> 
            </button>
          `;
        },
      },
      {
        data: null,
        render: (v, t, row) => {
          // 🔒 ถ้ายืนยันแล้ว ปิดปุ่มแก้ไข
          if (row.prompt_confirmed) {
            return `<button class="btn btn-sm btn-secondary" disabled>แก้ไข</button>`;
          }

          return `
            <button 
              class="btn btn-sm btn-primary"
              onclick="editRow('${row.rec_id}', '${row.billnumber_out || ""}', '${row.remark || ""}')"
            >
              แก้ไข
            </button>
          `;
        },
      },
      {
        data: null,
        render: (v, t, row) => {
          // 🔒 ถ้ายืนยันแล้ว ปิดปุ่ม + เปลี่ยนข้อความ
          const disabled = row.prompt_confirmed ? "disabled" : "";
          const label = row.prompt_confirmed ? "ยืนยันแล้ว" : "ยืนยัน";

          return `
            <button 
              class="btn btn-success btn-sm"
              onclick="confirmRow('${row.rec_id}')"
              ${disabled}
            >
              ${label}
            </button>
          `;
        },
      },
    ],
  });

  dataTable.on("draw", () => {
    const total = dataTable.rows({ filter: "applied" }).count();
    document.getElementById("rowCount").textContent = total.toLocaleString();
  });
}

async function loadData() {
  const start = document.getElementById("startDate").value || "";
  const end = document.getElementById("endDate").value || "";

  const url = new URL(PROMPT_ENDPOINT, location.origin);
  if (start) url.searchParams.set("start", start);
  if (end) url.searchParams.set("end", end);

  const box = document.getElementById("errorBox");
  box.classList.add("d-none");

  try {
    const j = await fetchJSON(url, { credentials: "include" });
    const rows = Array.isArray(j?.data) ? j.data : [];
    dataTable.clear().rows.add(rows).draw();
  } catch (e) {
    console.error(e);
    box.classList.remove("d-none");
    box.textContent = e.message || "โหลดข้อมูลไม่สำเร็จ";
    dataTable.clear().draw();
  }
}

function toggleSelectAll(el) {
  const isChecked = el.checked;
  document.querySelectorAll(".chkRow").forEach((x) => (x.checked = isChecked));
}

// ฟังก์ชันยืนยันหลายรายการ
async function confirmSelectedRows() {
  // หา checkbox ที่ถูกเลือก
  const checked = Array.from(document.querySelectorAll(".chkRow:checked"));
  
  if (checked.length === 0) {
    return Swal.fire("แจ้งเตือน", "กรุณาเลือกรายการที่ต้องการยืนยัน", "warning");
  }

  // ดึง rec_id ทั้งหมดที่เลือก
  const recIds = checked.map((cb) => cb.getAttribute("data-id"));

  // ยืนยันก่อนดำเนินการ
  const result = await Swal.fire({
    title: "ยืนยันหลายรายการ",
    html: `ต้องการยืนยัน <strong>${recIds.length}</strong> รายการใช่ไหม?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "ยืนยัน",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#198754",
  });

  if (!result.isConfirmed) return;

  // แสดง loading
  Swal.fire({
    title: "กำลังยืนยัน...",
    html: `กำลังดำเนินการ 0/${recIds.length}`,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  let success = 0;
  let failed = 0;
  const errors = [];

  // ยืนยันทีละรายการ
  for (let i = 0; i < recIds.length; i++) {
    const recId = recIds[i];
    
    try {
      await fetchJSON("api/confirm_prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rec_id: recId }),
      });
      success++;
    } catch (err) {
      failed++;
      errors.push(`${recId}: ${err.message}`);
    }

    // อัปเดต progress
    Swal.update({
      html: `กำลังดำเนินการ ${i + 1}/${recIds.length}`,
    });
  }

  // แสดงผลลัพธ์
  if (failed === 0) {
    await Swal.fire({
      icon: "success",
      title: "สำเร็จ!",
      html: `ยืนยันสำเร็จ ${success} รายการ`,
      timer: 2000,
    });
  } else {
    await Swal.fire({
      icon: "warning",
      title: "เสร็จสิ้น",
      html: `
        <div class="text-start">
          <p>✅ สำเร็จ: ${success} รายการ</p>
          <p>❌ ล้มเหลว: ${failed} รายการ</p>
          ${
            errors.length > 0
              ? `<hr><small>${errors.join("<br>")}</small>`
              : ""
          }
        </div>
      `,
    });
  }

  // ยกเลิกการเลือกทั้งหมดและโหลดข้อมูลใหม่
  document.getElementById("chkAll").checked = false;
  loadData();
}

window.editRemark = function (rec_id, oldRemark) {
  Swal.fire({
    title: "แก้ไขหมายเหตุ",
    input: "text",
    inputValue: oldRemark,
    inputPlaceholder: "กรอกหมายเหตุใหม่...",
    confirmButtonText: "บันทึก",
    cancelButtonText: "ยกเลิก",
    showCancelButton: true,
    inputAttributes: {
      autocomplete: "off",
    },
  }).then(async (r) => {
    if (!r.isConfirmed) return;

    const newRemark = r.value || "";

    try {
      const resp = await fetch("api/update_remark_prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rec_id,
          remark: newRemark,
        }),
      });

      const json = await resp.json();
      if (!resp.ok || json.ok === false) throw new Error(json.detail);

      Swal.fire("สำเร็จ!", "อัปเดตหมายเหตุเรียบร้อย", "success");

      // โหลดใหม่ให้ข้อมูลอัปเดตในตาราง
      if (typeof loadData === "function") loadData();
    } catch (err) {
      Swal.fire("ผิดพลาด", err.message, "error");
    }
  });
};

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

(async () => {
  const user = await fetchSession();
  initTable();
  await loadData();
  
  // ผูก event listeners หลังจากโหลดข้อมูลเสร็จ
  document.getElementById("btnLoad").addEventListener("click", loadData);
  
  // เมื่อเปลี่ยนวันที่เริ่ม ให้ set min ของวันที่สิ้นสุด
  document.getElementById("startDate").addEventListener("change", (e) => {
    const endDateInput = document.getElementById("endDate");
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
  
  document.getElementById("btnClear").addEventListener("click", () => {
    document.getElementById("startDate").value = "";
    document.getElementById("endDate").value = "";
    document.getElementById("endDate").min = ""; // ล้าง min ด้วย
    loadData();
  });
  
  // เพิ่ม event listener สำหรับปุ่มยืนยันที่เลือก
  document.getElementById("btnConfirmSelected").addEventListener("click", confirmSelectedRows);
})();

async function editRow(rec_id, existingBill = "", existingRemark = "") {
  if (!rec_id) {
    return Swal.fire("Error", "ไม่พบ ID", "error");
  }

  // ดึงข้อมูลปัจจุบันจาก DataTable
  const rowData = dataTable.rows().data().toArray().find(r => r.rec_id === rec_id);
  const mileStart = rowData?.mile_start || "";
  const mileEnd = rowData?.mile_end || "";

  const { value: formValues } = await Swal.fire({
    title: "แก้ไขข้อมูล",
    html: `
      <div class="mb-3 text-start">
        <label class="form-label">เลขที่เอกสาร</label>
        <input id="swal-billnumber" class="form-control" value="${existingBill}">
      </div>
      <div class="row mb-3">
        <div class="col-6 text-start">
          <label class="form-label">เลขไมล์เริ่มต้น</label>
          <input id="swal-mile-start" type="number" class="form-control" value="${mileStart}">
        </div>
        <div class="col-6 text-start">
          <label class="form-label">เลขไมล์สิ้นสุด</label>
          <input id="swal-mile-end" type="number" class="form-control" value="${mileEnd}">
        </div>
      </div>
      <div class="mb-3 text-start">
        <label class="form-label">หมายเหตุ</label>
        <textarea id="swal-remark" class="form-control" rows="4">${existingRemark}</textarea>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "บันทึก",
    cancelButtonText: "ยกเลิก",
    width: "600px",
    focusConfirm: false,
    preConfirm: () => {
      return {
        billnumber_out: document.getElementById("swal-billnumber").value,
        mile_start: document.getElementById("swal-mile-start").value,
        mile_end: document.getElementById("swal-mile-end").value,
        remark: document.getElementById("swal-remark").value
      };
    }
  });

  if (!formValues) return;

  try {
    // อัปเดตเลขที่เอกสาร และไมล์
    await fetchJSON("api/update_billnumber_prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        rec_id, 
        billnumber_out: formValues.billnumber_out,
        mile_start: formValues.mile_start,
        mile_end: formValues.mile_end
      }),
    });

    // อัปเดตหมายเหตุ
    await fetchJSON("api/update_remark_prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        rec_id, 
        remark: formValues.remark 
      }),
    });

    Swal.fire("สำเร็จ", "บันทึกข้อมูลแล้ว", "success");
    loadData();
  } catch (err) {
    Swal.fire("Error", err.message || "บันทึกไม่สำเร็จ", "error");
  }
}
window.editRow = editRow;

async function viewImages(rec_id, purch_id) {
  if (!rec_id || !purch_id) {
    return Swal.fire("ข้อผิดพลาด", "ไม่พบข้อมูล", "error");
  }

  Swal.fire({
    title: "กำลังโหลดภาพ...",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  try {
    // ดึงรายการภาพจาก API
    const response = await fetch(`api/images/${rec_id}`);
    const json = await response.json();

    if (!response.ok || !json.ok) {
      throw new Error(json.detail || "ไม่สามารถโหลดภาพได้");
    }

    const images = json.images || [];

    if (images.length === 0) {
      return Swal.fire({
        icon: "info",
        title: "ไม่พบรูปภาพ",
        html: `
          <div class="text-center">
            <i class="bi bi-image" style="font-size: 3rem; color: #ccc;"></i>
            <p class="mt-3">ไม่มีรูปภาพสำหรับ PO: <strong>${purch_id}</strong></p>
            <small class="text-muted">ระบบยังไม่มีภาพที่บันทึกไว้สำหรับรายการนี้</small>
          </div>
        `,
        confirmButtonText: "ตรวจสอบแล้ว",
      });
    }

    // สร้าง HTML แสดงภาพทั้งหมด
    const imageHTML = images
      .map(
        (img, idx) => `
        <div class="mb-4 border-bottom pb-3">
          <h6 class="text-start mb-2">
            <i class="bi bi-card-image"></i> ${img.label}
          </h6>
          <div class="text-center">
            <img 
              src="${img.url}" 
              class="img-fluid rounded border shadow-sm" 
              style="max-width: 100%; max-height: 500px; cursor: pointer;"
              onclick="window.open('${img.url}', '_blank')"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
              alt="${img.label}"
            />
            <div class="alert alert-warning mt-2" style="display: none;">
              <i class="bi bi-exclamation-circle"></i> ไม่พบภาพ
            </div>
          </div>
        </div>
      `
      )
      .join("");

    Swal.fire({
      title: `ภาพของ PO: ${purch_id}`,
      html: `
        <div class="text-start" style="max-height: 70vh; overflow-y: auto;">
          ${imageHTML}
          <p class="text-muted small mt-3">คลิกที่ภาพเพื่อเปิดในหน้าต่างใหม่</p>
        </div>
      `,
      width: "90%",
      showCloseButton: true,
      showConfirmButton: false,
    });
  } catch (err) {
    Swal.fire("ข้อผิดพลาด", err.message, "error");
  }
}
window.viewImages = viewImages;

async function confirmRow(rec_id) {
  if (!rec_id) return;

  const ok = await Swal.fire({
    title: "ยืนยัน?",
    text: "ต้องการยืนยันข้อมูลนี้ใช่ไหม?",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "ยืนยัน",
    cancelButtonText: "ยกเลิก",
  });

  if (!ok.isConfirmed) return;

  try {
    await fetchJSON("api/confirm_prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rec_id }),
    });

    Swal.fire("สำเร็จ", "ยืนยันแล้ว", "success");

    loadData(); // โหลดตารางใหม่ → ปุ่มจะถูกปิดเอง
  } catch (err) {
    Swal.fire("ผิดพลาด", err.message, "error");
  }
}
window.confirmRow = confirmRow;
