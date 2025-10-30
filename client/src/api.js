const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function api(path, { method = 'GET', body, token } = {}) {
	const res = await fetch(`${API_BASE}${path}`, {
		method,
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: body ? JSON.stringify(body) : undefined,
	});

	// Handle 204 No Content and empty responses
	if (res.status === 204) return null;
	const text = await res.text();
	const json = text ? JSON.parse(text) : null;

	if (!res.ok) {
		throw new Error((json && json.error) || `HTTP ${res.status}`);
	}
	return json;
}
