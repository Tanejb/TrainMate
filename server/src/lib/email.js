import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter (you can use Gmail, Outlook, or any SMTP server)
const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST || 'smtp.gmail.com',
	port: parseInt(process.env.SMTP_PORT || '587'),
	secure: false, // true for 465, false for other ports
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

export async function sendTrainingCancellationEmail(playerEmail, playerName, training) {
	if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
		console.warn('Email not configured: SMTP_USER or SMTP_PASS not set');
		return false;
	}

	if (!playerEmail) {
		console.warn(`No email address for player: ${playerName}`);
		return false;
	}

	console.log(`Attempting to send email to ${playerEmail}...`);

	const mailOptions = {
		from: `"TrainMate" <${process.env.SMTP_USER}>`,
		to: playerEmail,
		subject: `Trening odpovedan - ${new Date(training.dateTime).toLocaleDateString('sl-SI')}`,
		html: `
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
				<h2 style="color: #dc2626;">Trening je bil odpovedan</h2>
				<p>Pozdravljeni ${playerName},</p>
				<p>Obveščamo vas, da je bil trening odpovedan:</p>
				<div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
					<p><strong>Datum:</strong> ${new Date(training.dateTime).toLocaleString('sl-SI')}</p>
					<p><strong>Lokacija:</strong> ${training.location}</p>
					${training.description ? `<p><strong>Opis:</strong> ${training.description}</p>` : ''}
				</div>
				<p>Lep pozdrav,<br>TrainMate ekipa</p>
			</div>
		`,
		text: `
			Trening je bil odpovedan
			
			Pozdravljeni ${playerName},
			
			Obveščamo vas, da je bil trening odpovedan:
			
			Datum: ${new Date(training.dateTime).toLocaleString('sl-SI')}
			Lokacija: ${training.location}
			${training.description ? `Opis: ${training.description}` : ''}
			
			Lep pozdrav,
			TrainMate ekipa
		`,
	};

	try {
		const info = await transporter.sendMail(mailOptions);
		console.log(`✅ Email sent successfully to ${playerEmail} (Message ID: ${info.messageId})`);
		return true;
	} catch (error) {
		console.error(`❌ Failed to send email to ${playerEmail}:`, error.message);
		if (error.response) {
			console.error('SMTP Response:', error.response);
		}
		return false;
	}
}

