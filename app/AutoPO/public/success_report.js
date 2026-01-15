const SESSION_ENDPOINT = "/autopo/api/ses";
const SUCCESS_ENDPOINT = "/autopo/api/success_report";

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

function fmtNum(v) {
  const n = Number(v);
  return Number.isFinite(n)
    ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : v ?? "";
}

// ฟังก์ชันคำนวณผลต่างสุทธิ (เวอร์ชันใหม่ ใช้ค่า net ที่แก้ไขแล้ว)
function calcDiffMeta(row) {
  // 🎯 ใช้ net จากฐานข้อมูลก่อน (เพราะฝ่ายคอนกรีตแก้ไขได้)
  const originNet = Number(row.net_origin_kg) || null;
  const destNet = Number(row.net_dest_kg) || null;

  // ❗ ถ้าไม่มีข้อมูล net ใดๆ ให้ return ว่าไม่มีข้อมูล
  if (originNet == null || destNet == null) {
    return { hasData: false };
  }

  // 🎯 คำนวณผลต่าง
  const diff = destNet - originNet;
  const diffPct = originNet === 0 ? 0 : (diff / originNet) * 100;

  // 🎯 ตรวจสอบ limit ตามประเภทสินค้า
  const name = (row.item_name || "").replace(/\s+/g, "");
  let limit = 0;
  if (/หิน/.test(name)) limit = 3;
  else if (/ทราย/.test(name)) limit = 4;
  else if (/ปูน/.test(name)) limit = 1;

  // 🎯 กำหนดสีตามเงื่อนไข
  let color = "text-dark";
  if (diff < 0 && Math.abs(diffPct) > limit) {
    color = "text-danger fw-semibold";
  } else if (diff > 0 && diffPct > limit) {
    color = "text-success fw-semibold";
  }

  return {
    hasData: true,
    diff,
    diffPct,
    limit,
    color,
    diffStr: diff.toLocaleString(),
    pctStr: diffPct.toFixed(2),
  };
}

