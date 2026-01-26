// Centralized endpoint map (easy to adjust when backend endpoints finalize)
export const endpoints = {
  // Post service
  listPublishedPosts: (status = 'Published') =>
    `/posts?status=${encodeURIComponent(status)}`,
  listAllPosts: () => '/posts',
  postDetail: (postId) => `/posts/${postId}`,
  updatePost: (postId) => `/posts/${postId}`,
  createPost: () => '/posts',
  createReply: (postId) => `/posts/${postId}/replies`,
  deleteReply: (replyId) => `/replies/${replyId}`,

  // User/Auth service
  userProfile: (userId) => `/users/${userId}/profile`,
  updateUserProfile: (userId) => `/users/${userId}/profile`,

  // Optional Post endpoints for Profile page (adjust if AR uses different paths)
  top3MyPosts: () => '/posts/me/top3',
  myDraftPosts: () => '/posts/me/drafts',

   // Admin endpoints
  adminListUsers: () => '/users',
  adminUpdateUserStatus: (userId) => `/users/${userId}/status`,
  adminUpdateUserRole: (userId) => `/users/${userId}/role`,
  adminListMessages: () => '/messages',
  adminUpdateMessageStatus: (messageId) => `/messages/${messageId}`,

  // Message service
  createContactMessage: () => '/contactus',

  // History service
  createHistory: () => '/history',
  listHistory: (keyword) =>
    keyword ? `/history?keyword=${encodeURIComponent(keyword)}` : '/history',
};

// Normalize backend responses (some services might wrap payloads as {result: ...})
export function unwrapResult(data) {
  if (!data) return data;
  if (Object.prototype.hasOwnProperty.call(data, 'result')) return data.result;
  return data;
}

export function formatDate(dt) {
  if (!dt) return '';
  try {
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return String(dt);
    return d.toLocaleString();
  } catch {
    return String(dt);
  }
}
