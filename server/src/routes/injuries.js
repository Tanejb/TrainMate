import express from 'express';
import { Injury } from '../models/Injury.js';
import { Training } from '../models/Training.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

// Helper to check if training belongs to trainer
async function ensureTrainingOwner(req, res, next) {
	const training = await Training.findById(req.body.trainingId || req.params.trainingId);
	if (!training) return res.status(404).json({ error: 'Training not found' });
	if (training.trainerId.toString() !== req.user.userId) {
		return res.status(403).json({ error: 'Forbidden' });
	}
	req.training = training;
	next();
}

// POST /api/injuries (coach records injury, US-15)
router.post('/', requireAuth, requireRole('trainer'), ensureTrainingOwner, async (req, res) => {
	const { trainingId, playerId, description, date } = req.body;
	if (!trainingId || !playerId || !description) {
		return res.status(400).json({ error: 'trainingId, playerId, description are required' });
	}
	// Verify player was registered for this training
	if (!req.training.attendees.some(a => a.toString() === playerId)) {
		return res.status(400).json({ error: 'Player was not registered for this training' });
	}
	const injury = await Injury.create({
		trainingId,
		playerId,
		description,
		date: date ? new Date(date) : new Date(),
		status: 'active',
	});
	const populated = await Injury.findById(injury._id)
		.populate('playerId', 'name email')
		.populate('trainingId', 'dateTime location')
		.lean();
	return res.status(201).json({
		id: populated._id,
		playerName: populated.playerId?.name || 'N/A',
		description: populated.description,
		date: populated.date,
		status: populated.status,
	});
});

// GET /api/injuries (coach sees all injuries for their trainings)
router.get('/', requireAuth, requireRole('trainer'), async (req, res) => {
	const { status } = req.query;
	const trainings = await Training.find({ trainerId: req.user.userId }).select('_id').lean();
	const trainingIds = trainings.map(t => t._id);
	const filter = { trainingId: { $in: trainingIds } };
	if (status) filter.status = status;
	const injuries = await Injury.find(filter)
		.populate('playerId', 'name email')
		.populate('trainingId', 'dateTime location')
		.sort({ date: -1 })
		.lean();
	return res.json(injuries.map(i => ({
		id: i._id,
		trainingId: i.trainingId._id,
		trainingDate: i.trainingId.dateTime,
		trainingLocation: i.trainingId.location,
		playerId: i.playerId._id,
		playerName: i.playerId?.name || 'N/A',
		description: i.description,
		date: i.date,
		status: i.status,
		resolvedDate: i.resolvedDate || null,
	})));
});

// PATCH /api/injuries/:id (coach marks injury as resolved)
router.patch('/:id', requireAuth, requireRole('trainer'), async (req, res) => {
	const injury = await Injury.findById(req.params.id).populate('trainingId');
	if (!injury) return res.status(404).json({ error: 'Not found' });
	if (injury.trainingId.trainerId.toString() !== req.user.userId) {
		return res.status(403).json({ error: 'Forbidden' });
	}
	const { status } = req.body;
	if (status === 'resolved') {
		injury.status = 'resolved';
		injury.resolvedDate = new Date();
	} else if (status === 'active') {
		injury.status = 'active';
		injury.resolvedDate = null;
	}
	await injury.save();
	return res.json(injury);
});

export default router;

