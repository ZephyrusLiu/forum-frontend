import { API_BASE_URL } from './apiClient.js';

const demoUsers = [
  { email: 'user@demo.com', sub: 1001, type: 'user', status: 'active' },
  { email: 'unverified@demo.com', sub: 3001, type: 'user', status: 'unverified' },
  { email: 'admin@demo.com', sub: 2001, type: 'admin', status: 'active' },
  { email: 'super@demo.com', sub: 9001, type: 'super', status: 'active' },
];

const demoPosts = [
  {
    id: 'p-100',
    title: 'Welcome to the Forum',
    content: 'This is a published post with a sample attachment.',
    status: 'Published',
    published: true,
    userId: '1001',
    userName: 'Demo User',
    profileImageUrl: 'https://placekitten.com/96/96',
    dateCreated: '2024-09-01T10:00:00Z',
    dateModified: '2024-09-02T12:00:00Z',
    attachments: ['https://placekitten.com/480/300'],
  },
  {
    id: 'p-101',
    title: 'Draft: Roadmap Thoughts',
    content: 'This is a draft post and should not show on /home.',
    status: 'Banned',
    published: false,
    userId: '1001',
    userName: 'Demo User',
    profileImageUrl: 'https://placekitten.com/97/97',
    dateCreated: '2024-09-03T09:30:00Z',
    attachments: [],
  },
  {
    id: 'p-103',
    title: 'Deleted: Archived Post',
    content: 'This post is deleted and only visible for admins.',
    status: 'Deleted',
    published: false,
    userId: '3001',
    userName: 'Unverified Member',
    profileImageUrl: 'https://placekitten.com/95/95',
    dateCreated: '2024-08-20T09:30:00Z',
    attachments: [],
  },
  {
    id: 'p-102',
    title: 'Published: Release Notes',
    content: 'A published announcement with multiple images.',
    status: 'Published',
    published: true,
    userId: '2001',
    userName: 'Admin Jane',
    profileImageUrl: 'https://placekitten.com/98/98',
    dateCreated: '2024-09-04T08:15:00Z',
    attachments: ['https://placekitten.com/320/200', 'https://placekitten.com/420/240'],
  },
  {
    id: 'p-104',
    title: 'Draft: Upcoming Features',
    content: 'This is a draft post.',
    status: 'Unpublished',
    published: false,
    userId: '1001',
    userName: 'Demo User',
    profileImageUrl: 'https://placekitten.com/94/94',
    dateCreated: '2024-09-05T07:45:00Z',
    attachments: [],
  },
];

const demoReplies = [
  {
    id: 'r-500',
    postId: 'p-100',
    userId: '2001',
    userName: 'Admin Jane',
    profileImageUrl: 'https://placekitten.com/64/64',
    content: 'Thanks for joining! Feel free to post questions.',
    dateCreated: '2024-09-02T14:10:00Z',
    isActive: true,
  },
  {
    id: 'r-501',
    postId: 'p-100',
    userId: '1001',
    userName: 'Demo User',
    profileImageUrl: 'https://placekitten.com/65/65',
    content: 'Happy to be here!',
    dateCreated: '2024-09-02T15:20:00Z',
    isActive: true,
  },
];

const demoHistory = [];
const demoProfiles = new Map([
  [
    '1001',
    {
      userId: '1001',
      firstName: 'Demo',
      lastName: 'User',
      email: 'user@demo.com',
      profileImageUrl: 'https://placekitten.com/120/120',
      registeredAt: '2024-08-15T09:00:00Z',
    },
  ],
  [
    '2001',
    {
      userId: '2001',
      firstName: 'Admin',
      lastName: 'Jane',
      email: 'admin@demo.com',
      profileImageUrl: 'https://placekitten.com/121/121',
      registeredAt: '2024-08-01T12:00:00Z',
    },
  ],
  [
    '3001',
    {
      userId: '3001',
      firstName: 'Unverified',
      lastName: 'Member',
      email: 'unverified@demo.com',
      profileImageUrl: 'https://placekitten.com/122/122',
      registeredAt: '2024-08-20T15:00:00Z',
    },
  ],
  [
    '9001',
    {
      userId: '9001',
      firstName: 'Super',
      lastName: 'Admin',
      email: 'super@demo.com',
      profileImageUrl: 'https://placekitten.com/123/123',
      registeredAt: '2024-07-10T08:00:00Z',
    },
  ],
]);
const demoAdminUsers = [
  { userId: '1001', email: 'user@demo.com', type: 'user', status: 'active' },
  { userId: '2001', email: 'admin@demo.com', type: 'admin', status: 'active' },
  { userId: '3001', email: 'unverified@demo.com', type: 'user', status: 'unverified' },
  { userId: '9001', email: 'super@demo.com', type: 'super', status: 'active' },
  { userId: '4001', email: 'banned@demo.com', type: 'user', status: 'banned' },
];
const demoAdminMessages = [
  {
    id: 'm-200',
    from: 'user@demo.com',
    subject: 'Please help',
    status: 'open',
    createdAt: '2024-09-05T08:00:00Z',
  },
  {
    id: 'm-201',
    from: 'admin@demo.com',
    subject: 'Resolved issue',
    status: 'closed',
    createdAt: '2024-09-04T09:30:00Z',
  },
];

