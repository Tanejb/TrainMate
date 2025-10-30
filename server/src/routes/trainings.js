import express from 'express';
import { Training } from '../models/Training.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

// helper to check ownership
async function ensureOwner(req, res, next) {
	const training = await Training.findById(req.params.id);
	if (!training) return res.status(404).json({ error: 'Not found' });
	if (training.trainerId.toString() !== req.user.userId) {
		return res.status(403).json({ error: 'Forbidden' });
	}
	req.training = training;
	next();
}

// GET /api/trainings (trainer's own list with filters)
router.get('/', requireAuth, requireRole('trainer'), async (req, res) => {
	const { from, to, location } = req.query;
	const filter = { trainerId: req.user.userId };
	if (from || to) {
		filter.dateTime = {};
		if (from) filter.dateTime.$gte = new Date(from);
		if (to) filter.dateTime.$lte = new Date(to);
	}
	if (location) {
		filter.location = { $regex: location, $options: 'i' };
	}
	const items = await Training.find(filter).sort({ dateTime: 1 }).lean();
	res.json(items.map(t => ({
		id: t._id,
		dateTime: t.dateTime,
		location: t.location,
		description: t.description,
		status: t.status,
		attendeesCount: Array.isArray(t.attendees) ? t.attendees.length : 0,
	})));
});

// GET /api/trainings/:id (details with attendees)
router.get('/:id', requireAuth, requireRole('trainer'), ensureOwner, async (req, res) => {
	const t = await Training.findById(req.params.id)
		.populate({ path: 'attendees', select: 'name email role', options: { lean: true } })
		.lean();
	return res.json({
		id: t._id,
		dateTime: t.dateTime,
		location: t.location,
		description: t.description,
		status: t.status,
		attendees: (t.attendees || []).map(a => ({ id: a._id, name: a.name, email: a.email })),
	});
});

// POST /api/trainings (trainer creates)
router.post('/', requireAuth, requireRole('trainer'), async (req, res) => {
	const { dateTime, location, description, status } = req.body;
	if (!dateTime || !location) return res.status(400).json({ error: 'dateTime and location required' });
	const training = await Training.create({
		dateTime: new Date(dateTime),
		location,
		description,
		status: status || 'active',
		trainerId: req.user.userId,
		attendees: [],
	});
	return res.status(201).json(training);
});

// PATCH /api/trainings/:id (trainer edits only own)
router.patch('/:id', requireAuth, requireRole('trainer'), ensureOwner, async (req, res) => {
	const { dateTime, location, description, status } = req.body;
	if (dateTime !== undefined) req.training.dateTime = new Date(dateTime);
	if (location !== undefined) req.training.location = location;
	if (description !== undefined) req.training.description = description;
	if (status !== undefined) req.training.status = status;
	await req.training.save();
	return res.json(req.training);
});

// DELETE /api/trainings/:id (trainer deletes only own)
router.delete('/:id', requireAuth, requireRole('trainer'), ensureOwner, async (req, res) => {
	await req.training.deleteOne();
	return res.status(204).send();
});

export default router;
