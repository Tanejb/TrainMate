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
	const [stats, setStats] = useState(null);
	const [statsLoading, setStatsLoading] = useState(true);
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

	async function loadStats() {
		setStatsLoading(true);
		try {
			const data = await api('/api/users/statistics', { token });
			setStats(data);
		} catch (e) {
			console.error('Failed to load stats:', e);
		} finally {
			setStatsLoading(false);
		}
	}

	useEffect(() => { load(); }, []);
	useEffect(() => { loadStats(); }, []);

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

			{statsLoading ? null : stats && (
				<div className="card" style={{ marginBottom: 16 }}>
					<h2 style={{ marginTop: 0, marginBottom: 16 }}>Statistika</h2>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
						<div style={{ padding: 16, background: '#f3f4f6', borderRadius: 8 }}>
							<div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Skupaj uporabnikov</div>
							<div style={{ fontSize: 24, fontWeight: 700 }}>{stats.users.total}</div>
							<div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
								{stats.users.admins} admin, {stats.users.trainers} trener, {stats.users.players} igralec
							</div>
						</div>
						<div style={{ padding: 16, background: '#f3f4f6', borderRadius: 8 }}>
							<div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Treningi</div>
							<div style={{ fontSize: 24, fontWeight: 700 }}>{stats.trainings}</div>
						</div>
						<div style={{ padding: 16, background: '#f3f4f6', borderRadius: 8 }}>
							<div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Registracije</div>
							<div style={{ fontSize: 24, fontWeight: 700 }}>{stats.registrations}</div>
						</div>
					</div>
				</div>
			)}

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
	const [tab, setTab] = useState('upcoming'); // 'upcoming' or 'history'
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);
	const [err, setErr] = useState('');
	const [note, setNote] = useState({ message: '', type: 'success' });
	const [editing, setEditing] = useState(null);
	const [form, setForm] = useState({ dateTime: '', location: '', description: '', status: 'active', postponedDate: '', notes: '' });

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
			setForm({ dateTime: '', location: '', description: '', status: 'active', postponedDate: '', notes: '' });
			setEditing(null);
			await load();
		} catch (e) {
			setErr(e.message);
			showSnack(e.message, 'error');
		}
	}

	async function edit(id) {
		try {
			// Load full training details to ensure we have all fields including notes
			const t = await api(`/api/trainings/${id}`, { token });
			setEditing(id);
			setForm({
				dateTime: new Date(t.dateTime).toISOString().slice(0, 16),
				location: t.location || '',
				description: t.description || '',
				status: t.status || 'active',
				postponedDate: t.postponedDate ? new Date(t.postponedDate).toISOString().slice(0, 16) : '',
				notes: (t.notes !== undefined && t.notes !== null) ? String(t.notes) : '',
			});
		} catch (e) {
			showSnack(e.message, 'error');
		}
	}

	async function copyTraining(id) {
		try {
			// Load full training details to ensure we have all fields including notes
			const t = await api(`/api/trainings/${id}`, { token });
			setEditing(null); // Not editing, creating new
			setForm({
				dateTime: '', // Clear date so user must set new one
				location: t.location || '',
				description: t.description || '',
				status: 'active', // Default to active
				postponedDate: '',
				notes: (t.notes !== undefined && t.notes !== null) ? String(t.notes) : '', // Copy notes
			});
			showSnack('Podatki treninga kopirani. Nastavi nov datum in shrani.');
			// Scroll to form
			setTimeout(() => {
				document.querySelector('form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}, 100);
		} catch (e) {
			showSnack(e.message, 'error');
		}
	}

	function cancelEdit() {
		setEditing(null);
		setForm({ dateTime: '', location: '', description: '', status: 'active', postponedDate: '', notes: '' });
		setErr('');
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
	const [attendanceState, setAttendanceState] = useState({});
	const [injuries, setInjuries] = useState([]);
	const [injuryForm, setInjuryForm] = useState({ playerId: '', description: '' });

	async function loadDetails(id) {
		try {
			const data = await api(`/api/trainings/${id}`, { token });
			setDetailsModal(data);
			// Initialize attendance checkboxes
			const checked = {};
			(data.attendees || []).forEach(a => {
				checked[a.id] = (data.attendance || []).some(at => at.id === a.id);
			});
			setAttendanceState(checked);
			// Load injuries for this training
			const injuriesData = await api('/api/injuries', { token }).catch(() => []);
			setInjuries(injuriesData.filter(i => i.trainingId === id));
			setInjuryForm({ playerId: '', description: '' });
		} catch (e) {
			showSnack(e.message, 'error');
		}
	}

	async function saveInjury() {
		if (!detailsModal || !injuryForm.playerId || !injuryForm.description) {
			showSnack('Izberi igralca in vnesi opis', 'error');
			return;
		}
		try {
			await api('/api/injuries', {
				method: 'POST',
				body: {
					trainingId: detailsModal.id,
					playerId: injuryForm.playerId,
					description: injuryForm.description,
				},
				token,
			});
			showSnack('Poškodba zabeležena');
			setInjuryForm({ playerId: '', description: '' });
			await loadDetails(detailsModal.id);
		} catch (e) {
			showSnack(e.message, 'error');
		}
	}

	async function toggleInjuryStatus(injuryId, currentStatus) {
		try {
			await api(`/api/injuries/${injuryId}`, {
				method: 'PATCH',
				body: { status: currentStatus === 'active' ? 'resolved' : 'active' },
				token,
			});
			showSnack(currentStatus === 'active' ? 'Poškodba označena kot ozdravljena' : 'Poškodba označena kot aktivna');
			await loadDetails(detailsModal.id);
		} catch (e) {
			showSnack(e.message, 'error');
		}
	}

	async function saveAttendance() {
		if (!detailsModal) return;
		const playerIds = Object.keys(attendanceState).filter(id => attendanceState[id]);
		try {
			await api(`/api/trainings/${detailsModal.id}/attendance`, { method: 'POST', body: { playerIds }, token });
			showSnack('Prisotnost shranjena');
			await loadDetails(detailsModal.id);
			await load();
		} catch (e) {
			showSnack(e.message, 'error');
		}
	}

	return (
		<div className="container">
			<Snackbar message={note.message} type={note.type} />
			{detailsModal && (
				<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
					<div className="card" style={{ maxWidth: 700, width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
						<div className="header">
							<h2>Podrobnosti treninga</h2>
							<button className="button" onClick={() => { setDetailsModal(null); setAttendanceState({}); setInjuries([]); setInjuryForm({ playerId: '', description: '' }); }}>✕</button>
						</div>
						<div style={{ marginBottom: 16 }}>
							<strong>{new Date(detailsModal.dateTime).toLocaleString()}</strong> · {detailsModal.location}
						</div>
						{detailsModal.description && <div style={{ marginBottom: 12 }}>{detailsModal.description}</div>}
						{detailsModal.notes && (
							<div style={{ marginBottom: 16, padding: 12, background: '#f9fafb', borderRadius: 8 }}>
								<strong>Opombe:</strong> {detailsModal.notes}
							</div>
						)}
						<div style={{ marginBottom: 16 }}>
							<strong>Prijavljeni igralci ({detailsModal.attendees.length}):</strong>
							{detailsModal.attendees.length === 0 ? (
								<div style={{ marginTop: 8, color: '#6b7280' }}>Ni prijavljenih igralcev</div>
							) : (
								<div style={{ marginTop: 12 }}>
									{new Date(detailsModal.dateTime) < new Date() ? (
										<div>
											<div style={{ marginBottom: 8, fontSize: 14, color: '#6b7280' }}>Označi prisotnost:</div>
											{detailsModal.attendees.map(a => (
												<label key={a.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 8, cursor: 'pointer' }}>
													<input type="checkbox" checked={attendanceState[a.id] || false} onChange={(e) => setAttendanceState({ ...attendanceState, [a.id]: e.target.checked })} style={{ marginRight: 8 }} />
													<span>{a.name} ({a.email})</span>
												</label>
											))}
											<button className="button" onClick={saveAttendance} style={{ marginTop: 12 }}>Shrani prisotnost</button>
										</div>
									) : (
										<ul style={{ marginTop: 8, paddingLeft: 20 }}>
											{detailsModal.attendees.map(a => (
												<li key={a.id}>{a.name} ({a.email})</li>
											))}
										</ul>
									)}
								</div>
							)}
						</div>
						{detailsModal.attendance && detailsModal.attendance.length > 0 && (
							<div style={{ marginTop: 16, padding: 12, background: '#ecfdf5', borderRadius: 8 }}>
								<strong>Prisotni ({detailsModal.attendance.length}):</strong>
								<ul style={{ marginTop: 8, paddingLeft: 20 }}>
									{detailsModal.attendance.map(a => (
										<li key={a.id}>{a.name}</li>
									))}
								</ul>
							</div>
						)}
						{new Date(detailsModal.dateTime) < new Date() && detailsModal.attendees.length > 0 && (
							<div style={{ marginTop: 16, padding: 12, background: '#fef3c7', borderRadius: 8 }}>
								<strong>Zabeleži poškodbo:</strong>
								<div style={{ marginTop: 12 }}>
									<select className="input" value={injuryForm.playerId} onChange={(e) => setInjuryForm({ ...injuryForm, playerId: e.target.value })} style={{ marginBottom: 8 }}>
										<option value="">Izberi igralca</option>
										{detailsModal.attendees.map(a => (
											<option key={a.id} value={a.id}>{a.name}</option>
										))}
									</select>
									<textarea className="input" rows={2} value={injuryForm.description} onChange={(e) => setInjuryForm({ ...injuryForm, description: e.target.value })} placeholder="Opis poškodbe..." style={{ marginBottom: 8 }} />
									<button className="button" onClick={saveInjury}>Zabeleži poškodbo</button>
								</div>
								{injuries.length > 0 && (
									<div style={{ marginTop: 16 }}>
										<strong>Zabeležene poškodbe ({injuries.length}):</strong>
										<ul style={{ marginTop: 8, paddingLeft: 20 }}>
											{injuries.map(i => (
												<li key={i.id} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
													<div style={{ flex: 1 }}>
														<strong>{i.playerName}</strong>: {i.description}
														<span className={`badge ${i.status === 'active' ? 'postponed' : 'active'}`} style={{ marginLeft: 8 }}>
															{i.status === 'active' ? 'Aktivna' : 'Ozdravljena'}
														</span>
													</div>
													<button className="button" onClick={() => toggleInjuryStatus(i.id, i.status)} style={{ fontSize: 12, padding: '4px 8px' }}>
														{i.status === 'active' ? 'Označi kot ozdravljena' : 'Označi kot aktivna'}
													</button>
												</li>
											))}
										</ul>
									</div>
								)}
							</div>
						)}
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
				<div className="row" style={{ gap: 8, marginBottom: 16 }}>
					<button className="button" onClick={() => setTab('upcoming')} style={{ background: tab === 'upcoming' ? 'var(--primary)' : '#e5e7eb', color: tab === 'upcoming' ? '#fff' : '#111827' }}>
						Prihajajoči
					</button>
					<button className="button" onClick={() => setTab('history')} style={{ background: tab === 'history' ? 'var(--primary)' : '#e5e7eb', color: tab === 'history' ? '#fff' : '#111827' }}>
						Zgodovina
					</button>
				</div>
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
						<div style={{ display: 'flex', gap: 8 }}>
							<button className="button" type="submit">{editing ? 'Shrani' : 'Dodaj'}</button>
							{editing && (
								<button className="button" type="button" onClick={cancelEdit} style={{ background: '#6b7280' }}>Prekliči</button>
							)}
						</div>
					</div>
					<div style={{ marginTop: 12 }}>
						<div className="label">Opombe</div>
						<textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Kaj prinesite s seboj, dodatne informacije..." />
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
								<th style={{ textAlign: 'left' }}>Prisotni</th>
								<th style={{ textAlign: 'right' }}>Akcije</th>
							</tr>
						</thead>
						<tbody>
							{items.filter(t => {
								const now = new Date();
								const isPast = new Date(t.dateTime) < now;
								return tab === 'upcoming' ? !isPast : isPast;
							}).length === 0 ? (
								<tr>
									<td colSpan={7} style={{ textAlign: 'center', padding: 20 }}>
										{tab === 'upcoming' ? 'Ni prihajajočih treningov' : 'Ni zgodovine treningov'}
									</td>
								</tr>
							) : (
								items.filter(t => {
									const now = new Date();
									const isPast = new Date(t.dateTime) < now;
									return tab === 'upcoming' ? !isPast : isPast;
								}).map(t => (
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
										<td>
											{tab === 'history' && (t.attendanceCount || 0) > 0 ? (
												<span style={{ color: '#16a34a', fontWeight: 600 }}>{t.attendanceCount} prisotnih</span>
											) : tab === 'history' ? (
												<span style={{ color: '#6b7280' }}>Ni prisotnih</span>
											) : (
												<span style={{ color: '#6b7280' }}>-</span>
											)}
										</td>
										<td style={{ textAlign: 'right' }}>
											<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
												<button className="button" onClick={() => copyTraining(t.id)} style={{ background: '#6366f1', fontSize: 14, padding: '8px 12px' }}>Kopiraj</button>
												<button className="button" onClick={() => edit(t.id)} style={{ fontSize: 14, padding: '8px 12px' }}>Uredi</button>
												<button className="button" onClick={() => remove(t.id)} style={{ fontSize: 14, padding: '8px 12px' }}>Izbriši</button>
											</div>
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

function PlayerTrainings({ token, user, onLogout }) {
	const [tab, setTab] = useState('upcoming'); // 'upcoming' or 'history'
	const [items, setItems] = useState([]);
	const [history, setHistory] = useState([]);
	const [loading, setLoading] = useState(true);
	const [historyLoading, setHistoryLoading] = useState(false);
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

	async function loadHistory() {
		setHistoryLoading(true);
		try {
			const data = await api('/api/trainings/history', { token });
			setHistory(data);
		} catch (e) {
			showSnack(e.message, 'error');
		} finally {
			setHistoryLoading(false);
		}
	}

	useEffect(() => { load(); }, []);
	useEffect(() => { if (tab === 'history') loadHistory(); }, [tab]);

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
				<h1 className="h1">Treningi</h1>
				<div>
					{user?.name} · {user?.role}
					<button className="button" style={{ marginLeft: 12 }} onClick={onLogout}>Odjava</button>
				</div>
			</div>

			<div className="card" style={{ marginBottom: 16 }}>
				<div className="row" style={{ gap: 8 }}>
					<button className={`button ${tab === 'upcoming' ? '' : ''}`} onClick={() => setTab('upcoming')} style={{ background: tab === 'upcoming' ? 'var(--primary)' : '#e5e7eb', color: tab === 'upcoming' ? '#fff' : '#111827' }}>
						Prihajajoči
					</button>
					<button className={`button ${tab === 'history' ? '' : ''}`} onClick={() => setTab('history')} style={{ background: tab === 'history' ? 'var(--primary)' : '#e5e7eb', color: tab === 'history' ? '#fff' : '#111827' }}>
						Zgodovina
					</button>
				</div>
			</div>

			<div className="card">
				{tab === 'upcoming' ? (
					loading ? 'Nalaganje...' : (
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
				)
				) : (
					historyLoading ? 'Nalaganje...' : (
						<table style={{ width: '100%', borderCollapse: 'collapse' }}>
							<thead>
								<tr>
									<th style={{ textAlign: 'left' }}>Datum</th>
									<th style={{ textAlign: 'left' }}>Lokacija</th>
									<th style={{ textAlign: 'left' }}>Opis</th>
									<th style={{ textAlign: 'left' }}>Trener</th>
									<th style={{ textAlign: 'left' }}>Status</th>
									<th style={{ textAlign: 'left' }}>Opombe</th>
								</tr>
							</thead>
							<tbody>
								{history.length === 0 ? (
									<tr>
										<td colSpan={6} style={{ textAlign: 'center', padding: 20 }}>Ni zgodovine treningov</td>
									</tr>
								) : (
									history.map(t => (
										<tr key={t.id}>
											<td>{new Date(t.dateTime).toLocaleString()}</td>
											<td>{t.location}</td>
											<td>{t.description}</td>
											<td>{t.trainerName}</td>
											<td>
												{!t.wasRegistered ? (
													<span style={{ color: '#6b7280' }}>Ni se prijavil</span>
												) : t.attended ? (
													<span className="badge active">Prisoten</span>
												) : (
													<span style={{ color: '#f59e0b' }}>Ni bil prisoten</span>
												)}
											</td>
											<td>{t.notes ? t.notes : '-'}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					)
				)}
			</div>
		</div>
	);
}
