const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const router = express.Router();
const { authGuard } = require("../middlewares/auth");
const axios = require("axios");
const { pool, useryc_pool } = require("../db");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const FormData = require("form-data");
const zlib = require("zlib");

// const API_PO = "http://192.168.1.221:10449/api/purchline/";
const API_PO = " http://192.168.2.25:10440/api/purchline/";
// const API_USER = "http://192.168.2.28:433/intraapi/api/Data/GetUsr?id=";
const API_PUSER =
  "http://192.168.2.28:433/intraapi/api/Data/GetUsrPrivilege?id=";
const API_Driver = "http://192.168.2.28:433/intraapi/api/Data/GetPerson";
const API_Car = "http://192.168.2.28:433/intraapi/api/Data/GetCar";
const API_TypeCar = "http://192.168.2.28:433/intraapi/api/Data/GetTypeCar";

//---------------Mapping Functions----------------------------

// ฟังก์ชันแปลงเป็นรหัสคลัง (Y) ตามตารางที่ให้มา
function mapPlantCode(inventSiteId, inventLocationId, wmsLocationId) {
  const site = String(inventSiteId || "").trim();
  const invLoc = String(inventLocationId || "").trim();
  const wms = String(wmsLocationId || "").trim();
  
  // สร้าง key จากทั้ง 3 ฟิลด์
  const key = `${site}-${invLoc}-${wms}`;
  
  // Mapping ตามตารางที่ให้มา
  const mapping = {
    "00-00-10-P02": "Y5",
    "00-00-11-P01": "Y4",
    "01-01-10-110": "Y3",
    "01-01-11-120": "Y3",
    "03-03-10-310": "Y6",
    "07-07-10-710": "Y13",
    "09-09-10-910": "Y15",
    "10-10-10-1010": "Y16",
    "11-11-10-1110": "Y14",
    "04-04-10-P01": "Y8",
    "04-04-10-P02": "Y8",
    "05-05-11-PL1": "Y11",
    "05-05-12-PL2": "Y11",
    "05-05-13-PL3": "Y11",
  };
  
  return mapping[key] || "-";
}

// ฟังก์ชันแปลงเป็นชื่อแพลนท์
function mapPlantName(inventSiteId, inventLocationId, wmsLocationId) {
  const site = String(inventSiteId || "").trim();
  const invLoc = String(inventLocationId || "").trim();
  const wms = String(wmsLocationId || "").trim();
  
  // สร้าง key จากทั้ง 3 ฟิลด์
  const key = `${site}-${invLoc}-${wms}`;
  
  // Mapping ตามตารางที่ให้มา
  const mapping = {
    "00-00-10-P02": "แพลนท์1",
    "00-00-11-P01": "แพลนท์2",
    "01-01-10-110": "แพลนท์1",
    "01-01-11-120": "แพลนท์2",
    "03-03-10-310": "แพลนท์1",
    "07-07-10-710": "แพลนท์1",
    "09-09-10-910": "แพลนท์1",
    "10-10-10-1010": "แพลนท์1",
    "11-11-10-1110": "แพลนท์1",
    "04-04-10-P01": "แพลนท์1",
    "04-04-10-P02": "แพลนท์2",
    "05-05-11-PL1": "แพลนท์1",
    "05-05-12-PL2": "แพลนท์2",
    "05-05-13-PL3": "แพลนท์3",
  };
  
  return mapping[key] || "-";
}

//---------------Path----------------------------

router.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/login.html"));
});

//----------------Login (เชื่อม API)---------------------------

