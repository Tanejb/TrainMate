import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../src/lib/mongoose.js';
import { User } from '../src/models/User.js';

dotenv.config();

async function main() {
	// Expected: node scripts/seedAdmin.js <email> <password> [name]
	const email = process.argv[2];
	const password = process.argv[3];
	const name = process.argv[4] || 'Admin';
	if (!email || !password) {
		console.error('Usage: npm run seed:admin -- <email> <password> [name]');
		process.exit(1);
	}
	await connectToDatabase();
	const existing = await User.findOne({ email });
	if (existing) {
		console.log('User already exists:', email);
		process.exit(0);
	}
	const passwordHash = await bcrypt.hash(password, 10);
	await User.create({ name, email, passwordHash, role: 'admin' });
	console.log('Admin user created:', email);
	process.exit(0);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
