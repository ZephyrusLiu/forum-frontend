import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import PageShell from "../components/PageShell.jsx";
import { apiRequest } from "../lib/apiClient.js";
import { endpoints, formatDate, unwrapResult } from "../lib/endpoints.js";

export default function Home() {
  const navigate = useNavigate();
  const { token, user } = useSelector((s) => s.auth);

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  const [publishedPosts, setPublishedPosts] = useState([]);
  const [bannedPosts, setBannedPosts] = useState([]);
  const [deletedPosts, setDeletedPosts] = useState([]);

  const [myPosts, setMyPosts] = useState([]);

  // ✅ profile cache: userId -> profile
  const [profilesById, setProfilesById] = useState(() => new Map());

  // ✅ my profile for "Logged in as"
  const [myProfile, setMyProfile] = useState(null);
  const [profileStatus, setProfileStatus] = useState("idle");
  const [profileError, setProfileError] = useState("");

  const [creatorQuery, setCreatorQuery] = useState("");
  const [sortRepliesDir, setSortRepliesDir] = useState("desc");
  const [sortCreatedDir, setSortCreatedDir] = useState("desc");
  const [sortBy, setSortBy] = useState("replies");

  const [adminTab, setAdminTab] = useState("published");
  const [actionBusyId, setActionBusyId] = useState("");

  const isAdmin = user?.type === "admin" || user?.type === "super";
  const canCreate =
    user?.status === "active" || user?.type === "admin" || user?.type === "super";

  // ✅ stable current user id
  const myId = user?.id ?? user?.userId ?? user?._id ?? user?.user?._id;

  // ✅ reset cache when user changes (login as other user)
  useEffect(() => {
    setProfilesById(new Map());
    setMyProfile(null);
    setProfileStatus("idle");
    setProfileError("");
  }, [token, myId]);

  function getPostId(p) {
    const id = p?._id ?? p?.id ?? p?.postId;
    return id == null ? "" : String(id);
  }

  function getStage(p) {
    const st = p?.stage ?? p?.status ?? p?.postStatus ?? "";
    return String(st).toUpperCase();
  }

  function getRepliesCount(p) {
    const v = p?.repliesCount ?? p?.replyCount ?? p?.replies ?? p?.numReplies;
    if (typeof v === "number") return v;
    if (Array.isArray(v)) return v.length;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function getCreatedTs(p) {
    const d = p?.createdAt || p?.created_at || p?.dateCreated;
    const t = d ? Date.parse(d) : NaN;
    return Number.isFinite(t) ? t : 0;
  }

  function getOwnerId(p) {
    const ownerId =
      p?.userId ?? p?.ownerId ?? p?.authorId ?? p?.user?.id ?? p?.user?._id;
    return ownerId == null ? "" : String(ownerId);
  }

  function isOwner(p) {
    const ownerId = getOwnerId(p);
    if (!ownerId || !myId) return false;
    return String(ownerId) === String(myId);
  }

  function makeFullName(profile) {
    const first = (profile?.firstName || "").trim();
    const last = (profile?.lastName || "").trim();
    return `${first} ${last}`.trim();
  }

  function getCreatorDisplay(p) {
    const already =
      p?.userName ||
      p?.username ||
      p?.authorName ||
      p?.user?.userName ||
      p?.user?.username ||
      p?.user?.name;

    if (already) return already;

    const uid = getOwnerId(p);
    if (!uid) return "Unknown";

    const prof = profilesById.get(String(uid));
    const full = makeFullName(prof);
    if (full) return full;

    return uid; // fallback until profile arrives
  }

  function matchesSearch(p, qLower) {
    if (!qLower) return true;

    const hay = [
      p?.title,
      p?.content,
      p?.body,
      getCreatorDisplay(p),
      p?.userId,
      p?._id,
      p?.id,
      p?.postId,
      getStage(p),
    ]
      .filter(Boolean)
      .map((x) => String(x).toLowerCase())
      .join(" ");

    return hay.includes(qLower);
  }

  function getLinkTo(p) {
    const id = getPostId(p);
    if (!id) return null;

    const stage = getStage(p);

    if (stage === "UNPUBLISHED" || stage === "DRAFT") {
      return `/posts/create?draftId=${encodeURIComponent(id)}`;
    }

    return `/posts/${encodeURIComponent(id)}`;
  }

  function TitleLink({ post }) {
    const to = getLinkTo(post);
    const title = post?.title || "(Untitled)";

    if (!to) {
      return (
        <span className="muted">
          <b>{title}</b>
        </span>
      );
    }

    return (
      <Link className="link" to={to}>
        <b>{title}</b>
      </Link>
    );
  }

  // ===== Profile fetch (my profile) =====
  async function fetchMyProfile({ signal } = {}) {
    if (!token || !myId) return;

    setProfileStatus("loading");
    setProfileError("");

    try {
      const raw = await apiRequest("GET", endpoints.userProfile(myId), token);
      const data = unwrapResult(raw);

      if (signal?.aborted) return;

      setMyProfile(data || null);
      setProfileStatus("succeeded");

      // ✅ cache myself too
      setProfilesById((prev) => {
        const next = new Map(prev);
        next.set(String(myId), data || null);
        return next;
      });
    } catch (e) {
      if (signal?.aborted) return;
      setMyProfile(null);
      setProfileError(e?.message || "Failed to load profile");
      setProfileStatus("failed");
    }
  }

  useEffect(() => {
    const ctrl = new AbortController();
    fetchMyProfile({ signal: ctrl.signal });
    return () => ctrl.abort();
  }, [token, myId]);

  async function doBan(postId) {
    const raw = await apiRequest("POST", endpoints.banPost(postId), token);
    return unwrapResult(raw);
  }
  async function doUnban(postId) {
    const raw = await apiRequest("POST", endpoints.unbanPost(postId), token);
    return unwrapResult(raw);
  }
  async function doRecover(postId) {
    const raw = await apiRequest("POST", endpoints.recoverPost(postId), token);
    return unwrapResult(raw);
  }

  async function fetchLists({ signal } = {}) {
    setStatus("loading");
    setError("");

    try {
      if (!isAdmin) {
        const [rawPublished, rawMine] = await Promise.all([
          apiRequest("GET", endpoints.listPublishedPosts(), token),
          apiRequest("GET", endpoints.getMyPosts(), token),
        ]);

        if (signal?.aborted) return;

        const publishedData = unwrapResult(rawPublished);
        const mineData = unwrapResult(rawMine);

        const pubList = Array.isArray(publishedData)
          ? publishedData
          : publishedData?.items || publishedData?.posts || [];

        const mineList = Array.isArray(mineData)
          ? mineData
          : mineData?.items || mineData?.posts || [];

        setPublishedPosts(pubList);
        setMyPosts(mineList);

        setBannedPosts([]);
        setDeletedPosts([]);
        setStatus("succeeded");
        return;
      }

      const [rawAll, rawBanned, rawDeleted] = await Promise.all([
        apiRequest("GET", endpoints.listAllPosts(), token),
        apiRequest("GET", endpoints.adminBannedPosts(), token),
        apiRequest("GET", endpoints.adminDeletedPosts(), token),
      ]);

      if (signal?.aborted) return;

      const allData = unwrapResult(rawAll);
      const bannedData = unwrapResult(rawBanned);
      const deletedData = unwrapResult(rawDeleted);

      const allList = Array.isArray(allData)
        ? allData
        : allData?.items || allData?.posts || [];
      const bannedList = Array.isArray(bannedData)
        ? bannedData
        : bannedData?.items || bannedData?.posts || [];
      const deletedList = Array.isArray(deletedData)
        ? deletedData
        : deletedData?.items || deletedData?.posts || [];

      setPublishedPosts(allList.filter((p) => getStage(p) === "PUBLISHED"));
      setBannedPosts(bannedList);
      setDeletedPosts(deletedList);
      setMyPosts([]);

      setStatus("succeeded");
    } catch (e) {
      if (signal?.aborted) return;
      setError(e?.message || "Failed to load posts");
      setStatus("failed");
    }
  }

  useEffect(() => {
    const ctrl = new AbortController();
    fetchLists({ signal: ctrl.signal });
    return () => ctrl.abort();
  }, [token, isAdmin, reloadKey]);

  const applyFilterSort = useMemo(() => {
    return (list) => {
      let out = Array.isArray(list) ? [...list] : [];

      const qLower = creatorQuery.trim().toLowerCase();
      if (qLower) out = out.filter((p) => matchesSearch(p, qLower));

      out.sort((a, b) => {
        const ar = getRepliesCount(a);
        const br = getRepliesCount(b);
        const at = getCreatedTs(a);
        const bt = getCreatedTs(b);

        if (sortBy === "created") {
          if (at !== bt) return sortCreatedDir === "asc" ? at - bt : bt - at;
          return sortRepliesDir === "asc" ? ar - br : br - ar;
        }

        if (ar !== br) return sortRepliesDir === "asc" ? ar - br : br - ar;
        return sortCreatedDir === "asc" ? at - bt : bt - at;
      });

      return out;
    };
  }, [creatorQuery, sortRepliesDir, sortCreatedDir, sortBy, profilesById]);

  const userVisiblePosts = useMemo(() => {
    const pub = Array.isArray(publishedPosts) ? publishedPosts : [];
    const mine = Array.isArray(myPosts) ? myPosts : [];

    const map = new Map();
    for (const p of pub) {
      const id = getPostId(p);
      if (id) map.set(id, p);
    }
    for (const p of mine) {
      const id = getPostId(p);
      if (id) map.set(id, p);
    }

    const merged = [...map.values()];

    const visible = merged.filter((p) => {
      const st = getStage(p);

      if (st === "PUBLISHED") return true;

      if (st === "HIDDEN" || st === "UNPUBLISHED" || st === "DRAFT") {
        return isOwner(p);
      }

      if (st === "BANNED") return isOwner(p);

      if (st === "DELETED") return false;

      return false;
    });

    return applyFilterSort(visible);
  }, [applyFilterSort, publishedPosts, myPosts, myId]);

  const adminPublishedVisible = useMemo(
    () => applyFilterSort(publishedPosts),
    [applyFilterSort, publishedPosts]
  );
  const adminBannedVisible = useMemo(
    () => applyFilterSort(bannedPosts),
    [applyFilterSort, bannedPosts]
  );
  const adminDeletedVisible = useMemo(
    () => applyFilterSort(deletedPosts),
    [applyFilterSort, deletedPosts]
  );

  // ✅ fetch profiles for all userIds appearing in current lists
  useEffect(() => {
    if (!token) return;
    if (status !== "succeeded") return;

    const listForScreen = isAdmin
      ? adminTab === "published"
        ? adminPublishedVisible
        : adminTab === "banned"
          ? adminBannedVisible
          : adminDeletedVisible
      : userVisiblePosts;

    const ids = new Set();
    for (const p of listForScreen || []) {
      const uid = getOwnerId(p);
      if (uid) ids.add(String(uid));
    }

    const missing = [];
    for (const id of ids) {
      if (!profilesById.has(id)) missing.push(id);
    }
    if (missing.length === 0) return;

    let cancelled = false;

    (async () => {
      const results = await Promise.all(
        missing.map(async (id) => {
          try {
            // ✅ FIX: apiRequest has no 4th arg for signal/options
            const raw = await apiRequest("GET", endpoints.userProfile(id), token);
            const data = unwrapResult(raw);
            return [id, data || null];
          } catch {
            return [id, null];
          }
        })
      );

      if (cancelled) return;

      setProfilesById((prev) => {
        const next = new Map(prev);
        for (const [id, prof] of results) next.set(String(id), prof);
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    token,
    status,
    isAdmin,
    adminTab,
    userVisiblePosts,
    adminPublishedVisible,
    adminBannedVisible,
    adminDeletedVisible,
    profilesById,
  ]);

  function resetFilters() {
    setCreatorQuery("");
    setSortRepliesDir("desc");
    setSortCreatedDir("desc");
    setSortBy("replies");
  }

  function AdminActionCell({ post, mode }) {
    const pid = getPostId(post);
    const stage = getStage(post);
    if (!isAdmin || !pid) return null;

    const busy = actionBusyId === pid;

    if (mode === "published") {
      const isBanned = stage === "BANNED" || post?.isBanned === true;
      return (
        <button
          className="btn btn--secondary"
          disabled={busy}
          onClick={async () => {
            setActionBusyId(pid);
            try {
              if (isBanned) await doUnban(pid);
              else await doBan(pid);
              setReloadKey((k) => k + 1);
            } catch (e) {
              alert(e?.message || "Action failed");
            } finally {
              setActionBusyId("");
            }
          }}
          title={isBanned ? "Unban post" : "Ban post"}
        >
          {busy ? "..." : isBanned ? "Unban" : "Ban"}
        </button>
      );
    }

    if (mode === "banned") {
      return (
        <button
          className="btn btn--secondary"
          disabled={busy}
          onClick={async () => {
            setActionBusyId(pid);
            try {
              await doUnban(pid);
              setReloadKey((k) => k + 1);
            } catch (e) {
              alert(e?.message || "Unban failed");
            } finally {
              setActionBusyId("");
            }
          }}
          title="Unban post"
        >
          {busy ? "..." : "Unban"}
        </button>
      );
    }

    return (
      <button
        className="btn btn--secondary"
        disabled={busy}
        onClick={async () => {
          setActionBusyId(pid);
          try {
            await doRecover(pid);
            setReloadKey((k) => k + 1);
          } catch (e) {
            alert(e?.message || "Recover failed");
          } finally {
            setActionBusyId("");
          }
        }}
        title="Recover post"
      >
        {busy ? "..." : "Recover"}
      </button>
    );
  }

  function PostsList({ items, mode }) {
    if (items.length === 0) return <div className="muted">No posts.</div>;

    return (
      <div className="list">
        {items.map((p) => {
          const pid = getPostId(p);
          return (
            <div key={pid || `${p.title}-${p.createdAt}`} className="listItem">
              <div
                className="listItem__top"
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <TitleLink post={p} />
                </div>

                <span className="pill">
                  {getStage(p) || (mode || "PUBLISHED").toUpperCase()}
                </span>

                {isAdmin ? <AdminActionCell post={p} mode={mode} /> : null}
              </div>

              <div className="muted">
                <span>
                  by <b>{getCreatorDisplay(p) || "Unknown"}</b>
                </span>
                <span className="dot">•</span>
                <span>{formatDate(p.dateCreated || p.createdAt || p.created_at)}</span>
                <span className="dot">•</span>
                <span>{getRepliesCount(p)} replies</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const myDisplayName =
    makeFullName(myProfile) ||
    user?.userName ||
    user?.username ||
    user?.name ||
    user?.userId ||
    "";

  return (
    <PageShell title="/home" subtitle={null}>
      <div className="row">
        <div className="muted">
          Logged in as <b>{myDisplayName || "Unknown"}</b>
          {profileStatus === "loading" ? (
            <span className="muted" style={{ marginLeft: 8 }}>
              (loading profile…)
            </span>
          ) : null}
        </div>

        <div className="spacer" />

        {canCreate ? (
          <button className="btn" onClick={() => navigate("/posts/create")}>
            Create Post
          </button>
        ) : null}
      </div>

      {profileStatus === "failed" ? (
        <div className="muted" style={{ marginTop: 6 }}>
          Profile error: {profileError}
        </div>
      ) : null}

      <div className="row" style={{ marginTop: 12, gap: 8, flexWrap: "wrap" }}>
        <input
          className="input"
          value={creatorQuery}
          onChange={(e) => setCreatorQuery(e.target.value)}
          placeholder="Search (title/content/creator/userId)"
          style={{ minWidth: 260 }}
        />

        <button
          className="btn"
          onClick={() => {
            setSortBy("replies");
            setSortRepliesDir((d) => (d === "asc" ? "desc" : "asc"));
          }}
          title="Sort by replies count"
        >
          Replies: {sortRepliesDir === "asc" ? "Ascending" : "Descending"}
        </button>

        <button
          className="btn"
          onClick={() => {
            setSortBy("created");
            setSortCreatedDir((d) => (d === "asc" ? "desc" : "asc"));
          }}
          title="Sort by created date"
        >
          Created: {sortCreatedDir === "asc" ? "Ascending" : "Descending"}
        </button>

        <button className="btn btn--secondary" onClick={resetFilters}>
          Reset
        </button>
      </div>

      {status === "loading" ? <div className="muted">Loading…</div> : null}
      {status === "failed" ? <div className="error">Error: {error}</div> : null}

      {status === "succeeded" ? (
        isAdmin ? (
          <>
            <div className="row" style={{ marginTop: 14, gap: 8, flexWrap: "wrap" }}>
              <button
                className={`btn ${adminTab === "published" ? "" : "btn--secondary"}`}
                onClick={() => setAdminTab("published")}
              >
                Published
              </button>
              <button
                className={`btn ${adminTab === "banned" ? "" : "btn--secondary"}`}
                onClick={() => setAdminTab("banned")}
              >
                Banned
              </button>
              <button
                className={`btn ${adminTab === "deleted" ? "" : "btn--secondary"}`}
                onClick={() => setAdminTab("deleted")}
              >
                Deleted
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              {adminTab === "published" ? (
                <PostsList items={adminPublishedVisible} mode="published" />
              ) : null}

              {adminTab === "banned" ? (
                <PostsList items={adminBannedVisible} mode="banned" />
              ) : null}

              {adminTab === "deleted" ? (
                <PostsList items={adminDeletedVisible} mode="deleted" />
              ) : null}
            </div>
          </>
        ) : (
          <PostsList items={userVisiblePosts} mode="published" />
        )
      ) : null}
    </PageShell>
  );
}
