const bcrypt = require('bcryptjs');
const db = require('./database');

function seed() {
  console.log('Seeding database...');

  // Departments
  const departments = [
    { name: 'Technical (Site)', section: 'onsite', description: 'On-site technical operations team' },
    { name: 'Operational (Site)', section: 'onsite', description: 'On-site operational management team' },
    { name: 'Technical Design Team', section: 'inhouse', description: 'In-house technical design and architecture' },
    { name: 'Creative Studio', section: 'inhouse', description: 'Creative production and visual design' },
    { name: 'Creative Content Studio', section: 'inhouse', description: 'Content creation and media production' },
    { name: 'Procurement Team', section: 'inhouse', description: 'Procurement and vendor management' },
    { name: 'Events Team', section: 'inhouse', description: 'Event planning and coordination' },
    { name: 'Business Development Team', section: 'inhouse', description: 'Sales and business growth' },
    { name: 'HR Team', section: 'inhouse', description: 'Human resources and talent management' },
    { name: 'Finance & Admin Team', section: 'inhouse', description: 'Finance, accounting, and administration' },
  ];

  const insertDept = db.prepare(`
    INSERT OR IGNORE INTO departments (name, section, description) VALUES (?, ?, ?)
  `);

  departments.forEach(d => insertDept.run(d.name, d.section, d.description));
  console.log('Departments seeded');

  // Get department IDs
  const deptMap = {};
  db.prepare('SELECT id, name FROM departments').all().forEach(d => {
    deptMap[d.name] = d.id;
  });

  // Users
  const password = bcrypt.hashSync('password123', 10);

  const users = [
    // Super Admin (CEO)
    { name: 'Ahmed Al-Rashid', email: 'ceo@company.com', password, role: 'super_admin', department_id: null, section: 'inhouse', position: 'CEO' },

    // Managers
    { name: 'Sara Hassan', email: 'sara@company.com', password, role: 'manager', department_id: deptMap['HR Team'], section: 'inhouse', position: 'HR Manager' },
    { name: 'Omar Khalil', email: 'omar@company.com', password, role: 'manager', department_id: deptMap['Technical Design Team'], section: 'inhouse', position: 'Technical Design Manager' },
    { name: 'Fatima Al-Zahra', email: 'fatima@company.com', password, role: 'manager', department_id: deptMap['Events Team'], section: 'inhouse', position: 'Events Manager' },
    { name: 'Khalid Mansour', email: 'khalid@company.com', password, role: 'manager', department_id: deptMap['Technical (Site)'], section: 'onsite', position: 'Site Technical Manager' },
    { name: 'Nadia Farooq', email: 'nadia@company.com', password, role: 'manager', department_id: deptMap['Business Development Team'], section: 'inhouse', position: 'BD Manager' },
    { name: 'Tariq Bilal', email: 'tariq@company.com', password, role: 'manager', department_id: deptMap['Finance & Admin Team'], section: 'inhouse', position: 'Finance Manager' },

    // Employees - HR Team
    { name: 'Layla Nasser', email: 'layla@company.com', password, role: 'employee', department_id: deptMap['HR Team'], section: 'inhouse', position: 'HR Officer' },
    { name: 'Reem Saleh', email: 'reem@company.com', password, role: 'employee', department_id: deptMap['HR Team'], section: 'inhouse', position: 'Recruiter' },

    // Employees - Technical Design
    { name: 'Hassan Iqbal', email: 'hassan@company.com', password, role: 'employee', department_id: deptMap['Technical Design Team'], section: 'inhouse', position: 'UI/UX Designer' },
    { name: 'Maryam Siddiqui', email: 'maryam@company.com', password, role: 'employee', department_id: deptMap['Technical Design Team'], section: 'inhouse', position: 'Graphic Designer' },
    { name: 'Zaid Al-Amin', email: 'zaid@company.com', password, role: 'employee', department_id: deptMap['Technical Design Team'], section: 'inhouse', position: 'Web Developer' },

    // Employees - Creative Studio
    { name: 'Aisha Karimi', email: 'aisha@company.com', password, role: 'employee', department_id: deptMap['Creative Studio'], section: 'inhouse', position: 'Creative Director' },
    { name: 'Yousef Al-Makki', email: 'yousef@company.com', password, role: 'employee', department_id: deptMap['Creative Studio'], section: 'inhouse', position: 'Video Editor' },

    // Employees - Creative Content Studio
    { name: 'Noura Al-Sabah', email: 'noura@company.com', password, role: 'employee', department_id: deptMap['Creative Content Studio'], section: 'inhouse', position: 'Content Writer' },
    { name: 'Faisal Qureshi', email: 'faisal@company.com', password, role: 'employee', department_id: deptMap['Creative Content Studio'], section: 'inhouse', position: 'Social Media Manager' },

    // Employees - Events Team
    { name: 'Dina Youssef', email: 'dina@company.com', password, role: 'employee', department_id: deptMap['Events Team'], section: 'inhouse', position: 'Event Coordinator' },
    { name: 'Samir Haddad', email: 'samir@company.com', password, role: 'employee', department_id: deptMap['Events Team'], section: 'inhouse', position: 'Logistics Officer' },

    // Employees - Technical (Site)
    { name: 'Bilal Chaudhry', email: 'bilal@company.com', password, role: 'employee', department_id: deptMap['Technical (Site)'], section: 'onsite', position: 'Site Engineer' },
    { name: 'Marwan Al-Faisal', email: 'marwan@company.com', password, role: 'employee', department_id: deptMap['Technical (Site)'], section: 'onsite', position: 'Technical Supervisor' },

    // Employees - Operational (Site)
    { name: 'Sana Malik', email: 'sana@company.com', password, role: 'employee', department_id: deptMap['Operational (Site)'], section: 'onsite', position: 'Operations Officer' },
    { name: 'Imran Shaikh', email: 'imran@company.com', password, role: 'employee', department_id: deptMap['Operational (Site)'], section: 'onsite', position: 'Site Coordinator' },

    // Employees - Procurement
    { name: 'Hana Al-Jaber', email: 'hana@company.com', password, role: 'employee', department_id: deptMap['Procurement Team'], section: 'inhouse', position: 'Procurement Officer' },
    { name: 'Rami Aziz', email: 'rami@company.com', password, role: 'employee', department_id: deptMap['Procurement Team'], section: 'inhouse', position: 'Vendor Relations' },

    // Employees - Business Development
    { name: 'Lena Mahmoud', email: 'lena@company.com', password, role: 'employee', department_id: deptMap['Business Development Team'], section: 'inhouse', position: 'Sales Executive' },
    { name: 'Adam Hassan', email: 'adam@company.com', password, role: 'employee', department_id: deptMap['Business Development Team'], section: 'inhouse', position: 'Business Analyst' },

    // Employees - Finance & Admin
    { name: 'Rana Farhat', email: 'rana@company.com', password, role: 'employee', department_id: deptMap['Finance & Admin Team'], section: 'inhouse', position: 'Accountant' },
    { name: 'Jad Moussa', email: 'jad@company.com', password, role: 'employee', department_id: deptMap['Finance & Admin Team'], section: 'inhouse', position: 'Admin Officer' },
  ];

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (name, email, password, role, department_id, section, position)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  users.forEach(u => {
    insertUser.run(u.name, u.email, u.password, u.role, u.department_id, u.section, u.position);
  });
  console.log('Users seeded');

  // Update department managers
  const setManager = db.prepare('UPDATE departments SET manager_id = (SELECT id FROM users WHERE email = ? LIMIT 1) WHERE name = ?');
  setManager.run('sara@company.com', 'HR Team');
  setManager.run('omar@company.com', 'Technical Design Team');
  setManager.run('fatima@company.com', 'Events Team');
  setManager.run('khalid@company.com', 'Technical (Site)');
  setManager.run('nadia@company.com', 'Business Development Team');
  setManager.run('tariq@company.com', 'Finance & Admin Team');

  // Seed attendance for last 30 days
  const allUsers = db.prepare('SELECT id FROM users WHERE role = "employee"').all();
  const insertAttendance = db.prepare(`
    INSERT OR IGNORE INTO attendance (user_id, date, punch_in, punch_out, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    // Skip weekends
    if (dayOfWeek === 5 || dayOfWeek === 6) continue;

    allUsers.forEach(user => {
      const rand = Math.random();
      let status, punchIn, punchOut;

      if (rand < 0.05) {
        status = 'absent';
        punchIn = null;
        punchOut = null;
      } else if (rand < 0.15) {
        status = 'late';
        punchIn = `${dateStr}T09:${String(Math.floor(Math.random() * 30) + 15).padStart(2,'0')}:00`;
        punchOut = `${dateStr}T18:${String(Math.floor(Math.random() * 30)).padStart(2,'0')}:00`;
      } else if (rand < 0.20) {
        status = 'half_day';
        punchIn = `${dateStr}T09:00:00`;
        punchOut = `${dateStr}T13:${String(Math.floor(Math.random() * 30)).padStart(2,'0')}:00`;
      } else {
        status = 'present';
        punchIn = `${dateStr}T0${Math.floor(Math.random() * 2) + 8}:${String(Math.floor(Math.random() * 30)).padStart(2,'0')}:00`;
        punchOut = `${dateStr}T1${Math.floor(Math.random() * 2) + 7}:${String(Math.floor(Math.random() * 30)).padStart(2,'0')}:00`;
      }

      insertAttendance.run(user.id, dateStr, punchIn, punchOut, status);
    });
  }
  console.log('Attendance seeded');

  // Seed tasks
  const allUsersList = db.prepare('SELECT id, department_id FROM users WHERE role != "super_admin"').all();
  const taskTitles = [
    'Design new landing page mockups',
    'Review vendor contracts',
    'Prepare monthly financial report',
    'Coordinate event logistics for Q2',
    'Update employee onboarding documents',
    'Fix site technical issues',
    'Create social media content calendar',
    'Conduct supplier evaluation',
    'Develop business proposal for new client',
    'Implement security updates on-site',
    'Prepare HR policy documentation',
    'Design event branding materials',
    'Review procurement budget allocation',
    'Train new team members',
    'Compile weekly performance reports',
    'Develop client presentation deck',
    'Coordinate with on-site technical team',
    'Review and approve creative concepts',
    'Prepare quarterly business review',
    'Audit attendance records',
  ];

  const priorities = ['low', 'medium', 'high', 'urgent'];
  const statuses = ['assigned', 'accepted', 'in_progress', 'completed', 'reviewed'];
  const ceoId = db.prepare('SELECT id FROM users WHERE role = "super_admin" LIMIT 1').get()?.id || 1;

  const insertTask = db.prepare(`
    INSERT INTO tasks (title, description, assigned_to, assigned_by, department_id, deadline, priority, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < 40; i++) {
    const user = allUsersList[Math.floor(Math.random() * allUsersList.length)];
    const title = taskTitles[Math.floor(Math.random() * taskTitles.length)];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    const daysOffset = Math.floor(Math.random() * 20) - 5;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + daysOffset);

    const createdDaysAgo = Math.floor(Math.random() * 20) + 1;
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - createdDaysAgo);

    insertTask.run(
      title,
      `This task requires attention and careful execution. Please review all requirements before starting.`,
      user.id,
      ceoId,
      user.department_id,
      deadline.toISOString(),
      priority,
      status,
      createdAt.toISOString()
    );
  }
  console.log('Tasks seeded');

  console.log('\n========================================');
  console.log('SEED COMPLETE! Login credentials:');
  console.log('========================================');
  console.log('CEO:      ceo@company.com    / password123');
  console.log('Manager:  sara@company.com   / password123');
  console.log('Employee: layla@company.com  / password123');
  console.log('========================================\n');
}

seed();
