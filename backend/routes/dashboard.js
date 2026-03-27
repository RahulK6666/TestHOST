const express = require('express');
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// CEO/Super Admin Dashboard
router.get('/ceo', authenticateToken, requireRole('super_admin'), (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  // Attendance overview today
  const attendanceToday = db.prepare(`
    SELECT
      COUNT(DISTINCT u.id) as total_employees,
      COUNT(CASE WHEN a.status IN ('present','late') AND a.punch_in IS NOT NULL THEN 1 END) as present,
      COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late,
      COUNT(CASE WHEN a.punch_in IS NULL OR a.id IS NULL THEN 1 END) as absent,
      COUNT(CASE WHEN a.punch_in IS NOT NULL AND a.punch_out IS NULL THEN 1 END) as currently_in
    FROM users u
    LEFT JOIN attendance a ON u.id = a.user_id AND a.date = ?
    WHERE u.role = 'employee' AND u.is_active = 1
  `).get(today);

  // Task overview
  const taskStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'assigned' THEN 1 END) as pending,
      COUNT(CASE WHEN status IN ('accepted','in_progress') THEN 1 END) as in_progress,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'reviewed' THEN 1 END) as reviewed,
      COUNT(CASE WHEN deadline < datetime('now') AND status NOT IN ('completed','reviewed') THEN 1 END) as overdue,
      COUNT(CASE WHEN priority = 'urgent' AND status NOT IN ('completed','reviewed') THEN 1 END) as urgent
    FROM tasks
  `).get();

  // Total employees by role
  const employeeStats = db.prepare(`
    SELECT role, COUNT(*) as count, is_active
    FROM users GROUP BY role, is_active
  `).all();

  // Department performance
  const deptPerformance = db.prepare(`
    SELECT d.id, d.name, d.section,
      COUNT(DISTINCT u.id) as total_employees,
      COUNT(DISTINCT CASE WHEN a.status IN ('present','late') AND a.date = ? THEN u.id END) as present_today,
      COUNT(DISTINCT t.id) as total_tasks,
      COUNT(DISTINCT CASE WHEN t.status IN ('completed','reviewed') THEN t.id END) as completed_tasks,
      COUNT(DISTINCT CASE WHEN t.deadline < datetime('now') AND t.status NOT IN ('completed','reviewed') THEN t.id END) as overdue_tasks
    FROM departments d
    LEFT JOIN users u ON u.department_id = d.id AND u.role = 'employee' AND u.is_active = 1
    LEFT JOIN attendance a ON a.user_id = u.id AND a.date = ?
    LEFT JOIN tasks t ON t.department_id = d.id
    GROUP BY d.id
    ORDER BY d.section, d.name
  `).all(today, today);

  // Attendance trend (last 14 days)
  const attendanceTrend = db.prepare(`
    SELECT a.date,
      COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
      COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late,
      COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent,
      COUNT(CASE WHEN a.status = 'half_day' THEN 1 END) as half_day
    FROM attendance a
    JOIN users u ON a.user_id = u.id
    WHERE a.date >= date('now', '-14 days') AND u.role = 'employee'
    GROUP BY a.date ORDER BY a.date
  `).all();

  // Task completion trend (last 14 days)
  const taskTrend = db.prepare(`
    SELECT date(updated_at) as date, COUNT(*) as count
    FROM tasks WHERE status IN ('completed','reviewed')
    AND updated_at >= datetime('now', '-14 days')
    GROUP BY date(updated_at) ORDER BY date
  `).all();

  // Top performers (by task completion rate, last 30 days)
  const topPerformers = db.prepare(`
    SELECT u.id, u.name, u.position, d.name as department_name,
      COUNT(CASE WHEN t.status IN ('completed','reviewed') THEN 1 END) as completed,
      COUNT(t.id) as total,
      ROUND(COUNT(CASE WHEN a.status IN ('present','late') THEN 1 END) * 100.0 /
            NULLIF(COUNT(DISTINCT a.date), 0), 1) as attendance_rate
    FROM users u
    LEFT JOIN tasks t ON t.assigned_to = u.id AND t.created_at >= datetime('now', '-30 days')
    LEFT JOIN attendance a ON a.user_id = u.id AND a.date >= date('now', '-30 days')
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.role = 'employee' AND u.is_active = 1
    GROUP BY u.id
    HAVING total > 0
    ORDER BY completed DESC, attendance_rate DESC
    LIMIT 10
  `).all();

  // Least active employees
  const leastActive = db.prepare(`
    SELECT u.id, u.name, u.position, d.name as department_name,
      COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
      COUNT(CASE WHEN t.status NOT IN ('completed','reviewed') AND t.deadline < datetime('now') THEN 1 END) as overdue_tasks
    FROM users u
    LEFT JOIN attendance a ON a.user_id = u.id AND a.date >= date('now', '-30 days')
    LEFT JOIN tasks t ON t.assigned_to = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.role = 'employee' AND u.is_active = 1
    GROUP BY u.id
    ORDER BY absent_days DESC, overdue_tasks DESC
    LIMIT 5
  `).all();

  // Overloaded employees (5+ pending tasks)
  const overloaded = db.prepare(`
    SELECT u.id, u.name, u.position, d.name as department_name,
      COUNT(t.id) as pending_tasks
    FROM users u
    JOIN tasks t ON t.assigned_to = u.id AND t.status NOT IN ('completed','reviewed')
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.role = 'employee' AND u.is_active = 1
    GROUP BY u.id HAVING pending_tasks >= 3
    ORDER BY pending_tasks DESC
    LIMIT 10
  `).all();

  // Recent activity
  const recentTasks = db.prepare(`
    SELECT t.id, t.title, t.status, t.priority, t.deadline, t.updated_at,
           u.name as assigned_to_name, d.name as department_name
    FROM tasks t JOIN users u ON t.assigned_to = u.id LEFT JOIN departments d ON t.department_id = d.id
    ORDER BY t.updated_at DESC LIMIT 10
  `).all();

  // Priority task breakdown
  const priorityBreakdown = db.prepare(`
    SELECT priority, status, COUNT(*) as count FROM tasks
    GROUP BY priority, status ORDER BY priority, status
  `).all();

  res.json({
    attendanceToday,
    taskStats,
    employeeStats,
    deptPerformance,
    attendanceTrend,
    taskTrend,
    topPerformers,
    leastActive,
    overloaded,
    recentTasks,
    priorityBreakdown,
  });
});

// Manager Dashboard
router.get('/manager', authenticateToken, requireRole('super_admin', 'manager'), (req, res) => {
  const deptId = req.user.role === 'manager' ? req.user.department_id : req.query.dept_id;
  const today = new Date().toISOString().split('T')[0];

  const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(deptId);

  const attendanceToday = db.prepare(`
    SELECT
      COUNT(DISTINCT u.id) as total,
      COUNT(CASE WHEN a.status IN ('present','late') AND a.punch_in IS NOT NULL THEN 1 END) as present,
      COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late,
      COUNT(CASE WHEN a.status = 'absent' OR a.id IS NULL THEN 1 END) as absent
    FROM users u
    LEFT JOIN attendance a ON u.id = a.user_id AND a.date = ?
    WHERE u.department_id = ? AND u.role = 'employee' AND u.is_active = 1
  `).get(today, deptId);

  const taskStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'assigned' THEN 1 END) as pending,
      COUNT(CASE WHEN status IN ('accepted','in_progress') THEN 1 END) as in_progress,
      COUNT(CASE WHEN status IN ('completed','reviewed') THEN 1 END) as completed,
      COUNT(CASE WHEN deadline < datetime('now') AND status NOT IN ('completed','reviewed') THEN 1 END) as overdue
    FROM tasks WHERE department_id = ?
  `).get(deptId);

  const teamMembers = db.prepare(`
    SELECT u.id, u.name, u.position,
      COUNT(CASE WHEN a.status IN ('present','late') AND a.date = ? THEN 1 END) as present_today,
      COUNT(CASE WHEN t.status NOT IN ('completed','reviewed') THEN 1 END) as pending_tasks,
      COUNT(CASE WHEN t.deadline < datetime('now') AND t.status NOT IN ('completed','reviewed') THEN 1 END) as overdue_tasks
    FROM users u
    LEFT JOIN attendance a ON a.user_id = u.id AND a.date = ?
    LEFT JOIN tasks t ON t.assigned_to = u.id
    WHERE u.department_id = ? AND u.role = 'employee' AND u.is_active = 1
    GROUP BY u.id ORDER BY u.name
  `).all(today, today, deptId);

  const attendanceTrend = db.prepare(`
    SELECT a.date,
      COUNT(CASE WHEN a.status IN ('present','late') THEN 1 END) as present,
      COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent
    FROM attendance a JOIN users u ON a.user_id = u.id
    WHERE u.department_id = ? AND a.date >= date('now', '-14 days')
    GROUP BY a.date ORDER BY a.date
  `).all(deptId);

  res.json({ dept, attendanceToday, taskStats, teamMembers, attendanceTrend });
});

