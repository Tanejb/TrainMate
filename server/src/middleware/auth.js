import jwt from 'jsonwebtoken';

export function signToken(payload) {
	const secret = process.env.JWT_SECRET || 'dev_secret';
	return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export function requireAuth(req, res, next) {
	const header = req.headers.authorization || '';
	const token = header.startsWith('Bearer ') ? header.slice(7) : null;
	if (!token) return res.status(401).json({ error: 'Unauthorized' });
	try {
		const secret = process.env.JWT_SECRET || 'dev_secret';
		const decoded = jwt.verify(token, secret);
		req.user = decoded;
		next();
	} catch (err) {
		return res.status(401).json({ error: 'Invalid token' });
	}
}
