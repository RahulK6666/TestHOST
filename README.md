# 🏢 Employee Management System (EMS)

A complete, production-ready employee management platform built for companies with ~150 employees.

## 🚀 Quick Start

### Windows (Recommended)
```
Double-click: start.bat
```

### Manual Setup
```bash
# Backend
cd backend
npm install
npm run seed      # Populate demo data (run once)
npm run dev       # Starts on http://localhost:5000

# Frontend (new terminal)
cd frontend
npm install
npm run dev       # Starts on http://localhost:3000
```

Open **http://localhost:3000** in your browser.

---

## 🔐 Login Credentials

| Role | Email | Password |
|------|-------|----------|
| CEO / Super Admin | ceo@company.com | password123 |
| Manager (HR) | sara@company.com | password123 |
| Employee | layla@company.com | password123 |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Backend | Node.js, Express.js |
| Database | SQLite (via better-sqlite3) |
| Auth | JWT (JSON Web Tokens) |
| Real-time | Socket.io |
| Charts | Recharts |

---

## 📋 Features

### ⏱️ Attendance System
- Daily punch in / punch out with timestamps
- Automatic late detection (after 9:15 AM)
- Half-day detection (< 4 hours worked)
- Department-wise attendance overview
- Admin attendance override
- 30-day history with filters

### 📋 Task Management
- Kanban board + list view
- Task flow: Assigned → Accepted → In Progress → Completed → Reviewed
- Mandatory deadline enforcement
- Priority levels: Low / Medium / High / Urgent
- Task comments/chat
- Overdue task highlighting
- Recurring tasks support

### 📊 CEO Dashboard
- Real-time KPI metrics
- Department performance breakdown
- Attendance trend charts (14 days)
- Task completion trend charts
- Top performers leaderboard
- Needs attention list
- Overloaded employees alert
- Recent task activity feed

### 👥 Employee Management
- Full CRUD for employees
- Role-based access (CEO/Manager/Employee)
- Department & section assignment
- Employee profile with attendance + task summary
- Activate/deactivate employees

### 🏢 Department Management
- 10 departments pre-configured
- On-site & in-house sections
- Department detail with team roster
- Manager assignment

### 📈 Reports (Downloadable CSV)
- Performance report (efficiency score = 40% attendance + 60% task completion)
- Attendance report (present/late/absent/half-day)
- Task completion report (by employee & department)
- Date range + department filters

### 📅 Calendar
- Task deadlines visualized on a calendar
- Click any day to see all tasks due
- Color-coded by priority/overdue status
- Department filter

### 🔔 Notifications
- Task assignment alerts
- Read/unread management
- Real-time via Socket.io

---

## 🏢 Company Structure

### On-Site
- Technical (Site)
- Operational (Site)

### In-House
- Technical Design Team
- Creative Studio
- Creative Content Studio
- Procurement Team
- Events Team
- Business Development Team
- HR Team
- Finance & Admin Team

---

## 🔐 Role Permissions

| Feature | CEO | Manager | Employee |
|---------|-----|---------|----------|
| View all employees | ✅ | Own dept | ❌ |
| Create tasks | ✅ | Own dept | ❌ |
| CEO Dashboard | ✅ | ❌ | ❌ |
| Manager Dashboard | ✅ | ✅ | ❌ |
| Override attendance | ✅ | ✅ | ❌ |
| Reports | ✅ | Own dept | ❌ |
| Punch in/out | ✅ | ✅ | ✅ |
| View own tasks | ✅ | ✅ | ✅ |

---

## 📁 Project Structure

```
employee-management-system/
├── backend/
│   ├── db/
│   │   ├── database.js      # SQLite setup & schema
│   │   └── seed.js          # Demo data seeder
│   ├── middleware/
│   │   └── auth.js          # JWT authentication
│   ├── routes/
│   │   ├── auth.js          # Login, profile
│   │   ├── employees.js     # Employee CRUD
│   │   ├── attendance.js    # Punch in/out, history
│   │   ├── tasks.js         # Task management
│   │   ├── departments.js   # Department CRUD
│   │   ├── dashboard.js     # Dashboard data
│   │   └── reports.js       # Reports
│   ├── uploads/             # File attachments
│   ├── server.js            # Express + Socket.io
│   └── package.json
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Layout/      # Sidebar, Header, Layout
│       │   ├── Dashboard/   # CEO, Manager, Employee dashboards
│       │   └── common/      # Modal, StatCard, Avatar, Badge
│       ├── pages/           # All page components
│       ├── context/         # AuthContext
│       └── utils/           # API client, helpers
│
├── start.bat                # One-click Windows startup
└── README.md
```

---

## 🔮 Future Roadmap

- [ ] File attachments on tasks
- [ ] WhatsApp / Slack integration
- [ ] Biometric attendance (face recognition)
- [ ] Payroll module
- [ ] AI-based task suggestions
- [ ] Mobile app (React Native)
- [ ] Zoho / Tally integration
- [ ] Multi-company SaaS mode
