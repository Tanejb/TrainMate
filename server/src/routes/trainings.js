import express from 'express';
import { Training } from '../models/Training.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { sendTrainingCancellationEmail } from '../lib/email.js';

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

// GET /api/trainings (trainer's own list with filters OR player's upcoming active trainings)
router.get('/', requireAuth, async (req, res) => {
	const role = req.user.role;
	if (role === 'trainer') {
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
		return res.json(items.map(t => ({
			id: t._id,
			dateTime: t.dateTime,
			postponedDate: t.postponedDate || null,
			location: t.location,
			description: t.description,
			notes: (t.notes !== undefined && t.notes !== null) ? t.notes : null,
			status: t.status,
			attendeesCount: Array.isArray(t.attendees) ? t.attendees.length : 0,
			attendanceCount: Array.isArray(t.attendance) ? t.attendance.length : 0,
			isPast: t.dateTime < new Date(),
		})));
	} else if (role === 'player') {
		// US-05: Player sees upcoming trainings (active + postponed with new date)
		const now = new Date();
		const userId = req.user.userId.toString();
		// Active upcoming trainings
		const activeItems = await Training.find({
			dateTime: { $gte: now },
			status: 'active',
		}).populate('trainerId', 'name email').sort({ dateTime: 1 }).lean();
		// Postponed trainings with a new date set (not in the past)
		const postponedItems = await Training.find({
			status: 'postponed',
			postponedDate: { $exists: true, $ne: null, $gte: now },
		}).populate('trainerId', 'name email').sort({ postponedDate: 1 }).lean();
		const allItems = [...activeItems, ...postponedItems];
		return res.json(allItems.map(t => ({
			id: t._id,
			dateTime: t.dateTime,
			postponedDate: t.postponedDate || null,
			location: t.location,
			description: t.description,
			status: t.status,
			trainerName: t.trainerId?.name || 'N/A',
			isRegistered: Array.isArray(t.attendees) && t.attendees.some(a => a.toString() === userId),
		})));
	}
	return res.status(403).json({ error: 'Forbidden' });
});

// GET /api/trainings/history (player's training history, US-09) - MUST BE BEFORE /:id
router.get('/history', requireAuth, requireRole('player'), async (req, res) => {
	const now = new Date();
	const userId = req.user.userId.toString();
	const items = await Training.find({
		dateTime: { $lt: now },
		status: { $ne: 'cancelled' },
	}).populate('trainerId', 'name email').sort({ dateTime: -1 }).lean();
	return res.json(items.map(t => ({
		id: t._id,
		dateTime: t.dateTime,
		location: t.location,
		description: t.description,
		notes: (t.notes !== undefined && t.notes !== null) ? t.notes : null,
		trainerName: t.trainerId?.name || 'N/A',
		wasRegistered: Array.isArray(t.attendees) && t.attendees.some(a => a.toString() === userId),
		attended: Array.isArray(t.attendance) && t.attendance.some(a => a.toString() === userId),
	})));
});

// GET /api/trainings/:id (details with attendees - trainer only, US-07)
router.get('/:id', requireAuth, async (req, res) => {
	const t = await Training.findById(req.params.id)
		.populate({ path: 'attendees', select: 'name email role', options: { lean: true } })
		.populate({ path: 'attendance', select: 'name email role', options: { lean: true } })
		.populate({ path: 'trainerId', select: 'name email', options: { lean: true } })
		.lean();
	if (!t) return res.status(404).json({ error: 'Not found' });
	if (req.user.role === 'trainer' && t.trainerId._id.toString() !== req.user.userId) {
		return res.status(403).json({ error: 'Forbidden' });
	}
	return res.json({
		id: t._id,
		dateTime: t.dateTime,
		postponedDate: t.postponedDate || null,
		location: t.location,
		description: t.description || '',
		notes: (t.notes !== undefined && t.notes !== null) ? t.notes : '',
		status: t.status,
		trainerName: t.trainerId?.name || 'N/A',
		attendees: (t.attendees || []).map(a => ({ id: a._id, name: a.name, email: a.email })),
		attendance: (t.attendance || []).map(a => ({ id: a._id, name: a.name, email: a.email })),
	});
});

// POST /api/trainings/:id/register (player registers, US-06)
router.post('/:id/register', requireAuth, requireRole('player'), async (req, res) => {
	const t = await Training.findById(req.params.id);
	if (!t) return res.status(404).json({ error: 'Not found' });
	// Allow registration for active trainings OR postponed trainings with a new date
	if (t.status === 'cancelled') return res.status(400).json({ error: 'Training is cancelled' });
	if (t.status === 'postponed' && !t.postponedDate) return res.status(400).json({ error: 'Training is postponed, new date not set yet' });
	const targetDate = t.status === 'postponed' && t.postponedDate ? t.postponedDate : t.dateTime;
	if (targetDate < new Date()) return res.status(400).json({ error: 'Training has passed' });
	const userId = req.user.userId;
	if (!t.attendees) t.attendees = [];
	if (t.attendees.some(a => a.toString() === userId)) {
		return res.status(409).json({ error: 'Already registered' });
	}
	t.attendees.push(userId);
	await t.save();
	return res.status(201).json({ message: 'Registered successfully' });
});

