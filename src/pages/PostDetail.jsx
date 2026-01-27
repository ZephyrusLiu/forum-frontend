import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";

import PageShell from "../components/PageShell.jsx";
import { apiRequest } from "../lib/apiClient.js";
import { endpoints, formatDate, unwrapResult } from "../lib/endpoints.js";

const styles = `
  .container { max-width: 780px; margin: 0 auto; font-family: -apple-system, sans-serif; color: #1a1a1a; padding: 24px 16px; }
  .title { font-size: 2.2rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
  .meta { display: flex; align-items: center; gap: 12px; margin-bottom: 1.25rem; color: #6b6b6b; font-size: 0.95rem; }
  .avatar { width: 44px; height: 44px; border-radius: 50%; background: #f0f0f0; object-fit: cover; display:block; }
  .content { font-size: 1.05rem; line-height: 1.65; margin-bottom: 1.2rem; white-space: pre-wrap; }
  .divider { border: 0; border-top: 1px solid #eee; margin: 1.5rem 0; }

  .attachments { margin: 10px 0 20px; }
  .attachments h4 { margin: 0 0 10px; font-size: 1rem; }
  .attachment-item { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 12px; border:1px solid #eee; border-radius:12px; margin-bottom:10px; background:#fafafa; }
  .attachment-name { font-size: .95rem; color:#111; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .attachment-meta { font-size: .85rem; color:#6b6b6b; }
  .attachment-preview { margin-top: 10px; }
  .attachment-img { max-width: 100%; border-radius: 12px; display:block; border:1px solid #eee; }

  .reply { margin-bottom: 12px; }
  .reply-card { padding: 12px; border: 1px solid #f0f0f0; border-radius: 14px; background: #fff; }
  .reply-row { display:flex; gap: 10px; align-items:flex-start; }
  .reply-avatar { width: 34px; height: 34px; border-radius: 50%; background: #f0f0f0; object-fit: cover; flex: 0 0 auto; }
  .reply-main { flex:1; min-width:0; }
  .reply-meta { font-size: 0.85rem; color: #6b6b6b; margin-bottom: 6px; display:flex; justify-content:space-between; gap:12px; align-items:center; }
  .reply-meta-left { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .reply-body { font-size: 1rem; line-height: 1.55; white-space: pre-wrap; color:#111; }
  .reply-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }

  .indent { margin-left: 44px; padding-left: 12px; border-left: 2px solid #f3f3f3; margin-top: 10px; }
  .input-area { width: 100%; border: 1px solid #e0e0e0; border-radius: 12px; padding: 12px; margin-bottom: 10px; resize: none; }
  .input-area:focus { outline: none; border-color: #1a1a1a; }
  .input-area:disabled { background:#fafafa; color:#777; cursor:not-allowed; }

  .btn-black { background: #1a1a1a; color: white; border: none; padding: 8px 14px; border-radius: 999px; cursor: pointer; font-size: 0.9rem; }
  .btn-black:disabled { background: #ccc; cursor: not-allowed; }

  .btn-ghost { background: transparent; color: #1a1a1a; border: 1px solid #e6e6e6; padding: 7px 12px; border-radius: 999px; cursor: pointer; font-size: 0.9rem; text-decoration:none; display:inline-flex; align-items:center; }
  .btn-row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }

  .btn-danger { background: #b42318; color: #fff; border: 1px solid #b42318; padding: 8px 14px; border-radius: 999px; cursor: pointer; font-size: 0.9rem; }
  .btn-danger:hover { filter: brightness(0.95); }
  .btn-danger:disabled { background: #f1a7a0; border-color: #f1a7a0; cursor: not-allowed; }

  .btn-success { background: #16a34a; color: #fff; border: 1px solid #16a34a; padding: 8px 14px; border-radius: 999px; cursor: pointer; font-size: 0.9rem; }
  .btn-success:hover { filter: brightness(0.95); }
  .btn-success:disabled { background: #86efac; border-color: #86efac; cursor: not-allowed; }

  .btn-warn { background: #f59e0b; color:#111; border: 1px solid #f59e0b; padding: 8px 14px; border-radius: 999px; cursor:pointer; font-size:0.9rem; }
  .btn-warn:hover { filter: brightness(0.95); }
  .btn-warn:disabled { background:#fde68a; border-color:#fde68a; cursor:not-allowed; }

  .ghost-link { color: #6b6b6b; text-decoration: none; font-size: 0.95rem; }
  .ghost-link:hover { color: #1a1a1a; }
  .error { background:#fff4f4; border:1px solid #ffd2d2; padding:12px; border-radius:12px; margin:14px 0; color:#8a1f1f; }
  .muted { color:#6b6b6b; }

  .badge { display:inline-flex; align-items:center; gap:6px; font-size:.85rem; padding:4px 10px; border:1px solid #eee; border-radius:999px; background:#fafafa; color:#444; margin-left:10px; }

  .replying-to { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; border:1px solid #eee; border-radius:12px; background:#fafafa; margin: 0 0 10px; }
  .replying-to b { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
`;

