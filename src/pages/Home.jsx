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

  // ✅ used to re-fetch after admin actions
  const [reloadKey, setReloadKey] = useState(0);

  // ADMIN: 3 lists
  // USER: only published list (+ my posts merged)
  const [publishedPosts, setPublishedPosts] = useState([]);
  const [bannedPosts, setBannedPosts] = useState([]);
  const [deletedPosts, setDeletedPosts] = useState([]);

  // ✅ NEW: my posts for owner-only visibility (HIDDEN/UNPUBLISHED/BANNED)
  const [myPosts, setMyPosts] = useState([]);

  // filters + sorting (shared)
  const [creatorQuery, setCreatorQuery] = useState("");
  const [sortRepliesDir, setSortRepliesDir] = useState("desc"); // asc|desc
  const [sortCreatedDir, setSortCreatedDir] = useState("desc"); // asc|desc
  const [sortBy, setSortBy] = useState("replies"); // replies|created

  // admin section tab
  const [adminTab, setAdminTab] = useState("published"); // published|banned|deleted

  // button busy state (prevents double clicks)
  const [actionBusyId, setActionBusyId] = useState("");

  const isAdmin = user?.type === "admin" || user?.type === "super";
  const canCreate =
    user?.status === "active" || user?.type === "admin" || user?.type === "super";

  // ===== helpers =====
  function getPostId(p) {
    const id = p?._id ?? p?.id ?? p?.postId;
    return id == null ? "" : String(id);
  }

  function getStage(p) {
    const st = p?.stage ?? p?.status ?? p?.postStatus ?? "";
    return String(st).toUpperCase();
  }

  function getCreator(p) {
    return p?.userName || p?.username || p?.authorName || p?.userId || "";
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

  // ✅ stable current user id
  const myId = user?.id ?? user?.userId ?? user?._id ?? user?.user?._id;

  // ✅ owner check (post.userId stored as "7" string)
  function isOwner(p) {
    const ownerId = p?.userId ?? p?.ownerId ?? p?.authorId ?? p?.user?._id;
    if (!ownerId || !myId) return false;
    return String(ownerId) === String(myId);
  }

  function getLinkTo(p) {
    const id = getPostId(p);
    if (!id) return null;

    const stage = getStage(p);

    // drafts -> edit page
    if (stage === "UNPUBLISHED" || stage === "DRAFT") {
      return `/posts/create?draftId=${encodeURIComponent(id)}`;
    }

    // everything else -> detail page
    return `/posts/${encodeURIComponent(id)}`;
  }

  function TitleLink({ post }) {
    const to = getLinkTo(post);
    const title = post?.title || "(Untitled)";
    if (!to)
      return (
        <span className="muted">
          <b>{title}</b>
        </span>
      );

    return (
      <Link className="link" to={to}>
        <b>{title}</b>
      </Link>
    );
  }

  // ===== Admin API actions =====
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

  // ===== Fetch lists =====
  async function fetchLists({ signal } = {}) {
    setStatus("loading");
    setError("");

    try {
      // ✅ USER MODE (non-admin):
      // fetch public published + my posts, then merge in UI
      if (!isAdmin) {
        const [rawPublished, rawMine] = await Promise.all([
          apiRequest("GET", endpoints.listPublishedPosts(), token),
          // ✅ needs endpoint: getMyPosts: () => `/api/posts/me`
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

      // ✅ ADMIN MODE (unchanged)
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
      setMyPosts([]); // admin doesn’t need my list

      setStatus("succeeded");
    } catch (e) {
      if (signal?.aborted) return;
      setError(e?.message || "Failed to load posts");
      setStatus("failed");
    }
  }

  // reload lists (initial + after actions)
  useEffect(() => {
    const ctrl = new AbortController();
    fetchLists({ signal: ctrl.signal });
    return () => ctrl.abort();
  }, [token, isAdmin, reloadKey]);

  // shared filter+sort
  const applyFilterSort = useMemo(() => {
    return (list) => {
      let out = Array.isArray(list) ? [...list] : [];

      const q = creatorQuery.trim().toLowerCase();
      if (q) out = out.filter((p) => String(getCreator(p)).toLowerCase().includes(q));

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
  }, [creatorQuery, sortRepliesDir, sortCreatedDir, sortBy]);

  // ✅ USER VISIBLE:
  // - always show PUBLISHED
  // - additionally show my HIDDEN + my UNPUBLISHED + my BANNED
  // - never show other people's HIDDEN/BANNED
  // - DELETED hidden for normal users (change if you want owner to see it)
  const userVisiblePosts = useMemo(() => {
    const pub = Array.isArray(publishedPosts) ? publishedPosts : [];
    const mine = Array.isArray(myPosts) ? myPosts : [];

    // merge unique by id
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

      // anyone sees published
      if (st === "PUBLISHED") return true;

      // owner-only stages
      if (st === "HIDDEN" || st === "UNPUBLISHED" || st === "DRAFT") {
        return isOwner(p);
      }

      // ✅ NEW: banned visible to owner
      if (st === "BANNED") {
        return isOwner(p);
      }

      // keep deleted hidden for normal users
      if (st === "DELETED") return false;

      return false;
    });

    return applyFilterSort(visible);
  }, [applyFilterSort, publishedPosts, myPosts, myId]);

  // ADMIN lists
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

  function resetFilters() {
    setCreatorQuery("");
    setSortRepliesDir("desc");
    setSortCreatedDir("desc");
    setSortBy("replies");
  }

  // action cell
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

    // deleted -> recover
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
                  by <b>{getCreator(p) || "Unknown"}</b>
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

  return (
    <PageShell title="/home" subtitle={null}>
      <div className="row">
        <div className="muted">
          Logged in as <b>{user?.userId}</b>
        </div>
        <div className="spacer" />
        {canCreate ? (
          <button className="btn" onClick={() => navigate("/posts/create")}>
            Create Post
          </button>
        ) : null}
      </div>

      {/* Shared Controls */}
      <div className="row" style={{ marginTop: 12, gap: 8, flexWrap: "wrap" }}>
        <input
          className="input"
          value={creatorQuery}
          onChange={(e) => setCreatorQuery(e.target.value)}
          placeholder="Filter by creator (username/userId)"
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
