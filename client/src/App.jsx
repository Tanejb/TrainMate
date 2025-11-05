import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

function Snackbar({ message, type }) {
	if (!message) return null;
	return <div className={`snackbar ${type || ''}`}>{message}</div>;
}

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

	if (user.role === 'admin') {
		return <AdminUsers token={token} onLogout={() => { localStorage.removeItem('tm_token'); location.reload(); }} />;
	} else if (user.role === 'trainer') {
		return <TrainerTrainings token={token} user={user} onLogout={() => { localStorage.removeItem('tm_token'); location.reload(); }} />;
	} else if (user.role === 'player') {
		return <PlayerTrainings token={token} user={user} onLogout={() => { localStorage.removeItem('tm_token'); location.reload(); }} />;
	}
	return null;
}

function AdminUsers({ token, onLogout }) {
	const [users, setUsers] = useState([]);
	const [q, setQ] = useState('');
	const [loading, setLoading] = useState(true);
	const [err, setErr] = useState('');
	const [note, setNote] = useState({ message: '', type: 'success' });
	const [form, setForm] = useState({ name: '', email: '', password: '', role: 'trainer' });

	const filtered = useMemo(() => users, [users]);

	function showSnack(message, type = 'success') {
		setNote({ message, type });
		setTimeout(() => setNote({ message: '', type }), 2500);
	}

	async function load() {
		setLoading(true);
		setErr('');
		try {
			const data = await api(`/api/users?q=${encodeURIComponent(q)}`, { token });
			setUsers(data);
		} catch (e) {
			setErr(e.message);
		} finally {
			setLoading(false);
		}
	}
	useEffect(() => { load(); }, []);

	async function createUser(e) {
		e.preventDefault();
		setErr('');
		try {
			await api('/api/users', { method: 'POST', body: form, token });
			setForm({ name: '', email: '', password: '', role: 'trainer' });
			await load();
			showSnack('Uporabnik ustvarjen', 'success');
		} catch (e) {
			setErr(e.message);
			showSnack(e.message, 'error');
		}
	}

	async function removeUser(id) {
		if (!confirm('Izbrišem uporabnika?')) return;
		try {
			await api(`/api/users/${id}`, { method: 'DELETE', token });
			await load();
			showSnack('Uporabnik izbrisan', 'error');
		} catch (e) {
			setErr(e.message);
			showSnack(e.message, 'error');
		}
	}

	return (
		<div className="container">
			<Snackbar message={note.message} type={note.type} />
			<div className="header">
				<h1 className="h1">Upravljanje uporabnikov</h1>
				<button className="button" onClick={onLogout}>Odjava</button>
			</div>

			<div className="card" style={{ marginBottom: 16 }}>
				<form className="form" onSubmit={createUser}>
					<div className="row">
						<input className="input" placeholder="Ime" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
						<input className="input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
						<input className="input" placeholder="Geslo" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
						<select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
							<option value="trainer">Trener</option>
							<option value="player">Igralec</option>
							<option value="admin">Admin</option>
						</select>
						<button className="button" type="submit">Dodaj</button>
					</div>
					{err && <div className="error">{err}</div>}
				</form>
			</div>

			<div className="card">
				<div className="row" style={{ marginBottom: 12 }}>
					<input className="input" placeholder="Išči po imenu ali emailu" value={q} onChange={(e) => setQ(e.target.value)} />
					<button className="button" onClick={load}>Osveži</button>
				</div>
				{loading ? 'Nalaganje...' : (
					<table style={{ width: '100%', borderCollapse: 'collapse' }}>
						<thead>
							<tr>
								<th style={{ textAlign: 'left' }}>Ime</th>
								<th style={{ textAlign: 'left' }}>Email</th>
								<th style={{ textAlign: 'left' }}>Vloga</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{filtered.map(u => (
								<tr key={u.id}>
									<td>{u.name}</td>
									<td>{u.email}</td>
									<td>{u.role}</td>
									<td style={{ textAlign: 'right' }}>
										<button className="button" onClick={() => removeUser(u.id)}>Izbriši</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}

function TrainerTrainings({ token, user, onLogout }) {
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [err, setErr] = useState('');
	const [note, setNote] = useState({ message: '', type: 'success' });
	const [editing, setEditing] = useState(null);
	const [form, setForm] = useState({ dateTime: '', location: '', description: '', status: 'active', postponedDate: '' });

	function showSnack(message, type = 'success') {
		setNote({ message, type });
		setTimeout(() => setNote({ message: '', type }), 2500);
	}

	async function load() {
		setLoading(true);
		setErr('');
		try {
			const data = await api('/api/trainings', { token });
			setItems(data);
		} catch (e) {
			setErr(e.message);
		} finally {
			setLoading(false);
		}
	}
	useEffect(() => { load(); }, []);

	async function save(e) {
		e.preventDefault();
		setErr('');
		try {
			if (editing) {
				await api(`/api/trainings/${editing}`, { method: 'PATCH', body: form, token });
				showSnack('Trening posodobljen');
			} else {
				await api('/api/trainings', { method: 'POST', body: form, token });
				showSnack('Trening ustvarjen');
			}
			setForm({ dateTime: '', location: '', description: '', status: 'active', postponedDate: '' });
			setEditing(null);
			await load();
		} catch (e) {
			setErr(e.message);
			showSnack(e.message, 'error');
		}
	}

	async function edit(id) {
		const t = items.find(x => x.id === id);
		if (!t) return;
		setEditing(id);
		setForm({
			dateTime: new Date(t.dateTime).toISOString().slice(0, 16),
			location: t.location,
			description: t.description || '',
			status: t.status,
			postponedDate: t.postponedDate ? new Date(t.postponedDate).toISOString().slice(0, 16) : '',
		});
	}

	async function remove(id) {
		if (!confirm('Izbrišem trening?')) return;
		try {
			await api(`/api/trainings/${id}`, { method: 'DELETE', token });
			await load();
			showSnack('Trening izbrisan', 'error');
		} catch (e) {
			setErr(e.message);
			showSnack(e.message, 'error');
		}
	}

	const [detailsModal, setDetailsModal] = useState(null);

	async function loadDetails(id) {
		try {
			const data = await api(`/api/trainings/${id}`, { token });
			setDetailsModal(data);
		} catch (e) {
			showSnack(e.message, 'error');
		}
	}

	return (
		<div className="container">
			<Snackbar message={note.message} type={note.type} />
			{detailsModal && (
				<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
					<div className="card" style={{ maxWidth: 600, width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
						<div className="header">
							<h2>Prijavljeni igralci</h2>
							<button className="button" onClick={() => setDetailsModal(null)}>✕</button>
						</div>
						<div style={{ marginBottom: 16 }}>
							<strong>{new Date(detailsModal.dateTime).toLocaleString()}</strong> · {detailsModal.location}
						</div>
						{detailsModal.description && <div style={{ marginBottom: 16 }}>{detailsModal.description}</div>}
						<div>
							<strong>Prijavljeni igralci ({detailsModal.attendees.length}):</strong>
							<ul style={{ marginTop: 8, paddingLeft: 20 }}>
								{detailsModal.attendees.map(a => (
									<li key={a.id}>{a.name} ({a.email})</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			)}
			<div className="header">
				<h1 className="h1">Moji treningi</h1>
				<div>
					{user?.name} · {user?.role}
					<button className="button" style={{ marginLeft: 12 }} onClick={onLogout}>Odjava</button>
				</div>
			</div>

			<div className="card" style={{ marginBottom: 16 }}>
				<form className="form" onSubmit={save}>
					<div className="row" style={{ alignItems: 'flex-end' }}>
						<div style={{ flex: 1 }}>
							<div className="label">Datum in čas</div>
							<input className="input" type="datetime-local" value={form.dateTime} onChange={(e) => setForm({ ...form, dateTime: e.target.value })} required />
						</div>
						<div style={{ flex: 1 }}>
							<div className="label">Lokacija</div>
							<input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
						</div>
						<div style={{ flex: 2 }}>
							<div className="label">Opis</div>
							<input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
						</div>
						<div>
							<div className="label">Status</div>
							<select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
								<option value="active">Aktivno</option>
								<option value="postponed">Preloženo</option>
								<option value="cancelled">Odpovedano</option>
							</select>
						</div>
						{form.status === 'postponed' && (
							<div style={{ flex: 1 }}>
								<div className="label">Novi datum (pustite prazno če še ni znan)</div>
								<input className="input" type="datetime-local" value={form.postponedDate} onChange={(e) => setForm({ ...form, postponedDate: e.target.value })} />
							</div>
						)}
						<button className="button" type="submit">{editing ? 'Shrani' : 'Dodaj'}</button>
					</div>
					{err && <div className="error">{err}</div>}
				</form>
			</div>

			<div className="card">
				{loading ? 'Nalaganje...' : (
					<table style={{ width: '100%', borderCollapse: 'collapse' }}>
						<thead>
							<tr>
								<th style={{ textAlign: 'left' }}>Datum</th>
								<th style={{ textAlign: 'left' }}>Lokacija</th>
								<th style={{ textAlign: 'left' }}>Opis</th>
								<th style={{ textAlign: 'left' }}>Status</th>
								<th style={{ textAlign: 'left' }}>Prijavljeni</th>
								<th style={{ textAlign: 'right' }}>Akcije</th>
							</tr>
						</thead>
						<tbody>
							{items.map(t => (
								<tr key={t.id}>
									<td>
										{new Date(t.dateTime).toLocaleString()}
										{t.status === 'postponed' && t.postponedDate && (
											<div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
												Novi datum: {new Date(t.postponedDate).toLocaleString()}
											</div>
										)}
										{t.status === 'postponed' && !t.postponedDate && (
											<div style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>
												Novi datum še ni znan
											</div>
										)}
									</td>
									<td>{t.location}</td>
									<td>{t.description}</td>
									<td><span className={`badge ${t.status}`}>{t.status === 'active' ? 'Aktivno' : t.status === 'postponed' ? 'Preloženo' : 'Odpovedano'}</span></td>
									<td>
										<button className="button" onClick={() => loadDetails(t.id)} style={{ fontSize: 14, padding: '6px 12px' }}>
											{t.attendeesCount || 0} prijavljenih
										</button>
									</td>
									<td style={{ textAlign: 'right' }}>
										<button className="button" onClick={() => edit(t.id)} style={{ marginRight: 8 }}>Uredi</button>
										<button className="button" onClick={() => remove(t.id)}>Izbriši</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}

function PlayerTrainings({ token, user, onLogout }) {
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [err, setErr] = useState('');
	const [note, setNote] = useState({ message: '', type: 'success' });

	function showSnack(message, type = 'success') {
		setNote({ message, type });
		setTimeout(() => setNote({ message: '', type }), 2500);
	}

	async function load() {
		setLoading(true);
		setErr('');
		try {
			const data = await api('/api/trainings', { token });
			setItems(data);
		} catch (e) {
			setErr(e.message);
		} finally {
			setLoading(false);
		}
	}
	useEffect(() => { load(); }, []);

	async function register(id) {
		try {
			await api(`/api/trainings/${id}/register`, { method: 'POST', token });
			showSnack('Prijavljen na trening');
			await load();
		} catch (e) {
			showSnack(e.message, 'error');
		}
	}

	async function unregister(id) {
		if (!confirm('Odjavljam se s treninga?')) return;
		try {
			await api(`/api/trainings/${id}/unregister`, { method: 'DELETE', token });
			showSnack('Odjavljen s treninga');
			await load();
		} catch (e) {
			showSnack(e.message, 'error');
		}
	}

	return (
		<div className="container">
			<Snackbar message={note.message} type={note.type} />
			<div className="header">
				<h1 className="h1">Prihajajoči treningi</h1>
				<div>
					{user?.name} · {user?.role}
					<button className="button" style={{ marginLeft: 12 }} onClick={onLogout}>Odjava</button>
				</div>
			</div>

			<div className="card">
				{loading ? 'Nalaganje...' : (
					<table style={{ width: '100%', borderCollapse: 'collapse' }}>
						<thead>
							<tr>
								<th style={{ textAlign: 'left' }}>Datum</th>
								<th style={{ textAlign: 'left' }}>Lokacija</th>
								<th style={{ textAlign: 'left' }}>Opis</th>
								<th style={{ textAlign: 'left' }}>Trener</th>
								<th style={{ textAlign: 'left' }}>Status</th>
								<th style={{ textAlign: 'right' }}>Akcije</th>
							</tr>
						</thead>
						<tbody>
							{items.length === 0 ? (
								<tr>
									<td colSpan={6} style={{ textAlign: 'center', padding: 20 }}>Ni prihajajočih treningov</td>
								</tr>
							) : (
								items.map(t => (
									<tr key={t.id}>
										<td>
											{new Date(t.dateTime).toLocaleString()}
											{t.status === 'postponed' && t.postponedDate && (
												<div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
													Novi datum: {new Date(t.postponedDate).toLocaleString()}
												</div>
											)}
											{t.status === 'postponed' && !t.postponedDate && (
												<div style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>
													Novi datum še ni znan
												</div>
											)}
										</td>
										<td>{t.location}</td>
										<td>{t.description}</td>
										<td>{t.trainerName}</td>
										<td>
											<span className={`badge ${t.status}`}>
												{t.status === 'active' ? 'Aktivno' : t.status === 'postponed' ? 'Preloženo' : 'Odpovedano'}
											</span>
											{t.status === 'postponed' && (
												<div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
													{t.postponedDate ? 'Preloženo - prijavi se za novi datum' : 'Preloženo - novi datum še ni znan'}
												</div>
											)}
										</td>
										<td style={{ textAlign: 'right' }}>
											{t.status === 'active' ? (
												t.isRegistered ? (
													<button className="button unregister" onClick={() => unregister(t.id)}>Odjavi</button>
												) : (
													<button className="button register" onClick={() => register(t.id)}>Prijavi se</button>
												)
											) : t.status === 'postponed' && t.postponedDate ? (
												t.isRegistered ? (
													<button className="button unregister" onClick={() => unregister(t.id)}>Odjavi</button>
												) : (
													<button className="button register" onClick={() => register(t.id)}>Prijavi se</button>
												)
											) : (
												<span style={{ color: '#6b7280', fontSize: 14 }}>Ni možno</span>
											)}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}
