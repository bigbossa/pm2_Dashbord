// ===== Constants =====
const SESSION_ENDPOINT = "/autopo/api/ses";
const PO_ENDPOINT = "/autopo/api/po";

// ===== Helpers =====
async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP_${r.status}`);
  const j = await r.json();
  if (!j || j.ok === false) throw new Error("API_NOT_OK");
  return j;
}

async function fetchSession() {
  const j = await fetchJSON(SESSION_ENDPOINT);
  return j.user;
}

async function fetchPO(branchId) {
  const qs = branchId ? "?branchId=" + encodeURIComponent(branchId) : "";
  const j = await fetchJSON(PO_ENDPOINT + qs);
  return Array.isArray(j.data) ? j.data : [];
}

// นับจำนวนคำสั่งต่อ purch_id และ purch_status = "1"
// กรองไม่ให้แสดงปูน (cement)
function countByPurchId(rows) {
  const map = new Map();
  rows.forEach((r) => {
    if (r.purch_status != "1") return;

    // ปิดกั้นปูน - ไม่นับและไม่แสดง (ตรวจทั้งสินค้า, ชื่อบริษัท และ item_id)
    // const itemName = (r.item_name || "").toLowerCase();
    // const purchName = (r.purch_name || "").toLowerCase();
    const itemId = (r.item_id || "").toLowerCase();
    if (itemId.includes("cem") || itemId.includes("flya")) return;

    const key = r.purch_id || "-";
    if (!map.has(key)) {
      map.set(key, {
        purch_id: key,
        purch_name: r.purch_name || "",
        branch_name: r.branch_name || "",
        branch_id: r.branch_id || "",
        item_names: new Set(),
        order_count: 0,
      });
    }
    const agg = map.get(key);
    agg.order_count += 1;
    if (r.item_name) agg.item_names.add(r.item_name);
    if (!agg.branch_name && r.branch_name) agg.branch_name = r.branch_name;
    if (!agg.branch_id && r.branch_id) agg.branch_id = r.branch_id;
    if (!agg.purch_name && r.purch_name) agg.purch_name = r.purch_name;
    if (!agg.plant_code && r.plant_code) agg.plant_code = r.plant_code;
    if (!agg.plant_name && r.plant_name) agg.plant_name = r.plant_name;
  });
  return Array.from(map.values()).map((x) => ({
    purch_id: x.purch_id,
    purch_name: x.purch_name || "-",
    item_name_joined: Array.from(x.item_names).join(", ") || "-",
    order_count: x.order_count,
    branch_name: x.branch_name,
    branch_id: x.branch_id,
    plant_code: x.plant_code || "-",
    plant_name: x.plant_name || "-",
  }));
}

// ดึงจำนวนรอบที่มีแล้วในฐานข้อมูลต่อ purch_id
async function fetchRunCounts(purchIds) {
  if (!Array.isArray(purchIds) || purchIds.length === 0) return [];
  const r = await fetch("api/dispatch_runs_count", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ purch_ids: purchIds }),
  });

  if (r.status === 401 || r.status === 403) {
    throw new Error("UNAUTHORIZED");
  }

  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await r.text();
    throw new Error(
      `Expected JSON but got ${ct}. First bytes: ${text.slice(0, 120)}`
    );
  }
  const j = await r.json();
  if (!j.ok || !Array.isArray(j.data)) {
    throw new Error("API_NOT_OK: api/dispatch_runs_count");
  }
  return j.data;
}

let dataTable;

const SELECTED = new Set(); // เก็บ id ที่ติ๊กไว้ (เฉพาะหน้าเว็บนี้)

function updateChosenUI() {
  // เปิดปุ่มก็ต่อเมื่อมีเลือก
  const hasSelection = SELECTED.size > 0;
  document.getElementById("btnOpenForm").disabled = !hasSelection;
  document.getElementById("btnClearSelection").disabled = !hasSelection;
}

function renderTable(list) {
  const body = document.getElementById("poBody");
  const totalEl = document.getElementById("totalPo");
  body.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    body.innerHTML = `<tr><td colspan="8" class="text-center text-muted">ไม่พบข้อมูล</td></tr>`;
  } else {
    list.forEach((r, i) => {
      const checked = SELECTED.has(r.purch_id) ? "checked" : "";
      const remaining = Number(r.remaining ?? 0);
      const disabled =
        remaining > 0 ? "" : "disabled title='คงเหลือ 0 - ไม่สามารถเลือกได้'";
      const badgeClass =
        remaining > 0
          ? "bg-primary-subtle text-primary"
          : "bg-secondary-subtle text-secondary";

      // เพิ่ม style จางลงสำหรับข้อความในแถวที่คงเหลือ 0
      const textStyle = remaining === 0 ? 'style="color: #adb5bd;"' : "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
            <input type="checkbox" class="row-check form-check-input" data-id="${
              r.purch_id
            }" ${checked} ${disabled}/>
        </td>
        <td class="text-center text-muted"><span ${textStyle}>${
        i + 1
      }</span></td>
        <td><span ${textStyle}>${r.purch_id || "-"}</span></td>
        <td><span ${textStyle}>${r.item_name_joined || "-"}</span></td>
        <td><span ${textStyle}>${r.purch_name || "-"}</span></td>
        <td class="text-center"><span ${textStyle}>${r.plant_code || "-"}</span></td>
        <td class="text-center"><span ${textStyle}>${r.plant_name || "-"}</span></td>
        <td class="text-end"><span ${textStyle}>${remaining}</span></td>
        `;
      body.appendChild(tr);
    });
  }

  // Re-init DataTable
  if ($.fn.DataTable.isDataTable("#poTable")) {
    $("#poTable").DataTable().destroy();
  }
  dataTable = $("#poTable").DataTable({
    pageLength: 10,
    autoWidth: false,
    responsive: true,
    stripeClasses: [],
    columnDefs: [{ orderable: false, targets: 0 }],
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
  });

  // อัปเดตตัวเลขตามผลกรอง
  const updateCount = () =>
    (totalEl.textContent = dataTable.rows({ filter: "applied" }).count());
  dataTable.on("draw", () => {
    // sync checkbox ตาม SELECTED เมื่อเปลี่ยนหน้า/ค้นหา
    document.querySelectorAll("#poTable tbody .row-check").forEach((chk) => {
      chk.checked = SELECTED.has(chk.dataset.id);
    });
    syncCheckAllOnPage();
    updateCount();
  });
  updateCount();

  // เดลิเกต: เมื่อเปลี่ยนสถานะ checkbox แถว
  $("#poTable tbody")
    .off("change", ".row-check")
    .on("change", ".row-check", function () {
      const id = this.dataset.id;
      if (this.checked) SELECTED.add(id);
      else SELECTED.delete(id);
      syncCheckAllOnPage();
      updateChosenUI();
    });

  // เลือกทั้งหน้าปัจจุบัน
  const checkAll = document.getElementById("checkAllPage");
  if (checkAll) {
    checkAll.onchange = function () {
      const idsOnPage = [];
      $("#poTable tbody .row-check").each(function () {
        idsOnPage.push(this.dataset.id);
      });
      if (!idsOnPage.length) return;

      if (this.checked) {
        idsOnPage.forEach((id) => SELECTED.add(id));
        $("#poTable tbody .row-check").prop("checked", true);
      } else {
        idsOnPage.forEach((id) => SELECTED.delete(id));
        $("#poTable tbody .row-check").prop("checked", false);
      }
      updateChosenUI();
    };
  }

  function syncCheckAllOnPage() {
    const checks = Array.from(
      document.querySelectorAll("#poTable tbody .row-check")
    );
    const allChecked = checks.length && checks.every((c) => c.checked);
    const head = document.getElementById("checkAllPage");
    if (head) head.checked = allChecked;
  }
  window.syncCheckAllOnPage = syncCheckAllOnPage;

  updateChosenUI();
}

