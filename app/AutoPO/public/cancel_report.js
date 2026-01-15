let table;
const BASE = "/autopo";

$(document).ready(async function () {
  // เริ่มต้น DataTable
  table = $("#cancelTable").DataTable({
    order: [[0, "asc"]], // เรียงตามครั้งที่ (ID)
    pageLength: 25,
    autoWidth: false,
    columnDefs: [
      { width: "50px", targets: 0 }, // ครั้งที่ ให้ขนาดเล็ก
      { width: "200px", targets: 12 }, // หมายเหตุ ให้กว้างขึ้น
      { className: "text-center", targets: [0, 1, 5, 6] }, // ครั้งที่, วันที่, สาขา, แพลนท์ อยู่ตรงกลาง
      { className: "text-end", targets: [9, 10, 11] } // ไมล์เริ่ม, ไมล์สิ้นสุด, ระยะทาง ชิดขวา
    ],
    language: {
      search: "ค้นหา:",
      lengthMenu: "แสดง _MENU_ รายการ",
      info: "แสดง _START_ ถึง _END_ จาก _TOTAL_ รายการ",
      infoEmpty: "ไม่มีข้อมูล",
      infoFiltered: "(กรองจาก _MAX_ รายการทั้งหมด)",
      zeroRecords: "ไม่พบข้อมูล",
      paginate: {
        first: "แรก",
        last: "สุดท้าย",
        next: "ถัดไป",
        previous: "ก่อนหน้า",
      },
    },
  });

  // ตั้งค่าวันที่เริ่มต้น (เดือนปัจจุบัน)
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  $("#startDate").val(firstDay.toISOString().split("T")[0]);
  $("#endDate").val(today.toISOString().split("T")[0]);

  // โหลดข้อมูลครั้งแรก
  await loadData();

  // Event listeners
  $("#btnLoad").click(loadData);
  $("#btnClear").click(clearDates);
});

async function loadData() {
  try {
    const start = $("#startDate").val();
    const end = $("#endDate").val();

    let url = `${BASE}/api/cancel_report`;
    const params = new URLSearchParams();
    if (start) params.append("start", start);
    if (end) params.append("end", end);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    if (!result.ok) {
      showError(result.detail || "เกิดข้อผิดพลาด");
      return;
    }

    renderTable(result.data || []);
    $("#rowCount").text(result.data?.length || 0);
    hideError();
  } catch (err) {
    console.error("Load error:", err);
    showError("ไม่สามารถโหลดข้อมูลได้: " + err.message);
  }
}

function formatThaiDate(dateStr) {
  if (!dateStr) return "-";
  
  const date = new Date(dateStr);
  const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", 
                      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  
  const day = date.getDate();
  const month = thaiMonths[date.getMonth()];
  const year = (date.getFullYear() + 543).toString().slice(-2); // Buddhist year, last 2 digits
  
  return `${day} ${month} ${year}`;
}

function renderTable(data) {
  table.clear();

  data.forEach((row) => {
    const cancelDate = formatThaiDate(row.cancel_date);
    
    // คำนวณระยะทาง
    const mileStart = Number(row.mile_start) || 0;
    const mileCancel = Number(row.mile_cancel) || 0;
    const distance = (mileStart && mileCancel) ? (mileCancel - mileStart) : "-";

    table.row.add([
      row.attempt_number || "-",
      cancelDate,
      row.purch_id || "-",
      row.item_name || "-",
      row.purch_name || "-",
      row.invent_site_id || "-",
      row.plant_name || "-",
      row.driver_name || "-",
      row.vehicle_name || "-",
      row.mile_start || "-",
      row.mile_cancel || "-",
      distance !== "-" ? distance.toLocaleString() : "-",
      row.cancel_note || "-",
    ]);
  });

  table.draw();
}

function clearDates() {
  $("#startDate").val("");
  $("#endDate").val("");
  loadData();
}

function showError(msg) {
  $("#errorBox").text(msg).removeClass("d-none");
}

function hideError() {
  $("#errorBox").addClass("d-none");
}