const SESSION_ENDPOINT = "/autopo/api/ses";
const JOBS_ENDPOINT = "/autopo/api/drivers/finish";

// อ่าน driverId จาก URL ถ้าไม่มี fallback เป็นของ session
let DRIVER_ID = new URL(location.href).searchParams.get("driverId");
if (typeof DRIVER_ID === "string") {
  const s = DRIVER_ID.trim().toLowerCase();
  if (s === "" || s === "null" || s === "undefined") DRIVER_ID = null;
}

async function fetchJSON(url, opts) {
  const r = await fetch(url, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j?.ok === false)
    throw new Error(j?.detail || `HTTP_${r.status}`);
  return j;
}

async function fetchSession() {
  const j = await fetchJSON(SESSION_ENDPOINT, { credentials: "include" });
  return j.user || {};
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

function showError(msg) {
  const box = document.getElementById("errorBox");
  if (!box) return;
  box.classList.remove("d-none");
  box.textContent = msg;
}
function clearError() {
  const box = document.getElementById("errorBox");
  if (!box) return;
  box.classList.add("d-none");
}

// ====== Hamburger (top drawer) ======
(() => {
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const btn = document.getElementById("btnMenu");

  function openMenu() {
    sidebar?.classList.add("open");
    overlay?.classList.add("show");
    document.body.style.overflow = "hidden";
  }
  function closeMenu() {
    sidebar?.classList.remove("open");
    overlay?.classList.remove("show");
    document.body.style.overflow = "";
  }

  btn?.addEventListener("click", openMenu);
  overlay?.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 992) closeMenu();
  });
  document.querySelectorAll(".sidebar a").forEach((a) =>
    a.addEventListener("click", () => {
      if (window.innerWidth < 992) closeMenu();
    })
  );
})();

// ====== Utilities ======
function mapBranch(siteId) {
  const branchMap = window.BRANCH_MAP || {};
  return branchMap[siteId] || siteId || "-";
}