async function bootstrap() {
  const nameEl = document.getElementById("username");
  const branchEl = document.getElementById("branchName");
  const errEl = document.getElementById("errorBox");
  const body = document.getElementById("poBody");

  // spinner
  body.innerHTML = `<tr class="spinner-row"><td colspan="6" class="text-center">
      <div class="spinner-border" role="status" aria-label="กำลังโหลด"></div>
    </td></tr>`;
  errEl.classList.add("d-none");
  errEl.textContent = "";

  try {
    const user = await fetchSession();
    if (user.branchName) branchEl.textContent = user.branchName;
    else if (user.branchId) branchEl.textContent = user.branchId;

    // โหลดข้อมูล PO จาก API
    const raw = await fetchPO(user.branchId);
    const grouped = countByPurchId(raw);

    // ถ้าไม่มีข้อมูลเลย
    if (!grouped.length) {
      renderTable([]);
      return;
    }

    // ดึงจำนวนรอบที่มีใน DB
    const purchIds = grouped.map((x) => x.purch_id);
    const runData = await fetchRunCounts(purchIds);
    const runMap = new Map(runData.map((r) => [r.purch_id, r.run_count || 0]));

    // คำนวณคงเหลือ = API - DB
    const merged = grouped
      .map((x) => ({
        ...x,
        remaining: Math.max(0, x.order_count - (runMap.get(x.purch_id) || 0)),
      }))
      .filter((x) => x.remaining > 0); // กรองเฉพาะรายการที่คงเหลือมากกว่า 0

    // อัปเดตชื่อสาขา (ถ้าไม่มีใน session)
    if (!user.branchName && !user.branchId && grouped.length) {
      branchEl.textContent =
        grouped[0].branch_name || grouped[0].branch_id || "-";
    } else if (
      !branchEl.textContent ||
      branchEl.textContent === "กำลังโหลด..."
    ) {
      branchEl.textContent =
        (grouped[0]?.branch_name || grouped[0]?.branch_id || "-") ?? "-";
    }

    // ให้ส่วนอื่นเรียกใช้คงเหลือของแต่ละ PO ได้
    window.REMAINING_BY_ID = new Map(
      merged.map((x) => [x.purch_id, x.remaining])
    );

    // แสดงผลเฉพาะ “คงเหลือ”
    renderTable(merged);
  } catch (e) {
    console.error(e);
    if (String(e.message).includes("UNAUTHORIZED")) {
      window.location.href = "login";
      return;
    }
    body.innerHTML = `<tr><td colspan="8" class="text-center text-muted">โหลดข้อมูลไม่สำเร็จ</td></tr>`;
    errEl.classList.remove("d-none");
    errEl.textContent = e?.message || String(e);
  }
}
bootstrap();

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

