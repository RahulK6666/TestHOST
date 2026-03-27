const express = require('express');
const db = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get tasks
router.get('/', authenticateToken, (req, res) => {
  const { status, priority, department_id, assigned_to, overdue, search } = req.query;

  let query = `
    SELECT t.*,
           u1.name as assigned_to_name, u1.position as assigned_to_position,
           u2.name as assigned_by_name,
           d.name as department_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assigned_to = u1.id
    LEFT JOIN users u2 ON t.assigned_by = u2.id
    LEFT JOIN departments d ON t.department_id = d.id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role === 'employee') {
    query += ' AND t.assigned_to = ?'; params.push(req.user.id);
  } else if (req.user.role === 'manager') {
    query += ' AND t.department_id = ?'; params.push(req.user.department_id);
  } else {
    if (assigned_to) { query += ' AND t.assigned_to = ?'; params.push(assigned_to); }
    if (department_id) { query += ' AND t.department_id = ?'; params.push(department_id); }
  }

  if (status) { query += ' AND t.status = ?'; params.push(status); }
  if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
  if (overdue === 'true') { query += ' AND t.deadline < datetime("now") AND t.status NOT IN ("completed","reviewed")'; }
  if (search) {
    query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY t.deadline ASC, t.priority DESC';
  const tasks = db.prepare(query).all(...params);

  // Add comment count and overdue flag
  const enriched = tasks.map(task => ({
    ...task,
    isOverdue: new Date(task.deadline) < new Date() && !['completed', 'reviewed'].includes(task.status),
    commentCount: db.prepare('SELECT COUNT(*) as count FROM task_comments WHERE task_id = ?').get(task.id)?.count || 0,
  }));

  res.json(enriched);
});

// Get single task
router.get('/:id', authenticateToken, (req, res) => {
  const task = db.prepare(`
    SELECT t.*,
           u1.name as assigned_to_name, u1.position as assigned_to_position,
           u2.name as assigned_by_name,
           d.name as department_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assigned_to = u1.id
    LEFT JOIN users u2 ON t.assigned_by = u2.id
    LEFT JOIN departments d ON t.department_id = d.id
    WHERE t.id = ?
  `).get(req.params.id);

  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (req.user.role === 'employee' && task.assigned_to !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const comments = db.prepare(`
    SELECT tc.*, u.name as user_name, u.role, u.position
    FROM task_comments tc JOIN users u ON tc.user_id = u.id
    WHERE tc.task_id = ? ORDER BY tc.created_at ASC
  `).all(req.params.id);

  const files = db.prepare(`
    SELECT tf.*, u.name as uploaded_by_name
    FROM task_files tf JOIN users u ON tf.uploaded_by = u.id
    WHERE tf.task_id = ?
  `).all(req.params.id);

  res.json({
    ...task,
    isOverdue: new Date(task.deadline) < new Date() && !['completed', 'reviewed'].includes(task.status),
    comments,
    files,
  });
});

// Create task
router.post('/', authenticateToken, requireRole('super_admin', 'manager'), (req, res) => {
  const { title, description, assigned_to, department_id, deadline, priority, is_recurring, recurrence_pattern } = req.body;

  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (!deadline) return res.status(400).json({ error: 'Deadline is mandatory' });
  if (!assigned_to) return res.status(400).json({ error: 'Assigned employee is required' });

  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) return res.status(400).json({ error: 'Invalid deadline date' });

  const assignee = db.prepare('SELECT id, department_id FROM users WHERE id = ?').get(assigned_to);
  if (!assignee) return res.status(400).json({ error: 'Assigned user not found' });

  if (req.user.role === 'manager' && assignee.department_id !== req.user.department_id) {
    return res.status(403).json({ error: 'Cannot assign tasks outside your department' });
  }

  const result = db.prepare(`
    INSERT INTO tasks (title, description, assigned_to, assigned_by, department_id, deadline, priority, is_recurring, recurrence_pattern)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title, description || '', assigned_to, req.user.id,
    department_id || assignee.department_id,
    deadline, priority || 'medium',
    is_recurring ? 1 : 0, recurrence_pattern || null
  );

  const task = db.prepare(`
    SELECT t.*, u1.name as assigned_to_name, u2.name as assigned_by_name, d.name as department_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assigned_to = u1.id
    LEFT JOIN users u2 ON t.assigned_by = u2.id
    LEFT JOIN departments d ON t.department_id = d.id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  // Create notification
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (?, ?, ?, 'task', ?)
  `).run(
    assigned_to,
    'New Task Assigned',
    `You have been assigned: "${title}" — Deadline: ${new Date(deadline).toLocaleDateString()}`,
    `/tasks/${result.lastInsertRowid}`
  );

  res.status(201).json(task);
});