// แปลงหน่วย "ตัน/ton/tons → หาร 1000"
function formatQty(row) {
  let qty = Number(row.qty_ordered || 0);
  const unit = (row.purch_unit || "").trim().toLowerCase();
  if (unit === "ตัน" || unit === "ton" || unit === "tons") qty = qty / 1000;
  return `${qty.toLocaleString()} ${row.purch_unit || ""}`;
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

// แปลงชื่อสินค้าให้เป็น "ประเภท"
function getProductType(row) {
  const name = (row.item_name || "").toString().trim();

  if (/หิน/.test(name)) return "หิน";
  if (/ทราย/.test(name)) return "ทราย";

  return "อื่น ๆ";
}

// group rows ตามประเภท
function groupByType(rows) {
  const groups = {};
  for (const r of rows) {
    const type = getProductType(r);
    if (!groups[type]) groups[type] = [];
    groups[type].push(r);
  }
  return groups;
}

// group rows ตามวันที่
function groupByDate(rows) {
  const groups = {};
  for (const r of rows) {
    const dateStr = formatThaiDate(r.saved_date || r.receive_date);
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(r);
  }
  return groups;
}

// การ์ด 1 ใบ
function renderCard(row) {
  const statusText = "สำเร็จ";
  const statusClass = "text-success";
  const theDate = formatThaiDate(row.saved_date);

  return `
      <div class="card shadow-sm w-100">
        <div class="card-body">
          <div class="d-flex flex-column gap-1">
            <div class="fw-semibold">เลขที่ PO: ${row.purch_id || "-"}</div>
            <div>วันที่รับ: ${theDate}</div>
            <div>สินค้า: ${row.item_name || "-"} ${formatQty(row)}</div>
            <div>จุดรับ: ${row.purch_name || "-"}</div>
            <div>จุดส่ง: ${mapBranch(row.invent_site_id)}</div>
            <div>สถานะ: <span class="${statusClass}">${statusText}</span></div>
          </div>
        </div>
      </div>
    `;
}

function renderCards(rows) {
  const box = document.getElementById("jobCards");
  const noJobBox = document.getElementById("noJobFinish");

  if (!rows.length) {
    box.innerHTML = "";
    noJobBox.style.display = "block";
    return;
  }

  noJobBox.style.display = "none";

  // Group by date
  const dateGroups = groupByDate(rows);

  const html = Object.entries(dateGroups)
    .map(([dateStr, list]) => {
      // Group by type within this date
      const typeGroups = groupByType(list);
      
      const stoneCount = (typeGroups["หิน"] || []).length;
      const sandCount = (typeGroups["ทราย"] || []).length;
      // const otherCount = (typeGroups["อื่น ๆ"] || []).length;
      
      return `
        <div class="card shadow-sm mb-3">
          <div class="card-body py-2 px-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <div style="font-size: 1.1rem; font-weight: 600;">
                ${dateStr}
              </div>
            </div>
            <div style="border-top: 2px solid #8e8f8cff; padding-top: 10px;">
              <div class="d-flex justify-content-around" style="font-size: 1rem;">
                <div class="text-center">
                  <div class="text-muted">หิน</div>
                  <div class="fw-bold" style="font-size: 1.2rem;">${stoneCount}</div>
                </div>
                <div class="text-center">
                  <div class="text-muted">ทราย</div>
                  <div class="fw-bold" style="font-size: 1.2rem;">${sandCount}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  box.innerHTML = html;
}

// กรองช่วงเวลา (ใช้ saved_date; ถ้าไม่มี fallback receive_date)
function filterByRange(rows, startStr, endStr) {
  if (!startStr && !endStr) return rows;

  const start = startStr ? new Date(startStr + "T00:00:00") : null;
  const end = endStr ? new Date(endStr + "T23:59:59.999") : null;

  return rows.filter((r) => {
    const d = new Date(r.saved_date || r.receive_date || 0);
    if (Number.isNaN(d.getTime())) return false;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}

function sortLatest(rows) {
  return rows.sort((a, b) => {
    const dateA = new Date(a.saved_date || a.receive_date || 0);
    const dateB = new Date(b.saved_date || b.receive_date || 0);
    return dateB - dateA; // ล่าสุดก่อน
  });
}

async function fetchJobs() {
  const url = new URL(JOBS_ENDPOINT, location.origin);
  if (DRIVER_ID) url.searchParams.set("driverId", DRIVER_ID);

  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false)
    throw new Error(json?.detail || `HTTP_${res.status}`);

  // ไม่ต้อง filter ใดๆ ให้ backend ส่งเฉพาะที่ต้องการ
  return Array.isArray(json?.data) ? json.data : [];
}

(async function initPage() {
  // เปลี่ยนมาใช้องค์ประกอบช่วงวันที่
  const startInput = document.getElementById("filterStart");
  const endInput = document.getElementById("filterEnd");
  const clearBtn = document.getElementById("btnClearDate");

  // ตั้งค่า default เป็น 7 วันย้อนหลัง
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  
  if (startInput) startInput.value = sevenDaysAgo.toISOString().split('T')[0];
  if (endInput) endInput.value = today.toISOString().split('T')[0];

  try {
    const user = await fetchSession();
    const u = document.getElementById("username");
    if (u)
      u.textContent = user.displayName
        ? `${user.displayName}`
        : user.username || "ไม่ระบุ";
    if (!DRIVER_ID && user?.driverId) DRIVER_ID = user.driverId;
  } catch (e) {
    console.warn("session load fail:", e.message);
  }

  if (!DRIVER_ID)
    showError("ไม่พบ driverId (โปรดเข้าสู่ระบบหรือระบุ ?driverId=...)");

  try {
    clearError();

    // โหลด + เรียงล่าสุดก่อน
    const allRows = sortLatest(await fetchJobs());
    
    // ฟังก์ชันใช้งานเมื่อเปลี่ยนช่วงเวลา
    function applyRangeFilter() {
      const filtered = filterByRange(
        allRows,
        startInput?.value || "",
        endInput?.value || ""
      );
      // คงการเรียงล่าสุดก่อน
      renderCards(sortLatest(filtered));
    }

    // แสดงข้อมูลตามวันที่ default (7 วันย้อนหลัง)
    applyRangeFilter();

    startInput?.addEventListener("change", applyRangeFilter);
    endInput?.addEventListener("change", applyRangeFilter);

    clearBtn?.addEventListener("click", () => {
      // Reset to default 7 days
      if (startInput) startInput.value = sevenDaysAgo.toISOString().split('T')[0];
      if (endInput) endInput.value = today.toISOString().split('T')[0];
      applyRangeFilter();
    });
  } catch (err) {
    console.error("[JOB LOAD ERROR]", err);
    showError(`โหลดข้อมูลไม่สำเร็จ: ${err.message}`);
    renderCards([]);
  }
})();

// logout
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
