const express = require('express');
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all departments
router.get('/', authenticateToken, (req, res) => {
  const { section } = req.query;
  let query = `
    SELECT d.*, u.name as manager_name, u.email as manager_email,
           COUNT(DISTINCT emp.id) as employee_count
    FROM departments d
    LEFT JOIN users u ON d.manager_id = u.id
    LEFT JOIN users emp ON emp.department_id = d.id AND emp.role = 'employee' AND emp.is_active = 1
    WHERE 1=1
  `;
  const params = [];
  if (section) { query += ' AND d.section = ?'; params.push(section); }
  query += ' GROUP BY d.id ORDER BY d.section, d.name';

  res.json(db.prepare(query).all(...params));
});

// Get department by ID
router.get('/:id', authenticateToken, (req, res) => {
  const dept = db.prepare(`
    SELECT d.*, u.name as manager_name, u.email as manager_email
    FROM departments d LEFT JOIN users u ON d.manager_id = u.id
    WHERE d.id = ?
  `).get(req.params.id);

  if (!dept) return res.status(404).json({ error: 'Department not found' });

  const employees = db.prepare(`
    SELECT id, name, email, role, position, section, is_active
    FROM users WHERE department_id = ? AND is_active = 1
    ORDER BY name
  `).all(req.params.id);

  const taskStats = db.prepare(`
    SELECT status, COUNT(*) as count FROM tasks WHERE department_id = ? GROUP BY status
  `).all(req.params.id);

  const today = new Date().toISOString().split('T')[0];
  const attendanceToday = db.prepare(`
    SELECT COUNT(CASE WHEN a.status IN ('present','late') AND a.punch_in IS NOT NULL THEN 1 END) as present,
           COUNT(u.id) as total
    FROM users u LEFT JOIN attendance a ON u.id = a.user_id AND a.date = ?
    WHERE u.department_id = ? AND u.role = 'employee' AND u.is_active = 1
  `).get(today, req.params.id);

  res.json({ ...dept, employees, taskStats, attendanceToday });
});

// Create department
router.post('/', authenticateToken, requireRole('super_admin'), (req, res) => {
  const { name, section, description, manager_id } = req.body;
  if (!name || !section) return res.status(400).json({ error: 'Name and section required' });

  const result = db.prepare('INSERT INTO departments (name, section, description, manager_id) VALUES (?, ?, ?, ?)')
    .run(name, section, description, manager_id || null);

  res.status(201).json(db.prepare('SELECT * FROM departments WHERE id = ?').get(result.lastInsertRowid));
});

// Update department
router.put('/:id', authenticateToken, requireRole('super_admin'), (req, res) => {
  const { name, section, description, manager_id } = req.body;
  const existing = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Department not found' });

  db.prepare('UPDATE departments SET name=?, section=?, description=?, manager_id=? WHERE id=?')
    .run(name || existing.name, section || existing.section, description || existing.description, manager_id ?? existing.manager_id, req.params.id);

  res.json(db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id));
});

// Delete department
router.delete('/:id', authenticateToken, requireRole('super_admin'), (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as count FROM users WHERE department_id = ?').get(req.params.id);
  if (count.count > 0) return res.status(400).json({ error: 'Cannot delete department with employees' });
  db.prepare('DELETE FROM departments WHERE id = ?').run(req.params.id);
  res.json({ message: 'Department deleted' });
});

module.exports = router;
