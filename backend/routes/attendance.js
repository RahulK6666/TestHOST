const express = require('express');
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const LATE_THRESHOLD_HOUR = 9;
const LATE_THRESHOLD_MINUTE = 15;

function getAttendanceStatus(punchInTime) {
  if (!punchInTime) return 'absent';
  const punchIn = new Date(punchInTime);
  const hour = punchIn.getHours();
  const minute = punchIn.getMinutes();
  if (hour > LATE_THRESHOLD_HOUR || (hour === LATE_THRESHOLD_HOUR && minute > LATE_THRESHOLD_MINUTE)) {
    return 'late';
  }
  return 'present';
}

// Get today's attendance for current user
router.get('/today', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const record = db.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?').get(req.user.id, today);
  res.json(record || null);
});

// Punch In
router.post('/punch-in', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const existing = db.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?').get(req.user.id, today);

  if (existing && existing.punch_in) {
    return res.status(400).json({ error: 'Already punched in today' });
  }

  const now = new Date().toISOString();
  const status = getAttendanceStatus(now);
  const { location } = req.body;

  if (existing) {
    db.prepare('UPDATE attendance SET punch_in = ?, status = ?, location = ? WHERE id = ?')
      .run(now, status, location, existing.id);
  } else {
    db.prepare('INSERT INTO attendance (user_id, date, punch_in, status, location) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, today, now, status, location);
  }

  const record = db.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?').get(req.user.id, today);
  res.json({ message: `Punched in successfully`, attendance: record, isLate: status === 'late' });
});

// Punch Out
router.post('/punch-out', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const existing = db.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?').get(req.user.id, today);

  if (!existing || !existing.punch_in) {
    return res.status(400).json({ error: 'You have not punched in today' });
  }
  if (existing.punch_out) {
    return res.status(400).json({ error: 'Already punched out today' });
  }

  const now = new Date().toISOString();
  const punchIn = new Date(existing.punch_in);
  const punchOut = new Date(now);
  const hoursWorked = (punchOut - punchIn) / (1000 * 60 * 60);

  let status = existing.status;
  if (hoursWorked < 4) status = 'half_day';

  db.prepare('UPDATE attendance SET punch_out = ?, status = ? WHERE id = ?')
    .run(now, status, existing.id);

  const record = db.prepare('SELECT * FROM attendance WHERE id = ?').get(existing.id);
  res.json({ message: 'Punched out successfully', attendance: record, hoursWorked: hoursWorked.toFixed(2) });
});

// Get attendance records (with filters)
router.get('/', authenticateToken, (req, res) => {
  const { user_id, department_id, date, start_date, end_date, status } = req.query;

  let query = `
    SELECT a.*, u.name as user_name, u.position, u.department_id,
           d.name as department_name, d.section
    FROM attendance a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE 1=1
  `;
  const params = [];

  // Role-based filter
  if (req.user.role === 'employee') {
    query += ' AND a.user_id = ?'; params.push(req.user.id);
  } else if (req.user.role === 'manager') {
    query += ' AND u.department_id = ?'; params.push(req.user.department_id);
  } else {
    if (user_id) { query += ' AND a.user_id = ?'; params.push(user_id); }
    if (department_id) { query += ' AND u.department_id = ?'; params.push(department_id); }
  }

  if (date) { query += ' AND a.date = ?'; params.push(date); }
  if (start_date) { query += ' AND a.date >= ?'; params.push(start_date); }
  if (end_date) { query += ' AND a.date <= ?'; params.push(end_date); }
  if (status) { query += ' AND a.status = ?'; params.push(status); }

  query += ' ORDER BY a.date DESC, u.name ASC';
  const records = db.prepare(query).all(...params);
  res.json(records);
});

