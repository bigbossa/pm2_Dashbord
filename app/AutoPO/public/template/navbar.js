(async function renderNavbarMini() {
  const container = document.getElementById("navbarMini");
  if (!container) return;

  // HTML ของ navbar-mini ใช้ร่วมกันได้ทุกหน้า
  container.innerHTML = `
    <div class="navbar-mini mb-3">
      <div class="d-flex align-items-center gap-2">
        <button id="btnMenu" aria-label="เปิดเมนู">
          <i class="bi bi-list"></i>
        </button>
        <span class="username" id="username">กำลังโหลด...</span>
      </div>
      <div class="d-flex align-items-center gap-2">
        <a class="btn btn-outline-secondary btn-sm" href="#" id="logoutBtn">Logout</a>
      </div>
    </div>
  `;

  // ดึงข้อมูล session เพื่อใส่ชื่อผู้ใช้
  async function fetchSession() {
    try {
      const res = await fetch("api/ses", { credentials: "include" });
      const json = await res.json();
      return json.user || {};
    } catch {
      return {};
    }
  }

  const user = await fetchSession();
  const u = document.getElementById("username");

  // แสดง full_name หรือ username
  u.textContent = user.username || user.displayName || "ไม่ระบุ";

  // ปุ่ม Logout
  document.getElementById("logoutBtn").addEventListener("click", (e) => {
    e.preventDefault();
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
      if (r.isConfirmed) location.href = "logout";
    });
  });

  // ====== Hamburger Menu Control ======
  setTimeout(() => {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const btnMenu = document.getElementById("btnMenu");

    if (!sidebar || !overlay || !btnMenu) return;

    const openMenu = () => {
      sidebar.classList.add("open");
      overlay.classList.add("show");
      document.body.style.overflow = "hidden";
    };
    
    const closeMenu = () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("show");
      document.body.style.overflow = "";
    };

    btnMenu.addEventListener("click", openMenu);
    overlay.addEventListener("click", closeMenu);
    document.addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());
    window.addEventListener("resize", () => window.innerWidth >= 992 && closeMenu());
    
    document.querySelectorAll(".sidebar a").forEach((a) =>
      a.addEventListener("click", () => window.innerWidth < 992 && closeMenu())
    );
  }, 100);
})();
