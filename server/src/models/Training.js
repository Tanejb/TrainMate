import mongoose from 'mongoose';

const trainingSchema = new mongoose.Schema(
	{
		dateTime: { type: Date, required: true },
		location: { type: String, required: true },
		description: { type: String },
		status: { type: String, enum: ['active', 'postponed', 'cancelled'], default: 'active' },
		trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
	},
	{ timestamps: true }
);

export const Training = mongoose.models.Training || mongoose.model('Training', trainingSchema);