router.post("/login", async (req, res) => {
  let { username, password } = req.body;

  username = (username || "").trim();
  password = (password || "").trim();

  if (!username || !password) {
    return res.status(400).send(`
      <script>alert('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');window.location='login';</script>
    `);
  }

  // 1) Admin (ยังใช้ได้เหมือนเดิม)
  if (username === "admin" && password === "1234") {
    const userData = {
      username: "admin",
      userRole: "admin", // admin เห็นทุกอย่าง
      branchAccess: ["00", "01", "03", "04", "05", "07", "09", "10", "11"], // admin เข้าถึงทุกสาขา
    };
    req.session.user = userData;
    // เก็บใน cookie (7 วัน)
    res.cookie("autopo_user", JSON.stringify(userData), {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    return res.redirect("manage");
  }

  // 2) Prompt test (hardcode)
  if (username === "prompt" && password === "1234") {
    const userData = {
      username: "ฝ่ายขนส่งทดสอบ",
      displayName: "Prompt Test",
      userId: "PROMPT_TEST",
      userRole: "prompt",
      nickname: "Prompt",
      branchId: "01",
      branchName: "วังสารภี",
      branchAccess: ["00", "01"], // ทดสอบเห็น 2 สาขา
    };
    req.session.user = userData;
    res.cookie("autopo_user", JSON.stringify(userData), {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    return res.redirect("manage");
  }

  // 3) Concrete test (hardcode)
  if (username === "concrete" && password === "1234") {
    const userData = {
      username: "ฝ่ายคอนกรีตทดสอบ",
      displayName: "Concrete Test",
      userId: "CONCRETE_TEST",
      userRole: "concrete",
      nickname: "Concrete",
      branchId: "01",
      branchName: "วังสารภี",
    };
    req.session.user = userData;
    res.cookie("autopo_user", JSON.stringify(userData), {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    return res.redirect("success_report");
  }

  // 4) Driver test (hardcode)
  if (username === "driver" && password === "1234") {
    const userData = {
      username: "Test Driver",
      displayName: "Driver Test Account",
      driverId: "Y820229",
    };
    req.session.user = userData;
    res.cookie("autopo_user", JSON.stringify(userData), {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    return res.redirect("driver_job");
  }

  // 5) เช็คจากฐานข้อมูล useryc (Concrete Users)
  try {
    const { rows } = await useryc_pool.query(
      `SELECT iduser, usersname, site, username, password, department, userid 
       FROM useryc 
       WHERE username = $1`,
      [username]
    );

    if (rows.length > 0) {
      const user = rows[0];
      console.log(`Useryc user found:`, {
        username: user.username,
        department: user.department,
        site: user.site,
      });
      console.log(`Password match: ${user.password === password}`);

      if (user.password === password) {
        // ดึงชื่อสาขาจาก branches table ใน useryc database
        let branchName = "";
        if (user.site) {
          const branchResult = await useryc_pool.query(
            `SELECT name FROM branches WHERE id = $1`,
            [user.site]
          );
          if (branchResult.rows.length > 0) {
            branchName = branchResult.rows[0].name;
          }
        }

        // ✔ Login สำเร็จ - Concrete User
        const userData = {
          username: user.usersname || user.username,
          displayName: user.usersname || user.username,
          userId: user.userid || user.iduser,
          userRole: "concrete",
          nickname: user.usersname || "",
          branchId: user.site || "",
          branchName: branchName,
        };
        req.session.user = userData;
        res.cookie("autopo_user", JSON.stringify(userData), {
          httpOnly: true,
          maxAge: 7 * 24 * 60 * 60 * 1000
        });
        console.log("Concrete user logged in:", userData);
        return res.redirect("success_report");
      }
    }
  } catch (err) {
    console.log("Concrete user DB check error:", err.message);
  }

  // 6) เช็ค API User Privilege (Prompt/Staff)
  try {
    const userResp = await axios.get(`${API_PUSER}${username}`, {
      timeout: 10000,
    });
    const userData = userResp.data?.data;

    if (userData && Array.isArray(userData) && userData.length > 0) {
      const user = userData[0];
      const userPass = String(user.password || "").trim();

      if (userPass === password) {
        // ดึง branchId และ branchName จาก BrhConcrete (เช่น "01 วังสารภี")
        let branchId = "";
        let branchName = "";
        if (user.BrhConcrete) {
          const brhFull = String(user.BrhConcrete).trim();
          // แยกเลขสาขา (2 หลักแรก)
          const match = brhFull.match(/^(\d+)\s*(.*)/);
          if (match) {
            branchId = match[1].padStart(2, "0"); // เช่น "1" -> "01"
            branchName = match[2].trim(); // เช่น "วังสารภี"
          }
        }

        // รวบรวมสาขาที่มีสิทธิ์เข้าถึง (B1-B9 = true)
        // Mapping B1-B9 to actual branch IDs
        const branchMapping = {
          1: "00", // สำนักงานใหญ่
          2: "01", // วังสารภี
          3: "04", // ชลบุรี
          4: "09", // บางใหญ่
          5: "10", // ระยอง
          6: "03", // นครปฐม
          7: "05", // บางเลน
          8: "07", // นครศรีธรรมราช
          9: "11", // แก่งเสียน
        };

        const branchAccess = [];
        for (let i = 1; i <= 9; i++) {
          if (user[`B${i}`] === true) {
            branchAccess.push(branchMapping[i]);
          }
        }

        // ✔ Login สำเร็จ - Prompt User
        const userData = {
          username: user.FullName || user.username || username,
          displayName: user.FullName || user.NickName || username,
          userId: user.ID || user.username,
          userRole: "prompt",
          nickname: user.NickName || "",
          branchId: branchId,
          branchName: branchName,
          branchAccess: branchAccess, // สาขาที่มีสิทธิ์
          inactive: user.Inactive || "A",
        };
        req.session.user = userData;
        res.cookie("autopo_user", JSON.stringify(userData), {
          httpOnly: true,
          maxAge: 7 * 24 * 60 * 60 * 1000
        });
        console.log("Prompt user logged in:", userData);
        return res.redirect("manage");
      }
    }
  } catch (err) {
    // ถ้า API_PUSER error หรือไม่พบ ให้ลองเช็ค Driver ต่อ
    console.log(
      "USER Privilege API not found or error, checking driver API..."
    );
  }

  // 7) Driver จริงจาก API (JSON array)
  try {
    const resp = await axios.get(API_Driver, { timeout: 10000 });
    const drivers = resp.data?.data || [];

    const found = drivers.find((d) => String(d.PersonCode).trim() === username);

    if (!found) {
      return res.status(401).send(`
        <script>alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');window.location='login';</script>
      `);
    }

    // ตรวจรหัสผ่าน
    if (String(found.pass).trim() !== password) {
      return res.status(401).send(`
        <script>alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');window.location='login';</script>
      `);
    }

    // ✔ Login สำเร็จ
    const userData = {
      username: found.FullName,
      displayName: found.FullName,
      driverId: found.PersonCode,
      driverRole: found.PositionNameT,
    };
    req.session.user = userData;
    res.cookie("autopo_user", JSON.stringify(userData), {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.redirect("driver_job");
  } catch (err) {
    console.error("LOGIN API ERROR:", err.message);
    return res.status(500).send(`
      <script>alert('เชื่อมต่อระบบไม่ได้');window.location='login';</script>
    `);
  }
});

//---------------------------------------------------------------

router.get("/api/ses", (req, res) => {
  const user = req.user || req.session?.user;
  if (!user) return res.status(401).json({ ok: false });
  res.json({ ok: true, user });
});

router.get("/dashboard", authGuard, (req, res) => {
  const userRole = req.session?.user?.userRole;
  // เฉพาะ admin เท่านั้นที่เข้าได้
  if (userRole !== "admin") {
    const redirectUrl =
      userRole === "concrete"
        ? "success_report"
        : userRole === "prompt"
        ? "prompt_report"
        : "manage";
    return res.status(403).send(`
      <script>
        alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        window.location='${redirectUrl}';
      </script>
    `);
  }
  res.sendFile(path.join(__dirname, "../public/dashboard.html"));
});

router.get("/manage", authGuard, (req, res) => {
  const userRole = req.session?.user?.userRole;
  if (userRole === "concrete") {
    return res.status(403).send(`
      <script>
        alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        window.location='success_report';
      </script>
    `);
  }
  res.sendFile(path.join(__dirname, "../public/manage.html"));
});

router.get("/report", authGuard, (req, res) => {
  const userRole = req.session?.user?.userRole;
  if (userRole === "concrete") {
    return res.status(403).send(`
      <script>
        alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        window.location='success_report';
      </script>
    `);
  }
  res.sendFile(path.join(__dirname, "../public/report.html"));
});

router.get("/success_report", authGuard, (req, res) => {
  // เฉพาะ admin และ concrete เท่านั้นที่เห็นหน้านี้
  const userRole = req.session?.user?.userRole;
  if (userRole === "prompt") {
    return res.status(403).send(`
      <script>
        alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        window.location='prompt_report';
      </script>
    `);
  }
  res.sendFile(path.join(__dirname, "../public/success_report.html"));
});

router.get("/prompt_report", authGuard, (req, res) => {
  // เฉพาะ admin และ prompt เท่านั้นที่เห็นหน้านี้
  const userRole = req.session?.user?.userRole;
  if (userRole === "concrete") {
    return res.status(403).send(`
      <script>
        alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        window.location='success_report';
      </script>
    `);
  }
  res.sendFile(path.join(__dirname, "../public/prompt_report.html"));
});

router.get("/driver_job", authGuard, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/driver_job.html"));
});

router.get("/finish_form", authGuard, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/finish_form.html"));
});

router.get("/driver_finish", authGuard, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/driver_finish.html"));
});

router.get("/cancel_report", authGuard, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/cancel_report.html"));
});

router.get("/logout", (req, res) => {
  // ลบ cookie
  res.clearCookie("autopo_user");
  // ลบ session
  req.session.destroy(() => {
    res.redirect("login");
  });
});

// ----------------------------แบบกำหนดสาขา-----------------------------------

router.get("/api/po", authGuard, async (req, res) => {
  try {
    const user = req.session.user || {};

    // กำหนดสาขาที่จะดึงข้อมูล
    let branchIds = [];
    if (user.userRole === "admin") {
      // Admin ดูได้ทุกสาขา
      branchIds = ["00", "01", "03", "04", "05", "07", "09", "10", "11"];
    } else if (
      Array.isArray(user.branchAccess) &&
      user.branchAccess.length > 0
    ) {
      // ถ้ามี branchAccess ให้ดึงทุกสาขาที่มีสิทธิ์
      branchIds = user.branchAccess;
    } else if (user.branchId) {
      // ถ้าไม่มี branchAccess ให้ดึงเฉพาะสาขาตัวเอง
      branchIds = [user.branchId];
    } else {
      // fallback
      branchIds = ["01"];
    }

    console.log(
      `[/api/po] User ${user.username} fetching branches:`,
      branchIds
    );

    // ดึงข้อมูลจากทุกสาขาพร้อมกัน
    const requests = branchIds.map((branchId) => {
      const apiUrl = API_PO + branchId;
      // console.log(`[/api/po] Fetching from: ${apiUrl}`);
      return axios.get(apiUrl, { timeout: 30000 }).catch((err) => {
        console.error(`Failed to fetch branch ${branchId}:`, err.message);
        console.error(`  URL: ${apiUrl}`);
        console.error(`  Error code: ${err.code}`);
        return { data: { data: [] } }; // คืนค่าว่างถ้า error
      });
    });

    const responses = await Promise.all(requests);

    // รวมข้อมูลจากทุกสาขา
    let allData = [];
    responses.forEach((response) => {
      const arr = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? response.data
        : [];
      allData = allData.concat(arr);
    });

    // ดึงชื่อสาขาจาก useryc database
    const branchMap = {};
    try {
      const branchResult = await useryc_pool.query(
        `SELECT id, name FROM branches`
      );
      branchResult.rows.forEach((b) => {
        branchMap[b.id] = b.name;
      });
    } catch (err) {
      console.log("Error fetching branches from useryc:", err.message);
    }

    const rows = allData.map((x) => ({
      item_id: x.ITEMID ?? "",
      item_name: x.NAME ?? "",
      qty_ordered: x.QTYORDERED ?? 0,
      branch_id: x.INVENTSITEID ?? "",
      branch_name: branchMap[x.INVENTSITEID] || x.INVENTSITEID || "",
      purch_name: x.PURCHNAME ?? "",
      purch_id: x.PURCHID ?? "",
      purch_status: x.PURCHLINESTATUS ?? "",
      sub_id: x.RECID ?? "",
      BPC_REMARK: x.BPC_REMARK ?? "",
      WMSLOCATIONID: x.WMSLOCATIONID ?? "",
      INVENTLOCATIONID: x.INVENTLOCATIONID ?? "",
      plant_code: mapPlantCode(x.INVENTSITEID, x.INVENTLOCATIONID, x.WMSLOCATIONID),
      plant_name: mapPlantName(x.INVENTSITEID, x.INVENTLOCATIONID, x.WMSLOCATIONID),
    }));

    res.json({ ok: true, data: rows });
  } catch (e) {
    console.error("UPSTREAM_ERROR:", e.message);
    res.status(502).json({ ok: false, error: "UPSTREAM_ERROR" });
  }
});

// API สำหรับ Dashboard - ดึงรอบวิ่งที่เสร็จแล้ว (purch_status1 = 3 หรือ 4) - แสดงทั้งหมด พร้อม item_name และ vehicle_name
router.get("/api/finished_po", authGuard, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT rec_id, purch_id, item_name, vehicle_name
      FROM dispatch_po_runs 
      WHERE purch_status1 IN (3, 4)
    `);
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("Error fetching finished PO:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// API สำหรับ Dashboard - ดึงรอบที่รอวิ่ง (purch_status1 = 2) - แสดงทั้งหมด
router.get("/api/pending_po", authGuard, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT rec_id, purch_id 
      FROM dispatch_po_runs 
      WHERE purch_status1 = 2
    `);
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("Error fetching pending PO:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get("/api/purchlines", authGuard, async (req, res) => {
  try {
    const user = req.session.user || {};
    const ids = (req.query.ids || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // กำหนดสาขาที่จะดึงข้อมูล (เหมือน /api/po)
    let branchIds = [];
    if (user.userRole === "admin") {
      // Admin ดูได้ทุกสาขา
      branchIds = ["00", "01", "03", "04", "05", "07", "09", "10", "11"];
    } else if (
      Array.isArray(user.branchAccess) &&
      user.branchAccess.length > 0
    ) {
      branchIds = user.branchAccess;
    } else if (user.branchId) {
      branchIds = [user.branchId];
    } else {
      branchIds = ["01"];
    }

    // ดึงข้อมูลจากทุกสาขาพร้อมกัน
    const requests = branchIds.map((branchId) => {
      const apiUrl = API_PO + branchId;
      return axios.get(apiUrl, { timeout: 30000 }).catch((err) => {
        console.error(`[/api/purchlines] Failed to fetch branch ${branchId}:`, err.message);
        return { data: { data: [] } };
      });
    });

    const responses = await Promise.all(requests);

    // รวมข้อมูลจากทุกสาขา
    let allData = [];
    responses.forEach((response) => {
      const arr = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? response.data
        : [];
      allData = allData.concat(arr);
    });

    const rows = allData.map((x) => ({
      item_id: x.ITEMID ?? "",
      item_name: x.NAME ?? "",
      qty_ordered: x.QTYORDERED ?? 0,
      branch_id: x.INVENTSITEID ?? "",
      purch_name: x.PURCHNAME ?? "",
      purch_id: x.PURCHID ?? "",
      purch_status: String(x.PURCHSTATUS ?? ""),
      sub_id: x.RECID ?? "",
    }));

    const filtered = ids.length
      ? rows.filter((r) => ids.includes(r.purch_id))
      : rows;
    res.json({ ok: true, data: filtered });
  } catch (e) {
    console.error("purchlines error:", e.message);
    res.status(502).json({ ok: false, detail: "UPSTREAM_ERROR" });
  }
});

//------------------------------บันทึกข้อมูล------------------------------------

router.post("/api/data/save", authGuard, async (req, res) => {
  try {
    const {
      driver_id,
      driver_name,
      vehicle_id,
      vehicle_name,
      receive_date,
      entries,
    } = req.body;

    if (
      !driver_id ||
      !vehicle_id ||
      !Array.isArray(entries) ||
      !entries.length
    ) {
      return res.status(400).json({ ok: false, detail: "ข้อมูลไม่ครบ" });
    }

    // ---------- Utils ----------
    const norm = (s) =>
      String(s ?? "")
        .trim()
        .toUpperCase();
    const remapLine = (x) => ({
      ITEMID: x.ITEMID ?? x.item_id ?? null,
      NAME: x.NAME ?? x.item_name ?? null,
      QTYORDERED: x.QTYORDERED ?? x.qty_ordered ?? null,
      INVENTSITEID: x.INVENTSITEID ?? x.branch_id ?? null,
      PURCHNAME: x.PURCHNAME ?? x.purch_name ?? null,
      PURCHID: x.PURCHID ?? x.purch_id ?? null,
      PURCHSTATUS: x.PURCHLINESTATUS ?? x.purch_status ?? null,
      RECID: x.RECID ?? x.rec_id ?? null,
      PURCHUNIT: x.PURCHUNIT ?? x.purch_unit ?? null,
      BPC_REMARK: x.BPC_REMARK ?? x.bpc_remark ?? null,
      BPC_LASTCONFIRMDATE:
        x.BPC_LASTCONFIRMDATE ?? x.bpc_lastconfirmdate ?? null,
      DATAAREAID: x.DATAAREAID ?? x.dataareaid ?? null,
      PARTITION: x.PARTITION ?? x.partition_key ?? null,
      ["DATAAREAID#2"]: x["DATAAREAID#2"] ?? x.dataareaid_2 ?? null,
      ["PARTITION#2"]: x["PARTITION#2"] ?? x.partition_key_2 ?? null,
      WMSLOCATIONID: x.WMSLOCATIONID ?? x.wms_location_id ?? null,
      INVENTLOCATIONID: x.INVENTLOCATIONID ?? x.invent_location_id ?? null,
      plant_code: x.plant_code ?? mapPlantCode(x.INVENTSITEID, x.INVENTLOCATIONID, x.WMSLOCATIONID),
      plant_name: x.plant_name ?? mapPlantName(x.INVENTSITEID, x.INVENTLOCATIONID, x.WMSLOCATIONID),
    });

    // ---------- เตรียมข้อมูล PO ----------
    const user = req.session.user || {};
    let arr = [];

    if (Array.isArray(req.body.po_cache) && req.body.po_cache.length > 0) {
      arr = req.body.po_cache.map(remapLine);
    } else {
      // กำหนดสาขาที่จะดึงข้อมูล (เหมือน /api/po)
      let branchIds = [];
      if (user.userRole === "admin") {
        // Admin ดูได้ทุกสาขา
        branchIds = ["00", "01", "03", "04", "05", "07", "09", "10", "11"];
      } else if (Array.isArray(user.branchAccess) && user.branchAccess.length > 0) {
        branchIds = user.branchAccess;
      } else if (user.branchId) {
        branchIds = [user.branchId];
      } else {
        branchIds = ["01"];
      }

      // ดึงข้อมูลจากทุกสาขาพร้อมกัน
      const requests = branchIds.map((branchId) =>
        axios.get(`${API_PO}${branchId}`, { timeout: 10000 }).catch((err) => {
          console.error(`Failed to fetch branch ${branchId}:`, err.message);
          return { data: { data: [] } };
        })
      );

      const responses = await Promise.all(requests);

      // รวมข้อมูลจากทุกสาขา
      responses.forEach((response) => {
        const branchData = Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data)
          ? response.data
          : [];
        arr = arr.concat(branchData.map(remapLine));
      });

      console.log(`[/api/data/save] Total PO items loaded: ${arr.length}`);
    }

    const rows = [];
    const missing = [];

    // ---------- รวบรวม PO ที่ผู้ใช้กรอกเข้ามา ----------
    const purchIds = [
      ...new Set(entries.map((e) => norm(e.purch_id)).filter(Boolean)),
    ];
    if (!purchIds.length) {
      return res
        .status(400)
        .json({ ok: false, detail: "ไม่มีรหัส PO ใน entries" });
    }

    // ---------- หา MAX(run_no) ต่อ PO (ไม่สนวันที่) ----------
    const maxRunMap = new Map(); // key = purch_id (normalized), value = max_run_no(int)
    {
      const client = await pool.connect();
      try {
        const q = `
          SELECT purch_id, MAX(run_no)::int AS max_run
          FROM dispatch_po_runs
          WHERE purch_id = ANY($1)
          GROUP BY purch_id
        `;
        const { rows: rs } = await client.query(q, [purchIds]);
        for (const r of rs) {
          maxRunMap.set(norm(r.purch_id), Number(r.max_run) || 0);
        }
        for (const pid of purchIds) {
          if (!maxRunMap.has(pid)) maxRunMap.set(pid, 0);
        }
      } finally {
        client.release();
      }
    }

    // ---------- สร้างแถวที่จะบันทึก โดยรอบวิ่งนับต่อจากเดิม ----------
    for (const e of entries) {
      const pid = norm(e.purch_id);
      const rounds = Number(e.rounds) || 0;
      if (!pid || !Number.isInteger(rounds) || rounds <= 0) continue;

      const poItems = arr.filter((x) => norm(x.PURCHID) === pid);
      if (!poItems.length) {
        missing.push(e.purch_id);
        continue;
      }

      const base = maxRunMap.get(pid) || 0; // รอบสูงสุดเดิม (รวมทุกวัน)
      for (let i = 1; i <= rounds; i++) {
        const runNo = base + i; // ← ต่อรอบจากเดิม
        for (const x of poItems) {
          rows.push({
            purch_id: x.PURCHID ?? null,
            driver_id,
            driver_name,
            vehicle_id,
            vehicle_name,
            receive_date, // เก็บไว้เป็นข้อมูล แต่ไม่ได้ใช้คีย์รอบ
            run_no: runNo, // ← ใช้รอบใหม่
            item_id: x.ITEMID ?? null,
            item_name: x.NAME ?? null,
            purch_status: 2, // บังคับสถานะ "รอจัดส่ง"
            purch_unit: x.PURCHUNIT ?? null,
            qty_ordered: x.QTYORDERED ?? null,
            purch_status1: 2, // บังคับสถานะ "รอจัดส่ง"
            dataareaid: x.DATAAREAID ?? null,
            partition_key: x.PARTITION ?? null,
            rec_id: x.PURCHID + runNo, // ถ้ามี RECID จากต้นทางให้เก็บตามจริง
            dataareaid_2: x["DATAAREAID#2"] ?? null,
            partition_key_2: x["PARTITION#2"] ?? null,
            bpc_remark: x.BPC_REMARK ?? null,
            invent_site_id: x.INVENTSITEID ?? null,
            bpc_lastconfirmdate: x.BPC_LASTCONFIRMDATE ?? null,
            purch_name: x.PURCHNAME ?? null,
            wms_location_id: x.WMSLOCATIONID ?? null,
            invent_location_id: x.INVENTLOCATIONID ?? null,
            plant_code: x.plant_code ?? null,
            plant_name: x.plant_name ?? null,
          });
        }
      }
    }

    if (!rows.length) {
      // กำหนด branchList สำหรับแสดง error ให้ตรงกับสาขาที่ดึงข้อมูลจริง
      let branchList;
      if (user.userRole === "admin") {
        branchList = "00, 01, 03, 04, 05, 07, 09, 10, 11";
      } else if (Array.isArray(user.branchAccess) && user.branchAccess.length > 0) {
        branchList = user.branchAccess.join(", ");
      } else {
        branchList = user.branchId || "01";
      }

      return res.status(404).json({
        ok: false,
        detail: missing.length
          ? `ไม่พบใน API (สาขา ${branchList}): ${missing.join(", ")}`
          : "ไม่พบข้อมูล PO ใน API",
      });
    }

    // ---------- บันทึกลงฐานข้อมูล ----------
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const sql = `
        INSERT INTO dispatch_po_runs (
          purch_id, driver_id, driver_name, vehicle_id, vehicle_name, receive_date, run_no,
          item_id, item_name, purch_status, purch_unit, qty_ordered, purch_status1,
          dataareaid, partition_key, rec_id, dataareaid_2, partition_key_2,
          bpc_remark, invent_site_id, bpc_lastconfirmdate, purch_name, created_by,
          wms_location_id, invent_location_id, plant_code, plant_name
        )
        VALUES ${rows
          .map(
            (_, i) => `(
              $${i * 27 + 1},  $${i * 27 + 2},  $${i * 27 + 3},  $${
              i * 27 + 4
            },  $${i * 27 + 5},
              $${i * 27 + 6},  $${i * 27 + 7},  $${i * 27 + 8},  $${
              i * 27 + 9
            },  $${i * 27 + 10},
              $${i * 27 + 11}, $${i * 27 + 12}, $${i * 27 + 13}, $${
              i * 27 + 14
            }, $${i * 27 + 15},
              $${i * 27 + 16}, $${i * 27 + 17}, $${i * 27 + 18}, $${
              i * 27 + 19
            }, $${i * 27 + 20},
              $${i * 27 + 21}, $${i * 27 + 22}, $${i * 27 + 23}, $${
              i * 27 + 24
            }, $${i * 27 + 25},
              $${i * 27 + 26}, $${i * 27 + 27}
            )`
          )
          .join(",")}
        ON CONFLICT (purch_id, receive_date, run_no)
        DO NOTHING;
      `;

      const params = rows.flatMap((r) => [
        r.purch_id,
        r.driver_id,
        r.driver_name,
        r.vehicle_id,
        r.vehicle_name,
        r.receive_date,
        r.run_no,
        r.item_id,
        r.item_name,
        2, // บังคับสถานะ "รอจัดส่ง"
        r.purch_unit,
        r.qty_ordered,
        2, // บังคับสถานะ "รอจัดส่ง"
        r.dataareaid,
        r.partition_key,
        r.rec_id,
        r.dataareaid_2,
        r.partition_key_2,
        r.bpc_remark,
        r.invent_site_id,
        r.bpc_lastconfirmdate,
        r.purch_name,
        "system",
        r.wms_location_id || null,
        r.invent_location_id || null,
        r.plant_code || null,
        r.plant_name || null,
      ]);

      await client.query(sql, params);
      await client.query("COMMIT");
      return res.json({ ok: true, inserted: rows.length });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("DB ERROR:", err.message);
      return res.status(500).json({ ok: false, detail: err.message });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("ERROR:", err.message);
    return res.status(500).json({ ok: false, detail: err.message });
  }
});

router.post("/api/dispatch_runs_count", authGuard, async (req, res) => {
  try {
    const { purch_ids } = req.body;
    if (!Array.isArray(purch_ids) || purch_ids.length === 0)
      return res.json({ ok: true, data: [] });

    const client = await pool.connect();
    const sql = `
      SELECT purch_id, COUNT(DISTINCT run_no)::int AS run_count
      FROM dispatch_po_runs
      WHERE purch_id = ANY($1)
      GROUP BY purch_id;
    `;
    const { rows } = await client.query(sql, [purch_ids]);
    client.release();
    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("ERR:", err);
    return res.status(500).json({ ok: false, detail: err.message });
  }
});

//  GET: มีช่วงวันที่
router.get("/api/report/query", authGuard, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const user = req.session.user || {};

    // กำหนดสาขาที่มีสิทธิ์ดู
    let branchIds = [];
    if (user.userRole === "admin") {
      // admin เห็นทุกสาขา - ไม่กรอง
      branchIds = null;
    } else if (
      Array.isArray(user.branchAccess) &&
      user.branchAccess.length > 0
    ) {
      // prompt user ที่มี branchAccess
      branchIds = user.branchAccess;
    } else if (user.branchId) {
      // concrete หรือ user ที่มีสาขาเดียว
      branchIds = [user.branchId];
    } else {
      // ถ้าไม่มีสาขาเลย ให้คืนข้อมูลว่าง
      return res.json({ ok: true, data: [] });
    }

    const client = await pool.connect();

    const sql = `
      WITH base AS (
        SELECT
          purch_id,
          (receive_date)::date AS receive_date,
          COALESCE(NULLIF(TRIM(driver_name), ''), 'ไม่ระบุ')  AS driver_name_norm,
          COALESCE(NULLIF(TRIM(vehicle_name), ''), 'ไม่ระบุ') AS vehicle_name_norm,
          purch_name,
          item_name,
          invent_site_id,
          plant_code,
          plant_name
        FROM dispatch_po_runs
        WHERE purch_status1 = 2
          AND ($1::date IS NULL OR receive_date >= $1)
          AND ($2::date IS NULL OR receive_date <= $2)
          AND ($3::text[] IS NULL OR invent_site_id = ANY($3))
      )
      SELECT
        purch_id,
        TO_CHAR(receive_date, 'YYYY-MM-DD')              AS receive_date,
        MAX(purch_name)                                   AS purch_name,
        MAX(item_name)                                    AS item_name,
        driver_name_norm                                   AS driver_name,
        vehicle_name_norm                                  AS vehicle_name,
        2                                                 AS purch_status,
        MAX(invent_site_id)                               AS invent_site_id,
        MAX(plant_code)                                   AS plant_code,
        MAX(plant_name)                                   AS plant_name,
        COUNT(*)                                          AS run_count
      FROM base
      GROUP BY purch_id, receive_date, driver_name_norm, vehicle_name_norm
      ORDER BY receive_date DESC, purch_id, driver_name_norm, vehicle_name_norm;
    `;
    const params = [start_date || null, end_date || null, branchIds];

    const result = await client.query(sql, params);
    client.release();
    res.json({ ok: true, data: result.rows });
  } catch (e) {
    console.error("REPORT_GET_ERROR:", e);
    res.status(500).json({ ok: false, detail: "INTERNAL_SERVER_ERROR" });
  }
});

//  POST: ดึงทั้งหมด
router.post("/api/report/query", authGuard, async (req, res) => {
  try {
    const user = req.session.user || {};

    // กำหนดสาขาที่มีสิทธิ์ดู
    let branchIds = [];
    if (user.userRole === "admin") {
      // admin เห็นทุกสาขา - ไม่กรอง
      branchIds = null;
    } else if (
      Array.isArray(user.branchAccess) &&
      user.branchAccess.length > 0
    ) {
      // prompt user ที่มี branchAccess
      branchIds = user.branchAccess;
    } else if (user.branchId) {
      // concrete หรือ user ที่มีสาขาเดียว
      branchIds = [user.branchId];
    } else {
      // ถ้าไม่มีสาขาเลย ให้คืนข้อมูลว่าง
      return res.json({ ok: true, data: [] });
    }

    const client = await pool.connect();
    const sql = `
      WITH base AS (
        SELECT
          purch_id,
          (receive_date)::date AS receive_date,
          COALESCE(NULLIF(TRIM(driver_name), ''), 'ไม่ระบุ')  AS driver_name_norm,
          COALESCE(NULLIF(TRIM(vehicle_name), ''), 'ไม่ระบุ') AS vehicle_name_norm,
          purch_name,
          item_name,
          invent_site_id,
          plant_code,
          plant_name
        FROM dispatch_po_runs
        WHERE purch_status1 = 2
          AND ($1::text[] IS NULL OR invent_site_id = ANY($1))
      )
      SELECT
        purch_id,
        TO_CHAR(receive_date, 'YYYY-MM-DD')              AS receive_date,
        MAX(purch_name)                                   AS purch_name,
        MAX(item_name)                                    AS item_name,
        driver_name_norm                                   AS driver_name,
        vehicle_name_norm                                  AS vehicle_name,
        2                                                 AS purch_status,
        MAX(invent_site_id)                               AS invent_site_id,
        MAX(plant_code)                                   AS plant_code,
        MAX(plant_name)                                   AS plant_name,
        COUNT(*)                                          AS run_count
      FROM base
      GROUP BY purch_id, receive_date, driver_name_norm, vehicle_name_norm
      ORDER BY receive_date DESC, purch_id, driver_name_norm, vehicle_name_norm;
    `;
    const result = await client.query(sql, [branchIds]);
    client.release();
    res.json({ ok: true, data: result.rows });
  } catch (e) {
    console.error("REPORT_POST_ERROR:", e);
    res.status(500).json({ ok: false, detail: "INTERNAL_SERVER_ERROR" });
  }
});

// API: ดึงรายละเอียดรอบวิ่งแต่ละรอบของ PO
router.get("/api/report/runs", authGuard, async (req, res) => {
  try {
    const { purch_id } = req.query;
    
    if (!purch_id) {
      return res.status(400).json({ 
        ok: false, 
        detail: "กรุณาระบุ purch_id" 
      });
    }

    const client = await pool.connect();
    const sql = `
      SELECT
        r.purch_id,
        r.run_no,
        r.driver_id,
        r.driver_name,
        r.vehicle_id,
        r.vehicle_name,
        r.purch_status1,
        TO_CHAR(r.receive_date, 'YYYY-MM-DD') AS receive_date,
        CASE WHEN f.rec_id IS NOT NULL THEN true ELSE false END AS has_started
      FROM dispatch_po_runs r
      LEFT JOIN driver_job_finishes f ON f.rec_id = r.rec_id
      WHERE r.purch_id = $1
        AND r.purch_status1 = 2
      ORDER BY r.run_no;
    `;
    
    const result = await client.query(sql, [purch_id]);
    client.release();
    
    res.json({ ok: true, data: result.rows });
  } catch (e) {
    console.error("REPORT_RUNS_ERROR:", e);
    res.status(500).json({ ok: false, detail: "INTERNAL_SERVER_ERROR" });
  }
});

// API: อัปเดตคนขับและทะเบียนรถ
router.post("/api/report/update", authGuard, async (req, res) => {
  let client;
  try {
    const { purch_id, run_no, driver_id, vehicle_id, receive_date } = req.body;

    if (!purch_id || !driver_id || !vehicle_id) {
      return res.status(400).json({ 
        ok: false, 
        detail: "กรุณาระบุ purch_id, driver_id และ vehicle_id" 
      });
    }

    // ดึงข้อมูลคนขับและรถจาก API
    let driverName = "";
    let vehicleName = "";

    const [driverRes, vehicleRes] = await Promise.all([
      axios.get(API_Driver, { timeout: 10000 }),
      axios.get(API_Car, { timeout: 10000 })
    ]);

    const drivers = driverRes.data?.data || [];
    const vehicles = vehicleRes.data?.data || [];

    const driver = drivers.find(d => String(d.PersonCode).trim() === String(driver_id).trim());
    const vehicle = vehicles.find(v => String(v.IdAt).trim() === String(vehicle_id).trim());

    if (driver) {
      driverName = String(driver.FullName || "").trim();
    }
    if (vehicle) {
      vehicleName = String(vehicle.NmCar || "").trim();
    }

    if (!driverName || !vehicleName) {
      return res.status(400).json({ 
        ok: false, 
        detail: "ไม่พบข้อมูลคนขับหรือรถที่เลือก" 
      });
    }

    client = await pool.connect();

    // อัปเดตในตาราง dispatch_po_runs
    let sql;
    let params;

    if (run_no) {
      // ถ้ามี run_no ให้อัปเดตเฉพาะรอบนั้น
      sql = `
        UPDATE dispatch_po_runs
        SET 
          driver_name = $1,
          vehicle_name = $2,
          driver_id = $3,
          vehicle_id = $4,
          receive_date = $5
        WHERE purch_id = $6 
          AND run_no = $7
          AND purch_status1 = 2
      `;
      params = [driverName, vehicleName, driver_id, vehicle_id, receive_date, purch_id, run_no];
    } else {
      // ไม่มี run_no ให้อัปเดตทุกรอบของ PO นั้น
      sql = `
        UPDATE dispatch_po_runs
        SET 
          driver_name = $1,
          vehicle_name = $2,
          driver_id = $3,
          vehicle_id = $4,
          receive_date = $5
        WHERE purch_id = $6
          AND purch_status1 = 2
      `;
      params = [driverName, vehicleName, driver_id, vehicle_id, receive_date, purch_id];
    }

    const result = await client.query(sql, params);

    if (result.rowCount > 0) {
      return res.json({ 
        ok: true, 
        message: `อัปเดตข้อมูล ${result.rowCount} รายการสำเร็จ`,
        updated: result.rowCount
      });
    } else {
      return res.status(404).json({ 
        ok: false, 
        detail: "ไม่พบข้อมูลที่ต้องการอัปเดต หรืออาจถูกอัปเดตไปแล้ว" 
      });
    }
  } catch (e) {
    console.error("REPORT_UPDATE_ERROR:", e);
    if (!res.headersSent) {
      res.status(500).json({ ok: false, detail: "INTERNAL_SERVER_ERROR" });
    }
  } finally {
    if (client) client.release();
  }
});

// API: ยกเลิกรายการ
router.post("/api/report/cancel", authGuard, async (req, res) => {
  let client;
  try {
    const { purch_id, run_no } = req.body;

    if (!purch_id) {
      return res.status(400).json({ 
        ok: false, 
        detail: "กรุณาระบุ purch_id" 
      });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    // 1. ยกเลิกข้อมูลในตาราง dispatch_po_runs (ลบแถวออกเพื่อให้กลับไปเป็นสถานะรอจัดรถ)
    let sqlRuns;
    let paramsRuns;

    if (run_no) {
      // ยกเลิกเฉพาะรอบที่ระบุ - ลบแถวที่จัดรถออก
      sqlRuns = `
        DELETE FROM dispatch_po_runs
        WHERE purch_id = $1 
          AND run_no = $2
          AND purch_status1 = 2
      `;
      paramsRuns = [purch_id, run_no];
    } else {
      // ยกเลิกทุกรอบของ PO นั้น - ลบทุกแถวที่จัดรถออก
      sqlRuns = `
        DELETE FROM dispatch_po_runs
        WHERE purch_id = $1
          AND purch_status1 = 2
      `;
      paramsRuns = [purch_id];
    }

    const resultRuns = await client.query(sqlRuns, paramsRuns);

    // 2. ลบข้อมูลในตาราง driver_job_finishes (ถ้ามี)
    // ใช้ rec_id ที่เป็น purch_id + run_no
    let sqlFinishes;
    let paramsFinishes;

    if (run_no) {
      // ลบเฉพาะรอบที่ระบุ
      sqlFinishes = `
        DELETE FROM driver_job_finishes
        WHERE rec_id = $1
          AND status = 2
      `;
      paramsFinishes = [purch_id + run_no];
    } else {
      // ลบทุกรอบของ PO นั้น (rec_id ขึ้นต้นด้วย purch_id)
      sqlFinishes = `
        DELETE FROM driver_job_finishes
        WHERE rec_id LIKE $1
          AND status = 2
      `;
      paramsFinishes = [purch_id + '%'];
    }

    const resultFinishes = await client.query(sqlFinishes, paramsFinishes);

    await client.query("COMMIT");

    const totalCancelled = resultRuns.rowCount + resultFinishes.rowCount;

    if (totalCancelled > 0) {
      return res.json({ 
        ok: true, 
        message: `ยกเลิกการจัดรถสำเร็จ กลับไปเป็นสถานะรอจัดรถ (รอบวิ่ง: ${resultRuns.rowCount}, งานคนขับ: ${resultFinishes.rowCount})`,
        cancelled: {
          runs: resultRuns.rowCount,
          finishes: resultFinishes.rowCount,
          total: totalCancelled
        }
      });
    } else {
      return res.status(404).json({ 
        ok: false, 
        detail: "ไม่พบข้อมูลที่ต้องการยกเลิก หรืออาจถูกยกเลิกไปแล้ว" 
      });
    }
  } catch (e) {
    console.error("REPORT_CANCEL_ERROR:", e);
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("ROLLBACK_ERROR:", rollbackError);
      }
    }
    if (!res.headersSent) {
      res.status(500).json({ ok: false, detail: "INTERNAL_SERVER_ERROR" });
    }
  } finally {
    if (client) client.release();
  }
});

router.get("/api/vehicles", authGuard, async (req, res) => {
  const { search = "", limit = 100 } = req.query;

  try {
    const resp = await axios.get(API_Car, { timeout: 10000 });

    const raw = resp.data?.data || [];

    let mapped = raw
      .map((v) => ({
        id: String(v.IdAt ?? "").trim(),
        plate: String(v.NmCar ?? "").trim(),
        name: String(v.CarName ?? "").trim(), // ยี่ห้อ/ชื่อรุ่น
        company: String(v.CamName ?? "").trim(), // บริษัทเจ้าของ
        status: String(v.StaName ?? "").trim(), // ประเภท/สถานะรถ
        branchCode: String(v.IdBrh2 ?? "").trim(), // รหัสสาขา
        branchName: String(v.BrhName2 ?? "").trim(), // ชื่อสาขา
      }))
      .filter((x) => x.id && x.plate); // ต้องมี id + ทะเบียน

    const q = String(search).trim();
    if (q) {
      mapped = mapped.filter(
        (x) =>
          x.plate.includes(q) ||
          x.id.includes(q) ||
          x.branchCode.includes(q) ||
          x.branchName.includes(q) ||
          x.name.includes(q)
      );
    }

    mapped = mapped.slice(0, Number(limit) || 100);

    return res.json({ ok: true, data: mapped });
  } catch (error) {
    console.error("VEHICLE_API_ERROR:", error?.message || error);
    return res.status(200).json({
      ok: true,
      data: [
        {
          id: "0",
          plate: "ข้อมูลไม่มา",
          name: "",
          company: "",
          status: "",
          branchCode: "",
          branchName: "",
        },
      ],
    });
  }
});

router.get("/api/drivers", authGuard, async (req, res) => {
  const { search = "", limit = 100 } = req.query;

  try {
    const resp = await axios.get(API_Driver, { timeout: 10000 });

    const arr = resp.data?.data || [];

    // map -> { id, name, position }
    let mapped = arr
      .map((p) => ({
        id: String(p.PersonCode || "").trim(),
        name: String(p.FullName || "").trim(),
        position: String(p.PositionNameT || "").trim(),
      }))
      .filter((d) => d.id && d.name);

    // search
    const q = search.trim();
    if (q) {
      mapped = mapped.filter((d) => d.id.includes(q) || d.name.includes(q));
    }

    // limit
    mapped = mapped.slice(0, Number(limit) || 100);

    return res.json({ ok: true, data: mapped });
  } catch (error) {
    console.error("DRIVER_API_ERROR:", error?.message);
    return res.status(200).json({
      ok: true,
      data: [{ id: "Y000001", name: "ข้อมูลไม่มา", position: "พนักงานขับรถ" }],
    });
  }
});

//ดึงข้อมูลรายงานการ ตารางdriver jobs ที่สถานะรอจัดส่ง (status = 2)
router.get("/api/drivers/job", authGuard, async (req, res) => {
  // sanitize ค่า driverId จาก query
  let { driverId } = req.query;
  if (typeof driverId === "string") {
    const s = driverId.trim().toLowerCase();
    if (s === "" || s === "null" || s === "undefined") driverId = undefined;
  }

  // fallback จาก session/user หากไม่ได้ส่งมา
  const finalDriverId =
    driverId || req.user?.driverId || req.session?.user?.driverId;
  if (!finalDriverId)
    return res.status(400).json({ ok: false, detail: "Missing driverId" });

  try {
    const sql = `
      SELECT 
        r.rec_id,
        TO_CHAR(r.receive_date::date, 'YYYY-MM-DD') AS receive_date,  
        r.purch_id,
        r.item_name,
        r.qty_ordered, 
        r.purch_unit,
        r.purch_name, 
        r.invent_site_id, 
        r.driver_name, 
        r.vehicle_name,
        r.plant_code,
        r.plant_name,
        r.purch_status1 as purch_status,
        f.mile_start,
        f.mile_end,
        f.wt_before_pick,
        f.wt_after_pick,
        f.wt_arrive_dest,
        f.wt_leave_dest
      FROM dispatch_po_runs r
      LEFT JOIN driver_job_finishes f ON f.rec_id = r.rec_id
      WHERE r.driver_id = $1 AND r.purch_status1 = 2
      ORDER BY r.created_at DESC;
    `;
    const { rows } = await pool.query(sql, [finalDriverId]);
    return res.json({ ok: true, data: rows, driverIdUsed: finalDriverId });
  } catch (err) {
    console.error("ERROR:", err.message);
    return res.status(500).json({ ok: false, detail: err.message });
  }
});

router.get("/api/drivers/finish", authGuard, async (req, res) => {
  // sanitize ค่า driverId จาก query
  let { driverId } = req.query;
  if (typeof driverId === "string") {
    const s = driverId.trim().toLowerCase();
    if (s === "" || s === "null" || s === "undefined") driverId = undefined;
  }

  // fallback จาก session/user หากไม่ได้ส่งมา
  const finalDriverId =
    driverId || req.user?.driverId || req.session?.user?.driverId;
  if (!finalDriverId)
    return res.status(400).json({ ok: false, detail: "Missing driverId" });

  try {
    // ✅ ใช้ saved_at จาก driver_job_finishes เป็นหลัก
    const savedDateExpr = "(f.saved_at AT TIME ZONE 'Asia/Bangkok')::date";

    const sql = `
      SELECT
        TO_CHAR(${savedDateExpr}, 'YYYY-MM-DD') AS saved_date,
        r.purch_id,
        r.rec_id,
        r.item_name,
        r.qty_ordered,
        r.purch_unit,
        r.purch_name,
        r.invent_site_id,
        r.driver_name,
        r.vehicle_name,
        r.purch_status1 
      FROM dispatch_po_runs r
      JOIN driver_job_finishes f ON f.rec_id = r.rec_id
      WHERE r.driver_id = $1
        AND r.purch_status1 in (3,4)  -- สถานะสำเร็จหรือยกเลิก
      ORDER BY ${savedDateExpr} DESC, r.rec_id DESC
      LIMIT 1000;
    `;
    const { rows } = await pool.query(sql, [finalDriverId]);
    return res.json({ ok: true, data: rows, driverIdUsed: finalDriverId });
  } catch (err) {
    console.error("ERROR:", err.message);
    return res.status(500).json({ ok: false, detail: err.message });
  }
});

// API: ดึงข้อมูลรายงานการยกเลิกจาก cancel_logs
router.get("/api/cancel_report", authGuard, async (req, res) => {
  try {
    let { start, end } = req.query;

    let where = "1=1";
    const params = [];

    // กรองตามช่วงวันที่ถ้ามี
    if (start && end) {
      where += " AND cancel_date::date BETWEEN $1 AND $2";
      params.push(start, end);
    } else if (start) {
      where += " AND cancel_date::date >= $1";
      params.push(start);
    } else if (end) {
      where += " AND cancel_date::date <= $1";
      params.push(end);
    }

    const sql = `
      SELECT 
        cl.id,
        cl.rec_id,
        cl.purch_id,
        r.item_name,
        r.purch_name,
        r.invent_site_id,
        r.plant_name,
        cl.driver_id,
        cl.driver_name,
        cl.vehicle_id,
        cl.vehicle_name,
        cl.attempt_number,
        cl.mile_start,
        cl.mile_cancel,
        cl.cancel_note,
        cl.cancel_image_path,
        cl.cancel_date
      FROM cancel_logs cl
      LEFT JOIN dispatch_po_runs r ON cl.rec_id = r.rec_id
      WHERE ${where}
      ORDER BY cl.cancel_date DESC
      LIMIT 1000
    `;

    const { rows } = await pool.query(sql, params);
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("CANCEL_REPORT_ERROR:", err);
    res.status(500).json({ 
      ok: false, 
      detail: err.message || "INTERNAL_ERROR" 
    });
  }
});

//ดึงข้อมูลรายงานการ ตารางfinished jobs ที่สถานะสำเร็จ (status = 3)
router.get("/api/success_report", authGuard, async (req, res) => {
  try {
    let { start, end } = req.query;
    const user = req.session.user || {};

    // กำหนดสาขาที่มีสิทธิ์ดู
    let branchIds = [];
    if (user.userRole === "admin") {
      // admin เห็นทุกสาขา - ไม่กรอง
      branchIds = null;
    } else if (
      Array.isArray(user.branchAccess) &&
      user.branchAccess.length > 0
    ) {
      // prompt user ที่มี branchAccess
      branchIds = user.branchAccess;
    } else if (user.branchId) {
      // concrete หรือ user ที่มีสาขาเดียว
      branchIds = [user.branchId];
    } else {
      // ถ้าไม่มีสาขาเลย ให้คืนข้อมูลว่าง
      return res.json({ ok: true, data: [] });
    }

    // ✅ ตรวจสอบรูปแบบ YYYY-MM-DD
    const isYMD = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
    if (start && !isYMD(start)) start = undefined;
    if (end && !isYMD(end)) end = undefined;
    if (start && end && start > end) [start, end] = [end, start];

    const params = [];
    let where = "1=1";

    // ถ้า f.saved_at เป็น timestamptz → ใช้ AT TIME ZONE เพื่อเทียบตามเวลาไทย
    const savedAtExpr = "(f.saved_at AT TIME ZONE 'Asia/Bangkok')::date";

    if (start) {
      params.push(start);
      where += ` AND ${savedAtExpr} >= $${params.length}`;
    }
    if (end) {
      params.push(end);
      where += ` AND ${savedAtExpr} <= $${params.length}`;
    }
    // where += ` AND f.status = 3`;
    where += ` AND f.status IN (3,4)`; //ช่วงทดลอง อนุโลมให้ดึงสถานะ 4 ได้ด้วย

    // เพิ่มเงื่อนไขกรองสาขา
    if (branchIds !== null) {
      params.push(branchIds);
      where += ` AND r.invent_site_id = ANY($${params.length})`;
    }

    const sql = `
      SELECT
        TO_CHAR(${savedAtExpr}, 'YYYY-MM-DD') AS saved_date,
        r.purch_id,
        r.item_name,
        r.purch_name,
        r.invent_site_id,
        r.driver_name,
        r.vehicle_name,
        r.purch_status1 AS purch_status,
        r.plant_code,
        r.plant_name,
        f.rec_id,
        f.mile_start,
        f.mile_end,
        f.wt_before_pick,
        f.wt_after_pick,
        f.wt_arrive_dest,
        f.wt_leave_dest,
        f.saved_at,
        f.start_datetime,
        f.end_datetime,
        f.remark,  -- ✅ หมายเหตุ ขนส่ง
        f.remark1,  -- ✅ หมายเหตุ คอนกรีต
        f.prompt_confirmed,
        f.concrete_confirmed,
        f.billnumber_out,
        f.net_origin_kg,
        f.net_dest_kg
      FROM dispatch_po_runs r
      JOIN driver_job_finishes f ON f.rec_id = r.rec_id
      WHERE ${where}
      ORDER BY f.saved_at DESC
      LIMIT 2000
    `;

    const { rows } = await pool.query(sql, params);
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("SUCCESS_REPORT_ERROR:", err);
    res
      .status(500)
      .json({ ok: false, detail: err.message || "INTERNAL_ERROR" });
  }
});

// remark_1 = หมายเหตุ ฝ่ายคอนกรีต
router.post("/api/update_remark_con", async (req, res) => {
  try {
    const { rec_id, remark, net_origin_kg, net_dest_kg } = req.body;

    if (!rec_id) {
      return res.status(400).json({ ok: false, detail: "rec_id is required" });
    }

    const sql = `
      UPDATE driver_job_finishes 
      SET remark1 = $1,
          net_origin_kg = $2,
          net_dest_kg = $3
      WHERE rec_id = $4
    `;
    await pool.query(sql, [remark, net_origin_kg, net_dest_kg, rec_id]);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, detail: err.message });
  }
});

