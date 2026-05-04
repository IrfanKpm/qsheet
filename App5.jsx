import { useState, useEffect, useRef, useCallback } from "react";

const FRAME_DELAY = 650;


const BASE_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function createShuffledMap(token) {
  const arr = BASE_MAP.split("");
  let seed = Array.from(token).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = seed % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
    seed = (seed * 31 + j) % 9973;
  }
  return {
    decodeMap: Object.fromEntries(arr.map((c, i) => [c, BASE_MAP[i]])),
  };
}

function substituteDecode(text, token) {
  if (!token) return text;
  const { decodeMap } = createShuffledMap(token);
  return Array.from(text).map((c) => decodeMap[c] ?? c).join("");
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── styles ──────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;800&family=DM+Mono:wght@300;400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:       #0d0d0f;
  --surface:  #16161a;
  --surface2: #1e1e24;
  --border:   #2a2a35;
  --accent:   #00e5a0;
  --accent2:  #7c6fff;
  --text:     #e8e8f0;
  --muted:    #6b6b80;
  --danger:   #ff4d6d;
  --sidebar-w: 240px;
  --header-h:  56px;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Syne', sans-serif;
  min-height: 100vh;
  overflow: hidden;
}

/* ── HEADER ── */
.header {
  height: var(--header-h);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 1.2rem;
  gap: .8rem;
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
}
.logo {
  font-size: 1rem;
  font-weight: 800;
  color: var(--accent);
  letter-spacing: -0.02em;
  white-space: nowrap;
  flex-shrink: 0;
}
.header-fields {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: .45rem;
  flex-wrap: nowrap;
}
.header-fields label {
  font-size: .65rem;
  color: var(--muted);
  font-family: 'DM Mono', monospace;
  white-space: nowrap;
}
.hdr-input {
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text);
  padding: .26rem .55rem;
  border-radius: 6px;
  font-family: 'DM Mono', monospace;
  font-size: .74rem;
  outline: none;
  transition: border-color .2s;
}
.hdr-input:focus { border-color: var(--accent); }
.hdr-input.api-url { width: 230px; }
.hdr-input.domain  { width: 140px; }
.hdr-input.token   { width: 110px; }

.fetch-btn {
  background: var(--accent2);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: .28rem .75rem;
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  font-size: .72rem;
  cursor: pointer;
  transition: opacity .15s, transform .1s;
  white-space: nowrap;
  flex-shrink: 0;
}
.fetch-btn:hover:not(:disabled) { opacity: .85; transform: translateY(-1px); }
.fetch-btn:disabled { opacity: .3; cursor: not-allowed; transform: none; }

/* ── BODY ── */
.app-body {
  display: flex;
  height: calc(100vh - var(--header-h));
  margin-top: var(--header-h);
}

/* ── SIDEBAR ── */
.sidebar {
  width: var(--sidebar-w);
  min-width: var(--sidebar-w);
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sidebar-head {
  padding: .8rem 1rem .5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.sidebar-head span {
  font-size: .6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--muted);
}
.clear-btn {
  font-size: .6rem;
  color: var(--muted);
  background: none;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: .15rem .4rem;
  cursor: pointer;
  font-family: 'DM Mono', monospace;
  transition: color .15s, border-color .15s;
}
.clear-btn:hover { color: var(--danger); border-color: var(--danger); }

.sidebar-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 .85rem .8rem;
  display: flex;
  flex-direction: column;
  gap: .8rem;
}
.sidebar-scroll::-webkit-scrollbar { width: 3px; }
.sidebar-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

.cat-label {
  font-size: .58rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: var(--accent2);
  margin-bottom: .3rem;
}
.tags-wrap { display: flex; flex-wrap: wrap; gap: .28rem; }

.tag-btn {
  font-family: 'DM Mono', monospace;
  font-size: .65rem;
  padding: .18rem .48rem;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: all .15s;
  line-height: 1.4;
}
.tag-btn:hover { border-color: var(--accent); color: var(--accent); }
.tag-btn.sel {
  background: var(--accent);
  border-color: var(--accent);
  color: #000;
  font-weight: 500;
}

