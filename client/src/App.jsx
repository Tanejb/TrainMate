import { useState } from 'react';
import { api } from './api.js';

export default function App() {
	const [email, setEmail] = useState('admin@trainmate.si');
	const [password, setPassword] = useState('MojeGeslo123');
	const [error, setError] = useState('');
	const [user, setUser] = useState(null);
	const [token, setToken] = useState(localStorage.getItem('tm_token') || '');

	async function handleLogin(e) {
		e.preventDefault();
		setError('');
		try {
			const data = await api('/api/auth/login', { method: 'POST', body: { email, password } });
			setUser(data.user);
			setToken(data.token);
			localStorage.setItem('tm_token', data.token);
		} catch (e) {
			setError(e.message);
		}
	}

	if (!token || !user) {
		return (
			<div className="container">
				<div className="card" style={{ maxWidth: 420, margin: '80px auto' }}>
					<h1 className="h1">Prijava</h1>
					<form className="form" onSubmit={handleLogin}>
						<div>
							<div className="label">E‑pošta</div>
							<input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vnesi.e-posto@primer.si" />
						</div>
						<div>
							<div className="label">Geslo</div>
							<input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
						</div>
						<button className="button" type="submit">Prijava</button>
						{error && <div className="error">{error}</div>}
					</form>
				</div>
			</div>
		);
	}

	return (
		<div className="container">
			<div className="header">
				<h1 className="h1">Treningi</h1>
				<div>{user?.name} · {user?.role}</div>
			</div>
			<div className="card">Welcome! Tukaj pride seznam treningov.</div>
		</div>
	);
}