router.post("/api/confirm_con", authGuard, async (req, res) => {
  const { rec_id } = req.body || {};
  if (!rec_id) {
    return res.status(400).json({ ok: false, detail: "rec_id is required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // อัปเดตตารางหลักของไมล์/รายงานคอนกรีต
    await client.query(
      `
      UPDATE driver_job_finishes
      SET concrete_confirmed = TRUE,
          status = 4
      WHERE rec_id = $1
      `,
      [rec_id]
    );

    // ถ้าต้องการผูกกับ dispatch_po_runs ด้วย
    await client.query(
      `
      UPDATE dispatch_po_runs
      SET purch_status1 = 4
      WHERE rec_id = $1
      `,
      [rec_id]
    );

    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ ok: false, detail: err.message });
  } finally {
    client.release();
  }
});

//remark = หมายเหตุ ฝ่ายขนส่ง
router.post("/api/update_remark_prompt", async (req, res) => {
  try {
    const { rec_id, remark } = req.body;

    // ตรวจสอบก่อนว่าถูก confirm แล้วหรือไม่
    const { rows } = await pool.query(
      `SELECT prompt_confirmed 
       FROM driver_job_finishes 
       WHERE rec_id = $1`,
      [rec_id]
    );

    if (rows.length === 0)
      return res.status(404).json({ ok: false, detail: "ไม่พบข้อมูล" });

    if (rows[0].prompt_confirmed)
      return res
        .status(400)
        .json({ ok: false, detail: "แก้ไขไม่ได้เพราะยืนยันแล้ว" });

    await pool.query(
      `UPDATE driver_job_finishes 
       SET remark = $1
       WHERE rec_id = $2`,
      [remark, rec_id]
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, detail: err.message });
  }
});