// Update task status
router.patch('/:id/status', authenticateToken, (req, res) => {
  const { status } = req.body;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const validTransitions = {
    employee: { 'assigned': ['accepted'], 'accepted': ['in_progress'], 'in_progress': ['completed'] },
    manager: { 'assigned': ['accepted', 'in_progress'], 'accepted': ['in_progress'], 'in_progress': ['completed'], 'completed': ['reviewed'] },
    super_admin: { 'assigned': ['accepted', 'in_progress', 'completed', 'reviewed'], 'accepted': ['in_progress', 'completed', 'reviewed'], 'in_progress': ['completed', 'reviewed'], 'completed': ['reviewed', 'in_progress'], 'reviewed': ['completed'] },
  };

  if (req.user.role === 'employee' && task.assigned_to !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Employees cannot accept tasks without deadline (already enforced at creation)
  if (req.user.role === 'employee' && status === 'accepted' && !task.deadline) {
    return res.status(400).json({ error: 'Cannot accept task without deadline' });
  }

  const allowed = validTransitions[req.user.role]?.[task.status] || [];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `Cannot transition from ${task.status} to ${status}` });
  }

  db.prepare('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Update task (admin/manager)
router.put('/:id', authenticateToken, requireRole('super_admin', 'manager'), (req, res) => {
  const { title, description, deadline, priority, assigned_to, department_id } = req.body;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (!deadline) return res.status(400).json({ error: 'Deadline is mandatory' });

  db.prepare(`
    UPDATE tasks SET title=?, description=?, deadline=?, priority=?, assigned_to=?, department_id=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(
    title || task.title, description || task.description,
    deadline || task.deadline, priority || task.priority,
    assigned_to || task.assigned_to, department_id || task.department_id,
    req.params.id
  );

  const updated = db.prepare(`
    SELECT t.*, u1.name as assigned_to_name, u2.name as assigned_by_name, d.name as department_name
    FROM tasks t LEFT JOIN users u1 ON t.assigned_to = u1.id LEFT JOIN users u2 ON t.assigned_by = u2.id
    LEFT JOIN departments d ON t.department_id = d.id WHERE t.id = ?
  `).get(req.params.id);

  res.json(updated);
});

// Delete task (admin only)
router.delete('/:id', authenticateToken, requireRole('super_admin'), (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ message: 'Task deleted' });
});

// Add comment
router.post('/:id/comments', authenticateToken, (req, res) => {
  const { comment } = req.body;
  if (!comment?.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (req.user.role === 'employee' && task.assigned_to !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const result = db.prepare('INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)')
    .run(req.params.id, req.user.id, comment.trim());

  const newComment = db.prepare(`
    SELECT tc.*, u.name as user_name, u.role, u.position
    FROM task_comments tc JOIN users u ON tc.user_id = u.id WHERE tc.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(newComment);
});

// Task stats (admin/manager)
router.get('/stats/overview', authenticateToken, requireRole('super_admin', 'manager'), (req, res) => {
  let filter = '';
  const params = [];

  if (req.user.role === 'manager') {
    filter = 'WHERE t.department_id = ?'; params.push(req.user.department_id);
  }

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned,
      COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'reviewed' THEN 1 END) as reviewed,
      COUNT(CASE WHEN deadline < datetime('now') AND status NOT IN ('completed','reviewed') THEN 1 END) as overdue,
      COUNT(CASE WHEN priority = 'urgent' AND status NOT IN ('completed','reviewed') THEN 1 END) as urgent_pending
    FROM tasks t ${filter}
  `).get(...params);

  res.json(stats);
});

module.exports = router;