function b64UrlEncode(obj) {
  const json = JSON.stringify(obj);
  const base64 = btoa(unescape(encodeURIComponent(json)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function makeJwt(payload) {
  const header = { alg: 'none', typ: 'JWT' };
  return `${b64UrlEncode(header)}.${b64UrlEncode(payload)}.`;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function readJsonBody(init) {
  try {
    if (!init?.body) return null;
    return JSON.parse(init.body);
  } catch {
    return null;
  }
}

function isPublicPath(path) {
  return (
    path.startsWith('/users/login') ||
    path.startsWith('/users/register') ||
    path.startsWith('/users/verify') ||
    path.startsWith('/users/verify-token') ||
    path.startsWith('/contactus') ||
    path.startsWith('/health')
  );
}

function isProtectedPath(path) {
  if (isPublicPath(path)) return false;
  return (
    path.startsWith('/posts') ||
    path.startsWith('/history') ||
    path.startsWith('/messages') ||
    path.startsWith('/users') ||
    path.startsWith('/replies')
  );
}

function pickClaimsByEmail(email) {
  const baseUser = demoUsers.find((u) => u.email === email);
  const adminUser = demoAdminUsers.find((u) => u.email === email);

  if (baseUser) {
    return {
      ...baseUser,
      type: adminUser?.type ?? baseUser.type,
      status: adminUser?.status ?? baseUser.status,
    };
  }

  if (adminUser) {
    return {
      email,
      sub: Number(adminUser.userId),
      type: adminUser.type,
      status: adminUser.status,
    };
  }

  return { email, sub: 1001, type: 'user', status: 'active' };
}

function getAuthPayload(headers) {
  const auth = headers?.get?.('Authorization') || headers?.Authorization || '';
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const [, payload] = token.split('.');
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function filterPublished(list) {
  return list.filter((post) => {
    const status = String(post.status || '').toLowerCase();
    return status === 'published' || post.published === true;
  });
}

function ensureHistoryRecord(userId, postId) {
  demoHistory.unshift({
    historyId: `h-${demoHistory.length + 1}`,
    userId,
    postId,
    viewDate: new Date().toISOString(),
  });
}

function getPostById(postId) {
  return demoPosts.find((post) => String(post.id) === String(postId));
}

function getRepliesByPost(postId) {
  return demoReplies.filter((reply) => String(reply.postId) === String(postId));
}

function getProfileByUserId(userId) {
  const key = String(userId || '');
  if (!demoProfiles.has(key)) {
    demoProfiles.set(key, {
      userId: key,
      firstName: 'New',
      lastName: 'User',
      email: `user${key}@demo.com`,
      profileImageUrl: 'https://placekitten.com/124/124',
      registeredAt: new Date().toISOString(),
    });
  }
  return demoProfiles.get(key);
}

let installed = false;

export default function installMockApi() {
  if (installed) return;
  installed = true;

  const realFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url;
    if (!url || !url.startsWith(API_BASE_URL)) return realFetch(input, init);

    const parsed = new URL(url, window.location.origin);
    const path = parsed.pathname;
    const method = (init.method || 'GET').toUpperCase();
    const headers = new Headers(init.headers || {});

    if (isProtectedPath(path)) {
      const payload = getAuthPayload(headers);
      if (!payload?.sub || !payload?.type || !payload?.status) {
        return jsonResponse({ error: { message: 'Unauthorized (mock)' } }, 401);
      }
      if (payload.status === 'banned') {
        return jsonResponse({ error: { message: 'User banned (mock)' } }, 403);
      }
    }

    if (method === 'POST' && path === '/users/register') {
      const body = await readJsonBody(init);
      const email = body?.email || 'user@demo.com';
      return jsonResponse({ result: { userId: email } }, 201);
    }

    if (method === 'POST' && path === '/users/login') {
      const body = await readJsonBody(init);
      const { email, password } = body || {};
      if (!email || !password) {
        return jsonResponse({ error: { message: 'Missing email/password' } }, 400);
      }
      if (password !== 'pass1234') {
        return jsonResponse({ error: { message: 'Invalid credentials' } }, 401);
      }
      const claims = pickClaimsByEmail(email);
      return jsonResponse({ token: makeJwt(claims) }, 200);
    }

    if (method === 'POST' && path === '/users/verify') {
      const body = await readJsonBody(init);
      const code = body?.code;
      if (code && code !== '123456') {
        return jsonResponse({ error: { message: 'Invalid code' } }, 400);
      }
      const payload = getAuthPayload(headers);
      const claims = {
        sub: payload?.sub || 1001,
        type: payload?.type || 'user',
        status: 'active',
      };
      return jsonResponse({ token: makeJwt(claims) }, 200);
    }

    if (method === 'GET' && path === '/users/verify-token') {
      const payload = getAuthPayload(headers);
      const claims = {
        sub: payload?.sub || 1001,
        type: payload?.type || 'user',
        status: 'active',
      };
      return jsonResponse({ token: makeJwt(claims) }, 200);
    }

    if (path === '/users') {
      if (method === 'GET') {
        return jsonResponse({ result: demoAdminUsers }, 200);
      }
    }

    if (path.startsWith('/users/') && path.endsWith('/status') && method === 'PATCH') {
      const userId = path.split('/')[2];
      const body = await readJsonBody(init);
      const nextStatus = body?.status || 'active';
      const idx = demoAdminUsers.findIndex((u) => String(u.userId) === String(userId));
      if (idx === -1) return jsonResponse({ error: { message: 'User not found' } }, 404);
      demoAdminUsers[idx] = { ...demoAdminUsers[idx], status: nextStatus };
      return jsonResponse({ result: demoAdminUsers[idx] }, 200);
    }

    if (path.startsWith('/users/') && path.endsWith('/role') && method === 'PATCH') {
      const userId = path.split('/')[2];
      const body = await readJsonBody(init);
      const nextType = body?.type || 'user';
      const idx = demoAdminUsers.findIndex((u) => String(u.userId) === String(userId));
      if (idx === -1) return jsonResponse({ error: { message: 'User not found' } }, 404);
      demoAdminUsers[idx] = { ...demoAdminUsers[idx], type: nextType };
      return jsonResponse({ result: demoAdminUsers[idx] }, 200);
    }

    if (path.startsWith('/users/') && path.endsWith('/profile')) {
      const userId = path.split('/')[2];
      if (method === 'GET') {
        const profile = getProfileByUserId(userId);
        return jsonResponse({ result: profile }, 200);
      }

      if (method === 'PUT') {
        const body = await readJsonBody(init);
        const profile = getProfileByUserId(userId);
        const updated = {
          ...profile,
          email: body?.email ?? profile.email,
          profileImageUrl: body?.profileImageUrl ?? profile.profileImageUrl,
        };
        demoProfiles.set(String(userId), updated);
        return jsonResponse({ result: updated, verificationRequired: body?.email !== profile.email }, 200);
      }
    }

    if (method === 'GET' && path === '/posts/me/top3') {
      const published = filterPublished(demoPosts);
      const withCounts = published.map((post) => ({
        ...post,
        replyCount: getRepliesByPost(post.id).length,
      }));
      const top3 = withCounts.sort((a, b) => b.replyCount - a.replyCount).slice(0, 3);
      return jsonResponse({ result: top3 }, 200);
    }

    if (method === 'GET' && path === '/posts/me/drafts') {
      const drafts = demoPosts.filter((post) => {
        const status = String(post.status || '').toLowerCase();
        return post.published === false && status !== 'banned' && status !== 'deleted';
      });
      return jsonResponse({ result: drafts }, 200);
    }

    if (method === 'GET' && path === '/posts') {
      const status = parsed.searchParams.get('status');
      const items = status ? filterPublished(demoPosts) : demoPosts;
      return jsonResponse({ result: items }, 200);
    }

    if (method === 'GET' && path.startsWith('/posts/')) {
      const postId = path.split('/')[2];
      const post = getPostById(postId);
      if (!post) return jsonResponse({ error: { message: 'Post not found' } }, 404);
      return jsonResponse({ post, replies: getRepliesByPost(postId) }, 200);
    }

    if (method === 'PATCH' && path.startsWith('/posts/')) {
      const postId = path.split('/')[2];
      const body = await readJsonBody(init);
      const post = getPostById(postId);
      if (!post) return jsonResponse({ error: { message: 'Post not found' } }, 404);
      const updated = {
        ...post,
        status: body?.status ?? post.status,
        published: body?.published ?? body?.isPublished ?? post.published,
      };
      const idx = demoPosts.findIndex((p) => String(p.id) === String(postId));
      demoPosts[idx] = updated;
      return jsonResponse({ result: updated }, 200);
    }

    if (method === 'POST' && path === '/posts') {
      const body = await readJsonBody(init);
      const payload = getAuthPayload(headers);
      const newPost = {
        id: `p-${demoPosts.length + 100}`,
        title: body?.title || '(Untitled)',
        content: body?.content || '',
        status: body?.status || 'Unpublished',
        published: body?.published ?? body?.isPublished ?? false,
        userId: String(payload?.sub || 1001),
        userName: payload?.sub === 2001 ? 'Admin Jane' : 'Demo User',
        profileImageUrl: 'https://placekitten.com/99/99',
        dateCreated: new Date().toISOString(),
        attachments: body?.attachments || body?.images || body?.imageUrls || [],
      };
      demoPosts.unshift(newPost);
      return jsonResponse({ result: newPost }, 201);
    }

    if (method === 'POST' && path.endsWith('/replies')) {
      const postId = path.split('/')[2];
      const body = await readJsonBody(init);
      const payload = getAuthPayload(headers);
      const newReply = {
        id: `r-${demoReplies.length + 500}`,
        postId,
        userId: String(payload?.sub || 1001),
        userName: payload?.sub === 2001 ? 'Admin Jane' : 'Demo User',
        profileImageUrl: 'https://placekitten.com/66/66',
        content: body?.content || body?.message || '',
        dateCreated: new Date().toISOString(),
        isActive: true,
      };
      demoReplies.unshift(newReply);
      return jsonResponse({ result: newReply }, 201);
    }

    if (method === 'DELETE' && path.startsWith('/replies/')) {
      const replyId = path.split('/')[2];
      const index = demoReplies.findIndex((r) => String(r.id) === String(replyId));
      if (index === -1) return jsonResponse({ error: { message: 'Reply not found' } }, 404);
      demoReplies.splice(index, 1);
      return jsonResponse({ result: { deleted: true } }, 200);
    }

    if (method === 'POST' && path === '/history') {
      const body = await readJsonBody(init);
      const payload = getAuthPayload(headers);
      if (!body?.postId) {
        return jsonResponse({ error: { message: 'postId is required' } }, 400);
      }
      if (body?.published === false || body?.isPublished === false) {
        return jsonResponse({ result: null, skipped: true }, 200);
      }
      ensureHistoryRecord(String(payload?.sub || 1001), String(body.postId));
      return jsonResponse({ result: demoHistory[0] }, 201);
    }

    if (method === 'GET' && path === '/history') {
      const payload = getAuthPayload(headers);
      const userId = String(payload?.sub || 1001);
      const items = demoHistory.filter((h) => String(h.userId) === userId);
      return jsonResponse({ result: items }, 200);
    }

    if (path === '/messages') {
      if (method === 'GET') {
        return jsonResponse({ result: demoAdminMessages }, 200);
      }
    }

    if (path.startsWith('/messages/') && path.endsWith('/status') && method === 'PATCH') {
      const messageId = path.split('/')[2];
      const body = await readJsonBody(init);
      const nextStatus = body?.status || 'open';
      const idx = demoAdminMessages.findIndex((m) => String(m.id) === String(messageId));
      if (idx === -1) return jsonResponse({ error: { message: 'Message not found' } }, 404);
      demoAdminMessages[idx] = { ...demoAdminMessages[idx], status: nextStatus };
      return jsonResponse({ result: demoAdminMessages[idx] }, 200);
    }

    return jsonResponse({ error: { message: 'Unhandled mock route' } }, 404);
  };

  window.__mockApi = {
    reset() {
      demoHistory.splice(0, demoHistory.length);
    },
    seed() {
      if (demoHistory.length === 0) {
        ensureHistoryRecord('1001', 'p-100');
        ensureHistoryRecord('1001', 'p-102');
      }
    },
  };
}