// Employee Dashboard
router.get('/employee', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];

  const todayAttendance = db.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?').get(userId, today);

  const taskStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
      COUNT(CASE WHEN status IN ('completed','reviewed') THEN 1 END) as completed,
      COUNT(CASE WHEN deadline < datetime('now') AND status NOT IN ('completed','reviewed') THEN 1 END) as overdue
    FROM tasks WHERE assigned_to = ?
  `).get(userId);

  const upcomingTasks = db.prepare(`
    SELECT t.*, d.name as department_name
    FROM tasks t LEFT JOIN departments d ON t.department_id = d.id
    WHERE t.assigned_to = ? AND t.status NOT IN ('completed','reviewed')
    ORDER BY t.deadline ASC LIMIT 5
  `).all(userId);

  const recentAttendance = db.prepare(`
    SELECT * FROM attendance WHERE user_id = ?
    ORDER BY date DESC LIMIT 14
  `).all(userId);

  const attendanceSummary = db.prepare(`
    SELECT
      COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
      COUNT(CASE WHEN status = 'late' THEN 1 END) as late,
      COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
      COUNT(CASE WHEN status = 'half_day' THEN 1 END) as half_day
    FROM attendance WHERE user_id = ? AND date >= date('now', '-30 days')
  `).get(userId);

  const notifications = db.prepare(`
    SELECT * FROM notifications WHERE user_id = ? AND is_read = 0
    ORDER BY created_at DESC LIMIT 10
  `).all(userId);

  res.json({ todayAttendance, taskStats, upcomingTasks, recentAttendance, attendanceSummary, notifications });
});

// Notifications
router.get('/notifications', authenticateToken, (req, res) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 50
  `).all(req.user.id);
  res.json(notifications);
});

router.patch('/notifications/:id/read', authenticateToken, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Marked as read' });
});

router.patch('/notifications/read-all', authenticateToken, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ message: 'All marked as read' });
});

module.exports = router;
