import express from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

// POST /api/users  (admin creates trainer/player)
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
	const { name, email, password, role } = req.body;
	if (!name || !email || !password || !role) {
		return res.status(400).json({ error: 'name, email, password, role are required' });
	}
	if (!['admin', 'trainer', 'player'].includes(role)) {
		return res.status(400).json({ error: 'Invalid role' });
	}
	const existing = await User.findOne({ email });
	if (existing) return res.status(409).json({ error: 'Email already in use' });
	const passwordHash = await bcrypt.hash(password, 10);
	const user = await User.create({ name, email, passwordHash, role });
	return res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
});

export default router;