router.post("/api/confirm_prompt", async (req, res) => {
  try {
    const { rec_id } = req.body;

    await pool.query(
      `UPDATE driver_job_finishes 
       SET prompt_confirmed = true 
       WHERE rec_id = $1`,
      [rec_id]
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, detail: err.message });
  }
});

// แก้ไขเลขที่เอกสาร และไมล์ สำหรับ prompt
router.post("/api/update_billnumber_prompt", async (req, res) => {
  try {
    const { rec_id, billnumber_out, mile_start, mile_end } = req.body;

    if (!rec_id) {
      return res.status(400).json({ ok: false, detail: "rec_id is required" });
    }

    // ตรวจสอบว่ายืนยันแล้วหรือยัง
    const { rows } = await pool.query(
      `SELECT prompt_confirmed 
       FROM driver_job_finishes 
       WHERE rec_id = $1`,
      [rec_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, detail: "ไม่พบข้อมูล" });
    }

    if (rows[0].prompt_confirmed) {
      return res.status(400).json({ 
        ok: false, 
        detail: "แก้ไขไม่ได้เพราะยืนยันแล้ว" 
      });
    }

    // อัปเดตเลขที่เอกสาร และไมล์
    await pool.query(
      `UPDATE driver_job_finishes 
       SET billnumber_out = $1,
           mile_start = $2,
           mile_end = $3
       WHERE rec_id = $4`,
      [billnumber_out || null, mile_start || null, mile_end || null, rec_id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("UPDATE_BILLNUMBER_ERROR:", err);
    res.status(500).json({ ok: false, detail: err.message });
  }
});

// ✅ API: ดึงภาพทั้งหมดของรายการ
router.get("/api/images/:rec_id", authGuard, async (req, res) => {
  try {
    const { rec_id } = req.params;

    if (!rec_id) {
      return res.status(400).json({ ok: false, detail: "rec_id is required" });
    }

    // ดึงข้อมูลภาพจากฐานข้อมูล
    const { rows } = await pool.query(
      `SELECT 
        img_out,
        img_in,
        imgbill_out,
        imgbill_in,
        cancel_mile_image,
        purch_id
      FROM driver_job_finishes f
      LEFT JOIN dispatch_po_runs r ON f.rec_id = r.rec_id
      WHERE f.rec_id = $1`,
      [rec_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, detail: "ไม่พบข้อมูล" });
    }

    const row = rows[0];
    const images = [];

    // ฟังก์ชันแกะค่าจาก array (ถ้าเป็น array) หรือ string
    const extractPath = (value) => {
      if (!value) return null;
      
      // ถ้าเป็น array ให้เอาตัวแรก
      if (Array.isArray(value)) {
        return value[0] || null;
      }
      
      // ถ้าเป็น string ที่มี [] ครอบ (JSON string)
      if (typeof value === 'string' && value.startsWith('[')) {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? (parsed[0] || null) : value;
        } catch {
          return value;
        }
      }
      
      return value;
    };

    // ฟังก์ชันสร้าง URL ที่ถูกต้อง (ไม่ซ้ำ path)
    const getImageUrl = (path) => {
      if (!path) return null;
      
      // แกะค่าจาก array ก่อน
      const cleanPath = extractPath(path);
      if (!cleanPath) return null;
      
      // ถ้า path เริ่มต้นด้วย /image/ หรือ image/ ให้ใช้ตรงๆ
      if (cleanPath.startsWith('/image/') || cleanPath.startsWith('image/')) {
        return `/${cleanPath.replace(/^\//, '')}`;
      }
      // ถ้าเป็น path เต็มอยู่แล้ว (มี /)
      if (cleanPath.startsWith('/')) {
        return cleanPath;
      }
      // กรณีอื่นๆ ให้เพิ่ม /image/ ข้างหน้า
      return `/image/${cleanPath}`;
    };

    // เพิ่มภาพที่มีค่าลงในอาร์เรย์
    if (row.img_out) {
      const url = getImageUrl(row.img_out);
      if (url) {
        images.push({
          label: "ไมล์เริ่ม",
          url: url,
        });
      }
    }

    if (row.img_in) {
      const url = getImageUrl(row.img_in);
      if (url) {
        images.push({
          label: "ไมล์สิ้นสุด",
          url: url,
        });
      }
    }

    if (row.imgbill_out) {
      const url = getImageUrl(row.imgbill_out);
      if (url) {
        images.push({
          label: "เอกสารต้นทาง",
          url: url,
        });
      }
    }

    if (row.imgbill_in) {
      const url = getImageUrl(row.imgbill_in);
      if (url) {
        images.push({
          label: "เอกสารปลายทาง",
          url: url,
        });
      }
    }

    if (row.cancel_mile_image) {
      const url = getImageUrl(row.cancel_mile_image);
      if (url) {
        images.push({
          label: "ภาพยกเลิก",
          url: url,
        });
      }
    }

    res.json({
      ok: true,
      images,
      purch_id: row.purch_id,
    });
  } catch (err) {
    console.error("GET_IMAGES_ERROR:", err);
    res.status(500).json({ ok: false, detail: err.message });
  }
});

//----------------------------จัดการ User คอนกรีต----------------------------

// GET: ดึงรายการสาขาทั้งหมด (ไม่ต้อง auth เพื่อใช้ใน dropdown)
router.get("/api/branches", async (req, res) => {
  try {
    const { rows } = await useryc_pool.query(`
      SELECT id, name, address
      FROM branches
      ORDER BY id
    `);

    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("GET branches error:", err);
    res.status(500).json({ ok: false, detail: err.message });
  }
});

// GET: ดึงรายการ user คอนกรีตทั้งหมด (พร้อม join กับ branches)
router.get("/api/concrete_users", authGuard, async (req, res) => {
  try {
    // เฉพาะ admin เท่านั้นที่ดูได้
    const userRole = req.session?.user?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ ok: false, detail: "Access denied" });
    }

    const { rows } = await pool.query(`
      SELECT 
        c.id, c.username, c.full_name, c.nickname, c.email, c.phone, 
        c.branch_id, b.name as branch_name, 
        c.role, c.is_active, c.created_at, c.updated_at
      FROM concrete_users c
      LEFT JOIN branches b ON c.branch_id = b.id
      ORDER BY c.created_at DESC
    `);

    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("GET concrete_users error:", err);
    res.status(500).json({ ok: false, detail: err.message });
  }
});

// POST: เพิ่ม user คอนกรีตใหม่
router.post("/api/concrete_users", authGuard, async (req, res) => {
  try {
    // เฉพาะ admin เท่านั้นที่เพิ่มได้
    const userRole = req.session?.user?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ ok: false, detail: "Access denied" });
    }

    const { username, password, full_name, nickname, email, phone, branch_id } =
      req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ ok: false, detail: "Username and password required" });
    }

    const { rows } = await pool.query(
      `
      INSERT INTO concrete_users (username, password, full_name, nickname, email, phone, branch_id, role)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'concrete')
      RETURNING id, username, full_name, nickname, email, phone, branch_id, role, is_active, created_at
    `,
      [username, password, full_name, nickname, email, phone, branch_id]
    );

    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error("POST concrete_users error:", err);
    if (err.code === "23505") {
      // unique violation
      return res
        .status(400)
        .json({ ok: false, detail: "Username already exists" });
    }
    res.status(500).json({ ok: false, detail: err.message });
  }
});

// PUT: แก้ไข user คอนกรีต
router.put("/api/concrete_users/:id", authGuard, async (req, res) => {
  try {
    // เฉพาะ admin เท่านั้นที่แก้ไขได้
    const userRole = req.session?.user?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ ok: false, detail: "Access denied" });
    }

    const { id } = req.params;
    const {
      password,
      full_name,
      nickname,
      email,
      phone,
      branch_id,
      is_active,
    } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (password !== undefined) {
      updates.push(`password = $${paramIndex++}`);
      values.push(password);
    }
    if (full_name !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(full_name);
    }
    if (nickname !== undefined) {
      updates.push(`nickname = $${paramIndex++}`);
      values.push(nickname);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }
    if (branch_id !== undefined) {
      updates.push(`branch_id = $${paramIndex++}`);
      values.push(branch_id);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ ok: false, detail: "No fields to update" });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await pool.query(
      `
      UPDATE concrete_users
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING id, username, full_name, nickname, email, phone, branch_id, role, is_active, updated_at
    `,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, detail: "User not found" });
    }

    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error("PUT concrete_users error:", err);
    res.status(500).json({ ok: false, detail: err.message });
  }
});

// DELETE: ลบ user คอนกรีต (soft delete)
router.delete("/api/concrete_users/:id", authGuard, async (req, res) => {
  try {
    // เฉพาะ admin เท่านั้นที่ลบได้
    const userRole = req.session?.user?.userRole;
    if (userRole !== "admin") {
      return res.status(403).json({ ok: false, detail: "Access denied" });
    }

    const { id } = req.params;

    const { rows } = await pool.query(
      `
      UPDATE concrete_users
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id, username, is_active
    `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, detail: "User not found" });
    }

    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error("DELETE concrete_users error:", err);
    res.status(500).json({ ok: false, detail: err.message });
  }
});

//----------------------------ฟอร์มบันทึกจบงานคนขับรถ V1----------------------------

