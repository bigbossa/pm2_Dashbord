const SESSION_ENDPOINT = "/autopo/api/ses";
const JOBS_ENDPOINT = "/autopo/api/drivers/job";

// เอาจาก URL ก่อน ถ้าไม่มีค่อย fallback เป็นของ session
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

  // คลิกลิงก์เมนูแล้วปิด (เฉพาะจอเล็ก)
  document.querySelectorAll(".sidebar a").forEach((a) =>
    a.addEventListener("click", () => {
      if (window.innerWidth < 992) closeMenu();
    })
  );
})();

// แปลง/ฟอร์แมตจำนวนแบบเดิม (เหมือน DataTable)
function formatQty(row) {
  let qty = Number(row.qty_ordered || 0);
  const unit = (row.purch_unit || "").trim().toLowerCase();
  if (unit === "ตัน" || unit === "ton" || unit === "tons") {
    qty = qty / 1000; // เหมือนของเดิม
  }
  return `${qty.toLocaleString()} ${row.purch_unit || ""}`;
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

function mapBranch(siteId) {
  const branchMap = window.BRANCH_MAP || {};
  return branchMap[siteId] || siteId || "-";
}

// ========== Photo Progress Tracking ==========
function getPhotoProgress(row) {
  // เช็คจากฟิลด์ใน database ที่ส่งกลับมาจาก API
  return {
    mile_start: !!(row.mile_start),
    wt_origin: !!(row.wt_before_pick || row.wt_after_pick),
    wt_dest: !!(row.wt_arrive_dest || row.wt_leave_dest),
    mile_end: !!(row.mile_end)
  };
}

function renderProgressIndicator(progress, row) {
  const steps = [
    { key: 'mile_start', label: 'ไมล์เริ่ม', icon: '🚗' },
    { key: 'wt_origin', label: 'บิลรับ', icon: '📄' },
    { key: 'wt_dest', label: 'บิลส่ง', icon: '📋' },
    { key: 'mile_end', label: 'ไมล์จบ', icon: '🏁' }
  ];

  const total = steps.length;
  const completed = steps.filter(s => progress[s.key]).length;
  const percentage = (completed / total) * 100;

  const stepsHtml = steps.map(step => {
    const isDone = progress[step.key];
    const statusClass = isDone ? 'text-success' : 'text-muted';
    const checkmark = isDone ? '✓' : '○';
    
    // แสดงเลขไมล์เริ่มถ้ามี
    let extraInfo = '';
    if (step.key === 'mile_start' && row.mile_start) {
      extraInfo = `<span class="text-primary fw-bold"> (${row.mile_start})</span>`;
    }
    if (step.key === 'mile_end' && row.mile_end) {
      extraInfo = `<span class="text-primary fw-bold"> (${row.mile_end})</span>`;
    }
    
    return `
      <div class="d-flex align-items-center gap-1">
        <span class="${statusClass}" style="font-size: 0.85rem;">
          ${checkmark} ${step.icon} ${step.label}${extraInfo}
        </span>
      </div>
    `;
  }).join('');

  const progressColor = percentage === 100 ? '#28a745' : percentage > 0 ? '#ffc107' : '#6c757d';

  return `
    <div class="mt-2 p-2 bg-light rounded">
      <div class="d-flex justify-content-between align-items-center mb-1">
        <small class="text-muted fw-semibold">ความคืบหน้า</small>
        <small class="fw-bold" style="color: ${progressColor};">${completed}/${total}</small>
      </div>
      <div class="progress mb-2" style="height: 6px;">
        <div class="progress-bar" role="progressbar" 
             style="width: ${percentage}%; background-color: ${progressColor};"
             aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
        </div>
      </div>
      <div class="d-flex flex-wrap gap-2 small">
        ${stepsHtml}
      </div>
    </div>
  `;
}

// ฟังก์ชันเรนเดอร์การ์ด 1 ใบ (เต็มแถว)
function renderCard(row) {
  const isDone = Number(row.purch_status) === 3;
  const statusText = isDone ? "สำเร็จ" : "รอรับงาน";
  const statusClass = isDone ? "text-success" : "text-warning";

  // ดึงสถานะการถ่ายรูปจากข้อมูลที่มีใน database
  const progress = getPhotoProgress(row);

  // จำนวน + หน่วย (แปลงตัน/ton -> แสดงเป็นจำนวนเดิมตามข้อมูล)
  const qty = Number(row.qty_ordered || 0).toLocaleString();
  const unit = (row.purch_unit || "").trim();

  const finishHref = isDone
    ? "#"
    : `finish_form.html?rec_id=${encodeURIComponent(row.rec_id)}`;

  return `
      <div class="card shadow-sm w-100">
        <div class="card-body" style="font-size: 1.1rem;">
          <div class="d-flex flex-column gap-1">
            <div class="fw-semibold" style="font-size: 1.15rem;">
              เลขที่ PO: ${row.purch_id || "-"}  
           
            </div>

            <div>วันที่สั่ง: ${formatThaiDate(row.receive_date)}</div>
            <div>สินค้า: ${row.item_name || "-"} ${formatQty(row)}</div>
            <div>จุดรับ: ${row.purch_name || "-"}</div>
            <div>จุดส่ง: ${row.plant_code || "-"} ${row.plant_name || "-"}</div>
            <div>สถานะ: <span class="${statusClass}">${statusText}</span></div>

            ${!isDone ? renderProgressIndicator(progress, row) : ''}

            <div class="mt-3 d-grid">
              <a class="btn btn-success ${
                isDone ? "disabled" : ""
              }" href="${finishHref}" style="min-height: 50px; font-size: 1.1rem; font-weight: 600;">
                📋 รายละเอียด
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
}

// โหลดงานทั้งหมดจาก API
async function fetchJobs() {
  const url = new URL(JOBS_ENDPOINT, location.origin);
  if (DRIVER_ID) url.searchParams.set("driverId", DRIVER_ID);

  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.detail || `HTTP_${res.status}`);
  }
  return Array.isArray(json?.data) ? json.data : [];
}

// เรนเดอร์การ์ดทั้งหมด + อัปเดตตัวนับ
function renderCards(rows) {
  const box = document.getElementById("jobCards");
  const noJobBox = document.getElementById("noJob");
  const rowCountEl = document.getElementById("rowCount");

  rowCountEl.textContent = rows.length.toLocaleString();

  if (!rows.length) {
    box.innerHTML = "";
    noJobBox.style.display = "block";
    return;
  }

  noJobBox.style.display = "none";

  const groups = groupByType(rows);

  // สร้าง HTML: แสดงทีละประเภท
  const html = Object.entries(groups)
    .map(([typeName, list]) => {
      return `
              <div class="mb-3">
                <div class="d-flex align-items-center mb-2">
                  <span class="fw-semibold text-dark" style="font-size: 1.2rem;">
                    ${typeName}
                  </span>
                  <span class="ms-2 text-muted" style="font-size: 1rem;">
                    ${list.length} งาน
                  </span>
                </div>
                <div class="d-flex flex-column gap-2">
                  ${list.map(renderCard).join("")}
                </div>
              </div>
            `;
    })
    .join("");

  box.innerHTML = html;
}

// กรองด้วยวันที่จาก input
function filterByDate(rows, selectedDate) {
  if (!selectedDate) return rows;
  return rows.filter(
    (r) => (r.receive_date || "").slice(0, 10) === selectedDate
  );
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

// main
(async function initPage() {
  const dateInput = document.getElementById("filterDate");
  const clearBtn = document.getElementById("btnClearDate");
  const btnFilterAll = document.getElementById("btnFilterAll");
  const btnFilterStone = document.getElementById("btnFilterStone");
  const btnFilterSand = document.getElementById("btnFilterSand");

  let currentTypeFilter = "all"; // "all", "หิน", "ทราย"

  // ฟังก์ชันอัปเดตสไตล์ปุ่ม
  function updateFilterButtons() {
    [btnFilterAll, btnFilterStone, btnFilterSand].forEach(btn => {
      btn?.classList.remove("btn-primary");
      btn?.classList.add("btn-outline-primary");
    });

    if (currentTypeFilter === "all") {
      btnFilterAll?.classList.remove("btn-outline-primary");
      btnFilterAll?.classList.add("btn-primary");
    } else if (currentTypeFilter === "หิน") {
      btnFilterStone?.classList.remove("btn-outline-primary");
      btnFilterStone?.classList.add("btn-primary");
    } else if (currentTypeFilter === "ทราย") {
      btnFilterSand?.classList.remove("btn-outline-primary");
      btnFilterSand?.classList.add("btn-primary");
    }
  }

  // โหลด session เพื่อตั้งชื่อและ driverId (คงพฤติกรรมเดิมไว้)
  try {
    const user = await fetchSession();
    const u = document.getElementById("username");
    if (u) {
      u.textContent = user.displayName
        ? `${user.displayName}`
        : user.username || "ไม่ระบุ";
    }
    if (!DRIVER_ID && user?.driverId) DRIVER_ID = user.driverId;
  } catch (e) {
    console.warn("session load fail:", e.message);
  }

  if (!DRIVER_ID)
    showError("ไม่พบ driverId (โปรดเข้าสู่ระบบหรือระบุ ?driverId=...)");

  // โหลดข้อมูลครั้งแรก
  try {
    clearError();
    const allRows = await fetchJobs();

    // ฟังก์ชันคำนวณความคืบหน้า (0-4)
    function getProgressCount(row) {
      const progress = getPhotoProgress(row);
      return (progress.mile_start ? 1 : 0) +
             (progress.wt_origin ? 1 : 0) +
             (progress.wt_dest ? 1 : 0) +
             (progress.mile_end ? 1 : 0);
    }

    allRows.sort((a, b) => {
      // เรียงตามความคืบหน้าก่อน (มากไปน้อย)
      const progressA = getProgressCount(a);
      const progressB = getProgressCount(b);
      
      if (progressB !== progressA) {
        return progressB - progressA; // งานที่มีความคืบหน้ามากกว่าขึ้นก่อน
      }
      
      // ถ้าความคืบหน้าเท่ากัน เรียงตามวันที่ (เก่าไปใหม่)
      const dateA = new Date(a.saved_date || a.receive_date || 0);
      const dateB = new Date(b.saved_date || b.receive_date || 0);
      return dateA - dateB; // งานเก่าขึ้นก่อน
    });

    let currentRows = allRows.slice(); // สำเนาไว้สำหรับ filter

    // ฟังก์ชันกรองข้อมูลตามเงื่อนไขทั้งหมด
    function applyFilters() {
      let filtered = allRows;

      // กรองตามวันที่
      const selectedDate = dateInput.value || "";
      if (selectedDate) {
        filtered = filterByDate(filtered, selectedDate);
      }

      // กรองตามประเภท
      if (currentTypeFilter !== "all") {
        filtered = filtered.filter(row => getProductType(row) === currentTypeFilter);
      }

      renderCards(filtered);
    }

    // เรนเดอร์ครั้งแรก
    updateFilterButtons();
    applyFilters();

    // เมื่อเปลี่ยนวันที่
    dateInput.addEventListener("change", applyFilters);

    // ปุ่มล้างฟิลเตอร์วันที่
    clearBtn.addEventListener("click", () => {
      dateInput.value = "";
      applyFilters();
    });

    // ปุ่มกรองตามประเภท
    btnFilterAll?.addEventListener("click", () => {
      currentTypeFilter = "all";
      updateFilterButtons();
      applyFilters();
    });

    btnFilterStone?.addEventListener("click", () => {
      currentTypeFilter = "หิน";
      updateFilterButtons();
      applyFilters();
    });

    btnFilterSand?.addEventListener("click", () => {
      currentTypeFilter = "ทราย";
      updateFilterButtons();
      applyFilters();
    });
  } catch (err) {
    console.error("[JOB LOAD ERROR]", err);
    showError(`โหลดข้อมูลไม่สำเร็จ: ${err.message}`);
    renderCards([]); // แสดงว่าง
  }
})();

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
