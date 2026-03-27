const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all employees (admin/manager)
router.get('/', authenticateToken, (req, res) => {
  let query = `
    SELECT u.id, u.name, u.email, u.role, u.department_id, u.section, u.position, u.phone, u.is_active, u.created_at,
           d.name as department_name, d.section as dept_section
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role === 'manager') {
    query += ' AND u.department_id = ?';
    params.push(req.user.department_id);
  }

  const { department, section, role, search, active } = req.query;
  if (department) { query += ' AND u.department_id = ?'; params.push(department); }
  if (section) { query += ' AND u.section = ?'; params.push(section); }
  if (role) { query += ' AND u.role = ?'; params.push(role); }
  if (active !== undefined) { query += ' AND u.is_active = ?'; params.push(active === 'true' ? 1 : 0); }
  if (search) {
    query += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.position LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY u.name ASC';
  const employees = db.prepare(query).all(...params);
  res.json(employees);
});

// Get single employee
router.get('/:id', authenticateToken, (req, res) => {
  const employee = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.department_id, u.section, u.position, u.phone, u.is_active, u.created_at,
           d.name as department_name, d.section as dept_section
    FROM users u LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.id = ?
  `).get(req.params.id);

  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  // Managers can only see their department
  if (req.user.role === 'manager' && employee.department_id !== req.user.department_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Attendance summary
  const attendance = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM attendance WHERE user_id = ?
    AND date >= date('now', '-30 days')
    GROUP BY status
  `).all(req.params.id);

  // Task summary
  const tasks = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM tasks WHERE assigned_to = ?
    GROUP BY status
  `).all(req.params.id);

  res.json({ ...employee, attendanceSummary: attendance, taskSummary: tasks });
});

// Create employee (admin only)
router.post('/', authenticateToken, requireRole('super_admin', 'manager'), (req, res) => {
  const { name, email, password, role, department_id, section, position, phone } = req.body;

  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  // Managers can only create employees in their dept
  if (req.user.role === 'manager' && role !== 'employee') {
    return res.status(403).json({ error: 'Managers can only create employees' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) return res.status(400).json({ error: 'Email already exists' });

  const hashed = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (name, email, password, role, department_id, section, position, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, email.toLowerCase().trim(), hashed, role || 'employee', department_id, section, position, phone);

  const newUser = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.department_id, u.section, u.position, u.phone,
           d.name as department_name
    FROM users u LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(newUser);
});

// Update employee (admin or manager)
router.put('/:id', authenticateToken, requireRole('super_admin', 'manager'), (req, res) => {
  const { name, email, role, department_id, section, position, phone, is_active } = req.body;

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Employee not found' });

  if (req.user.role === 'manager' && existing.department_id !== req.user.department_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.prepare(`
    UPDATE users SET name=?, email=?, role=?, department_id=?, section=?, position=?, phone=?, is_active=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(
    name || existing.name,
    email || existing.email,
    role || existing.role,
    department_id !== undefined ? department_id : existing.department_id,
    section || existing.section,
    position || existing.position,
    phone || existing.phone,
    is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
    req.params.id
  );

  const updated = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.department_id, u.section, u.position, u.phone, u.is_active,
           d.name as department_name
    FROM users u LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.id = ?
  `).get(req.params.id);

  res.json(updated);
});

// Reset password (admin only)
router.put('/:id/reset-password', authenticateToken, requireRole('super_admin'), (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const hashed = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashed, req.params.id);
  res.json({ message: 'Password reset successfully' });
});

// Deactivate/activate employee
router.patch('/:id/status', authenticateToken, requireRole('super_admin'), (req, res) => {
  const { is_active } = req.body;
  db.prepare('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(is_active ? 1 : 0, req.params.id);
  res.json({ message: `Employee ${is_active ? 'activated' : 'deactivated'}` });
});

module.exports = router;
