# รายการพอร์ตที่ใช้งาน (Port List)

## 📋 สรุปพอร์ตทั้งหมด

| พอร์ต | แอปพลิเคชัน | ประเภท | สถานะ | หมายเหตุ |
|------|------------|--------|-------|---------|
| **3000** | Proxy Server | Reverse Proxy | ✅ ใช้งาน | Main Entry Point |
| **1000** | Dashboard | Web Dashboard | ✅ ใช้งาน | หน้าแดชบอร์ดหลัก |
| **1001** | Homecare Frontend | Vite Dev Server | ✅ ใช้งาน | Frontend Development |
| **1002** | Repair System Frontend | Next.js Dev | ✅ ใช้งาน | Next.js Development |
| **1003** | AutoPO Backend | Express API | ✅ ใช้งาน | API สำหรับ AutoPO |
| **1004** | YC Sales CRM Frontend | Express Static | ✅ ใช้งาน | CRM Frontend |
| **2001** | Homecare Backend | Express API | ✅ ใช้งาน | Backend API สำหรับ Homecare |
| **5432** | PostgreSQL | Database | ✅ ใช้งาน | ฐานข้อมูล (Default) |

---

## 🔌 รายละเอียดแต่ละพอร์ต

### 1. Port 3000 - Proxy Server ⭐
- **Path**: `./proxy`
- **Script**: `index.js`
- **หน้าที่**: เป็น Reverse Proxy หลักที่รับคำขอทั้งหมดและส่งต่อไปยังแอปพลิเคชันต่างๆ
- **Memory**: 200MB
- **Access**: `http://localhost:3000`

### 2. Port 1000 - Dashboard 📊
- **Path**: `./dashboard`
- **Script**: `server.js`
- **หน้าที่**: หน้าแดชบอร์ดสำหรับดูภาพรวมระบบ
- **Memory**: 100MB
- **Access**: `http://localhost:1000`

### 3. Port 1001 - Homecare Frontend 🏠
- **Path**: `./app/homecare`
- **Type**: Vite Development Server
- **หน้าที่**: Frontend สำหรับระบบ Homecare
- **Memory**: 300MB
- **Access**: 
  - Dev: `http://localhost:1001`
  - Production: `http://localhost:3000/homecare/`
- **HMR**: WebSocket บน port 1001

### 4. Port 1002 - Repair System Frontend 🔧
- **Path**: `./app/react-tsx-repair-system`
- **Type**: Next.js Development Server
- **หน้าที่**: Frontend สำหรับระบบแจ้งซ่อม
- **Memory**: 300MB
- **Access**: `http://localhost:1002`

### 5. Port 1003 - AutoPO Backend 📦
- **Path**: `./app/AutoPO`
- **Script**: `app.js`
- **หน้าที่**: Backend API สำหรับระบบ AutoPO
- **Access**: `http://localhost:1003`

### 6. Port 1004 - YC Sales CRM Frontend 💼
- **Path**: `./app/ycsalescrm`
- **Script**: `app.js`
- **หน้าที่**: Frontend สำหรับระบบ CRM ขาย
- **Memory**: 300MB
- **Access**: 
  - Direct: `http://localhost:1004`
  - Production: `http://localhost:3000/ycsalescrm/`

### 7. Port 2001 - Homecare Backend API 🔌
- **Path**: `./app/homecare/server`
- **Script**: `index.js`
- **หน้าที่**: Backend API สำหรับระบบ Homecare
- **Memory**: 500MB
- **Database**: PostgreSQL
- **Access**: `http://localhost:2001`

### 8. Port 5432 - PostgreSQL Database 🗄️
- **หน้าที่**: ฐานข้อมูลหลัก
- **ใช้โดย**: 
  - Homecare Backend (port 2001)
  - Repair System
  - AutoPO
  - YC Sales CRM

---

## 🔄 Port Mapping (Proxy Routes)

```
http://localhost:3000/              → Dashboard (Port 1000)
http://localhost:3000/homecare/     → Homecare Frontend (Port 1001)
http://localhost:3000/repair/       → Repair System (Port 1002)
http://localhost:3000/autopo/       → AutoPO (Port 1003)
http://localhost:3000/ycsalescrm/   → YC Sales CRM (Port 1004)
http://localhost:3000/api/homecare/ → Homecare Backend (Port 2001)
```

---

## ⚠️ หมายเหตุสำคัญ

1. **Port 3000** เป็นพอร์ตหลักที่ควรเข้าถึงจาก Production
2. พอร์ต 1001-1004 ใช้สำหรับ Development และควรถูก Proxy ผ่าน port 3000
3. **Port 5432** ห้ามเปิดให้เข้าถึงจากภายนอกโดยตรง (Database Security)
4. เมื่อ Deploy Production ควรปิด Direct Access ไปยังพอร์ต 1000-2001

---

## 🚀 คำสั่งที่เกี่ยวข้อง

```bash
# ดูสถานะแอพทั้งหมด
pm2 status

# ดูพอร์ตที่ใช้งาน
pm2 list

# ตรวจสอบพอร์ตที่เปิดอยู่ (Windows)
netstat -ano | findstr "3000 1000 1001 1002 1003 1004 2001 5432"

# Restart แอพเฉพาะ
pm2 restart proxy
pm2 restart homecare-frontend
pm2 restart homecare-backend
```

---

**อัพเดทล่าสุด**: January 2026  
**จัดการโดย**: bigboss