function kgToTon(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return v ?? "";
  return (n / 1000).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toggleSelectAllSuccess(el) {
  const isChecked = el.checked;
  document
    .querySelectorAll(".chkSuccessRow")
    .forEach((cb) => (cb.checked = isChecked));
}

// ฟังก์ชันยืนยันหลายรายการ
async function confirmSelectedRows() {
  // หา checkbox ที่ถูกเลือก
  const checked = Array.from(
    document.querySelectorAll(".chkSuccessRow:checked")
  );

  if (checked.length === 0) {
    return Swal.fire(
      "แจ้งเตือน",
      "กรุณาเลือกรายการที่ต้องการยืนยัน",
      "warning"
    );
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
      await fetchJSON("api/confirm_con", {
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
            errors.length > 0 ? `<hr><small>${errors.join("<br>")}</small>` : ""
          }
        </div>
      `,
    });
  }

  // ยกเลิกการเลือกทั้งหมดและโหลดข้อมูลใหม่
  document.getElementById("chkAllSuccess").checked = false;
  loadData();
}

let dataTable;
function initTable() {
  if ($.fn.DataTable.isDataTable("#successTable")) {
    $("#successTable").DataTable().destroy();
  }

  dataTable = $("#successTable").DataTable({
    pageLength: 25,
    autoWidth: false,
    responsive: true,
    stripeClasses: [],
    rowCallback: (row, data) => {
      const m = calcDiffMeta(data);
      if (!m.hasData) return;

      $(row).removeClass("table-danger table-success table-primary");

      // ไฮไลต์เฉพาะ "ลดเกินเกณฑ์"
      if (m.diff < 0 && Math.abs(m.diffPct) > (m.limit ?? 0)) {
        $(row).addClass("table-danger");
      }
    },
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
    order: [[1, "asc"]], // คอลัมน์ที่ 1 = วันที่รับ
    dom:
      '<"row mb-2"<"col-md-6"l><"col-md-6 text-md-end"f>>' +
      "rt" +
      '<"row mt-2"<"col-md-6"i><"col-md-6 text-md-end"p>>',
    columnDefs: [
      { orderable: false, targets: [0, 2, 3, 4, 5, 6] },
      // =============== ลดขนาดคอลัมน์ตัวเลข ===============
      { width: "10px", targets: [7, 8] }, // นน.ต้นทาง / ปลายทาง
      { width: "40px", targets: [9, 10] }, // ผลต่าง(Kg)
    ], //ปิด sorting บางคอลัมน์
    columns: [
      {
        data: null,
        render: (v, t, row) => {
          // ปิด checkbox ถ้ายืนยันแล้ว
          const disabled = row.concrete_confirmed ? "disabled" : "";
          return `<input type="checkbox" class="chkSuccessRow" data-id="${row.rec_id}" ${disabled}>`;
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
      {
        data: null,
        className: "col-num",
        title: "นน.ต้นทาง",
        render: (x) => {
          return x.net_origin_kg
            ? Number(x.net_origin_kg).toLocaleString()
            : "-";
        },
      },
      {
        data: null,
        className: "col-num",
        title: "นน.ปลายทาง",
        render: (x) => {
          return x.net_dest_kg ? Number(x.net_dest_kg).toLocaleString() : "-";
        },
      },
      {
        data: null,
        className: "col-num",
        title: "ผลต่าง(kg)",
        render: (x) => {
          const m = calcDiffMeta(x);
          if (!m.hasData) return "-";
          return `<span class="${m.color}">${m.diff.toLocaleString()}</span>`;
        },
      },
      {
        data: null,
        className: "col-num",
        title: "ผลต่าง(%)",
        render: (x) => {
          const m = calcDiffMeta(x);
          return m.hasData
            ? `<span class="${m.color}">${m.pctStr}%</span>`
            : "-";
        },
      },
      // ✅ หมายเหตุ ใช้ฟิลด์ remark1 จากฐานข้อมูล
      {
        data: "remark1",
        render: (v) => (v && v.trim() !== "" ? v : "-"),
      },

      // ✅ ปุ่มดูภาพ
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

      // ✅ ปุ่มแก้ไข — ปิดเมื่อ concrete_confirmed = true
      {
        data: null,
        render: (v, t, row) => {
          // 🔒 ถ้ายืนยันแล้ว ปิดปุ่มแก้ไข
          if (row.concrete_confirmed) {
            return `<button class="btn btn-sm btn-secondary" disabled>แก้ไข</button>`;
          }

          return `
            <button 
              class="btn btn-sm btn-primary"
              onclick="editRow('${row.rec_id}', '${encodeURIComponent(
            JSON.stringify(row)
          )}')"
            >
              แก้ไข
            </button>
          `;
        },
      },

      // ✅ ปุ่มยืนยัน — เปลี่ยนข้อความ + ปิดเมื่อ concrete_confirmed = true
      {
        data: null,
        render: (v, t, row) => {
          const disabled = row.concrete_confirmed ? "disabled" : "";
          const label = row.concrete_confirmed ? "ยืนยันแล้ว" : "ยืนยัน";
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
  const url = new URL(SUCCESS_ENDPOINT, location.origin);
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

(async () => {
  initTable();
  await loadData();

  // ผูก event listeners หลังจากโหลดข้อมูลเสร็จ
  document.getElementById("btnLoad").addEventListener("click", loadData);
  document.getElementById("btnClear").addEventListener("click", () => {
    document.getElementById("startDate").value = "";
    document.getElementById("endDate").value = "";
    loadData();
  });

  // เพิ่ม event listener สำหรับปุ่มยืนยันที่เลือก
  document
    .getElementById("btnConfirmSelected")
    .addEventListener("click", confirmSelectedRows);
})();

async function editRow(rec_id, encodedRow) {
  if (!rec_id) return Swal.fire("Error", "ไม่พบ rec_id", "error");

  const row = JSON.parse(decodeURIComponent(encodedRow));

  const { value: formValues } = await Swal.fire({
    title: "แก้ไขข้อมูล",
    html: `
      <div class="text-start">
        <label>น้ำหนักสุทธิต้นทาง:</label>
        <input id="editNetOrigin" type="number" class="swal2-input"
          value="${row.net_origin_kg || ""}">

        <label>น้ำหนักสุทธิปลายทาง:</label>
        <input id="editNetDest" type="number" class="swal2-input"
          value="${row.net_dest_kg || ""}">

          <hr>

          <label>หมายเหตุ:</label>
        <input id="editRemark" class="swal2-input" value="${row.remark1 || ""}">

      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "บันทึก",
    cancelButtonText: "ยกเลิก",
    preConfirm: () => ({
      remark: document.getElementById("editRemark").value,
      net_origin_kg:
        Number(document.getElementById("editNetOrigin").value) || null,
      net_dest_kg: Number(document.getElementById("editNetDest").value) || null,
    }),
  });

  if (!formValues) return;

  await fetchJSON("api/update_remark_con", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rec_id,
      remark: formValues.remark,
      net_origin_kg: formValues.net_origin_kg,
      net_dest_kg: formValues.net_dest_kg,
    }),
  });

  Swal.fire("สำเร็จ", "อัปเดตข้อมูลเรียบร้อยแล้ว", "success");
  loadData();
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
    await fetchJSON("api/confirm_con", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rec_id }),
    });

    Swal.fire("สำเร็จ", "ยืนยันเรียบร้อย", "success");
    loadData();
  } catch (err) {
    Swal.fire("ผิดพลาด", err.message, "error");
  }
}
window.confirmRow = confirmRow;
