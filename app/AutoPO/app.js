const express = require("express");
const path = require("path");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const app = express();
const port = 1003; // กำหนดพอร์ตที่ต้องการใช้
const indexRouter = require("./routes/index"); // Router


// อ่าน x-www-form-urlencoded (ฟอร์ม)
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // <-- ต้องมี! เพื่ออ่าน JSON body
app.use(cookieParser()); // <-- เพิ่ม cookie-parser

// ✅ เปิด session
app.use(
  session({
    secret: "1234", // เปลี่ยนเป็นค่าอื่นเวลาใช้จริง
    resave: false,
    saveUninitialized: false
  })
);

// ✅ Middleware: โหลด user จาก cookie เข้า req.user
app.use((req, res, next) => {
  if (req.cookies?.autopo_user) {
    try {
      req.user = JSON.parse(req.cookies.autopo_user);
      // Backward compatibility: เก็บไว้ใน session ด้วยถ้ามี code เก่าใช้ req.session.user
      if (!req.session.user) {
        req.session.user = req.user;
      }
    } catch (e) {
      console.error("❌ Error parsing cookie:", e);
    }
  }
  next();
});

// ✅ ตั้งค่า static files ก่อน (ต้องอยู่ก่อน routes)
app.use(express.static(path.join(__dirname, "public")));

// ✅ เพิ่ม path สำหรับ shared image folder (root project)
app.use("/image", express.static(path.join(__dirname, "../../public/image")));

// ✅ Redirect "/" ไปที่ "/login"
app.get("/", (req, res) => {
  res.redirect("login");
});

// ✅ ใช้ router หลัก (ไม่ต้อง /AutoPO เพราะ server.js จะเพิ่มเอง)
app.use("/", indexRouter);

// ตรวจสอบและสร้างตารางเมื่อเซิร์ฟเวอร์เริ่มทำงาน
(async function initDatabase() {
  try {
    const { ensureFinishTable, ensureCancelLogsTable, ensureDispatchPoRunsTable, ensureDriverLastCancelMileTable } = require('./routes/index');
    console.log('🔧 Initializing database tables...');
    await ensureFinishTable();
    await ensureCancelLogsTable();
    await ensureDispatchPoRunsTable();
    await ensureDriverLastCancelMileTable();
    console.log('✅ Database tables initialized successfully');
  } catch (err) {
    console.error('❌ Database initialization error:', err);
  }
})();

// ✅ Start server on port 1003
app.listen(port, () => {
  console.log('');
  console.log('============================================================');
  console.log('🚀 AutoPO SERVER IS RUNNING');
  console.log('============================================================');
  console.log(`   📍 Port:      ${port}`);
  console.log(`   📍 URL:       http://localhost:${port}`);
  console.log('============================================================');
  console.log('');
});

module.exports = app;

