(async function renderSidebar() {
  const container = document.getElementById("sidebar");
  if (!container) return;

  // ดึงข้อมูล user จาก session
  let userRole = "admin"; // default
  try {
    const res = await fetch("api/ses", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      userRole = data.user?.userRole || "admin";
    }
  } catch (err) {
    console.log("Cannot fetch session:", err);
  }

  // สร้างเมนูตาม role
  let menuHTML = `
    <div class="sidebar">
      <h4 class="mb-3">เมนู</h4>
  `;

  // Concrete role - เห็นเฉพาะรายงานคอนกรีต
  if (userRole === "concrete") {
    menuHTML += `<a href="success_report">รายงานยงคอนกรีต</a>`;
  } else if (userRole === "prompt") {
    // Prompt role - ไม่เห็น Dashboard และรายงานคอนกรีต
    menuHTML += `<a href="manage">จัดเที่ยวรถ</a>`;
    menuHTML += `<a href="report">รายงานรอบวิ่ง</a>`;
    menuHTML += `<a href="prompt_report">รายงานพร้อมขนส่ง</a>`;
    menuHTML += `<a href="cancel_report">รายงานการยกเลิก</a>`;
  } else {
    // Admin - เห็นทุกเมนู
    menuHTML += `<a href="dashboard"><i class="bi bi-speedometer2"></i> Dashboard</a>`;
    menuHTML += `<a href="manage">จัดเที่ยวรถ</a>`;
    menuHTML += `<a href="report">รายงานรอบวิ่ง</a>`;
    menuHTML += `<a href="prompt_report">รายงานพร้อมขนส่ง</a>`;
    menuHTML += `<a href="success_report">รายงานยงคอนกรีต</a>`;
    menuHTML += `<a href="cancel_report">รายงานการยกเลิก</a>`;
    // menuHTML += `<a href="driver_report">รายงานคนขับรถ</a>`;

  }

  menuHTML += `
    </div>
    
    <!-- Overlay สำหรับมือถือ -->
    <div id="sidebarOverlay"></div>
  `;

  container.innerHTML = menuHTML;

  // ใส่ active ตาม path ปัจจุบัน
  const path = location.pathname;
  document
    .querySelectorAll(".sidebar a")
    .forEach((a) => {
      const href = a.getAttribute("href");
      // เปรียบเทียบทั้ง full path และ path ที่ลงท้ายด้วย href
      if (path === href || path.endsWith("/" + href) || path.includes("/" + href)) {
        a.classList.add("active");
      } else {
        a.classList.remove("active");
      }
    });
})();
