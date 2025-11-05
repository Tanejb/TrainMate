import mongoose from 'mongoose';

const injurySchema = new mongoose.Schema(
	{
		trainingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Training', required: true },
		playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
		description: { type: String, required: true },
		date: { type: Date, default: Date.now },
		status: { type: String, enum: ['active', 'resolved'], default: 'active' },
		resolvedDate: { type: Date },
	},
	{ timestamps: true }
);

export const Injury = mongoose.models.Injury || mongoose.model('Injury', injurySchema);

