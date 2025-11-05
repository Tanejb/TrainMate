import mongoose from 'mongoose';

	const trainingSchema = new mongoose.Schema(
	{
		dateTime: { type: Date, required: true },
		location: { type: String, required: true },
		description: { type: String },
		status: { type: String, enum: ['active', 'postponed', 'cancelled'], default: 'active' },
		postponedDate: { type: Date }, // Optional new date when postponed
		trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
		attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
	},
	{ timestamps: true }
);

export const Training = mongoose.models.Training || mongoose.model('Training', trainingSchema);