.sel-count {
  padding: .55rem 1rem;
  font-size: .62rem;
  color: var(--muted);
  font-family: 'DM Mono', monospace;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  text-align: center;
}

/* ── VIEW ── */
.view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.view-head {
  padding: .65rem 1.1rem;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.view-count {
  font-size: .73rem;
  color: var(--muted);
  font-family: 'DM Mono', monospace;
}
.load-btn {
  background: var(--accent);
  color: #000;
  border: none;
  border-radius: 7px;
  padding: .33rem .9rem;
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  font-size: .75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: .35rem;
  transition: opacity .15s, transform .1s;
}
.load-btn:hover:not(:disabled) { opacity: .85; transform: translateY(-1px); }
.load-btn:disabled { opacity: .28; cursor: not-allowed; transform: none; }
.load-btn.loading {
  background: var(--surface2);
  color: var(--muted);
  border: 1px solid var(--border);
}
.spinner {
  width: 10px; height: 10px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── GRID ── */
.grid-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}
.grid-scroll::-webkit-scrollbar { width: 4px; }
.grid-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: .75rem;
}

/* ── CARD ── */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: fadeUp .22s ease both;
  transition: border-color .2s;
}
.card:hover { border-color: #3a3a50; }
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: none; }
}

.card-thumb {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: var(--surface2);
  overflow: hidden;
  position: relative;
}
.card-thumb iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}
.thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .3rem;
}
.thumb-placeholder span { font-size: 1.4rem; opacity: .15; }
.thumb-placeholder small {
  font-size: .52rem;
  color: var(--muted);
  font-family: 'DM Mono', monospace;
  opacity: .45;
}

.card-footer {
  padding: .5rem .6rem;
  flex: 1;
}
.card-name {
  font-size: .71rem;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── EMPTY / ERROR ── */
.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  gap: .5rem;
  font-size: .78rem;
  text-align: center;
  padding: 3rem;
}
.empty-icon { font-size: 2rem; opacity: .2; }

