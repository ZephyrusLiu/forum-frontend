// Centralized endpoint map (easy to adjust when backend endpoints finalize)
export const endpoints = {
  // Post service
listPublishedPosts: (status = "Published") =>
  `/api/posts?status=${encodeURIComponent(status)}`,

listAllPosts: () => "/api/posts",

getPost: (postId) => `/api/posts/${postId}`,
postDetail: (postId) => `/api/posts/${postId}`, // same as getPost (keep one if you want)

getMyPostById: (id) => `/api/posts/me/${id}`,

updatePost: (postId) => `/api/posts/${postId}`,
createPost: () => "/api/posts",
getMyPosts: () => `/api/posts/me`,


createReply: (postId) => `/api/posts/${postId}/replies`,
getReplies: (postId) => `/api/posts/${postId}/replies`,

deleteReply: (replyId) => `/api/replies/${replyId}`,
deletePost: (postId) => `/api/posts/${postId}`,

publishPost: (id) => `/api/posts/${id}/publish`,
createAndPublishPost: () => "/api/posts/publish",
updateReply: (replyId) => `/api/replies/${replyId}`,

banPost: (postId) => `/api/admin/posts/${postId}/ban`,
unbanPost: (postId) => `/api/admin/posts/${postId}/unban`,

adminBannedPosts: () => "/api/admin/posts/banned",
adminDeletedPosts: () => "/api/admin/posts/deleted",

adminPostDetail: (postId) => `/api/admin/posts/${postId}`,

recoverPost: (postId) => `/api/admin/posts/${postId}/recover`,

archivePost: (postId) => `/api/posts/${postId}/archive`,
unarchivePost: (postId) => `/api/posts/${postId}/unarchive`,
hidePost: (postId) => `/api/posts/${postId}/hide`,
unhidePost: (postId) => `/api/posts/${postId}/unhide`,

  // File service (direct)
  requestImageUpload: () => 'http://localhost:4003/files/upload',





  // TODO: add missing users endpoint
  userLogin: () => `/users/login`,
  userRegister: () => `/users/register`,
  userReverify: () => `/users/reverify`,
  userVerifyToken: (token) => `/users/verify?token=${encodeURIComponent(token)}`,
  userVerifyCode: (code) => `/users/verify?code=${encodeURIComponent(code)}`,



  // User/Auth service
  userProfile: (userId) => `/users/${userId}/profile`,
  updateUserProfile: (userId) => `/users/${userId}/profile`,

  // Optional Post endpoints for Profile page (adjust if AR uses different paths)
  top3MyPosts: () => '/api/me/posts/top',
  myDraftPosts: () => '/api/me/posts/drafts',

   // Admin endpoints
  adminListUsers: () => '/users/list',
  adminUpdateUserStatus: (userId) => `/users/${userId}/profile`,
  adminUpdateUserRole: (userId) => `/users/${userId}/profile`,


  adminListMessages: () => '/messages',
  adminUpdateMessageStatus: (messageId) => `/messages/${messageId}`,

  // Message service
  createContactMessage: () => '/contactus',

  // History service
  createHistory: () => '/history',
  listHistory: (keyword, date) => {
    const params = new URLSearchParams();
    if (keyword) params.set('keyword', keyword);
    if (date) params.set('date', date);
    const query = params.toString();
    return query ? `/history?${query}` : '/history';
  },
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