async function ensureFinishTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS driver_job_finishes (
      id              BIGSERIAL PRIMARY KEY,
      rec_id          TEXT NOT NULL,
      mile_start      TEXT,
      mile_end        TEXT,
      wt_before_pick  INTEGER,
      wt_after_pick   INTEGER,
      wt_arrive_dest  INTEGER,
      wt_leave_dest   INTEGER,
      status          INT NOT NULL DEFAULT 3,
      saved_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      meta            JSONB,
      detail          TEXT,
      img_out         TEXT
    );
    
    CREATE INDEX IF NOT EXISTS idx_driver_job_finishes_saved ON driver_job_finishes(saved_at);
    
    -- เพิ่มฟิลด์ทั้งหมดที่อาจจะยังไม่มี
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS net_origin_kg INTEGER;
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS net_dest_kg INTEGER;
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS detail TEXT;
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS img_out TEXT;
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS img_in TEXT;
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS start_datetime TIMESTAMP;
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS end_datetime TIMESTAMP;
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS regno_out VARCHAR(50);
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS regno_in VARCHAR(50);
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS billnumber_out VARCHAR(50);
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS billnumber_in VARCHAR(50);
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS remark_1 TEXT;
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS remark_2 TEXT;
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS remark_3 TEXT;
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS imgbill_out TEXT;
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS imgbill_in TEXT;
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS remark TEXT;
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS remark1 TEXT;
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS prompt_confirmed BOOLEAN DEFAULT FALSE;
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS concrete_confirmed BOOLEAN DEFAULT FALSE;
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0;
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS mile_cancel NUMERIC(10,2);
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS last_cancel_date TIMESTAMP;
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE;
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS cancel_note TEXT;
    ALTER TABLE driver_job_finishes ADD COLUMN IF NOT EXISTS cancel_mile_image TEXT;
    
    -- เปลี่ยน mile_start และ mile_end จาก INTEGER เป็น TEXT ถ้ายังเป็น INTEGER
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'driver_job_finishes' 
        AND column_name = 'mile_start' 
        AND data_type = 'integer'
      ) THEN
        ALTER TABLE driver_job_finishes 
        ALTER COLUMN mile_start TYPE TEXT USING mile_start::TEXT;
      END IF;
      
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'driver_job_finishes' 
        AND column_name = 'mile_end' 
        AND data_type = 'integer'
      ) THEN
        ALTER TABLE driver_job_finishes 
        ALTER COLUMN mile_end TYPE TEXT USING mile_end::TEXT;
      END IF;
    END $$;
  `);

  const chk = await pool.query(`
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_driver_job_finishes_rec'
  `);
  if (!chk.rowCount) {
    try {
      await pool.query(`
        ALTER TABLE driver_job_finishes
        ADD CONSTRAINT uq_driver_job_finishes_rec UNIQUE (rec_id);
      `);
    } catch (_) {}
  }
}

// ตรวจสอบและสร้างตาราง cancel_logs
async function ensureCancelLogsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cancel_logs (
      id SERIAL PRIMARY KEY,
      rec_id VARCHAR(50) NOT NULL,
      purch_id VARCHAR(50) NOT NULL,
      driver_id VARCHAR(50) NOT NULL,
      driver_name VARCHAR(255),
      vehicle_id VARCHAR(50),
      vehicle_name VARCHAR(255),
      attempt_number INT DEFAULT 1,
      mile_start TEXT,
      mile_cancel TEXT,
      cancel_note TEXT NOT NULL,
      cancel_image_path VARCHAR(500),
      cancel_date TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_cancel_logs_rec_id ON cancel_logs(rec_id);
    CREATE INDEX IF NOT EXISTS idx_cancel_logs_driver_id ON cancel_logs(driver_id);
    CREATE INDEX IF NOT EXISTS idx_cancel_logs_cancel_date ON cancel_logs(cancel_date DESC);
    
    -- เพิ่มฟิลด์ที่อาจจะยังไม่มี
    ALTER TABLE cancel_logs ADD COLUMN IF NOT EXISTS vehicle_id VARCHAR(50);
    ALTER TABLE cancel_logs ADD COLUMN IF NOT EXISTS vehicle_name VARCHAR(255);
    ALTER TABLE cancel_logs ADD COLUMN IF NOT EXISTS mile_start TEXT;
  `);
}

// ตรวจสอบและสร้างตาราง dispatch_po_runs พร้อมเพิ่มฟิลด์ที่จำเป็น
async function ensureDispatchPoRunsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dispatch_po_runs (
      id BIGSERIAL PRIMARY KEY,
      purch_id TEXT NOT NULL,
      driver_id TEXT NOT NULL,
      driver_name TEXT,
      vehicle_id TEXT NOT NULL,
      vehicle_name TEXT,
      receive_date DATE NOT NULL,
      run_no INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_purch_date_run UNIQUE (purch_id, receive_date, run_no)
    );
    
    -- เพิ่มฟิลด์ทั้งหมดที่อาจจะยังไม่มี
    ALTER TABLE dispatch_po_runs ADD COLUMN IF NOT EXISTS item_id TEXT;
    ALTER TABLE dispatch_po_runs ADD COLUMN IF NOT EXISTS item_name TEXT;
    ALTER TABLE dispatch_po_runs ADD COLUMN IF NOT EXISTS purch_status INTEGER;
    ALTER TABLE dispatch_po_runs ADD COLUMN IF NOT EXISTS purch_unit TEXT;
    ALTER TABLE dispatch_po_runs ADD COLUMN IF NOT EXISTS qty_ordered NUMERIC;
    ALTER TABLE dispatch_po_runs ADD COLUMN IF NOT EXISTS purch_status1 INTEGER DEFAULT 2;
    ALTER TABLE dispatch_po_runs ADD COLUMN IF NOT EXISTS dataareaid TEXT;
    ALTER TABLE dispatch_po_runs ADD COLUMN IF NOT EXISTS partition_key TEXT;
    ALTER TABLE dispatch_po_runs ADD COLUMN IF NOT EXISTS rec_id TEXT;
    ALTER TABLE dispatch_po_runs ADD COLUMN IF NOT EXISTS dataareaid_2 TEXT;
    ALTER TABLE dispatch_po_runs ADD COLUMN IF NOT EXISTS partition_key_2 TEXT;
    ALTER TABLE dispatch_po_runs ADD COLUMN IF NOT EXISTS bpc_remark TEXT;
    ALTER TABLE dispatch_po_runs ADD COLUMN IF NOT EXISTS invent_site_id TEXT;
    ALTER TABLE dispatch_po_runs ADD COLUMN IF NOT EXISTS bpc_lastconfirmdate TIMESTAMPTZ;
    ALTER TABLE dispatch_po_runs ADD COLUMN IF NOT EXISTS purch_name TEXT;
    ALTER TABLE dispatch_po_runs ADD COLUMN IF NOT EXISTS snapshot_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE dispatch_po_runs ADD COLUMN IF NOT EXISTS wms_location_id TEXT;
    ALTER TABLE dispatch_po_runs ADD COLUMN IF NOT EXISTS invent_location_id TEXT;
    ALTER TABLE dispatch_po_runs ADD COLUMN IF NOT EXISTS plant_code TEXT;
    ALTER TABLE dispatch_po_runs ADD COLUMN IF NOT EXISTS plant_name TEXT;
    ALTER TABLE dispatch_po_runs ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0;
    ALTER TABLE dispatch_po_runs ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE;
    ALTER TABLE dispatch_po_runs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    
    CREATE INDEX IF NOT EXISTS idx_dispatch_po_runs_purchid ON dispatch_po_runs(purch_id);
    CREATE INDEX IF NOT EXISTS idx_dispatch_po_runs_rec_id ON dispatch_po_runs(rec_id);
    CREATE INDEX IF NOT EXISTS idx_dispatch_po_runs_driver_id ON dispatch_po_runs(driver_id);
    
    -- สร้าง unique index สำหรับป้องกันข้อมูลซ้ำ
    CREATE UNIQUE INDEX IF NOT EXISTS uq_dispatch_po_runs_unique 
      ON dispatch_po_runs(purch_id, receive_date, run_no, rec_id);
  `);
}

// ตรวจสอบและสร้างตาราง driver_last_cancel_mile
async function ensureDriverLastCancelMileTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS driver_last_cancel_mile (
      driver_id TEXT PRIMARY KEY,
      last_cancel_mile_image TEXT,
      mile_cancel TEXT,
      last_cancelled_at TIMESTAMPTZ,
      rec_id TEXT
    );
    
    -- เพิ่มฟิลด์ที่อาจจะยังไม่มี
    ALTER TABLE driver_last_cancel_mile ADD COLUMN IF NOT EXISTS mile_cancel TEXT;
    ALTER TABLE driver_last_cancel_mile ADD COLUMN IF NOT EXISTS last_cancel_mile_image TEXT;
    ALTER TABLE driver_last_cancel_mile ADD COLUMN IF NOT EXISTS last_cancelled_at TIMESTAMPTZ;
    ALTER TABLE driver_last_cancel_mile ADD COLUMN IF NOT EXISTS rec_id TEXT;
  `);
}

async function readJson(fp) {
  const raw = await fs.promises.readFile(fp, "utf8");
  return JSON.parse(raw);
}

// คืนเฉพาะแกนข้อมูล (ตัด fields/meta) -> ใช้ raw.data ถ้ามี
function toCoreData(j) {
  return j?.raw?.data ?? j?.data ?? null;
}

// แยกไฟล์ OCR เป็น 4 หมวดจาก rec_id -> อย่างละ 1 ชิ้น
async function readOcrGroupedByRec(rec_id) {
  const dir = path.join(__dirname, "..", "public", "ocr-results"); // ปรับ path ตามโครงจริง
  if (!fs.existsSync(dir)) return null;

  const files = await fs.promises.readdir(dir);
  const mine = files.filter((f) => f.startsWith(rec_id) && f.endsWith(".json"));
  if (!mine.length) return null;

  const bucket = {
    mile_start: null,
    mile_end: null,
    wt_origin: null,
    wt_dest: null,
  };

  for (const f of mine) {
    const fp = path.join(dir, f);
    const lower = f.toLowerCase();
    try {
      const j = await readJson(fp);
      const core = toCoreData(j);
      if (!core) continue;

      if (!bucket.mile_start && lower.includes("mile_start")) {
        bucket.mile_start = core;
      } else if (!bucket.mile_end && lower.includes("mile_end")) {
        bucket.mile_end = core;
      } else if (
        !bucket.wt_origin &&
        (lower.includes("wt_origin") || lower.includes("origin"))
      ) {
        bucket.wt_origin = core;
      } else if (
        !bucket.wt_dest &&
        (lower.includes("wt_dest") || lower.includes("dest"))
      ) {
        bucket.wt_dest = core;
      }
    } catch (e) {
      console.warn("read OCR fail:", f, e.message);
    }
  }

  return bucket; // { mile_start, wt_origin, wt_dest, mile_end }
}

//ดึงข้อมูลรายงานการ ตารางfinished jobs ทั้งหมด
router.get("/api/drivers/job/finish-db/get", authGuard, async (req, res) => {
  try {
    const { rec_id } = req.query;
    if (!rec_id)
      return res.status(400).json({ ok: false, detail: "rec_id required" });
    await ensureFinishTable();
    const { rows } = await pool.query(
      `SELECT * FROM driver_job_finishes WHERE rec_id=$1 LIMIT 1`,
      [rec_id]
    );

    // ✅ ส่งข้อมูลรูปภาพที่เก็บไว้ด้วย
    const data = rows[0] || null;
    if (data && data.meta && data.meta.images) {
      data.saved_images = data.meta.images;
    }

    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, detail: e.message });
  }
});

router.post("/api/drivers/job/finish-db", authGuard, async (req, res) => {
  try {
    const {
      rec_id,
      mile_start,
      mile_end,
      wt_before_pick,
      wt_after_pick,
      wt_arrive_dest,
      wt_leave_dest,
      status,
      saved_at,
      meta,
      detail, // อาจเป็น object หรือ string
    } = req.body || {};

    if (!rec_id)
      return res.status(400).json({ ok: false, detail: "rec_id is required" });

    await ensureFinishTable();

    const { rows: existRows } = await pool.query(
      `SELECT 1 FROM driver_job_finishes WHERE rec_id=$1 LIMIT 1`,
      [rec_id]
    );
    const existed = !!existRows.length;

    if (!existed && (mile_start == null || Number.isNaN(Number(mile_start))))
      return res
        .status(400)
        .json({ ok: false, detail: "ต้องกรอกไมล์เริ่มครั้งแรก" });

    const finalStatus = mile_end != null && mile_end !== "" ? 3 : 2;

    // สร้าง detail เป็น 4 คีย์จากไฟล์ OCR (คัดเฉพาะ raw.data) + รวมข้อมูลเดิม
    let detailText = null;
    try {
      const grouped = await readOcrGroupedByRec(rec_id); // { mile_start, wt_origin, wt_dest, mile_end }

      // 🔥 ดึงข้อมูลเดิมจาก database ก่อน
      let existingDetail = {};
      try {
        const { rows: prevRows } = await pool.query(
          `SELECT detail FROM driver_job_finishes WHERE rec_id=$1 LIMIT 1`,
          [rec_id]
        );
        if (prevRows.length && prevRows[0].detail) {
          existingDetail = JSON.parse(prevRows[0].detail);
        }
      } catch (e) {
        console.warn("Failed to parse existing detail:", e.message);
        existingDetail = {};
      }

      let detailObj;
      if (
        grouped &&
        (grouped.mile_start ||
          grouped.wt_origin ||
          grouped.wt_dest ||
          grouped.mile_end)
      ) {
        detailObj = {
          mile_start: grouped.mile_start || existingDetail.mile_start || null,
          wt_origin: grouped.wt_origin || existingDetail.wt_origin || null,
          wt_dest: grouped.wt_dest || existingDetail.wt_dest || null,
          mile_end: grouped.mile_end || existingDetail.mile_end || null,
        };
      } else if (detail) {
        // ถ้า client ส่งมาเอง ให้ map ให้เหลือ 4 คีย์ และคัดเฉพาะ raw.data ถ้าส่งแบบตัวอย่าง
        const d = typeof detail === "string" ? JSON.parse(detail) : detail;
        const toCore = (x) => x?.raw?.data ?? x?.data ?? x ?? null;
        detailObj = {
          mile_start: toCore(d.mile_start) ?? existingDetail.mile_start ?? null,
          wt_origin: toCore(d.wt_origin) ?? existingDetail.wt_origin ?? null,
          wt_dest: toCore(d.wt_dest) ?? existingDetail.wt_dest ?? null,
          mile_end: toCore(d.mile_end) ?? existingDetail.mile_end ?? null,
        };
      } else {
        // 🔥 ถ้าไม่มีข้อมูลใหม่ ให้ใช้ข้อมูลเดิม
        detailObj = {
          mile_start: existingDetail.mile_start || null,
          wt_origin: existingDetail.wt_origin || null,
          wt_dest: existingDetail.wt_dest || null,
          mile_end: existingDetail.mile_end || null,
        };
      }

      // เก็บเป็น TEXT ดิบ (จะเปิด gzip ภายหลังก็ได้)
      detailText = JSON.stringify(detailObj);
    } catch (e) {
      detailText = null;
    }
    const sql = `
      INSERT INTO driver_job_finishes
        (rec_id, mile_start, mile_end, wt_before_pick, wt_after_pick,
         wt_arrive_dest, wt_leave_dest, status, saved_at, meta, detail)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7,
         COALESCE($8::int, $9::int),
         COALESCE($10, NOW()),
         $11::jsonb, $12)
      ON CONFLICT ON CONSTRAINT uq_driver_job_finishes_rec DO UPDATE SET
        mile_start      = COALESCE(EXCLUDED.mile_start, driver_job_finishes.mile_start),
        mile_end        = COALESCE(EXCLUDED.mile_end, driver_job_finishes.mile_end),
        wt_before_pick  = COALESCE(EXCLUDED.wt_before_pick, driver_job_finishes.wt_before_pick),
        wt_after_pick   = COALESCE(EXCLUDED.wt_after_pick, driver_job_finishes.wt_after_pick),
        wt_arrive_dest  = COALESCE(EXCLUDED.wt_arrive_dest, driver_job_finishes.wt_arrive_dest),
        wt_leave_dest   = COALESCE(EXCLUDED.wt_leave_dest, driver_job_finishes.wt_leave_dest),
        status          = COALESCE(EXCLUDED.status, driver_job_finishes.status),
        saved_at        = COALESCE(EXCLUDED.saved_at, NOW()),
        meta            = (
          COALESCE(driver_job_finishes.meta, '{}'::jsonb) || 
          COALESCE(EXCLUDED.meta, '{}'::jsonb)
        ),
        detail          = COALESCE(EXCLUDED.detail, driver_job_finishes.detail)
      RETURNING id, status;
    `;

    // 🔥 ปรับการจัดการ meta ให้รวมข้อมูลเดิม
    let finalMeta = meta || {};
    if (!existed) {
      // ครั้งแรก: ใช้ meta ที่ส่งมา
      finalMeta = meta || {};
    } else {
      // มีข้อมูลเดิม: ดึงข้อมูลเดิมมารวม
      try {
        const { rows: prevRows } = await pool.query(
          `SELECT meta FROM driver_job_finishes WHERE rec_id=$1 LIMIT 1`,
          [rec_id]
        );
        if (prevRows.length && prevRows[0].meta) {
          const existingMeta = prevRows[0].meta;

          // รวม images จากเดิมกับใหม่
          const existingImages = existingMeta.images || {};
          const newImages = (meta && meta.images) || {};

          // ฟังก์ชันรวม arrays แบบไม่ซ้ำ
          const mergeArrays = (arr1, arr2) => {
            const combined = [...(arr1 || []), ...(arr2 || [])];
            return [...new Set(combined)].filter(Boolean);
          };

          const mergedImages = {
            img_mile_start:
              newImages.img_mile_start || existingImages.img_mile_start || null,
            img_mile_end:
              newImages.img_mile_end || existingImages.img_mile_end || null,
            img_wt_origin: mergeArrays(
              existingImages.img_wt_origin,
              newImages.img_wt_origin
            ),
            img_wt_dest: mergeArrays(
              existingImages.img_wt_dest,
              newImages.img_wt_dest
            ),
          };

          finalMeta = {
            ...existingMeta,
            ...finalMeta,
            images: mergedImages,
            updated_at: new Date().toISOString(),
          };
        }
      } catch (e) {
        console.warn("Failed to merge existing meta:", e.message);
        finalMeta = meta || {};
      }
    }

    const params = [
      String(rec_id),
      mile_start == null ? null : String(mile_start),
      mile_end == null ? null : String(mile_end),
      wt_before_pick == null ? null : Number(wt_before_pick),
      wt_after_pick == null ? null : Number(wt_after_pick),
      wt_arrive_dest == null ? null : Number(wt_arrive_dest),
      wt_leave_dest == null ? null : Number(wt_leave_dest),

      status == null ? null : Number(status),
      finalStatus,

      saved_at || null,
      JSON.stringify(finalMeta), // ✅ ใช้ finalMeta ที่รวมข้อมูลแล้ว
      detailText, // TEXT (plain หรือ gzip base64 ถ้าเปิดใช้)
    ];

    const { rows } = await pool.query(sql, params);
    await recalcNetWeight(rec_id);
    const done = rows[0]?.status === 3;

    if (done) {
      await pool.query(
        `UPDATE dispatch_po_runs SET purch_status1=3 WHERE rec_id=$1`,
        [rec_id]
      );
    }

    res.json({ ok: true, done });
  } catch (err) {
    console.error("FINISH_DB_ERROR:", err);
    res.status(500).json({ ok: false, detail: err.message });
  }
});

