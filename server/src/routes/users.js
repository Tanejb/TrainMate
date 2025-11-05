import express from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Training } from '../models/Training.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

// GET /api/users/statistics (admin statistics, US-14) - MUST BE BEFORE /:id
router.get('/statistics', requireAuth, requireRole('admin'), async (req, res) => {
	const usersByRole = await User.aggregate([
		{ $group: { _id: '$role', count: { $sum: 1 } } }
	]);
	const roleCounts = { admin: 0, trainer: 0, player: 0 };
	usersByRole.forEach(r => { roleCounts[r._id] = r.count; });
	
	const totalTrainings = await Training.countDocuments();
	const totalRegistrations = await Training.aggregate([
		{ $project: { attendeesCount: { $size: { $ifNull: ['$attendees', []] } } } },
		{ $group: { _id: null, total: { $sum: '$attendeesCount' } } }
	]);
	const registrationsCount = totalRegistrations[0]?.total || 0;
	
	return res.json({
		users: {
			total: roleCounts.admin + roleCounts.trainer + roleCounts.player,
			admins: roleCounts.admin,
			trainers: roleCounts.trainer,
			players: roleCounts.player,
		},
		trainings: totalTrainings,
		registrations: registrationsCount,
	});
});

// GET /api/users (admin list)
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
	const q = (req.query.q || '').toString().trim();
	const filter = q
		? { $or: [ { name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } } ] }
		: {};
	const users = await User.find(filter).sort({ createdAt: -1 }).limit(200).lean();
	res.json(users.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role })));
});

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

// DELETE /api/users/:id (admin)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
	const { id } = req.params;
	if (id === req.user.userId) return res.status(400).json({ error: 'Cannot delete yourself' });
	await User.deleteOne({ _id: id });
	return res.status(204).send();
});

export default router;
