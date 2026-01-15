# 🚀 PM2 Multi-Application Management System

<div align="center">

![PM2](https://img.shields.io/badge/PM2-2B037A?style=for-the-badge&logo=pm2&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

**Enterprise-grade multi-application management system powered by PM2**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Applications](#-applications) • [API Documentation](#-api-documentation)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Applications](#-applications)
- [Port Management](#-port-management)
- [Deployment](#-deployment)
- [Monitoring](#-monitoring)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

A comprehensive application management system that orchestrates multiple web applications using PM2 process manager. The system includes a reverse proxy, dashboard, and several specialized applications for different business needs.

### Key Highlights

- 🔄 **Centralized Management**: Single PM2 ecosystem managing all applications
- 🛡️ **Reverse Proxy**: Secure routing through proxy server
- 📊 **Real-time Monitoring**: Live dashboard for system health
- 🏥 **Homecare System**: Complete healthcare management platform
- 🔧 **Repair System**: Issue tracking and maintenance management
- 📦 **AutoPO**: Purchase order automation
- 💼 **CRM System**: Customer relationship management for sales

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Port 3000                             │
│                  Proxy Server                            │
│              (Reverse Proxy Entry)                       │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┼──────────┬──────────┬──────────┐
        │          │          │          │          │
   ┌────▼───┐ ┌───▼────┐ ┌──▼─────┐ ┌──▼────┐ ┌──▼────┐
   │  1000  │ │  1001  │ │  1002  │ │ 1003  │ │ 1004  │
   │Dashboard│ │Homecare│ │ Repair │ │AutoPO │ │  CRM  │
   └────────┘ └───┬────┘ └────────┘ └───────┘ └───────┘
                  │
             ┌────▼────┐
             │  2001   │
             │ Backend │
             └────┬────┘
                  │
             ┌────▼────┐
             │  5432   │
             │PostgreSQL│
             └─────────┘
```

---

## ✨ Features

### Core Features
- ✅ **PM2 Process Management**: Automatic restart, load balancing, and monitoring
- ✅ **Hot Reload**: Development servers with HMR support
- ✅ **Database Integration**: PostgreSQL for data persistence
- ✅ **API Gateway**: Centralized API routing
- ✅ **Static File Serving**: Optimized delivery of frontend assets
- ✅ **Environment Management**: Separate dev/prod configurations
- ✅ **Memory Limits**: Auto-restart on memory threshold

### Application Features
- 🏥 **Homecare**: Patient management, appointments, medical records
- 🔧 **Repair System**: Maintenance requests, feedback system, LINE notifications
- 📦 **AutoPO**: OCR-based document processing, automated workflows
- 💼 **CRM**: Sales tracking, customer management, reporting

---

## 📦 Prerequisites

Before installation, ensure you have:

- **Node.js** >= 16.x
- **PM2** >= 5.x
- **PostgreSQL** >= 14.x
- **Git** (for cloning)
- **Windows/Linux/MacOS**

### Quick Install Dependencies

```bash
# Install Node.js (if not installed)
# Visit: https://nodejs.org/

# Install PM2 globally
npm install -g pm2

# Install PostgreSQL
# Visit: https://www.postgresql.org/download/
```

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd pm2_Suacess_Mark1
```

### 2. Install Root Dependencies

```bash
npm install
```

### 3. Install Application Dependencies

```bash
# Homecare
cd app/homecare
npm install
cd ../..

# Repair System
cd app/react-tsx-repair-system
npm install
cd ../..

# AutoPO
cd app/AutoPO
npm install
cd ../..

# YC Sales CRM
cd app/ycsalescrm
npm install
cd ../..
```

### 4. Configure Environment Variables

Create `.env` files in respective application directories:

```bash
# app/homecare/.env
DATABASE_URL=postgresql://user:password@localhost:5432/homecare_db
GEMINI_API_KEY=your_api_key_here

# app/react-tsx-repair-system/.env.local
DBLG_HOST=localhost
DBLG_PORT=5432
DBLG_NAME=useryc
DBLG_USER=postgres
DBLG_PASSWORD=your_password

DBRE_HOST=localhost
DBRE_PORT=5432
DBRE_NAME=RepairRequest
DBRE_USER=postgres
DBRE_PASSWORD=your_password

# app/ycsalescrm/.env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=salescrm
```

### 5. Setup Databases

```sql
-- Create databases
CREATE DATABASE homecare_db;
CREATE DATABASE useryc;
CREATE DATABASE RepairRequest;
CREATE DATABASE salescrm;

-- Run migrations (if available)
-- Check each app's documentation
```

---

## ⚙️ Configuration

### PM2 Ecosystem Configuration

The main configuration is in `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    // Proxy Server - Port 3000
    { name: "proxy", ... },
    
    // Dashboard - Port 1000
    { name: "dashboard", ... },
    
    // Applications - Ports 1001-1004
    { name: "homecare-frontend", ... },
    { name: "repair-frontend", ... },
    { name: "autopo-backend", ... },
    { name: "ycsales-Frontend", ... },
    
    // Backend API - Port 2001
    { name: "homecare-backend", ... }
  ]
};
```

### Custom Configuration

Edit `ecosystem.config.js` to modify:
- Memory limits
- Environment variables
- Port numbers
- Instance count
- Restart policies

---

## 🎮 Usage

### Start All Applications

```bash
# Start all apps defined in ecosystem
pm2 start ecosystem.config.js

# Or use npm script
npm start
```

### Individual App Management

```bash
# Start specific app
pm2 start proxy
pm2 start homecare-frontend
pm2 start homecare-backend

# Stop specific app
pm2 stop proxy

# Restart specific app
pm2 restart homecare-frontend

# Delete app from PM2
pm2 delete homecare-backend
```

### Monitoring

```bash
# View all processes
pm2 list

# Monitor real-time
pm2 monit

# View logs
pm2 logs

# View logs for specific app
pm2 logs homecare-frontend

# Flush logs
pm2 flush
```

### Save Configuration

```bash
# Save current PM2 process list
pm2 save

# Setup PM2 startup script
pm2 startup

# Disable startup
pm2 unstartup
```

---

## 📱 Applications

### 1. Proxy Server (Port 3000)
**Main entry point for all applications**

- Reverse proxy routing
- Load balancing
- SSL termination (if configured)
- Request logging

**Access**: `http://localhost:3000`

### 2. Dashboard (Port 1000)
**System monitoring and overview**

- Real-time metrics
- Process health status
- Resource usage graphs
- Quick actions

**Access**: `http://localhost:3000/dashboard` or `http://localhost:1000`

### 3. Homecare System (Ports 1001, 2001)
**Healthcare management platform**

**Frontend (1001):**
- React + Vite
- Patient registration
- Appointment scheduling
- Medical records
- Air maintenance tracking
- Water tank management

**Backend (2001):**
- Express.js API
- PostgreSQL database
- RESTful endpoints
- Authentication

**Access**: 
- Dev: `http://localhost:1001`
- Prod: `http://localhost:3000/homecare/`

### 4. Repair System (Port 1002)
**Maintenance request and feedback system**

- Next.js 14 (App Router)
- TypeScript
- Maintenance request submission
- Asset management
- Feedback collection
- LINE notification integration
- Excel reporting

**Access**: `http://localhost:1002`

### 5. AutoPO System (Port 1003)
**Purchase order automation**

- OCR document processing
- Automated PO generation
- Inventory tracking
- Approval workflows

**Access**: `http://localhost:1003`

### 6. YC Sales CRM (Port 1004)
**Customer relationship management**

- Customer database
- Sales tracking
- Daily reports
- Check-in system
- Expense tracking
- Mileage logging

**Access**: 
- Dev: `http://localhost:1004`
- Prod: `http://localhost:3000/ycsalescrm/`

---

## 🔌 Port Management

Comprehensive port documentation available in [`chackilstPORT.md`](chackilstPORT.md)

### Port Summary

| Port | Service | Status |
|------|---------|--------|
| 3000 | Proxy Server | 🟢 Active |
| 1000 | Dashboard | 🟢 Active |
| 1001 | Homecare Frontend | 🟢 Active |
| 1002 | Repair Frontend | 🟢 Active |
| 1003 | AutoPO Backend | 🟢 Active |
| 1004 | CRM Frontend | 🟢 Active |
| 2001 | Homecare Backend | 🟢 Active |
| 5432 | PostgreSQL | 🟢 Active |

### Check Port Usage

```bash
# Windows
netstat -ano | findstr "3000 1000 1001 1002 1003 1004 2001 5432"

# Linux/Mac
lsof -i :3000
netstat -tulpn | grep -E '3000|1000|1001|1002|1003|1004|2001|5432'
```

---

## 🚢 Deployment

### Production Deployment

1. **Build Frontend Applications**

```bash
# Homecare
cd app/homecare
npm run build

# Repair System
cd app/react-tsx-repair-system
npm run build

# CRM
cd app/ycsalescrm
npm run build
```

2. **Use Production Ecosystem**

```bash
pm2 start ecosystem.prod.js
```

3. **Configure Reverse Proxy**

Update proxy configuration for production domains and SSL.

4. **Setup PM2 Startup**

```bash
pm2 startup
pm2 save
```

### Docker Deployment (Optional)

```dockerfile
# Example Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY . .

RUN npm install
RUN pm2 install pm2-logrotate

CMD ["pm2-runtime", "ecosystem.config.js"]
```

---

## 📊 Monitoring

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Web-based monitoring (pm2 plus)
pm2 link <secret_key> <public_key>

# Status check
pm2 status

# Resource usage
pm2 describe <app-name>
```

### Log Management

```bash
# View all logs
pm2 logs

# View app-specific logs
pm2 logs homecare-frontend

# Clear logs
pm2 flush

# Rotate logs (install module)
pm2 install pm2-logrotate
```

### Health Checks

```bash
# Check if apps are running
pm2 list

# Check app details
pm2 describe homecare-backend

# Check memory usage
pm2 monit
```

---

## 🔧 Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port
netstat -ano | findstr :3000

# Kill process (Windows)
taskkill /PID <process_id> /F

# Kill process (Linux/Mac)
kill -9 <process_id>
```

#### Database Connection Issues

```bash
# Check PostgreSQL status
# Windows
sc query postgresql-x64-14

# Linux
systemctl status postgresql

# Test connection
psql -U postgres -h localhost -p 5432
```

#### Application Won't Start

```bash
# Check logs
pm2 logs <app-name> --lines 50

# Try starting manually
cd app/<app-directory>
node <script-name>

# Clear PM2 cache
pm2 delete all
pm2 kill
pm2 start ecosystem.config.js
```

#### Memory Issues

```bash
# Increase memory limit in ecosystem.config.js
max_memory_restart: "1G"

# Or restart app
pm2 restart <app-name>
```

### Debug Mode

```bash
# Start with debug output
DEBUG=* pm2 start ecosystem.config.js

# View detailed logs
pm2 logs --lines 100
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Write meaningful commit messages
- Update documentation
- Test thoroughly before submitting

---

## 📝 Project Structure

```
pm2_Suacess_Mark1/
├── app/
│   ├── AutoPO/              # Purchase order automation
│   ├── homecare/            # Healthcare management system
│   ├── react-tsx-repair-system/  # Maintenance system
│   └── ycsalescrm/          # Sales CRM
├── dashboard/               # System dashboard
├── proxy/                   # Reverse proxy server
├── logs/                    # Application logs
├── ssl/                     # SSL certificates (if any)
├── ecosystem.config.js      # PM2 configuration
├── ecosystem.prod.js        # Production PM2 config
├── package.json             # Root dependencies
├── chackilstPORT.md        # Port documentation
└── README.md               # This file
```

---

## 📄 License

This project is licensed under the ISC License.

---

## 👥 Team

- **Project Lead**: [Your Name]
- **Contributors**: [List contributors]

---

## 📞 Support

For issues and questions:

- 📧 Email: [your-email@example.com]
- 🐛 Issues: [GitHub Issues](link-to-issues)
- 📖 Documentation: [Wiki](link-to-wiki)

---

## 🙏 Acknowledgments

- PM2 for process management
- All open-source libraries used in this project
- Contributors and maintainers

---

<div align="center">

**[⬆ Back to Top](#-pm2-multi-application-management-system)**

Made with ❤️ by [Your Team Name]

</div>
