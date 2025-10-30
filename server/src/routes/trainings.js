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
