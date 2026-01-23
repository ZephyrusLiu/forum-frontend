
function getBaseURL(path){
	const active_paths = [
		'users/'
	];

	for(const x of active_paths){
		if(path.includes(x)){
			return 'http://localhost:8080';
		}
	}

	return 'https://mockapi.local';
}

function buildAuthHeader(token) {
  if (!token) return null;
  if (typeof token === 'string' && token.toLowerCase().startsWith('bearer ')) return token;
  return `Bearer ${token}`;
}

export async function apiRequest(method, path, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  const base_url = getBaseURL(path);

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
