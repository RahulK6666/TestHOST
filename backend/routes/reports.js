const express = require('express');
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Attendance report
router.get('/attendance', authenticateToken, requireRole('super_admin', 'manager'), (req, res) => {
  const { start_date, end_date, department_id } = req.query;
  const start = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = end_date || new Date().toISOString().split('T')[0];

  let deptFilter = '';
  const params = [start, end];

  if (req.user.role === 'manager') {
    deptFilter = ' AND u.department_id = ?'; params.push(req.user.department_id);
  } else if (department_id) {
    deptFilter = ' AND u.department_id = ?'; params.push(department_id);
  }

  const report = db.prepare(`
    SELECT u.id, u.name, u.position, d.name as department_name, d.section,
      COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
      COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_days,
      COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
      COUNT(CASE WHEN a.status = 'half_day' THEN 1 END) as half_days,
      COUNT(a.id) as total_records,
      ROUND(AVG(CASE WHEN a.punch_in IS NOT NULL AND a.punch_out IS NOT NULL
        THEN (julianday(a.punch_out) - julianday(a.punch_in)) * 24 END), 2) as avg_hours
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN attendance a ON a.user_id = u.id AND a.date >= ? AND a.date <= ?
    WHERE u.role = 'employee' AND u.is_active = 1${deptFilter}
    GROUP BY u.id ORDER BY d.name, u.name
  `).all(...params);

  res.json({ report, period: { start, end } });
});

// Task report
router.get('/tasks', authenticateToken, requireRole('super_admin', 'manager'), (req, res) => {
  const { start_date, end_date, department_id } = req.query;
  const start = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = end_date || new Date().toISOString().split('T')[0];

  let deptFilter = '';
  const params = [start, end];

  if (req.user.role === 'manager') {
    deptFilter = 'AND t.department_id = ?'; params.push(req.user.department_id);
  } else if (department_id) {
    deptFilter = 'AND t.department_id = ?'; params.push(department_id);
  }

  const byEmployee = db.prepare(`
    SELECT u.id, u.name, u.position, d.name as department_name,
      COUNT(t.id) as total_tasks,
      COUNT(CASE WHEN t.status IN ('completed','reviewed') THEN 1 END) as completed,
      COUNT(CASE WHEN t.status NOT IN ('completed','reviewed') THEN 1 END) as pending,
      COUNT(CASE WHEN t.deadline < datetime('now') AND t.status NOT IN ('completed','reviewed') THEN 1 END) as overdue,
      COUNT(CASE WHEN t.priority = 'urgent' THEN 1 END) as urgent_count,
      ROUND(COUNT(CASE WHEN t.status IN ('completed','reviewed') THEN 1 END) * 100.0 / NULLIF(COUNT(t.id), 0), 1) as completion_rate
    FROM users u
    LEFT JOIN tasks t ON t.assigned_to = u.id AND t.created_at >= ? AND t.created_at <= ?
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.role = 'employee' AND u.is_active = 1 ${deptFilter}
    GROUP BY u.id ORDER BY completion_rate DESC
  `).all(...params);

  const byDepartment = db.prepare(`
    SELECT d.id, d.name, d.section,
      COUNT(t.id) as total_tasks,
      COUNT(CASE WHEN t.status IN ('completed','reviewed') THEN 1 END) as completed,
      COUNT(CASE WHEN t.deadline < datetime('now') AND t.status NOT IN ('completed','reviewed') THEN 1 END) as overdue
    FROM departments d
    LEFT JOIN tasks t ON t.department_id = d.id AND t.created_at >= ? AND t.created_at <= ?
    GROUP BY d.id ORDER BY d.section, d.name
  `).all(start, end);

  res.json({ byEmployee, byDepartment, period: { start, end } });
});

// Performance report
router.get('/performance', authenticateToken, requireRole('super_admin', 'manager'), (req, res) => {
  const { start_date, end_date } = req.query;
  const start = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = end_date || new Date().toISOString().split('T')[0];

  let deptFilter = '';
  const params = [start, end, start, end];
  if (req.user.role === 'manager') {
    deptFilter = 'AND u.department_id = ?'; params.push(req.user.department_id);
  }

  const performance = db.prepare(`
    SELECT u.id, u.name, u.position, d.name as department_name,
      COUNT(DISTINCT a.date) as days_tracked,
      COUNT(CASE WHEN a.status IN ('present','late') THEN 1 END) as days_present,
      COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as days_absent,
      ROUND(COUNT(CASE WHEN a.status IN ('present','late') THEN 1 END) * 100.0 / NULLIF(COUNT(DISTINCT a.date), 0), 1) as attendance_rate,
      COUNT(t.id) as total_tasks,
      COUNT(CASE WHEN t.status IN ('completed','reviewed') THEN 1 END) as completed_tasks,
      ROUND(COUNT(CASE WHEN t.status IN ('completed','reviewed') THEN 1 END) * 100.0 / NULLIF(COUNT(t.id), 0), 1) as task_completion_rate,
      COUNT(CASE WHEN t.deadline < datetime('now') AND t.status NOT IN ('completed','reviewed') THEN 1 END) as overdue_tasks
    FROM users u
    LEFT JOIN attendance a ON a.user_id = u.id AND a.date >= ? AND a.date <= ?
    LEFT JOIN tasks t ON t.assigned_to = u.id AND t.created_at >= ? AND t.created_at <= ?
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.role = 'employee' AND u.is_active = 1 ${deptFilter}
    GROUP BY u.id
    ORDER BY task_completion_rate DESC, attendance_rate DESC
  `).all(...params);

  // Calculate efficiency score (50% attendance + 50% task completion)
  const withScore = performance.map(emp => ({
    ...emp,
    efficiency_score: Math.round(
      ((emp.attendance_rate || 0) * 0.4 + (emp.task_completion_rate || 0) * 0.6)
    )
  }));

  res.json({ performance: withScore, period: { start, end } });
});

module.exports = router;