.err {
  margin: 1rem;
  background: rgba(255,77,109,.08);
  border: 1px solid var(--danger);
  color: var(--danger);
  padding: .55rem .9rem;
  border-radius: 8px;
  font-size: .74rem;
  font-family: 'DM Mono', monospace;
}
`;

// ─── inject CSS once ──────────────────────────────────────────────────────────
function useGlobalStyle(css) {
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = css;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function Card({ title, isLoaded, domain, token }) {
  const encodedId = substituteDecode(title.name, token);
  return (
    <div className="card">
      <div className="card-thumb">
        {isLoaded ? (
          <iframe
            src={`https://${domain}/embed/${encodedId}`}
            title={encodedId}
            allowFullScreen
          />
        ) : (
          <div className="thumb-placeholder">
            <span>▶</span>
            <small>not loaded</small>
          </div>
        )}
      </div>
      <div className="card-footer">
        <div className="card-name">{title.name}</div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App5() {
  useGlobalStyle(CSS);

  // ── config inputs (all editable in header) ──
  const [apiUrl, setApiUrl]   = useState("http://cosine-test.example/api/test");
  const [domain, setDomain]   = useState("youtube.com");
  const [token, setToken]     = useState("");

  // ── data ──
  const [categories, setCategories] = useState([]);
  const [titles, setTitles]         = useState([]);
  const [selectedTags, setSelectedTags] = useState(new Set());
  const [loadedIds, setLoadedIds]   = useState(new Set());

  // ── ui state ──
  const [isFetching, setIsFetching] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState(null);
  const loadingRef = useRef(false);

  // ── fetch from API ──
  const fetchData = useCallback(() => {
    if (!apiUrl.trim()) return;
    setIsFetching(true);
    setError(null);
    fetch(apiUrl.trim())
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setCategories(data.categories ?? []);
        setTitles(data.titles ?? []);
        setSelectedTags(new Set());
        setLoadedIds(new Set());
      })
      .catch((e) => setError(`Could not connect to API — ${e.message}`))
      .finally(() => setIsFetching(false));
  }, [apiUrl]);

  // auto-fetch on mount
  useEffect(() => { fetchData(); }, []); // eslint-disable-line

  // ── tag toggle ──
  const toggleTag = useCallback((id) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ── derived ──
  const visibleTitles = titles.filter((t) => {
    if (selectedTags.size === 0) return true;
    const ids = t.tags.map((tag) => String(tag.id));
    return Array.from(selectedTags).every((id) => ids.includes(id));
  });

  const anyUnloaded = visibleTitles.some(
    (t) => !loadedIds.has(substituteDecode(t.name, token))
  );

  // ── load iframes sequentially ──
  const loadFrames = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    const toLoad = visibleTitles.filter(
      (t) => !loadedIds.has(substituteDecode(t.name, token))
    );
    for (let i = 0; i < toLoad.length; i++) {
      const encodedId = substituteDecode(toLoad[i].name, token);
      setLoadedIds((prev) => new Set([...prev, encodedId]));
      if (i < toLoad.length - 1) await delay(FRAME_DELAY);
    }
    setIsLoading(false);
    loadingRef.current = false;
  }, [visibleTitles, loadedIds, token]);

  return (
    <>
      {/* ── HEADER ── */}
      <header className="header">
        <div className="logo">🏷️ cosine similarity</div>
        <div className="header-fields">
          <label>API URL</label>
          <input
            className="hdr-input api-url"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchData()}
            placeholder="http://cosine-test.example/api/test"
          />
          <button
            className="fetch-btn"
            onClick={fetchData}
            disabled={isFetching}
          >
            {isFetching ? "…" : "Fetch"}
          </button>

          <label style={{ marginLeft: ".5rem" }}>Domain</label>
          <input
            className="hdr-input domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="youtube.com"
          />

          <label style={{ marginLeft: ".5rem" }}>Token</label>
          <input
            className="hdr-input token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="enter token"
            type="password"
          />
        </div>
      </header>

      <div className="app-body">
        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          <div className="sidebar-head">
            <span>Filters</span>
            <button className="clear-btn" onClick={() => setSelectedTags(new Set())}>
              Clear
            </button>
          </div>

          <div className="sidebar-scroll">
            {categories.map((cat) => (
              <div key={cat.id}>
                <div className="cat-label">{cat.name}</div>
                <div className="tags-wrap">
                  {cat.tags.map((tag) => (
                    <button
                      key={tag.id}
                      className={`tag-btn${selectedTags.has(String(tag.id)) ? " sel" : ""}`}
                      onClick={() => toggleTag(String(tag.id))}
                    >
                      #{tag.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {categories.length === 0 && !error && (
              <p style={{ fontSize: ".65rem", color: "var(--muted)", fontFamily: "'DM Mono',monospace" }}>
                No categories loaded.
              </p>
            )}
          </div>

          <div className="sel-count">
            {selectedTags.size === 0
              ? "no filters"
              : `${selectedTags.size} tag${selectedTags.size > 1 ? "s" : ""} active`}
          </div>
        </aside>

        {/* ── VIEW ── */}
        <div className="view">
          <div className="view-head">
            <span className="view-count">
              {visibleTitles.length} title{visibleTitles.length !== 1 ? "s" : ""}
            </span>
            <button
              className={`load-btn${isLoading ? " loading" : ""}`}
              onClick={loadFrames}
              disabled={isLoading || !anyUnloaded}
            >
              {isLoading ? (
                <><span className="spinner" /> Loading…</>
              ) : (
                <>▶ Load Iframes</>
              )}
            </button>
          </div>

          <div className="grid-scroll">
            {error && <div className="err">⚠ {error}</div>}

            {visibleTitles.length === 0 && !error ? (
              <div className="empty">
                <div className="empty-icon">
                  {titles.length === 0 ? "📭" : "🔍"}
                </div>
                <p>
                  {titles.length === 0
                    ? "Enter your API URL and click Fetch."
                    : "No titles match the selected filters."}
                </p>
              </div>
            ) : (
              <div className="grid">
                {visibleTitles.map((title) => (
                  <Card
                    key={title.id}
                    title={title}
                    isLoaded={loadedIds.has(substituteDecode(title.name, token))}
                    domain={domain}
                    token={token}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