// DELETE /api/trainings/:id/unregister (player unregisters)
router.delete('/:id/unregister', requireAuth, requireRole('player'), async (req, res) => {
	const t = await Training.findById(req.params.id);
	if (!t) return res.status(404).json({ error: 'Not found' });
	const userId = req.user.userId;
	if (!t.attendees || !t.attendees.some(a => a.toString() === userId)) {
		return res.status(409).json({ error: 'Not registered' });
	}
	t.attendees = t.attendees.filter(a => a.toString() !== userId);
	await t.save();
	return res.status(204).send();
});

// POST /api/trainings/:id/attendance (coach marks attendance, US-08)
router.post('/:id/attendance', requireAuth, requireRole('trainer'), ensureOwner, async (req, res) => {
	const { playerIds } = req.body; // Array of player IDs who attended
	if (!Array.isArray(playerIds)) {
		return res.status(400).json({ error: 'playerIds must be an array' });
	}
	// Only allow marking attendance for past trainings
	if (req.training.dateTime > new Date()) {
		return res.status(400).json({ error: 'Cannot mark attendance for future training' });
	}
	// Only allow players who were registered
	const validIds = playerIds.filter(id => 
		req.training.attendees.some(a => a.toString() === id)
	);
	req.training.attendance = validIds;
	await req.training.save();
	return res.json({ message: 'Attendance marked', attendance: req.training.attendance });
});

// POST /api/trainings (trainer creates)
router.post('/', requireAuth, requireRole('trainer'), async (req, res) => {
	const { dateTime, location, description, status, notes } = req.body;
	if (!dateTime || !location) return res.status(400).json({ error: 'dateTime and location required' });
	const training = await Training.create({
		dateTime: new Date(dateTime),
		location,
		description,
		notes: notes || '',
		status: status || 'active',
		trainerId: req.user.userId,
		attendees: [],
	});
	const saved = await Training.findById(training._id).lean();
	return res.status(201).json({
		id: saved._id,
		dateTime: saved.dateTime,
		postponedDate: saved.postponedDate || null,
		location: saved.location,
		description: saved.description || '',
		notes: (saved.notes !== undefined && saved.notes !== null) ? saved.notes : '',
		status: saved.status,
	});
});

// PATCH /api/trainings/:id (trainer edits only own)
router.patch('/:id', requireAuth, requireRole('trainer'), ensureOwner, async (req, res) => {
	const { dateTime, location, description, status, postponedDate, notes } = req.body;
	if (dateTime !== undefined) req.training.dateTime = new Date(dateTime);
	if (location !== undefined) req.training.location = location;
	if (description !== undefined) req.training.description = description;
	if (notes !== undefined) req.training.notes = notes;
	if (status !== undefined) {
		const wasActive = req.training.status === 'active';
		const wasCancelled = req.training.status === 'cancelled';
		req.training.status = status;
		if (status === 'postponed') {
			// If postponed, set postponedDate if provided, or clear if explicitly null
			if (postponedDate !== undefined) {
				req.training.postponedDate = postponedDate ? new Date(postponedDate) : null;
			}
			// When changing from active to postponed, clear attendees (they need to re-register)
			if (wasActive) {
				req.training.attendees = [];
			}
		} else {
			req.training.postponedDate = null;
		}
		// US-12: Send email notifications when training is cancelled
		if (status === 'cancelled' && !wasCancelled && req.training.attendees && req.training.attendees.length > 0) {
			// Send emails in background (don't wait for them)
			const attendees = await User.find({ _id: { $in: req.training.attendees } }).lean();
			console.log(`Sending cancellation emails to ${attendees.length} players...`);
			// Use Promise.allSettled to send all emails without blocking
			Promise.allSettled(
				attendees.map(async (player) => {
					const result = await sendTrainingCancellationEmail(player.email, player.name, {
						dateTime: req.training.dateTime,
						location: req.training.location,
						description: req.training.description,
					});
					if (!result) {
						console.error(`Failed to send email to ${player.email}`);
					}
				})
			).then(() => {
				console.log('All cancellation emails processed');
			});
		}
	} else if (postponedDate !== undefined) {
		req.training.postponedDate = postponedDate ? new Date(postponedDate) : null;
	}
	await req.training.save();
	const saved = await Training.findById(req.training._id).lean();
	return res.json({
		id: saved._id,
		dateTime: saved.dateTime,
		postponedDate: saved.postponedDate || null,
		location: saved.location,
		description: saved.description || '',
		notes: (saved.notes !== undefined && saved.notes !== null) ? saved.notes : '',
		status: saved.status,
	});
});

// DELETE /api/trainings/:id (trainer deletes only own)
router.delete('/:id', requireAuth, requireRole('trainer'), ensureOwner, async (req, res) => {
	// US-12: Send email notifications before deleting (same as cancellation)
	if (req.training.attendees && req.training.attendees.length > 0) {
		const attendees = await User.find({ _id: { $in: req.training.attendees } }).lean();
		console.log(`Sending cancellation emails to ${attendees.length} players (training deleted)...`);
		Promise.allSettled(
			attendees.map(async (player) => {
				const result = await sendTrainingCancellationEmail(player.email, player.name, {
					dateTime: req.training.dateTime,
					location: req.training.location,
					description: req.training.description,
				});
				if (!result) {
					console.error(`Failed to send email to ${player.email}`);
				}
			})
		).then(() => {
			console.log('All cancellation emails processed');
		});
	}
	await req.training.deleteOne();
	return res.status(204).send();
});

export default router;