function normalizePost(x) {
  return x?.post ?? x?.data?.post ?? x?.data ?? x ?? null;
}

function normalizeReplies(x) {
  const r = x?.replies ?? x?.data?.replies ?? x?.data ?? x;
  return Array.isArray(r) ? r : [];
}

function isNotFoundError(e) {
  const msg = String(e?.message || "").toLowerCase();
  return (
    e?.status === 404 ||
    e?.statusCode === 404 ||
    msg.includes("not found") ||
    msg.includes("404")
  );
}

function getUpdatedAt(x) {
  return x?.updatedAt || x?.updated_at || x?.lastUpdatedAt || null;
}

function isEdited(createdAt, updatedAt) {
  if (!createdAt || !updatedAt) return false;
  const c = Date.parse(createdAt);
  const u = Date.parse(updatedAt);
  if (!Number.isFinite(c) || !Number.isFinite(u)) return false;
  return u > c + 1000;
}

function getErrorMessage(e, fallback) {
  return (
    e?.data?.message ||
    e?.response?.data?.message ||
    e?.message ||
    fallback ||
    "Something went wrong"
  );
}

// ---------- fallback user fields (if your post/reply already contains them) ----------
function getUserName(x) {
  return (
    x?.userName ||
    x?.authorName ||
    x?.user?.name ||
    x?.user?.username ||
    x?.author?.name ||
    x?.author?.username ||
    "Anonymous"
  );
}

function getUserAvatarUrl(x) {
  return (
    x?.userProfileImage ||
    x?.profileImage ||
    x?.avatarUrl ||
    x?.avatar ||
    x?.user?.profileImage ||
    x?.user?.avatarUrl ||
    x?.user?.avatar ||
    x?.author?.profileImage ||
    x?.author?.avatarUrl ||
    x?.author?.avatar ||
    ""
  );
}

// ---------- user profile helpers ----------
function fullNameFromProfile(p) {
  const fn = p?.firstName || "";
  const ln = p?.lastName || "";
  const name = `${fn} ${ln}`.trim();
  return name || "Anonymous";
}

// ✅ FIX: Flask returns profileS3Key
function mediaKeyFromProfile(p) {
  return p?.profileS3Key || p?.profile_s3_key || p?.profileMediaID || "";
}

// ---------- Attachments helpers ----------
function looksLikeImage(name = "", contentType = "") {
  const ct = String(contentType || "").toLowerCase();
  if (ct.startsWith("image/")) return true;
  const n = String(name || "").toLowerCase();
  return (
    n.endsWith(".png") ||
    n.endsWith(".jpg") ||
    n.endsWith(".jpeg") ||
    n.endsWith(".gif") ||
    n.endsWith(".webp")
  );
}

function nameFromKey(key) {
  const s = String(key || "");
  const parts = s.split("/");
  return parts[parts.length - 1] || "attachment";
}

function normalizeAttachments(post) {
  const a =
    post?.attachments ||
    post?.files ||
    post?.media ||
    post?.documents ||
    post?.assets ||
    [];

  if (!Array.isArray(a)) return [];

  return a
    .map((it) => {
      if (typeof it === "string") {
        const key = it;
        return {
          id: key,
          key,
          name: nameFromKey(key),
          url: "",
          contentType: "",
          size: null,
        };
      }

      const key = it?.key || it?.path || it?.s3Key || "";
      const name =
        it?.name ||
        it?.filename ||
        it?.originalName ||
        it?.originalname ||
        (key ? nameFromKey(key) : "attachment");

      const url =
        it?.url ||
        it?.downloadUrl ||
        it?.presignedUrl ||
        it?.signedUrl ||
        it?.link ||
        it?.href ||
        "";

      const contentType = it?.contentType || it?.mimetype || it?.mimeType || "";
      const size = it?.size || it?.bytes || null;

      return {
        id: it?._id || it?.id || key || `${name}-${url}`,
        key,
        name,
        url,
        contentType,
        size,
      };
    })
    .filter((x) => x.name);
}