async function recalcNetWeight(rec_id) {
  const q = await pool.query(
    `SELECT wt_before_pick, wt_after_pick,
            wt_arrive_dest, wt_leave_dest
     FROM driver_job_finishes
     WHERE rec_id = $1`,
    [rec_id]
  );

  if (!q.rowCount) return;

  const r = q.rows[0];

  const b = Number(r.wt_before_pick) || 0;
  const a = Number(r.wt_after_pick) || 0;
  const di = Number(r.wt_arrive_dest) || 0;
  const do_ = Number(r.wt_leave_dest) || 0;

  let net_origin_kg = null;
  let net_dest_kg = null;

  if (a > 0 && b > 0) net_origin_kg = a - b;
  if (di > 0 && do_ > 0) net_dest_kg = di - do_;

  await pool.query(
    `UPDATE driver_job_finishes
     SET net_origin_kg = COALESCE($2, net_origin_kg),
         net_dest_kg   = COALESCE($3, net_dest_kg)
     WHERE rec_id=$1`,
    [rec_id, net_origin_kg, net_dest_kg]
  );
}

// 🆕 API สำหรับยกเลิกงานพร้อมรูปไมล์และหมายเหตุ
router.post("/api/drivers/job/cancel-with-mile", authGuard, async (req, res) => {
  console.log("🎯 cancel job with mile endpoint hit!");

  try {
    const { rec_id, cancel_note, cancel_mile_image, cancel_mile } = req.body || {};

    console.log("📥 Received cancel job with mile request:", {
      rec_id,
      cancel_note,
      cancel_mile_image,
      cancel_mile,
    });

    if (!rec_id) {
      return res.status(400).json({ ok: false, detail: "rec_id is required" });
    }

    if (!cancel_note) {
      return res.status(400).json({ ok: false, detail: "cancel_note is required" });
    }

    if (!cancel_mile_image) {
      return res.status(400).json({ ok: false, detail: "cancel_mile_image is required" });
    }
    
    if (!cancel_mile) {
      return res.status(400).json({ ok: false, detail: "cancel_mile is required" });
    }

    await ensureFinishTable();

    // เก็บข้อมูล driver_id จาก session หรือจากข้อมูลที่มีอยู่
    const driver_id = req.session?.user?.username || null;

    // ตรวจสอบว่ามีข้อมูลอยู่หรือไม่
    const { rows: existRows } = await pool.query(
      `SELECT rec_id, status, mile_start, img_out FROM driver_job_finishes WHERE rec_id=$1 LIMIT 1`,
      [rec_id]
    );

    // เก็บ mile_start ก่อนที่จะลบ
    const mile_start = existRows.length > 0 ? existRows[0].mile_start : null;

    // เวลาไทย (UTC+7)
    const thaiTime = new Date(Date.now() + 7 * 60 * 60 * 1000)
      .toISOString()
      .replace("Z", "+07:00");

    if (existRows.length > 0) {
      // ลบข้อมูลงานเดิมออก เพื่อให้กลับมาเป็นงานใหม่ที่สามารถรับได้อีกครั้ง
      console.log("🗑️ Deleting existing job record to allow re-acceptance...");
      await pool.query(
        `DELETE FROM driver_job_finishes WHERE rec_id=$1`,
        [rec_id]
      );
    }

    // ดึงข้อมูล purch_id, driver_name และ vehicle จาก dispatch_po_runs
    const { rows: recData } = await pool.query(
      `SELECT purch_id, driver_id, driver_name, vehicle_id, vehicle_name FROM dispatch_po_runs WHERE rec_id=$1 LIMIT 1`,
      [rec_id]
    );
    
    const purch_id = recData.length > 0 ? recData[0].purch_id : null;
    const driver_name = recData.length > 0 ? recData[0].driver_name : null;
    const rec_driver_id = recData.length > 0 ? recData[0].driver_id : driver_id;
    const vehicle_id = recData.length > 0 ? recData[0].vehicle_id : null;
    const vehicle_name = recData.length > 0 ? recData[0].vehicle_name : null;
    
    // นับจำนวนครั้งที่ยกเลิกของ rec_id นี้
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) as count FROM cancel_logs WHERE rec_id=$1`,
      [rec_id]
    );
    const attempt_number = parseInt(countRows[0].count || 0) + 1;
    
    // บันทึกลง cancel_logs
    await pool.query(
      `INSERT INTO cancel_logs 
       (rec_id, purch_id, driver_id, driver_name, vehicle_id, vehicle_name, attempt_number, mile_start, mile_cancel, cancel_note, cancel_image_path, cancel_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [rec_id, purch_id, rec_driver_id, driver_name, vehicle_id, vehicle_name, attempt_number, mile_start, cancel_mile, cancel_note, cancel_mile_image, thaiTime]
    );
    
    // บันทึกไมล์ยกเลิกของคนขับสำหรับใช้กับงานถัดไป
    if (driver_id) {
      await pool.query(
        `INSERT INTO driver_last_cancel_mile (driver_id, last_cancel_mile_image, mile_cancel, last_cancelled_at, rec_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (driver_id) 
         DO UPDATE SET 
           last_cancel_mile_image = EXCLUDED.last_cancel_mile_image,
           mile_cancel = EXCLUDED.mile_cancel,
           last_cancelled_at = EXCLUDED.last_cancelled_at,
           rec_id = EXCLUDED.rec_id`,
        [driver_id, cancel_mile_image, cancel_mile, thaiTime, rec_id]
      );
    }

    console.log("✅ ยกเลิกงานพร้อมรูปไมล์สำเร็จ:", {
      rec_id,
      cancel_note,
      cancel_mile_image,
    });

    res.json({
      ok: true,
      message: "ยกเลิกงานเรียบร้อยแล้ว",
      data: { rec_id, cancel_note, cancel_mile_image },
    });
  } catch (e) {
    console.error("❌ Error canceling job with mile:", e);
    console.error("Error stack:", e.stack);
    res.status(500).json({
      ok: false,
      detail: e.message,
      error: e.toString(),
    });
  }
});

// 🆕 API สำหรับดึงไมล์ยกเลิกล่าสุดของคนขับ
router.get("/api/drivers/last-cancel-mile", authGuard, async (req, res) => {
  try {
    const driver_id = req.session?.user?.username;
    
    if (!driver_id) {
      return res.status(401).json({ ok: false, detail: "Unauthorized" });
    }

    await ensureFinishTable();

    const { rows } = await pool.query(
      `SELECT last_cancel_mile_image, mile_cancel, last_cancelled_at, rec_id 
       FROM driver_last_cancel_mile 
       WHERE driver_id=$1 
       LIMIT 1`,
      [driver_id]
    );

    if (rows.length === 0) {
      return res.json({ ok: true, data: null });
    }

    res.json({
      ok: true,
      data: rows[0],
    });
  } catch (e) {
    console.error("❌ Error fetching last cancel mile:", e);
    res.status(500).json({
      ok: false,
      detail: e.message,
    });
  }
});

// 🆕 API สำหรับลบข้อมูลไมล์ยกเลิกหลังจากใช้แล้ว
router.post("/api/drivers/clear-last-cancel-mile", authGuard, async (req, res) => {
  try {
    const driver_id = req.session?.user?.username;
    
    if (!driver_id) {
      return res.status(401).json({ ok: false, detail: "Unauthorized" });
    }

    await ensureFinishTable();

    // ลบข้อมูลไมล์ยกเลิกของคนขับ
    await pool.query(
      `DELETE FROM driver_last_cancel_mile WHERE driver_id=$1`,
      [driver_id]
    );

    console.log("✅ Cleared cancel mile data for driver:", driver_id);

    res.json({
      ok: true,
      message: "ลบข้อมูลไมล์ยกเลิกสำเร็จ",
    });
  } catch (e) {
    console.error("❌ Error clearing cancel mile:", e);
    res.status(500).json({
      ok: false,
      detail: e.message,
    });
  }
});

// 🆕 API สำหรับยกเลิกงาน
router.post("/api/drivers/job/cancel", authGuard, async (req, res) => {
  console.log("🎯 cancel job endpoint hit!");

  try {
    const { rec_id, cancel_reason } = req.body || {};

    console.log("📥 Received cancel job request:", {
      rec_id,
      cancel_reason,
    });

    if (!rec_id) {
      return res.status(400).json({ ok: false, detail: "rec_id is required" });
    }

    if (!cancel_reason) {
      return res.status(400).json({ ok: false, detail: "cancel_reason is required" });
    }

    await ensureFinishTable();

    // ตรวจสอบว่ามีข้อมูลอยู่หรือไม่
    const { rows: existRows } = await pool.query(
      `SELECT rec_id, status FROM driver_job_finishes WHERE rec_id=$1 LIMIT 1`,
      [rec_id]
    );

    // เวลาไทย (UTC+7)
    const thaiTime = new Date(Date.now() + 7 * 60 * 60 * 1000)
      .toISOString()
      .replace("Z", "+07:00");

    if (existRows.length > 0) {
      // อัปเดตข้อมูลเดิม - เปลี่ยนสถานะเป็น 9 (ยกเลิก)
      console.log("🔄 Updating existing record to cancelled status...");
      await pool.query(
        `UPDATE driver_job_finishes 
         SET status=9, cancel_reason=$1, cancelled_at=$2
         WHERE rec_id=$3`,
        [cancel_reason, thaiTime, rec_id]
      );
    } else {
      // สร้างข้อมูลใหม่พร้อมสถานะยกเลิก
      console.log("➕ Inserting new cancelled record...");
      await pool.query(
        `INSERT INTO driver_job_finishes 
         (rec_id, status, cancel_reason, cancelled_at, saved_at) 
         VALUES ($1, 9, $2, $3, $3)`,
        [rec_id, cancel_reason, thaiTime]
      );
    }

    console.log("✅ ยกเลิกงานสำเร็จ:", {
      rec_id,
      cancel_reason,
    });

    res.json({
      ok: true,
      message: "ยกเลิกงานเรียบร้อยแล้ว",
      data: { rec_id, cancel_reason },
    });
  } catch (e) {
    console.error("❌ Error canceling job:", e);
    console.error("Error stack:", e.stack);
    res.status(500).json({
      ok: false,
      detail: e.message,
      error: e.toString(),
    });
  }
});

// 🆕 API สำหรับบันทึกไมล์เริ่มและรูปออก (img_out)
router.post("/api/drivers/job/save-mile-start", authGuard, async (req, res) => {
  console.log("🎯 save-mile-start endpoint hit!");
  console.log("📍 Request URL:", req.url);
  console.log("📍 Request method:", req.method);
  console.log(
    "📍 Session:",
    req.session?.user ? "Authenticated" : "Not authenticated"
  );

  try {
    const { rec_id, mile_start, img_out } = req.body || {};

    console.log("📥 Received save-mile-start request:", {
      rec_id,
      mile_start,
      img_out,
    });

    if (!rec_id) {
      return res.status(400).json({ ok: false, detail: "rec_id is required" });
    }

    if (!mile_start) {
      return res
        .status(400)
        .json({ ok: false, detail: "mile_start is required" });
    }

    // แปลงเป็น string และลบ whitespace
    const mileStartStr = String(mile_start).trim();

    // ตรวจสอบว่าเป็นตัวเลขเท่านั้น (อนุญาตให้มี leading zeros)
    if (!/^\d+$/.test(mileStartStr)) {
      console.error("❌ Invalid mile_start pattern:", mileStartStr);
      return res.status(400).json({
        ok: false,
        detail: `mile_start ต้องเป็นตัวเลขเท่านั้น (ได้รับ: "${mileStartStr}")`,
      });
    }

    if (!img_out) {
      return res.status(400).json({ ok: false, detail: "img_out is required" });
    }

    await ensureFinishTable();

    // ตรวจสอบว่ามีข้อมูลอยู่แล้วหรือไม่
    const { rows: existRows } = await pool.query(
      `SELECT rec_id FROM driver_job_finishes WHERE rec_id=$1 LIMIT 1`,
      [rec_id]
    );

    // เวลาไทย (UTC+7)
    const thaiTime = new Date(Date.now() + 7 * 60 * 60 * 1000)
      .toISOString()
      .replace("Z", "+07:00");

    if (existRows.length > 0) {
      // อัปเดตข้อมูลเดิม
      console.log("🔄 Updating existing record...");
      await pool.query(
        `UPDATE driver_job_finishes 
         SET mile_start=$1, img_out=$2, start_datetime=$3, status=2, saved_at=$4
         WHERE rec_id=$5`,
        [mileStartStr, img_out, thaiTime, thaiTime, rec_id]
      );
    } else {
      // สร้างข้อมูลใหม่
      console.log("➕ Inserting new record...");
      await pool.query(
        `INSERT INTO driver_job_finishes 
         (rec_id, mile_start, img_out, start_datetime, status, saved_at) 
         VALUES ($1, $2, $3, $4, 2, $5)`,
        [rec_id, mileStartStr, img_out, thaiTime, thaiTime]
      );
    }

    console.log("✅ บันทึกไมล์เริ่มสำเร็จ:", {
      rec_id,
      mile_start: mileStartStr,
      img_out,
    });

    res.json({
      ok: true,
      message: "บันทึกไมล์เริ่มและรูปออกเรียบร้อยแล้ว",
      data: { rec_id, mile_start: mileStartStr, img_out },
    });
  } catch (e) {
    console.error("❌ Error saving mile_start:", e);
    console.error("Error stack:", e.stack);
    res.status(500).json({
      ok: false,
      detail: e.message,
      error: e.toString(),
    });
  }
});

// 🆕 API สำหรับบันทึกไมล์สิ้นสุด
router.post("/api/drivers/job/save-mile-end", authGuard, async (req, res) => {
  console.log("🎯 save-mile-end endpoint hit!");

  try {
    const { rec_id, mile_end, img_end, end_datetime } = req.body || {};

    console.log("📥 Received save-mile-end request:", {
      rec_id,
      mile_end,
      img_end,
      end_datetime,
    });

    if (!rec_id) {
      return res.status(400).json({ ok: false, detail: "rec_id is required" });
    }

    if (!mile_end) {
      return res
        .status(400)
        .json({ ok: false, detail: "mile_end is required" });
    }

    if (!img_end) {
      return res.status(400).json({ ok: false, detail: "img_end is required" });
    }

    // Validation เลขไมล์ (ต้องเป็นตัวเลขเท่านั้น)
    const mileEndStr = String(mile_end).trim();
    if (!/^\d+$/.test(mileEndStr)) {
      return res
        .status(400)
        .json({ ok: false, detail: "mile_end ต้องเป็นตัวเลขเท่านั้น" });
    }

    await ensureFinishTable();

    // ตรวจสอบว่ามีข้อมูลอยู่แล้วหรือไม่
    const { rows: existRows } = await pool.query(
      `SELECT rec_id, mile_start, meta FROM driver_job_finishes WHERE rec_id=$1 LIMIT 1`,
      [rec_id]
    );

    // ตรวจสอบว่าไมล์สิ้นสุดมากกว่าไมล์เริ่ม
    if (existRows.length > 0 && existRows[0].mile_start) {
      const mileStartNum = parseInt(String(existRows[0].mile_start).trim(), 10);
      const mileEndNum = parseInt(mileEndStr, 10);

      if (mileEndNum <= mileStartNum) {
        return res.status(400).json({
          ok: false,
          detail: `ไมล์สิ้นสุด (${mileEndNum}) ต้องมากกว่าไมล์เริ่ม (${mileStartNum})`,
        });
      }
    }

    // เวลาไทย (UTC+7)
    const thaiTime =
      end_datetime ||
      new Date(Date.now() + 7 * 60 * 60 * 1000)
        .toISOString()
        .replace("Z", "+07:00");

    // อัปเดต meta สำหรับเก็บข้อมูลเพิ่มเติม
    let existingMeta = {};
    if (existRows.length > 0 && existRows[0].meta) {
      try {
        existingMeta =
          typeof existRows[0].meta === "string"
            ? JSON.parse(existRows[0].meta)
            : existRows[0].meta;
      } catch (e) {
        console.warn("Cannot parse existing meta:", e);
      }
    }

    // อัปเดต images ใน meta
    if (!existingMeta.images) existingMeta.images = {};
    existingMeta.images.img_mile_end = img_end;

    if (existRows.length > 0) {
      // อัปเดตข้อมูลเดิม
      console.log("🔄 Updating mile_end in existing record...");
      await pool.query(
        `UPDATE driver_job_finishes 
         SET mile_end=$1, img_in=$2, end_datetime=$3, meta=$4, status=3, saved_at=$5
         WHERE rec_id=$6`,
        [
          mileEndStr,
          img_end,
          thaiTime,
          JSON.stringify(existingMeta),
          thaiTime,
          rec_id,
        ]
      );
    } else {
      // สร้างข้อมูลใหม่ (ไม่น่าจะเกิด แต่เผื่อไว้)
      console.log("➕ Inserting new record with mile_end...");
      await pool.query(
        `INSERT INTO driver_job_finishes 
         (rec_id, mile_end, img_in, end_datetime, meta, status, saved_at) 
         VALUES ($1, $2, $3, $4, $5, 3, $6)`,
        [
          rec_id,
          mileEndStr,
          img_end,
          thaiTime,
          JSON.stringify(existingMeta),
          thaiTime,
        ]
      );
    }

    // 🆕 อัปเดตสถานะอีกตาราง dispatch_po_runs → จบงาน (3)
    await pool.query(
      `UPDATE dispatch_po_runs SET purch_status1 = 3 WHERE rec_id = $1`,
      [rec_id]
    );

    console.log("✅ บันทึกไมล์สิ้นสุดสำเร็จ:", {
      rec_id,
      mile_end: mileEndStr,
      img_end,
      end_datetime: thaiTime,
    });

    res.json({
      ok: true,
      done: true,
      message: "บันทึกไมล์สิ้นสุดและจบงานเรียบร้อยแล้ว",
      data: { rec_id, mile_end: mileEndStr, img_end, end_datetime: thaiTime },
    });
  } catch (e) {
    console.error("❌ Error saving mile_end:", e);
    console.error("Error stack:", e.stack);
    res.status(500).json({
      ok: false,
      detail: e.message,
      error: e.toString(),
    });
  }
});

