function shouldUseMock() {
  if (typeof window === 'undefined') return false;
  return (
    import.meta.env.VITE_USE_MOCK === 'true' ||
    new URLSearchParams(window.location.search).get('mock') === '1'
  );
}

function getBaseURL() {
  if (shouldUseMock()) return 'https://mockapi.local';
  const configured = (
    import.meta.env.VITE_API_BASE_URL ??
    import.meta.env.VITE_API_BASE ??
    ''
  ).trim();
  return configured || 'http://localhost:8080';
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

  // ✅ minimal fix: if path is an absolute URL, don't prefix with base_url
  const isAbsolute = /^https?:\/\//i.test(path);
  const url = isAbsolute ? path : `${base_url}${path}`;

  const res = await fetch(url, {
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