// ดึงตัวเลือกจาก API (ถ้ามี) พร้อม fallback ง่าย ๆ
async function getOptions(url, fallback) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`bad_${r.status}`);
    const j = await r.json();
    if (Array.isArray(j.data)) {
      console.log(`[getOptions] OK ${url} ->`, j.data.slice(0, 3));
      return j.data;
    } else {
      console.warn(`[getOptions] NO data[] in ${url}, got:`, j);
      return fallback;
    }
  } catch (e) {
    console.warn(`[getOptions] FALLBACK for ${url}:`, e.message || e);
    return fallback;
  }
}

// ปุ่มล้างการเลือก
document.getElementById("btnClearSelection").addEventListener("click", () => {
  SELECTED.clear();
  document.querySelectorAll("#poTable tbody .row-check").forEach((chk) => {
    chk.checked = false;
  });
  const checkAll = document.getElementById("checkAllPage");
  if (checkAll) checkAll.checked = false;
  updateChosenUI();
});

document.getElementById("btnOpenForm").addEventListener("click", async () => {
  const purchIds = Array.from(SELECTED);
  if (!purchIds.length) {
    await Swal.fire({
      icon: "info",
      title: "ยังไม่ได้เลือก PO",
      text: "กรุณาเลือกอย่างน้อย 1 รายการก่อนบันทึกรอบวิ่ง",
      confirmButtonText: "ตกลง",
    });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  // 1) โหลดรายละเอียดตาม purch_id (ถ้ามี)
  let poDetails = [];
  try {
    const r = await fetch(
      `api/purchlines?ids=${encodeURIComponent(purchIds.join(","))}`
    );
    const j = await r.json();
    poDetails = Array.isArray(j.data) ? j.data : [];
  } catch (e) {
    console.warn("purchlines fetch fail:", e);
  }

  // 2) สรุปสั้นต่อ purch_id (เฉพาะสถานะปกติ "1")
  const summarize = (rows) => {
    const m = new Map();
    rows.forEach((r) => {
      if (String(r.purch_status) !== "1") return;
      const key = r.purch_id || "-";
      if (!m.has(key)) {
        m.set(key, {
          purch_id: key,
          purch_name: r.purch_name || "",
          items: new Set(),
          branch_id: r.branch_id || "",
        });
      }
      const g = m.get(key);
      if (r.item_name) g.items.add(r.item_name);
      if (!g.purch_name && r.purch_name) g.purch_name = r.purch_name;
      if (!g.branch_id && r.branch_id) g.branch_id = r.branch_id;
    });
    return Array.from(m.values()).map((x) => ({
      purch_id: x.purch_id,
      purch_name: x.purch_name || "-",
      item_names:
        Array.from(x.items).slice(0, 5).join(", ") +
        (x.items.size > 5 ? " …" : ""),
      branch_id: x.branch_id,
    }));
  };

  let poSummary = summarize(poDetails);
  // ถ้า API ไม่ส่งรายละเอียด ให้สร้างจากรายการที่เลือกไว้
  if (!poSummary.length) {
    poSummary = purchIds.map((id) => ({
      purch_id: id,
      purch_name: "-",
      item_names: "-",
      branch_id: "",
    }));
  }

  // 3) ผูก "คงเหลือ" เดียวกับหน้าหลัก
  const remMap =
    window.REMAINING_BY_ID instanceof Map ? window.REMAINING_BY_ID : new Map();
  poSummary = poSummary.map((x) => ({
    ...x,
    remaining: Number(remMap.get(x.purch_id) ?? 0),
  }));

  // ใช้ branch_id แรก สำหรับฟิลเตอร์ (ถ้าจำเป็น)
  const branchIdForFilter = poSummary[0]?.branch_id || "";

  // 4) HTML แถวในป๊อปอัป
  const rowsHtml = poSummary
    .map((r, i) => {
      const rem = Number(r.remaining) || 0;
      const maxAttr = rem > 0 ? `max="${rem}"` : "";
      const disAttr = rem > 0 ? "" : "disabled";
      const reqAttr = rem > 0 ? "required" : "";
      const initVal = rem > 0 ? 1 : "";
      const placeholder = rem > 0 ? "กรอกจำนวน" : "เต็มแล้ว";
      return `
                <tr>
                  <td class="text-muted">${i + 1}</td>
                  <td>${r.purch_id}</td>
                  <td>${r.purch_name}</td>
                  <td>${r.item_names}</td>
                  <td class="text-center">${rem}</td>
                  <td class="text-center">
                    <input id="round_${i}" data-id="${r.purch_id}" type="number"
                          min="0" ${maxAttr} ${reqAttr} ${disAttr}
                          class="form-control form-control-sm text-center"
                          value="${initVal}" placeholder="${placeholder}"
                          step="1" inputmode="numeric" pattern="\\d*"
                          oninput="const max=+this.max||Infinity,min=+this.min||0;
                                    let v=+this.value||0;
                                    if(v < min) v = min; if(v>max)v=max;
                                    this.value=v; this.setCustomValidity('');">
                  </td>
                </tr>`;
    })
    .join("");

  const html = `
              <div class="text-start mb-2">
                <div class="table-responsive border rounded">
                  <table class="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th style="width:60px">#</th>
                        <th style="min-width:120px">เลขที่ PO</th>
                        <th>บริษัท</th>
                        <th>สินค้า</th>
                        <th style="width:120px" class="text-center">คงเหลือ</th>
                        <th style="width:140px" class="text-center">กำหนดรอบวิ่ง</th>
                      </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                  </table>
                </div>
              </div>

              <div class="row g-3 text-start mt-2">
                <div class="col-md-6">
                  <label class="form-label">คนขับรถ</label>
                  <select id="sw_driver" class="form-select" required></select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">ทะเบียนรถ</label>
                  <select id="sw_vehicle" class="form-select" required></select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">วันที่สั่ง</label>
                  <input id="sw_date" type="date" class="form-control" required value="${today}" min="${today}">
                </div>
              </div>
            `;

  // 5) เปิดป๊อปอัป
  const { isConfirmed, value } = await Swal.fire({
    title: "กรอกข้อมูล",
    html,
    width: 900,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "บันทึก",
    cancelButtonText: "ยกเลิก",
    customClass: { popup: "text-start" },

    didOpen: () => {
      const $popup = $(Swal.getPopup());

      // Select2: Driver
      $popup.find("#sw_driver").select2({
        dropdownParent: $popup,
        placeholder: "พิมพ์ชื่อหรือรหัสคนขับ...",
        allowClear: true,
        width: "100%",
        minimumInputLength: 0,
        ajax: {
          url: "api/drivers",
          dataType: "json",
          delay: 250,
          cache: true,
          data: (params) => ({
            search: params.term || "",
            limit: 50,
            branch_id: branchIdForFilter,
            purch_ids: purchIds.join(","),
          }),
          processResults: (res) => ({
            results: (Array.isArray(res?.data) ? res.data : []).map((x) => ({
              id: x.id,
              text: x.name,
              position: x.position || "",
            })),
          }),
        },
        language: {
          inputTooShort: () => "พิมพ์เพื่อค้นหา",
          noResults: () => "ไม่พบข้อมูล",
          searching: () => "กำลังค้นหา...",
        },
        templateResult: (item) => {
          if (!item.id) return item.text || "";
          const pos = item.position
            ? `<div class="text-muted small">${item.position}</div>`
            : "";
          return $(`<div><div>${item.text} | ${item.id}</div>${pos}</div>`);
        },
        templateSelection: (item) => item.text || item.id,
      });

      // Select2: Vehicle
      $popup.find("#sw_vehicle").select2({
        dropdownParent: $popup,
        placeholder: "พิมพ์ทะเบียนหรือรหัสรถ...",
        allowClear: true,
        width: "100%",
        minimumInputLength: 0,
        ajax: {
          url: "api/vehicles",
          dataType: "json",
          delay: 250,
          cache: true,
          data: (params) => ({
            search: params.term || "",
            limit: 50,
            branch_id: branchIdForFilter,
            purch_ids: purchIds.join(","),
          }),
          processResults: (res) => ({
            results: (Array.isArray(res?.data) ? res.data : []).map((x) => ({
              id: x.id,
              text: x.plate || x.id,
            })),
          }),
        },
        language: {
          inputTooShort: () => "พิมพ์เพื่อค้นหา",
          noResults: () => "ไม่พบข้อมูล",
          searching: () => "กำลังค้นหา...",
        },
        templateResult: (item) =>
          item.id ? $(`<div>${item.text}</div>`) : item.text,
        templateSelection: (item) => item.text || item.id,
      });
    },

    preConfirm: () => {
      // อ่านค่ารอบเฉพาะช่องที่ไม่ disabled
      const inputs = Array.from(
        document.querySelectorAll('input[id^="round_"]:not(:disabled)')
      );

      const entries = inputs.map((el) => {
        const purch_id = el.dataset.id;
        const rem = Number(
          (window.REMAINING_BY_ID || new Map()).get(purch_id) ?? 0
        );
        const v = Math.max(0, parseInt(el.value, 10) || 0);
        const rounds = Math.min(rem || Infinity, Math.max(0, v)); // clamp อีกชั้น
        return { purch_id, rounds };
      });

      const totalRounds = entries.reduce((s, x) => s + x.rounds, 0);
      if (totalRounds === 0) {
        Swal.showValidationMessage("กรอกจำนวนรอบอย่างน้อย 1 รวมทุก PO");
        return false;
      }

      // ✅ ดึงทั้ง id และชื่อที่แสดงจาก Select2
      const driverEl = document.getElementById("sw_driver");
      const vehicleEl = document.getElementById("sw_vehicle");

      const driver_id = (driverEl.value || "").trim();
      const vehicle_id = (vehicleEl.value || "").trim();

      // ถ้าใช้ Select2 ให้ดึง text จาก data()[0].text
      const driverSel2 = $("#sw_driver").select2("data");
      const vehicleSel2 = $("#sw_vehicle").select2("data");

      const driver_name =
        (driverSel2 && driverSel2[0]?.text) ||
        driverEl.options[driverEl.selectedIndex]?.text ||
        "";

      const vehicle_name =
        (vehicleSel2 && vehicleSel2[0]?.text) ||
        vehicleEl.options[vehicleEl.selectedIndex]?.text ||
        "";

      const receive_date = document.getElementById("sw_date").value;

      if (!driver_id || !vehicle_id || !receive_date) {
        Swal.showValidationMessage("กรุณาเลือกคนขับ/ทะเบียนรถ/วันที่ให้ครบ");
        return false;
      }

      // ✅ คืนค่าพร้อมชื่อไปให้ backend
      return {
        entries,
        driver_id,
        driver_name,
        vehicle_id,
        vehicle_name,
        receive_date,
      };
    },
  });

  if (!isConfirmed) return;

  // 6) ส่งไป backend
  try {
    const res = await fetch("api/data/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    const j = await res.json();
    if (!j.ok) throw new Error(j.detail || "บันทึกไม่สำเร็จ");

    await Swal.fire({
      icon: "success",
      title: "บันทึกสำเร็จ",
      timer: 1500,
      showConfirmButton: false,
    }).then(() => {
      window.location.reload();
    });
    // รีโหลดตารางให้คงเหลืออัปเดต
    bootstrap();
  } catch (err) {
    console.error(err);
    await Swal.fire({
      icon: "error",
      title: "ผิดพลาด",
      text: err.message || String(err),
    });
  }
});
