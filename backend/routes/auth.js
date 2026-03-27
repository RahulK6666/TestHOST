const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare(`
    SELECT u.*, d.name as department_name, d.section as dept_section
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.email = ? AND u.is_active = 1
  `).get(email.toLowerCase().trim());

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

  const { password: _, ...userData } = user;
  res.json({ token, user: userData });
});

// Get current user profile
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.department_id, u.section, u.position, u.phone, u.avatar, u.created_at,
           d.name as department_name, d.section as dept_section
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.id = ?
  `).get(req.user.id);

  res.json(user);
});

// Change password
router.put('/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(400).json({ error: 'Current password incorrect' });
  }

  const hashed = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashed, req.user.id);
  res.json({ message: 'Password updated successfully' });
});

// Update profile
router.put('/profile', authenticateToken, (req, res) => {
  const { phone, position } = req.body;
  db.prepare('UPDATE users SET phone = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(phone, position, req.user.id);

  const updated = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.department_id, u.section, u.position, u.phone, u.avatar,
           d.name as department_name
    FROM users u LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.id = ?
  `).get(req.user.id);

  res.json(updated);
});

module.exports = router;