// Get attendance summary for date range
router.get('/summary', authenticateToken, (req, res) => {
  const { start_date, end_date, user_id } = req.query;
  const today = new Date().toISOString().split('T')[0];
  const start = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = end_date || today;

  let whereUser = '';
  const params = [start, end];

  if (req.user.role === 'employee') {
    whereUser = ' AND a.user_id = ?'; params.push(req.user.id);
  } else if (req.user.role === 'manager') {
    whereUser = ' AND u.department_id = ?'; params.push(req.user.department_id);
  } else if (user_id) {
    whereUser = ' AND a.user_id = ?'; params.push(user_id);
  }

  const summary = db.prepare(`
    SELECT
      COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
      COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late,
      COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent,
      COUNT(CASE WHEN a.status = 'half_day' THEN 1 END) as half_day,
      COUNT(*) as total
    FROM attendance a
    JOIN users u ON a.user_id = u.id
    WHERE a.date >= ? AND a.date <= ?${whereUser}
  `).get(...params);

  res.json(summary);
});

// Today's overview (admin/manager)
router.get('/today-overview', authenticateToken, requireRole('super_admin', 'manager'), (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  let deptFilter = '';
  const params = [today];

  if (req.user.role === 'manager') {
    deptFilter = ' AND u.department_id = ?'; params.push(req.user.department_id);
  }

  const overview = db.prepare(`
    SELECT
      COUNT(DISTINCT u.id) as total_employees,
      COUNT(CASE WHEN a.status IN ('present', 'late') AND a.punch_in IS NOT NULL THEN 1 END) as present,
      COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late,
      COUNT(CASE WHEN a.status = 'absent' OR a.id IS NULL THEN 1 END) as absent,
      COUNT(CASE WHEN a.punch_in IS NOT NULL AND a.punch_out IS NULL THEN 1 END) as still_in
    FROM users u
    LEFT JOIN attendance a ON u.id = a.user_id AND a.date = ?
    WHERE u.role = 'employee' AND u.is_active = 1${deptFilter}
  `).get(...params);

  const notPunchedOut = db.prepare(`
    SELECT u.id, u.name, u.position, d.name as department_name, a.punch_in
    FROM attendance a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE a.date = ? AND a.punch_in IS NOT NULL AND a.punch_out IS NULL
    ${deptFilter ? 'AND u.department_id = ?' : ''}
  `).all(...params.slice(0, 1), ...(req.user.role === 'manager' ? [req.user.department_id] : []));

  res.json({ ...overview, notPunchedOut });
});

// Admin override
router.post('/override', authenticateToken, requireRole('super_admin', 'manager'), (req, res) => {
  const { user_id, date, punch_in, punch_out, status, notes } = req.body;
  if (!user_id || !date) return res.status(400).json({ error: 'user_id and date required' });

  const existing = db.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?').get(user_id, date);

  if (existing) {
    db.prepare(`
      UPDATE attendance SET punch_in=?, punch_out=?, status=?, notes=?, override_by=?
      WHERE user_id=? AND date=?
    `).run(punch_in, punch_out, status || 'override', notes, req.user.id, user_id, date);
  } else {
    db.prepare(`
      INSERT INTO attendance (user_id, date, punch_in, punch_out, status, notes, override_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(user_id, date, punch_in, punch_out, status || 'override', notes, req.user.id);
  }

  const record = db.prepare('SELECT * FROM attendance WHERE user_id = ? AND date = ?').get(user_id, date);
  res.json({ message: 'Attendance overridden successfully', attendance: record });
});

// Department attendance stats
router.get('/dept-stats', authenticateToken, requireRole('super_admin', 'manager'), (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const { date } = req.query;
  const targetDate = date || today;

  const stats = db.prepare(`
    SELECT d.id, d.name, d.section,
      COUNT(DISTINCT u.id) as total,
      COUNT(CASE WHEN a.status IN ('present', 'late') AND a.punch_in IS NOT NULL THEN 1 END) as present,
      COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late,
      COUNT(CASE WHEN a.status = 'absent' OR a.id IS NULL THEN 1 END) as absent
    FROM departments d
    LEFT JOIN users u ON u.department_id = d.id AND u.role = 'employee' AND u.is_active = 1
    LEFT JOIN attendance a ON a.user_id = u.id AND a.date = ?
    GROUP BY d.id
    ORDER BY d.section, d.name
  `).all(targetDate);

  res.json(stats);
});

module.exports = router;