function formatBytes(bytes) {
  if (!Number.isFinite(Number(bytes))) return "";
  const b = Number(bytes);
  if (b < 1024) return `${b} B`;
  const kb = b / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

// ---------- Nested replies ----------
function getReplyId(r) {
  return r?._id || r?.id;
}
function getParentId(r) {
  return r?.parentReplyId || r?.parentId || r?.parentReply || null;
}

function buildReplyTree(flat) {
  const nodes = new Map();
  const roots = [];

  for (const r of flat) {
    const id = getReplyId(r);
    if (!id) continue;
    nodes.set(String(id), { ...r, __children: [] });
  }

  for (const r of flat) {
    const id = getReplyId(r);
    if (!id) continue;

    const parentId = getParentId(r);
    const node = nodes.get(String(id));

    if (parentId && nodes.has(String(parentId))) {
      nodes.get(String(parentId)).__children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortByCreatedDesc = (a, b) => {
    const ta = Date.parse(a?.createdAt || 0) || 0;
    const tb = Date.parse(b?.createdAt || 0) || 0;
    return tb - ta;
  };

  const sortDeep = (arr) => {
    arr.sort(sortByCreatedDesc);
    for (const n of arr) {
      if (Array.isArray(n.__children) && n.__children.length) sortDeep(n.__children);
    }
  };
  sortDeep(roots);

  return roots;
}

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useSelector((s) => s.auth);

  // ✅ file-service base (direct)
  const FILE_BASE = import.meta.env.VITE_FILE_SERVICE_URL || "http://localhost:5005";

  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState("");

  const [uiError, setUiError] = useState("");

  const [adminBusy, setAdminBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [recoverBusy, setRecoverBusy] = useState(false);
  const [hideBusy, setHideBusy] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);

  const [replyParentId, setReplyParentId] = useState(null);
  const [replyParentPreview, setReplyParentPreview] = useState(null);

  // attachments: key -> signed url
  const [attachmentLinks, setAttachmentLinks] = useState({});

  // ✅ NEW: profile cache + avatar url cache
  const [profilesById, setProfilesById] = useState({});
  const [avatarUrlById, setAvatarUrlById] = useState({});

  const myId = user?.id ?? user?.userId ?? user?._id ?? user?.user?._id;
  const isAdmin = user?.type === "admin" || user?.type === "super";

  const getPostOwnerId = (p) => p?.userId ?? p?.user?._id ?? p?.authorId ?? p?.ownerId;
  const postOwnerId = getPostOwnerId(post);
  const isPostOwner = Boolean(token && myId && postOwnerId && String(postOwnerId) === String(myId));

  const getReplyOwnerId = (r) => r?.userId ?? r?.user?._id ?? r?.authorId ?? r?.ownerId;

  const canEditReply = (r) => {
    if (!token) return false;
    const ownerId = getReplyOwnerId(r);
    if (!ownerId || !myId) return false;
    return String(ownerId) === String(myId);
  };

  const canDeleteReply = (r) => {
    if (!token) return false;
    const ownerId = getReplyOwnerId(r);
    const isReplyOwner = ownerId && myId && String(ownerId) === String(myId);
    return isReplyOwner || isAdmin || isPostOwner;
  };

  const stage = String(post?.stage ?? post?.status ?? "").toUpperCase();
  const isBannedPost = stage === "BANNED" || post?.isBanned === true;
  const isDeletedPost = stage === "DELETED" || post?.isDeleted === true;
  const isHiddenPost = stage === "HIDDEN" || post?.isHidden === true;
  const isArchivedPost = post?.isArchived === true || post?.isArchived === "true";
  const isPublishedPost = stage === "PUBLISHED";

  const canReply = Boolean(
    token && isPublishedPost && !isHiddenPost && !isArchivedPost && !isBannedPost && !isDeletedPost
  );

  // ---------- gateway: user profile fetch ----------
  async function fetchUserProfile(userId) {
    // ✅ through gateway: /users/:id/profile
    const raw = await apiRequest("GET", `/users/${Number(userId)}/profile`, token);
    return unwrapResult(raw);
  }

  // ---------- file-service: presign any s3 key ----------
  async function presignKey(key) {
    const res = await fetch(`${FILE_BASE}/files/url?key=${encodeURIComponent(key)}`, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Failed to get file url");
    return data?.url || data?.result?.url || "";
  }

  // ---------- Admin actions ----------
  const handleBanPost = async () => {
    if (!postId) return;
    if (!confirm("Ban this post?")) return;
    setAdminBusy(true);
    setUiError("");
    try {
      const raw = await apiRequest("POST", endpoints.banPost(postId), token);
      setPost(normalizePost(unwrapResult(raw)));
    } catch (e) {
      setUiError(getErrorMessage(e, "Ban failed"));
    } finally {
      setAdminBusy(false);
    }
  };

  const handleUnbanPost = async () => {
    if (!postId) return;
    if (!confirm("Unban this post?")) return;
    setAdminBusy(true);
    setUiError("");
    try {
      const raw = await apiRequest("POST", endpoints.unbanPost(postId), token);
      setPost(normalizePost(unwrapResult(raw)));
    } catch (e) {
      setUiError(getErrorMessage(e, "Unban failed"));
    } finally {
      setAdminBusy(false);
    }
  };

  const handleRecoverPost = async () => {
    if (!postId) return;
    if (!isAdmin) return;
    if (!confirm("Recover this deleted post?")) return;

    setRecoverBusy(true);
    setUiError("");
    try {
      const raw = await apiRequest("POST", endpoints.recoverPost(postId), token);
      setPost(normalizePost(unwrapResult(raw)));
    } catch (e) {
      setUiError(getErrorMessage(e, "Recover failed"));
    } finally {
      setRecoverBusy(false);
    }
  };

  const handleDeletePost = async () => {
    if (!postId) return;
    if (!isPostOwner) return;
    if (!confirm("Delete this post?")) return;

    setDeleteBusy(true);
    setUiError("");
    try {
      await apiRequest("DELETE", endpoints.deletePost(postId), token);
      navigate("/home");
    } catch (e) {
      setUiError(getErrorMessage(e, "Delete failed"));
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleEditPost = () => {
    if (!postId) return;
    if (!isPostOwner) return;
    navigate(`/posts/create?draftId=${encodeURIComponent(postId)}`);
  };

  const handleHidePost = async () => {
    if (!postId) return;
    if (!isPostOwner) return;
    if (!confirm("Hide this post? (Others won't see it)")) return;

    setHideBusy(true);
    setUiError("");
    try {
      const raw = await apiRequest("POST", endpoints.hidePost(postId), token);
      setPost(normalizePost(unwrapResult(raw)));
    } catch (e) {
      setUiError(getErrorMessage(e, "Hide failed"));
    } finally {
      setHideBusy(false);
    }
  };

  const handleUnhidePost = async () => {
    if (!postId) return;
    if (!isPostOwner) return;
    if (!confirm("Unhide this post?")) return;

    setHideBusy(true);
    setUiError("");
    try {
      const raw = await apiRequest("POST", endpoints.unhidePost(postId), token);
      setPost(normalizePost(unwrapResult(raw)));
    } catch (e) {
      setUiError(getErrorMessage(e, "Unhide failed"));
    } finally {
      setHideBusy(false);
    }
  };

  const handleArchivePost = async () => {
    if (!postId) return;
    if (!isPostOwner) return;
    if (!confirm("Archive this post? (Replies will be disabled)")) return;

    setArchiveBusy(true);
    setUiError("");
    try {
      const raw = await apiRequest("POST", endpoints.archivePost(postId), token);
      setPost(normalizePost(unwrapResult(raw)));
    } catch (e) {
      setUiError(getErrorMessage(e, "Archive failed"));
    } finally {
      setArchiveBusy(false);
    }
  };

  const handleUnarchivePost = async () => {
    if (!postId) return;
    if (!isPostOwner) return;
    if (!confirm("Unarchive this post? (Replies will be enabled)")) return;

    setArchiveBusy(true);
    setUiError("");
    try {
      const raw = await apiRequest("POST", endpoints.unarchivePost(postId), token);
      setPost(normalizePost(unwrapResult(raw)));
    } catch (e) {
      setUiError(getErrorMessage(e, "Unarchive failed"));
    } finally {
      setArchiveBusy(false);
    }
  };

  // ---------- LOAD POST + REPLIES ----------
  useEffect(() => {
    let alive = true;

    async function loadPublic() {
      const postRaw = await apiRequest("GET", endpoints.postDetail(postId), token);
      return normalizePost(unwrapResult(postRaw));
    }

    async function loadMine() {
      const raw = await apiRequest("GET", endpoints.getMyPostById(postId), token);
      return normalizePost(unwrapResult(raw));
    }

    async function loadAdmin() {
      const raw = await apiRequest("GET", endpoints.adminPostDetail(postId), token);
      return normalizePost(unwrapResult(raw));
    }

    async function loadRepliesSafe() {
      try {
        const repliesRaw = await apiRequest("GET", endpoints.getReplies(postId), token);
        return normalizeReplies(unwrapResult(repliesRaw));
      } catch {
        return [];
      }
    }

    async function run() {
      setStatus("loading");
      setErrorMsg("");
      setUiError("");

      try {
        let p = null;

        try {
          p = await loadPublic();
        } catch (e) {
          if (token && isNotFoundError(e) && endpoints.getMyPostById) {
            try {
              p = await loadMine();
            } catch (_) {}
          }
          if (!p && isAdmin && endpoints.adminPostDetail) {
            p = await loadAdmin();
          }
          if (!p) throw e;
        }

        if (!alive) return;
        setPost(p);

        if (token) {
          const historyPayload = {
            postId: p?.postId ?? p?._id ?? p?.id ?? postId,
            postStatus: p?.postStatus,
            status: p?.status,
            stage: p?.stage,
            isPublished: p?.isPublished,
            published: p?.published,
          };
          apiRequest("POST", endpoints.createHistory(), token, historyPayload).catch(() => {});
        }

        const r = await loadRepliesSafe();
        if (!alive) return;
        setReplies(r);

        setStatus("succeeded");
      } catch (e) {
        if (!alive) return;
        setStatus("failed");
        setErrorMsg(getErrorMessage(e, "Failed to load post"));
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [postId, token, isAdmin]);

  // ---------- Derived ----------
  const attachments = useMemo(() => normalizeAttachments(post), [post]);

  // ---------- presign attachments ----------
  useEffect(() => {
    let alive = true;

    async function run() {
      if (!token) return;

      const keys = attachments.map((a) => a.key).filter(Boolean);
      const missing = keys.filter((k) => !attachmentLinks[String(k)]);
      if (missing.length === 0) return;

      const nextMap = {};
      for (const k of missing) {
        try {
          const signed = await presignKey(k);
          if (signed) nextMap[String(k)] = signed;
        } catch {
          // ignore per-file errors
        }
      }

      if (!alive) return;
      if (Object.keys(nextMap).length) {
        setAttachmentLinks((prev) => ({ ...prev, ...nextMap }));
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [attachments, token, attachmentLinks]); // keep as-is (works)

  // ✅ NEW: load profiles (gateway) + presign avatars (file-service)
  useEffect(() => {
    let alive = true;

    async function ensureUserLoaded(uid) {
      const id = String(uid || "");
      if (!id) return;
      if (profilesById[id]) return;

      const profile = await fetchUserProfile(id);
      if (!alive) return;

      setProfilesById((prev) => ({ ...prev, [id]: profile }));

      const key = mediaKeyFromProfile(profile);
      if (key && !avatarUrlById[id]) {
        try {
          const signed = await presignKey(key);
          if (!alive) return;
          if (signed) setAvatarUrlById((prev) => ({ ...prev, [id]: signed }));
        } catch {
          // ignore avatar errors
        }
      }
    }

    async function run() {
      if (!token) return;

      const ids = new Set();

      const postUid = post?.userId ?? post?.authorId ?? post?.user?.id;
      if (postUid != null) ids.add(String(postUid));

      for (const r of Array.isArray(replies) ? replies : []) {
        const rid = r?.userId ?? r?.authorId ?? r?.user?.id;
        if (rid != null) ids.add(String(rid));
      }

      for (const id of ids) {
        if (!alive) return;
        if (!profilesById[id]) {
          try {
            await ensureUserLoaded(id);
          } catch {
            // ignore profile errors
          }
        }
      }
    }

    run();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post, replies, token]);

  const replyTree = useMemo(() => {
    const looksNested = replies?.some?.(
      (r) => Array.isArray(r?.__children) || Array.isArray(r?.children) || Array.isArray(r?.replies)
    );
    if (looksNested) {
      const mapNested = (arr) =>
        (Array.isArray(arr) ? arr : []).map((n) => ({
          ...n,
          __children: mapNested(n?.__children || n?.children || n?.replies || []),
        }));
      const top = mapNested(replies);
      top.sort(
        (a, b) => (Date.parse(b?.createdAt || 0) || 0) - (Date.parse(a?.createdAt || 0) || 0)
      );
      return top;
    }
    return buildReplyTree(replies);
  }, [replies]);

  const handleCreateReply = async () => {
    if (!replyText.trim()) return;

    setUiError("");

    if (!canReply) {
      setUiError("Replies are not allowed for this post.");
      return;
    }

    try {
      const body = { comment: replyText.trim() };
      if (replyParentId) body.parentReplyId = replyParentId;

      const raw = await apiRequest("POST", endpoints.createReply(postId), token, body);

      const payload = unwrapResult(raw);
      const created = payload?.reply ?? payload?.data?.reply ?? payload?.data ?? payload;

      setReplies((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
      setReplyText("");
      setReplyParentId(null);
      setReplyParentPreview(null);
    } catch (e) {
      setUiError(getErrorMessage(e, "Failed to create reply"));
    }
  };

  const startReplyTo = (r) => {
    const id = getReplyId(r);
    if (!id) return;
    setReplyParentId(id);
    setReplyParentPreview({
      name: getUserName(r),
      text: (r?.comment || r?.content || r?.body || "").slice(0, 120),
    });
  };

  const cancelReplyTo = () => {
    setReplyParentId(null);
    setReplyParentPreview(null);
  };

  const handleDeleteReply = async (replyId) => {
    if (!replyId) return;
    if (!confirm("Delete this reply?")) return;

    setUiError("");
    try {
      await apiRequest("DELETE", endpoints.deleteReply(replyId), token);
      setReplies((prev) =>
        Array.isArray(prev) ? prev.filter((x) => String(getReplyId(x)) !== String(replyId)) : []
      );
      if (replyParentId && String(replyParentId) === String(replyId)) cancelReplyTo();
    } catch (e) {
      setUiError(getErrorMessage(e, "Delete failed"));
    }
  };

  const handleEditReply = async (r) => {
    const replyId = getReplyId(r);
    const current = r.comment || r.content || r.body || "";
    const next = prompt("Edit reply:", current);
    if (next == null) return;

    setUiError("");
    try {
      const raw = await apiRequest("PATCH", endpoints.updateReply(replyId), token, {
        comment: next.trim(),
      });

      const payload = unwrapResult(raw);
      const updated = payload?.reply ?? payload?.data?.reply ?? payload?.data ?? payload;

      setReplies((prev) =>
        (Array.isArray(prev) ? prev : []).map((x) =>
          String(getReplyId(x)) === String(replyId) ? updated : x
        )
      );
    } catch (e) {
      setUiError(getErrorMessage(e, "Update failed"));
    }
  };

  const ReplyNode = ({ node, depth = 0 }) => {
    const id = getReplyId(node);

    const rid = String(getReplyOwnerId(node) || "");
    const rp = rid ? profilesById[rid] : null;

    const name = rp ? fullNameFromProfile(rp) : getUserName(node);
    const avatarUrl = (rid && avatarUrlById[rid]) || getUserAvatarUrl(node);

    const createdAt = node?.createdAt;
    const updatedAt = getUpdatedAt(node);

    const body =
      node?.isActive === false ? <i>Deleted</i> : node?.comment || node?.content || node?.body || "";

    const children = node?.__children || [];

    return (
      <div className="reply">
        <div className="reply-card">
          <div className="reply-row">
            {avatarUrl ? (
              <img className="reply-avatar" src={avatarUrl} alt={name} />
            ) : (
              <div className="reply-avatar" />
            )}

            <div className="reply-main">
              <div className="reply-meta">
                <span className="reply-meta-left" title={name}>
                  <b>{name}</b> • {formatDate(createdAt)}
                  {isEdited(createdAt, updatedAt) ? (
                    <>
                      {" "}
                      • <span className="muted">Edited {formatDate(updatedAt)}</span>
                    </>
                  ) : null}
                </span>

                <span className="reply-actions">
                  {canReply && node?.isActive !== false ? (
                    <button className="btn-ghost" onClick={() => startReplyTo(node)}>
                      Reply
                    </button>
                  ) : null}

                  {node?.isActive !== false && (canEditReply(node) || canDeleteReply(node)) ? (
                    <>
                      {canEditReply(node) ? (
                        <button className="btn-ghost" onClick={() => handleEditReply(node)}>
                          Edit
                        </button>
                      ) : null}
                      {canDeleteReply(node) ? (
                        <button className="btn-ghost" onClick={() => handleDeleteReply(id)}>
                          Delete
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </span>
              </div>

              <div className="reply-body">{body}</div>

              {Array.isArray(children) && children.length > 0 ? (
                <div className="indent" style={{ marginLeft: depth === 0 ? 44 : 34 }}>
                  {children.map((c) => (
                    <ReplyNode key={getReplyId(c)} node={c} depth={depth + 1} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (status === "loading") {
    return (
      <PageShell>
        <style>{styles}</style>
        <div className="container">Loading...</div>
      </PageShell>
    );
  }

  if (status === "failed") {
    return (
      <PageShell>
        <style>{styles}</style>
        <div className="container">
          <Link to="/home" className="ghost-link">
            ← Home
          </Link>
          <div className="error">{errorMsg || "Failed to load."}</div>
        </div>
      </PageShell>
    );
  }

  const renderableAttachments = (attachments || []).map((a) => {
    const k = a.key ? String(a.key) : "";
    const signed = k ? attachmentLinks[k] : "";
    return { ...a, url: a.url || signed || "" };
  });

  const postUid = String(getPostOwnerId(post) || "");
  const postProfile = postUid ? profilesById[postUid] : null;

  const postAuthorName = postProfile ? fullNameFromProfile(postProfile) : getUserName(post);
  const postAuthorAvatar = (postUid && avatarUrlById[postUid]) || getUserAvatarUrl(post);

  return (
    <PageShell>
      <style>{styles}</style>

      <div className="container">
        <Link to="/home" className="ghost-link">
          ← Home
        </Link>

        {!post ? (
          <div className="error">Post not found.</div>
        ) : (
          <>
            <header style={{ marginTop: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 className="title" style={{ marginBottom: 0 }}>
                  {post?.title || "Untitled"}
                </h1>

                {isHiddenPost ? <span className="badge">Hidden</span> : null}
                {isArchivedPost ? <span className="badge">Archived</span> : null}
                {isBannedPost ? <span className="badge">Banned</span> : null}
                {isDeletedPost ? <span className="badge">Deleted</span> : null}
              </div>

              {uiError ? <div className="error">{uiError}</div> : null}

              {isPostOwner && !isDeletedPost && !isBannedPost && (
                <div className="btn-row" style={{ marginTop: 10 }}>
                  <button className="btn-ghost" onClick={handleEditPost}>
                    Edit Post
                  </button>

                  {!isHiddenPost ? (
                    <button
                      className="btn-ghost"
                      onClick={handleHidePost}
                      disabled={hideBusy || isArchivedPost}
                      title={isArchivedPost ? "Archived posts cannot be hidden" : "Hide this post"}
                    >
                      {hideBusy ? "Hiding..." : "Hide Post"}
                    </button>
                  ) : (
                    <button
                      className="btn-ghost"
                      onClick={handleUnhidePost}
                      disabled={hideBusy || isArchivedPost}
                      title={isArchivedPost ? "Archived posts cannot be unhidden" : "Unhide this post"}
                    >
                      {hideBusy ? "Unhiding..." : "Unhide Post"}
                    </button>
                  )}

                  {!isArchivedPost ? (
                    <button className="btn-warn" onClick={handleArchivePost} disabled={archiveBusy}>
                      {archiveBusy ? "Archiving..." : "Archive Post"}
                    </button>
                  ) : (
                    <button className="btn-ghost" onClick={handleUnarchivePost} disabled={archiveBusy}>
                      {archiveBusy ? "Unarchiving..." : "Unarchive Post"}
                    </button>
                  )}

                  <button className="btn-danger" onClick={handleDeletePost} disabled={deleteBusy}>
                    {deleteBusy ? "Deleting..." : "Delete Post"}
                  </button>
                </div>
              )}

              {isAdmin && isDeletedPost && (
                <div className="btn-row" style={{ marginTop: 10 }}>
                  <button className="btn-success" onClick={handleRecoverPost} disabled={recoverBusy}>
                    {recoverBusy ? "Recovering..." : "Recover Post"}
                  </button>
                </div>
              )}

              {isAdmin && !isDeletedPost && (
                <div className="btn-row" style={{ marginTop: 10 }}>
                  {!isBannedPost ? (
                    <button className="btn-ghost" onClick={handleBanPost} disabled={adminBusy}>
                      {adminBusy ? "..." : "Ban Post"}
                    </button>
                  ) : (
                    <button className="btn-ghost" onClick={handleUnbanPost} disabled={adminBusy}>
                      {adminBusy ? "..." : "Unban Post"}
                    </button>
                  )}
                </div>
              )}

              <div className="meta" style={{ marginTop: "1rem" }}>
                {postAuthorAvatar ? (
                  <img className="avatar" src={postAuthorAvatar} alt={postAuthorName} />
                ) : (
                  <div className="avatar" />
                )}
                <div>
                  <div>{postAuthorName}</div>
                  <div style={{ fontSize: "0.85rem", opacity: 0.75 }}>
                    {formatDate(post?.createdAt)}
                    {isEdited(post?.createdAt, getUpdatedAt(post)) ? (
                      <>
                        {" "}
                        • <span className="muted">Last edited {formatDate(getUpdatedAt(post))}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </header>

            <article className="content">{post?.content || post?.body || post?.description || ""}</article>

            {renderableAttachments.length > 0 ? (
              <section className="attachments">
                <h4>Attachments ({renderableAttachments.length})</h4>

                {renderableAttachments.map((a) => {
                  const url = a.url || "";
                  const isImg = looksLikeImage(a.name, a.contentType);

                  return (
                    <div
                      key={a.id}
                      className="attachment-item"
                      style={{ flexDirection: "column", alignItems: "stretch" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <div className="attachment-name" title={a.name}>
                            {a.name}
                          </div>
                          <div className="attachment-meta">
                            {a.contentType ? a.contentType : a.key ? "s3-key" : "file"}
                            {a.size ? ` • ${formatBytes(a.size)}` : ""}
                          </div>
                        </div>

                        {url ? (
                          <a className="btn-ghost" href={url} target="_blank" rel="noreferrer">
                            Open
                          </a>
                        ) : (
                          <span className="muted" style={{ fontSize: ".9rem" }}>
                            Loading link...
                          </span>
                        )}
                      </div>

                      {url && isImg ? (
                        <div className="attachment-preview">
                          <img className="attachment-img" src={url} alt={a.name} />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </section>
            ) : null}

            <hr className="divider" />

            <section>
              <h3 style={{ marginBottom: "1rem" }}>
                Replies ({Array.isArray(replies) ? replies.length : 0})
              </h3>

              {!canReply ? (
                <div className="muted" style={{ marginBottom: 12 }}>
                  Replies are not allowed for this post.
                </div>
              ) : null}

              <div style={{ marginBottom: "1.4rem" }}>
                {replyParentId && replyParentPreview ? (
                  <div className="replying-to">
                    <div style={{ minWidth: 0 }}>
                      Replying to <b>{replyParentPreview.name}</b>
                      {replyParentPreview.text ? (
                        <span className="muted">
                          {" "}
                          — “{replyParentPreview.text}
                          {replyParentPreview.text.length >= 120 ? "…" : ""}”
                        </span>
                      ) : null}
                    </div>
                    <button className="btn-ghost" onClick={cancelReplyTo}>
                      Cancel
                    </button>
                  </div>
                ) : null}

                <textarea
                  className="input-area"
                  placeholder={
                    canReply
                      ? replyParentId
                        ? "Write your reply…"
                        : "What are your thoughts?"
                      : "Replies are disabled for this post"
                  }
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={!canReply}
                />
                <div className="btn-row">
                  <button className="btn-black" onClick={handleCreateReply} disabled={!canReply || !replyText.trim()}>
                    {replyParentId ? "Reply" : "Respond"}
                  </button>

                  {replyParentId ? (
                    <button className="btn-ghost" onClick={cancelReplyTo} disabled={!canReply}>
                      Cancel nested reply
                    </button>
                  ) : null}
                </div>
              </div>

              {replyTree.length === 0 ? (
                <div className="muted">No replies yet.</div>
              ) : (
                replyTree.map((node) => <ReplyNode key={getReplyId(node)} node={node} />)
              )}
            </section>
          </>
        )}
      </div>
    </PageShell>
  );
}
