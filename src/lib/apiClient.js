
function getBaseURL(path) {
  const active_paths = [
    'users/',
    'api/', // post service
  ];

  for (const x of active_paths) {
    if (path.includes(x)) {
      return import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
    }
  }

  // 🔥 FIX: default to real API, not mock
  return import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
}


function buildAuthHeader(token) {
  if (!token) return null;
  if (typeof token === 'string' && token.toLowerCase().startsWith('bearer ')) return token;
  return `Bearer ${token}`;
}

export async function apiRequest(method, path, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  const base_url = getBaseURL();

  const auth = buildAuthHeader(token);
  if (auth) headers.Authorization = auth;

  const res = await fetch(`${base_url}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error?.message || data?.message || 'Request failed');
  }

  return data;
}
