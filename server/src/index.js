import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectToDatabase } from './lib/mongoose.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import trainingsRouter from './routes/trainings.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
	res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/trainings', trainingsRouter);

const port = process.env.PORT || 4000;

connectToDatabase()
	.then(() => {
		app.listen(port, () => {
			console.log(`Server listening on http://localhost:${port}`);
		});
	})
	.catch((err) => {
		console.error('Failed to start server:', err);
		process.exit(1);
	});