// 🆕 API สำหรับบันทึกน้ำหนักต้นทาง (ครบทุกฟิลด์)
router.post("/api/drivers/job/save-wt-origin", authGuard, async (req, res) => {
  console.log("🎯 save-wt-origin endpoint hit!");

  try {
    const {
      rec_id,
      wt_before_pick, // น้ำหนักเข้า
      wt_after_pick, // น้ำหนักออก
      regno_out, // ทะเบียนรถ
      billnumber_out, // เลขที่
      remark_1, // หมายเหตุ 1
      remark_2, // หมายเหตุ 2
      remark_3, // หมายเหตุ 3
      imgbill_out, // path รูป
    } = req.body || {};

    console.log("📥 Received save-wt-origin request:", {
      rec_id,
      wt_before_pick,
      wt_after_pick,
      regno_out,
      billnumber_out,
      remark_1,
      remark_2,
      remark_3,
      imgbill_out,
    });

    if (!rec_id) {
      return res.status(400).json({ ok: false, detail: "rec_id is required" });
    }

    if (!wt_before_pick && !wt_after_pick) {
      return res.status(400).json({
        ok: false,
        detail: "ต้องกรอกน้ำหนักเข้าหรือน้ำหนักออกอย่างน้อย 1 ค่า",
      });
    }

    if (
      !imgbill_out ||
      (Array.isArray(imgbill_out) && imgbill_out.length === 0)
    ) {
      return res
        .status(400)
        .json({ ok: false, detail: "imgbill_out is required" });
    }

    // Validation ค่าน้ำหนัก
    if (wt_before_pick != null && Number(wt_before_pick) < 0) {
      return res
        .status(400)
        .json({ ok: false, detail: "น้ำหนักเข้าต้องไม่ติดลบ" });
    }
    if (wt_after_pick != null && Number(wt_after_pick) < 0) {
      return res
        .status(400)
        .json({ ok: false, detail: "น้ำหนักออกต้องไม่ติดลบ" });
    }

    await ensureFinishTable();

    // ตรวจสอบว่ามีข้อมูลอยู่แล้วหรือไม่
    const { rows: existRows } = await pool.query(
      `SELECT rec_id, meta FROM driver_job_finishes WHERE rec_id=$1 LIMIT 1`,
      [rec_id]
    );

    // เวลาไทย (UTC+7)
    const thaiTime = new Date(Date.now() + 7 * 60 * 60 * 1000)
      .toISOString()
      .replace("Z", "+07:00");

    // อัปเดต meta สำหรับเก็บข้อมูลเพิ่มเติม
    let existingMeta = {};
    if (existRows.length > 0 && existRows[0].meta) {
      try {
        existingMeta =
          typeof existRows[0].meta === "string"
            ? JSON.parse(existRows[0].meta)
            : existRows[0].meta;
      } catch (e) {
        console.warn("Cannot parse existing meta:", e);
      }
    }

    // อัปเดต images ใน meta
    if (!existingMeta.images) existingMeta.images = {};
    existingMeta.images.img_wt_origin = imgbill_out;

    if (existRows.length > 0) {
      // อัปเดตข้อมูลเดิม
      console.log("🔄 Updating wt_origin in existing record...");
      await pool.query(
        `UPDATE driver_job_finishes 
         SET wt_before_pick=$1, wt_after_pick=$2, regno_out=$3, billnumber_out=$4, 
             remark_1=$5, remark_2=$6, remark_3=$7, imgbill_out=$8, meta=$9, saved_at=$10
         WHERE rec_id=$11`,
        [
          wt_before_pick ? Number(wt_before_pick) : null,
          wt_after_pick ? Number(wt_after_pick) : null,
          regno_out || null,
          billnumber_out || null,
          remark_1 || null,
          remark_2 || null,
          remark_3 || null,
          Array.isArray(imgbill_out)
            ? JSON.stringify(imgbill_out)
            : imgbill_out,
          JSON.stringify(existingMeta),
          thaiTime,
          rec_id,
        ]
      );
    } else {
      // สร้างข้อมูลใหม่
      console.log("➕ Inserting new record with wt_origin...");
      await pool.query(
        `INSERT INTO driver_job_finishes 
         (rec_id, wt_before_pick, wt_after_pick, regno_out, billnumber_out, 
          remark_1, remark_2, remark_3, imgbill_out, meta, status, saved_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, $11)`,
        [
          rec_id,
          wt_before_pick ? Number(wt_before_pick) : null,
          wt_after_pick ? Number(wt_after_pick) : null,
          regno_out || null,
          billnumber_out || null,
          remark_1 || null,
          remark_2 || null,
          remark_3 || null,
          Array.isArray(imgbill_out)
            ? JSON.stringify(imgbill_out)
            : imgbill_out,
          JSON.stringify(existingMeta),
          thaiTime,
        ]
      );
    }

    console.log("✅ บันทึกน้ำหนักต้นทางสำเร็จ:", {
      rec_id,
      wt_before_pick,
      wt_after_pick,
      regno_out,
      billnumber_out,
      remark_1,
      remark_2,
      remark_3,
    });

    await recalcNetWeight(rec_id);

    res.json({
      ok: true,
      message: "บันทึกน้ำหนักต้นทางเรียบร้อยแล้ว",
      data: {
        rec_id,
        wt_before_pick,
        wt_after_pick,
        regno_out,
        billnumber_out,
        remark_1,
        remark_2,
        remark_3,
      },
    });
  } catch (e) {
    console.error("❌ Error saving wt_origin:", e);
    console.error("Error stack:", e.stack);
    res.status(500).json({
      ok: false,
      detail: e.message,
      error: e.toString(),
    });
  }
});

// 🆕 API สำหรับบันทึกน้ำหนักปลายทาง (ครบทุกฟิลด์)
router.post("/api/drivers/job/save-wt-dest", authGuard, async (req, res) => {
  console.log("🎯 save-wt-dest endpoint hit!");

  try {
    const {
      rec_id,
      wt_arrive_dest, // น้ำหนักเข้า
      wt_leave_dest, // น้ำหนักออก
      regno_in, // ทะเบียนรถ
      billnumber_in, // เลขที่
      remark_1, // หมายเหตุ 1
      remark_2, // หมายเหตุ 2
      remark_3, // หมายเหตุ 3
      imgbill_in, // path รูป
    } = req.body || {};

    console.log("📥 Received save-wt-dest request:", {
      rec_id,
      wt_arrive_dest,
      wt_leave_dest,
      regno_in,
      billnumber_in,
      remark_1,
      remark_2,
      remark_3,
      imgbill_in,
    });

    if (!rec_id) {
      return res.status(400).json({ ok: false, detail: "rec_id is required" });
    }

    if (!wt_arrive_dest || !wt_leave_dest) {
      return res.status(400).json({
        ok: false,
        detail: "ต้องกรอกน้ำหนักเข้าและน้ำหนักออกทั้ง 2 ค่า",
      });
    }

    // รูปใบชั่งไม่บังคับสำหรับใบชั่งเข้า
    // if (!imgbill_in || (Array.isArray(imgbill_in) && imgbill_in.length === 0)) {
    //   return res
    //     .status(400)
    //     .json({ ok: false, detail: "imgbill_in is required" });
    // }

    // Validation ค่าน้ำหนัก
    if (wt_arrive_dest != null && Number(wt_arrive_dest) < 0) {
      return res
        .status(400)
        .json({ ok: false, detail: "น้ำหนักเข้าต้องไม่ติดลบ" });
    }
    if (wt_leave_dest != null && Number(wt_leave_dest) < 0) {
      return res
        .status(400)
        .json({ ok: false, detail: "น้ำหนักออกต้องไม่ติดลบ" });
    }

    await ensureFinishTable();

    // ตรวจสอบว่ามีข้อมูลอยู่แล้วหรือไม่
    const { rows: existRows } = await pool.query(
      `SELECT rec_id, meta FROM driver_job_finishes WHERE rec_id=$1 LIMIT 1`,
      [rec_id]
    );

    // เวลาไทย (UTC+7)
    const thaiTime = new Date(Date.now() + 7 * 60 * 60 * 1000)
      .toISOString()
      .replace("Z", "+07:00");

    // อัปเดต meta สำหรับเก็บข้อมูลเพิ่มเติม
    let existingMeta = {};
    if (existRows.length > 0 && existRows[0].meta) {
      try {
        existingMeta =
          typeof existRows[0].meta === "string"
            ? JSON.parse(existRows[0].meta)
            : existRows[0].meta;
      } catch (e) {
        console.warn("Cannot parse existing meta:", e);
      }
    }

    // อัปเดต images ใน meta
    if (!existingMeta.images) existingMeta.images = {};
    existingMeta.images.img_wt_dest = imgbill_in;

    if (existRows.length > 0) {
      // อัปเดตข้อมูลเดิม
      console.log("🔄 Updating wt_dest in existing record...");
      await pool.query(
        `UPDATE driver_job_finishes 
         SET wt_arrive_dest=$1, wt_leave_dest=$2, regno_in=$3, billnumber_in=$4, 
             remark_1=$5, remark_2=$6, remark_3=$7, imgbill_in=$8, meta=$9, saved_at=$10
         WHERE rec_id=$11`,
        [
          wt_arrive_dest ? Number(wt_arrive_dest) : null,
          wt_leave_dest ? Number(wt_leave_dest) : null,
          regno_in || null,
          billnumber_in || null,
          remark_1 || null,
          remark_2 || null,
          remark_3 || null,
          Array.isArray(imgbill_in) ? JSON.stringify(imgbill_in) : imgbill_in,
          JSON.stringify(existingMeta),
          thaiTime,
          rec_id,
        ]
      );
    } else {
      // สร้างข้อมูลใหม่
      console.log("➕ Inserting new record with wt_dest...");
      await pool.query(
        `INSERT INTO driver_job_finishes 
         (rec_id, wt_arrive_dest, wt_leave_dest, regno_in, billnumber_in, 
          remark_1, remark_2, remark_3, imgbill_in, meta, status, saved_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, $11)`,
        [
          rec_id,
          wt_arrive_dest ? Number(wt_arrive_dest) : null,
          wt_leave_dest ? Number(wt_leave_dest) : null,
          regno_in || null,
          billnumber_in || null,
          remark_1 || null,
          remark_2 || null,
          remark_3 || null,
          Array.isArray(imgbill_in) ? JSON.stringify(imgbill_in) : imgbill_in,
          JSON.stringify(existingMeta),
          thaiTime,
        ]
      );
    }

    console.log("✅ บันทึกน้ำหนักปลายทางสำเร็จ:", {
      rec_id,
      wt_arrive_dest,
      wt_leave_dest,
      regno_in,
      billnumber_in,
      remark_1,
      remark_2,
      remark_3,
    });
    await recalcNetWeight(rec_id);

    res.json({
      ok: true,
      message: "บันทึกน้ำหนักปลายทางเรียบร้อยแล้ว",
      data: {
        rec_id,
        wt_arrive_dest,
        wt_leave_dest,
        regno_in,
        billnumber_in,
        remark_1,
        remark_2,
        remark_3,
      },
    });
  } catch (e) {
    console.error("❌ Error saving wt_dest:", e);
    console.error("Error stack:", e.stack);
    res.status(500).json({
      ok: false,
      detail: e.message,
      error: e.toString(),
    });
  }
});

//----------------------บันทึกภาพลง public/image-----------------------------------
const PUBLIC_DIR = path.join(process.cwd(), "public");
const IMAGE_DIR = path.join(PUBLIC_DIR, "image");
fs.mkdirSync(IMAGE_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, IMAGE_DIR),

  filename: (req, file, cb) => {
    // ⚠️ multer อ่าน req.body ไม่ได้ตอนนี้ ให้ใช้ชื่อชั่วคราวก่อน
    const tag = file.fieldname; // เช่น img_wt_origin
    const ext = path.extname(file.originalname) || ".jpg";
    const tempId = `temp_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // ใช้ชื่อชั่วคราวก่อน จะเปลี่ยนชื่อทีหลัง
    const filename = `${tag}-${tempId}${ext}`;
    console.log(`📁 Temporary filename: ${filename}`);
    cb(null, filename);
  },
});

const upload = multer({ storage });

// ฟังก์ชันเปลี่ยนชื่อไฟล์หลัง upload
function renameUploadedFile(oldPath, tag, recId) {
  const ext = path.extname(oldPath);
  const sanitizedRecId = String(recId || "unknown").replace(
    /[^a-zA-Z0-9_-]/g,
    "_"
  );

  // ✅ กรณีพิเศษ: ไมล์เริ่ม ให้ใช้ชื่อ img_mile_out-{rec_id}
  if (tag === "img_mile_start") {
    const newFilename = `img_mile_out-${sanitizedRecId}${ext}`;
    const newPath = path.join(IMAGE_DIR, newFilename);

    // ลบไฟล์เก่าถ้ามี
    if (fs.existsSync(newPath)) {
      fs.unlinkSync(newPath);
    }

    fs.renameSync(oldPath, newPath);
    console.log(`📁 Renamed ${path.basename(oldPath)} → ${newFilename}`);
    return newPath;
  }

  // ไฟล์อื่นๆ ใช้รูปแบบปกติ
  const newFilename = `${tag}-${sanitizedRecId}${ext}`;
  const newPath = path.join(IMAGE_DIR, newFilename);

  // กันชื่อซ้ำ
  let finalPath = newPath;
  let i = 1;
  while (fs.existsSync(finalPath) && finalPath !== oldPath) {
    finalPath = path.join(IMAGE_DIR, `${tag}-${sanitizedRecId}-${i}${ext}`);
    i++;
  }

  if (finalPath !== oldPath) {
    fs.renameSync(oldPath, finalPath);
    console.log(
      `📁 Renamed ${path.basename(oldPath)} → ${path.basename(finalPath)}`
    );
  }

  return finalPath;
}

// ✅ เส้นทางอัปโหลด
router.post(
  "/api/upload-images",
  upload.fields([
    { name: "img_mile_start", maxCount: 1 },
    { name: "img_mile_end", maxCount: 1 },
    { name: "img_wt_origin", maxCount: 20 },
    { name: "img_wt_dest", maxCount: 20 },
    { name: "img_cancel_mile", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      console.log("📤 Upload received");
      console.log("  req.body:", req.body);
      console.log("  req.files:", Object.keys(req.files || {}));

      const rec_id = req.body?.rec_id;
      console.log("  rec_id extracted:", rec_id);

      if (!rec_id) {
        console.warn("⚠️ rec_id is missing in req.body!");
      }

      const previewPaths = {};

      // เปลี่ยนชื่อไฟล์และเก็บ path ใหม่
      for (const [key, arr] of Object.entries(req.files || {})) {
        previewPaths[key] = arr.map((file) => {
          console.log(`  Processing ${key}: ${file.filename}`);
          const newPath = renameUploadedFile(file.path, key, rec_id);
          return `/image/${path.basename(newPath)}`;
        });
      }

      console.log("✅ Preview paths:", previewPaths);
      res.json({ ok: true, previewPaths });
    } catch (err) {
      console.error("❌ Upload error:", err);
      res.status(500).json({ ok: false, detail: err.message });
    }
  }
);

//-------------------------OCR------------------------------------
// Import OCR service
const {
  processOCR,
  normalizeOCRResult,
  processWeightScaleOCR,
  normalizeWeightData,
} = require("../ocr-service");

// ⭐ NEW: API สำหรับอ่านใบชั่งน้ำหนักโดยเฉพาะ
router.post("/api/ocr-weight", async (req, res) => {
  try {
    const { imagePath, rec_id, tag, context } = req.body || {};

    if (!imagePath) {
      return res.status(400).json({ ok: false, detail: "Missing imagePath" });
    }

    if (!context || !["origin", "destination"].includes(context)) {
      return res.status(400).json({
        ok: false,
        detail: 'Invalid context. Must be "origin" or "destination"',
      });
    }

    // หา absolute path
    const abs = path.join(
      process.cwd(),
      "public",
      imagePath.replace(/^\/+/, "")
    );

    if (!fs.existsSync(abs)) {
      return res
        .status(404)
        .json({ ok: false, detail: `File not found: ${abs}` });
    }

    console.log("📋 Processing weight scale OCR:", { imagePath, context, tag });

    // เรียก processWeightScaleOCR
    const ocrResult = await processWeightScaleOCR(abs, context);

    if (!ocrResult.ok) {
      return res.status(500).json({
        ok: false,
        detail: ocrResult.detail || "OCR failed",
        error: ocrResult.error,
      });
    }

    // ดึง fields ที่ normalized แล้ว
    const fields = ocrResult.normalized?.fields || {};

    // บันทึก JSON result
    const dir = path.join(process.cwd(), "public", "ocr-results");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const timestamp = Date.now();
    const fileName = `${rec_id || "unknown"}_${
      tag || context
    }_${timestamp}.json`;
    const jsonFilePath = path.join(dir, fileName);

    const jsonPayload = {
      ok: true,
      data: ocrResult.data,
      normalized: ocrResult.normalized,
      fields,
      meta: {
        rec_id,
        tag,
        context,
        imagePath,
        timestamp: new Date().toISOString(),
        model: ocrResult.meta?.model,
        type: "weight_scale_ticket",
      },
    };

    await fsp.writeFile(
      jsonFilePath,
      JSON.stringify(jsonPayload, null, 2),
      "utf-8"
    );

    const jsonPath = `/ocr-results/${fileName}`;

    console.log("✅ Weight scale OCR success:", { fields, jsonPath });

    return res.json({
      ok: true,
      data: ocrResult.data,
      normalized: ocrResult.normalized,
      fields,
      jsonPath,
      meta: jsonPayload.meta,
    });
  } catch (error) {
    console.error("❌ Weight scale OCR error:", error);
    return res.status(500).json({
      ok: false,
      detail: error.message || "Internal server error",
      error: error.toString(),
    });
  }
});

// routes/index.js  (/api/ocr) - สำหรับไมล์และอื่นๆ
router.post("/api/ocr", async (req, res) => {
  // ดึงตัวเลขตัวแรกจากอะไรก็ได้
  const pickNum = (v) => {
    if (v == null) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "string") {
      const m = v.replace(/[, ]+/g, "").match(/-?\d+(?:\.\d+)?/);
      return m ? Number(m[0]) : null;
    }
    if (Array.isArray(v)) {
      for (const e of v) {
        const n = pickNum(e);
        if (n != null) return n;
      }
      return null;
    }
    if (typeof v === "object") {
      return pickNum(Object.values(v));
    }
    return null;
  };

  // แปลงผลจาก Python -> fields ที่หน้าเว็บต้องการ
  function normalizeFields(j, prefer = "mile_start") {
    // helpers
    const digitsStr = (x) => {
      if (x == null) return null;
      if (typeof x === "string") {
        // คงรูปแบบเดิมเพื่อรักษา leading zeros
        const cleaned = x.replace(/[^\d]/g, "");
        return cleaned || null;
      }
      if (typeof x === "number" && Number.isFinite(x)) {
        // แปลงเป็น string แต่คงค่าเดิม (ไม่เติม leading zeros)
        return String(x);
      }
      if (Array.isArray(x))
        for (const e of x) {
          const s = digitsStr(e);
          if (s != null) return s;
        }
      if (typeof x === "object") return digitsStr(Object.values(x));
      return null;
    };
    const toNum = (v) => {
      if (v == null) return null;
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string") {
        const m = v.replace(/[, ]+/g, "").match(/-?\d+(?:\.\d+)?/);
        return m ? Number(m[0]) : null;
      }
      if (Array.isArray(v)) {
        for (const e of v) {
          const n = toNum(e);
          if (n != null) return n;
        }
        return null;
      }
      if (typeof v === "object") return toNum(Object.values(v));
      return null;
    };
    const norm = (x) =>
      String(x ?? "")
        .trim()
        .toLowerCase();
    const pick = (obj, keys) => {
      for (const k of keys) if (obj && obj[k] != null) return obj[k];
      return null;
    };

    const out = {
      mile_start: null,
      mile_end: null,
      wt_before_pick: null,
      wt_after_pick: null,
      wt_arrive_dest: null,
      wt_leave_dest: null,
    };

    if (!j || j.ok === false) return out;

    // รองรับรูปแบบ data/raw_text ฯลฯ
    const payload = j.data ?? j.text ?? j.raw_text ?? j;

    // ---- ช่วยอ่านจาก entries (เข้า/ออก) ----
    const extractFromEntries = (scope) => {
      // scope = payload, หรือ payload.data
      const rows = Array.isArray(scope?.entries)
        ? scope.entries
        : Array.isArray(scope?.items)
        ? scope.items
        : Array.isArray(scope?.transactions)
        ? scope.transactions
        : null;
      if (!rows) return {};

      const rowIn = rows.find((r) =>
        ["เข้า", "in", "arrive"].some((w) => norm(r?.type || "").includes(w))
      );
      const rowOut = rows.find((r) =>
        ["ออก", "out", "leave"].some((w) => norm(r?.type || "").includes(w))
      );

      const wIn = rowIn
        ? toNum(rowIn.weight ?? rowIn.wt ?? rowIn.value ?? rowIn.text)
        : null;
      const wOut = rowOut
        ? toNum(rowOut.weight ?? rowOut.wt ?? rowOut.value ?? rowOut.text)
        : null;

      return { inW: wIn, outW: wOut };
    };

    // 1) ไมล์
    if (typeof payload === "object") {
      const startSrc = pick(payload, [
        "mile_start",
        "start_mile",
        "ไมล์เริ่ม",
        "odometer",
      ]);
      const endSrc = pick(payload, [
        "mile_end",
        "end_mile",
        "ไมล์สิ้นสุด",
        "ไมล์จบ",
        "odometer_end",
      ]);

      if (prefer === "mile_end") {
        out.mile_end = digitsStr(endSrc) ?? digitsStr(startSrc) ?? out.mile_end;
        out.mile_start = digitsStr(startSrc) ?? out.mile_start;
      } else {
        out.mile_start =
          digitsStr(startSrc) ?? digitsStr(endSrc) ?? out.mile_start;
        out.mile_end = digitsStr(endSrc) ?? out.mile_end;
      }

      // 2) น้ำหนักจากคีย์เดี่ยว
      out.wt_before_pick = toNum(
        pick(payload, [
          "wt_before_pick",
          "inWeight",
          "ต้นทางเข้า",
          "นน.เข้า(ต้นทาง)",
          "น้ำหนักต้นทางเข้า",
        ])
      );
      out.wt_after_pick = toNum(
        pick(payload, [
          "wt_after_pick",
          "outWeight",
          "ต้นทางออก",
          "นน.ออก(ต้นทาง)",
          "น้ำหนักต้นทางออก",
        ])
      );
      out.wt_arrive_dest = toNum(
        pick(payload, [
          "wt_arrive_dest",
          "arriveIn",
          "destIn",
          "ปลายทางเข้า",
          "นน.เข้า(ปลายทาง)",
        ])
      );
      out.wt_leave_dest = toNum(
        pick(payload, [
          "wt_leave_dest",
          "leaveOut",
          "destOut",
          "ปลายทางออก",
          "นน.ออก(ปลายทาง)",
        ])
      );

      // 3) ถ้าไม่เจอ ให้ลองอ่านจาก entries ใน payload และ/หรือ payload.data
      if (out.wt_before_pick == null || out.wt_after_pick == null) {
        const { inW, outW } = extractFromEntries(payload);
        if (out.wt_before_pick == null && inW != null) out.wt_before_pick = inW;
        if (out.wt_after_pick == null && outW != null) out.wt_after_pick = outW;
      }
      if (out.wt_arrive_dest == null || out.wt_leave_dest == null) {
        const { inW, outW } = extractFromEntries(payload);
        if (out.wt_arrive_dest == null && inW != null) out.wt_arrive_dest = inW;
        if (out.wt_leave_dest == null && outW != null) out.wt_leave_dest = outW;
      }

      return out;
    }

    // 4) ถ้าเป็นสตริงล้วน (กรณีง่าย)
    if (typeof payload === "string") {
      const all = payload.match(/\d+/g) || [];
      if (prefer === "mile_end") {
        if (all[0]) out.mile_end = all[0];
        if (all[1]) out.mile_start = all[1];
      } else {
        if (all[0]) out.mile_start = all[0];
        if (all[1]) out.mile_end = all[1];
      }
      if (all[2]) out.wt_before_pick = Number(all[2]);
      if (all[3]) out.wt_after_pick = Number(all[3]);
      if (all[4]) out.wt_arrive_dest = Number(all[4]);
      if (all[5]) out.wt_leave_dest = Number(all[5]);
    }

    return out;
  }

  // ใช้ OCR service แบบ JavaScript (ไม่ต้องเรียก Python)
  async function sendFileToOCR(absPath, tag) {
    console.log(`[OCR] Processing: ${absPath} (tag: ${tag})`);

    // ⚠️ แยกการเรียกใช้ฟังก์ชัน OCR ตามประเภท
    let result;
    if (tag.includes("wt_")) {
      // ใบชั่งน้ำหนัก → ใช้ processWeightScaleOCR
      const context = tag === "wt_origin" ? "origin" : "destination";
      console.log(
        `🔀 [sendFileToOCR] เรียก processWeightScaleOCR (context: ${context})`
      );
      result = await processWeightScaleOCR(absPath, context);
    } else {
      // ไมล์ → ใช้ processOCR
      console.log(`🔀 [sendFileToOCR] เรียก processOCR (อ่านไมล์)`);
      result = await processOCR(absPath, tag);
    }

    console.log(`[OCR] Result:`, JSON.stringify(result, null, 2));
    if (!result.ok) {
      const errorMsg =
        result.detail || result.error || result.message || "OCR failed";
      console.error(`[OCR] Error:`, errorMsg);
      throw new Error(errorMsg);
    }
    return result;
  }

  // บันทึก JSON ไปที่ public/ocr-results/<...>.json แล้วคืน path แบบ public
  async function saveJson(recId, tag, imagePath, payload) {
    const dir = path.join(process.cwd(), "public", "ocr-results");
    await fsp.mkdir(dir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const safeRec = (recId || "unknown").replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeTag = (tag || "image").replace(/[^a-zA-Z0-9_-]/g, "_");
    const file = `${safeRec}__${safeTag}__${ts}.json`;
    const abs = path.join(dir, file);

    await fsp.writeFile(abs, JSON.stringify(payload, null, 2), "utf-8");
    // public path
    return `/ocr-results/${file}`;
  }

  try {
    const { imagePath, images, rec_id, tag } = req.body || {};

    // เคสเดี่ยว: imagePath (เช่น ไมล์เริ่ม)
    if (imagePath) {
      const abs = path.join(
        process.cwd(),
        "public",
        imagePath.replace(/^\/+/, "")
      );
      if (!fs.existsSync(abs))
        return res
          .status(404)
          .json({ ok: false, detail: `File not found: ${abs}` });

      const ocrResult = await sendFileToOCR(abs, tag);
      const normalized = normalizeOCRResult(ocrResult.data, tag);
      const fields = normalized.fields;
      const jsonPayload = {
        ok: true,
        data: ocrResult.data,
        fields,
        meta: {
          rec_id,
          tag: tag || "single",
          imagePath,
          ts: new Date().toISOString(),
          model: ocrResult.meta?.model,
        },
      };
      const jsonPath = await saveJson(
        rec_id,
        tag || "single",
        imagePath,
        jsonPayload
      );
      return res.json({ ok: true, data: ocrResult.data, fields, jsonPath });
    }

    // เคสหลายรูป: images:{ mile_start, mile_end, wt_origin[], wt_dest[] }
    if (images && typeof images === "object") {
      const results = {};
      const jsonFiles = [];

      for (const [k, val] of Object.entries(images)) {
        if (!val) continue;
        const paths = Array.isArray(val) ? val : [val];
        results[k] = [];

        for (let i = 0; i < paths.length; i++) {
          const p = paths[i];
          const abs = path.join(process.cwd(), "public", p.replace(/^\/+/, ""));
          if (!fs.existsSync(abs)) {
            results[k].push({ ok: false, detail: `File not found: ${abs}` });
            continue;
          }
          const ocrResult = await sendFileToOCR(abs, k);
          const normalized = normalizeOCRResult(ocrResult.data, k);
          results[k].push({ ...ocrResult, fields: normalized.fields });

          // เซฟไฟล์รายชิ้นด้วย
          const eachPayload = {
            ok: true,
            data: ocrResult.data,
            fields: normalized.fields,
            meta: {
              rec_id,
              tag: `${k}[${i}]`,
              imagePath: p,
              ts: new Date().toISOString(),
              model: ocrResult.meta?.model,
            },
          };
          const eachJsonPath = await saveJson(
            rec_id,
            `${k}_${i}`,
            p,
            eachPayload
          );
          jsonFiles.push(eachJsonPath);
        }
      }

      // รวมผลแบบง่าย: หาค่าที่เจออันแรกจากแต่ละกลุ่ม
      const firstNum = (arr) => {
        for (const r of arr || []) {
          const f = r.fields || {}; // ใช้ fields ที่ได้จาก normalizeOCRResult แล้ว
          if (
            f.wt_before_pick != null ||
            f.wt_after_pick != null ||
            f.wt_arrive_dest != null ||
            f.wt_leave_dest != null ||
            f.mile_start != null ||
            f.mile_end != null
          )
            return f;
        }
        return null;
      };
      const fields = firstNum(results.wt_origin) ||
        firstNum(results.wt_dest) ||
        firstNum(results.mile_start) ||
        firstNum(results.mile_end) || {
          mile_start: null,
          mile_end: null,
          wt_before_pick: null,
          wt_after_pick: null,
          wt_arrive_dest: null,
          wt_leave_dest: null,
        };

      const bundlePayload = {
        ok: true,
        raw: results,
        fields,
        meta: { rec_id, tag: "batch", ts: new Date().toISOString() },
      };
      const bundleJsonPath = await saveJson(
        rec_id,
        "batch",
        "-",
        bundlePayload
      );

      return res.json({
        ok: true,
        raw: results,
        fields,
        jsonPath: bundleJsonPath,
        jsonFiles,
      });
    }

    return res
      .status(400)
      .json({ ok: false, detail: "imagePath or images required" });
  } catch (err) {
    console.error("OCR_PROXY_ERROR", err);
    const errorDetail = err.message || err.detail || String(err);
    const errorStack = err.stack || "";
    console.error("Error detail:", errorDetail);
    console.error("Error stack:", errorStack);
    res.status(500).json({
      ok: false,
      detail: errorDetail,
      error: errorDetail,
      message: errorDetail,
    });
  }
});

// ลบไฟล์ JSON OCR ที่ไม่ต้องการ
router.delete("/api/ocr-cleanup/:rec_id", authGuard, async (req, res) => {
  try {
    const { rec_id } = req.params;
    if (!rec_id) {
      return res.status(400).json({ ok: false, detail: "rec_id required" });
    }

    const ocrDir = path.join(process.cwd(), "public", "ocr-results");
    if (!fs.existsSync(ocrDir)) {
      return res.json({ ok: true, deleted: 0, message: "ไม่มีไดเรกทอรี OCR" });
    }

    // หาไฟล์ที่เริ่มต้นด้วย rec_id
    const files = await fs.promises.readdir(ocrDir);
    const safeRecId = rec_id.replace(/[^a-zA-Z0-9_-]/g, "_");
    const matchingFiles = files.filter(
      (f) => f.startsWith(safeRecId) && f.endsWith(".json")
    );

    let deletedCount = 0;
    for (const file of matchingFiles) {
      try {
        await fs.promises.unlink(path.join(ocrDir, file));
        deletedCount++;
      } catch (unlinkError) {
        console.warn(`ลบไฟล์ไม่ได้: ${file}`, unlinkError.message);
      }
    }

    res.json({
      ok: true,
      deleted: deletedCount,
      files: matchingFiles,
      message: `ลบไฟล์ JSON สำเร็จ ${deletedCount} ไฟล์`,
    });
  } catch (error) {
    console.error("OCR_CLEANUP_ERROR:", error);
    res.status(500).json({ ok: false, detail: error.message });
  }
});

module.exports = router;
module.exports.ensureFinishTable = ensureFinishTable;
module.exports.ensureCancelLogsTable = ensureCancelLogsTable;
module.exports.ensureDispatchPoRunsTable = ensureDispatchPoRunsTable;
module.exports.ensureDriverLastCancelMileTable = ensureDriverLastCancelMileTable;
