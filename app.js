// Finder-like browser for static repos using a prebuilt manifest.json
// No API calls. No server. Works on GitHub Pages.

const state = {
  manifest: null,
  root: null,                // tree root
  cwd: "/",                  // current folder path
  selectionIndex: -1,
  showHidden: false,
  sort: "name-asc",
  query: "",
  version: null,             // commit sha from manifest
};

const els = {
  list: document.getElementById("list"),
  breadcrumb: document.getElementById("breadcrumb"),
  toggleHidden: document.getElementById("toggle-hidden"),
  sort: document.getElementById("sort"),
  search: document.getElementById("search"),
  previewTitle: document.getElementById("preview-title"),
  previewBody: document.getElementById("preview-body"),
  previewActions: document.getElementById("preview-actions"),
  statusbar: document.getElementById("statusbar"),
  repoMeta: document.getElementById("repo-meta"),
  navList: document.getElementById("nav-list"),
};

// Basic MIME/type mapping by extension
const TYPE_MAP = {
  image: ["png","jpg","jpeg","gif","webp","bmp","svg","avif"],
  video: ["mp4","webm","ogv","mov","m4v"],
  audio: ["mp3","wav","ogg","m4a","flac","aac"],
  pdf: ["pdf"],
  text: ["txt","md","markdown","json","yml","yaml","xml","csv","tsv","ini","cfg","env","gitignore","log","html","htm","css","js","ts","jsx","tsx","py","rb","rs","go","java","kt","c","h","cpp","hpp","cs","php","sh","bash","zsh","fish","r","m","mm","swift","lua","sql","pl","scala","toml"],
};

function extOf(name) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
}
function typeOf(name) {
  const e = extOf(name);
  if (!e) return "file";
  for (const [type, list] of Object.entries(TYPE_MAP)) {
    if (list.includes(e)) return type;
  }
  return "file";
}
function isHidden(name) {
  return name.startsWith(".");
}
function encodePath(p) {
  return p.split("/").map(seg => seg ? encodeURIComponent(seg) : "").join("/");
}
function pathJoin(...parts) {
  return normalizePath(parts.join("/"));
}
function normalizePath(p) {
  p = p.replace(/\/+/g, "/");
  if (!p.startsWith("/")) p = "/" + p;
  if (p !== "/" && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}
function segments(p) {
  return p === "/" ? [] : p.slice(1).split("/");
}
function parentOf(p) {
  const seg = segments(p);
  seg.pop();
  return seg.length ? "/" + seg.join("/") : "/";
}
function fileUrl(path) {
  // Serve from same origin (GitHub Pages) to avoid CORS issues.
  const base = new URL(window.location.origin + window.location.pathname);
  const root = base.pathname.endsWith("/") ? base.pathname : base.pathname + "/";
  return new URL(encodePath(path.replace(/^\//, "")), window.location.origin + root).toString();
}

function status(msg) {
  els.statusbar.textContent = msg;
}

async function main() {
  bindUI();
  await loadManifest();
  buildTree();
  restoreFromURL();
  renderAll();
  status("Ready");
  // Keyboard shortcuts
  window.addEventListener("keydown", onKey);
  window.addEventListener("popstate", () => {
    restoreFromURL();
    renderAll();
  });
}

function bindUI() {
  els.toggleHidden.addEventListener("change", () => {
    state.showHidden = els.toggleHidden.checked;
    renderList();
  });
  els.sort.addEventListener("change", () => {
    state.sort = els.sort.value;
    renderList();
  });
  els.search.addEventListener("input", () => {
    state.query = els.search.value.trim();
    state.selectionIndex = -1;
    renderBreadcrumb();
    renderList();
  });
  els.navList.addEventListener("click", (e) => {
    const li = e.target.closest(".nav-item");
    if (!li) return;
    navigateTo(li.dataset.target);
  });
}

async function loadManifest() {
  // Append cache-busting on first load; after load, rely on standard caching.
  let url = "manifest.json";
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Manifest fetch failed: ${res.status}`);
    const manifest = await res.json();
    state.manifest = manifest.files;
    state.version = manifest.version || null;
    els.repoMeta.textContent = state.version
      ? `Indexed @ ${state.version.slice(0,7)} • ${state.manifest.length} items`
      : `${state.manifest.length} items indexed`;
  } catch (err) {
    console.error(err);
    els.repoMeta.textContent = "Manifest not found. Commit and push to trigger the workflow.";
    state.manifest = [];
  }
}

function buildTree() {
  // Tree node: { name, path, isDir, size, mtime, type, children: Map<string,node> }
  const root = mkNode("", "/", true);
  for (const entry of state.manifest) {
    const p = normalizePath("/" + entry.path.replace(/^\//, ""));
    const seg = segments(p);
    let cur = root;
    for (let i = 0; i < seg.length; i++) {
      const name = seg[i];
      const isLast = i === seg.length - 1;
      const childPath = normalizePath("/" + seg.slice(0, i + 1).join("/"));
      let child = cur.children.get(name);
      if (!child) {
        child = mkNode(name, childPath, isLast ? entry.isDir : true);
        cur.children.set(name, child);
      }
      if (isLast) {
        child.isDir = !!entry.isDir === true ? true : false;
        child.size = entry.size || 0;
        child.mtime = entry.mtime || null;
        child.type = child.isDir ? "dir" : typeOf(name);
      }
      cur = child;
    }
  }
  state.root = root;
}

function mkNode(name, path, isDir) {
  return {
    name,
    path,
    isDir,
    size: 0,
    mtime: null,
    type: isDir ? "dir" : typeOf(name),
    children: new Map(),
  };
}

function restoreFromURL() {
  const u = new URL(window.location.href);
  const path = u.searchParams.get("path") || "/";
  state.cwd = normalizePath(path);
  const showHidden = u.searchParams.get("hidden");
  if (showHidden !== null) {
    state.showHidden = showHidden === "1";
    els.toggleHidden.checked = state.showHidden;
  }
  const sort = u.searchParams.get("sort");
  if (sort) {
    state.sort = sort;
    els.sort.value = sort;
  }
  const q = u.searchParams.get("q");
  if (q) {
    state.query = q;
    els.search.value = q;
  }
}

function pushURL() {
  const u = new URL(window.location.href);
  u.searchParams.set("path", state.cwd);
  if (state.showHidden) u.searchParams.set("hidden", "1"); else u.searchParams.delete("hidden");
  if (state.sort !== "name-asc") u.searchParams.set("sort", state.sort); else u.searchParams.delete("sort");
  if (state.query) u.searchParams.set("q", state.query); else u.searchParams.delete("q");
  history.pushState({}, "", u);
}

function navigateTo(path) {
  state.cwd = normalizePath(path);
  state.selectionIndex = -1;
  state.query = "";
  els.search.value = "";
  pushURL();
  renderAll();
}

function renderAll() {
  renderNav();
  renderBreadcrumb();
  renderList();
  clearPreviewIfNotVisible();
}

function renderNav() {
  const items = els.navList.querySelectorAll(".nav-item");
  items.forEach(li => {
    li.classList.toggle("active", normalizePath(li.dataset.target) === state.cwd);
  });
}

function renderBreadcrumb() {
  const bc = els.breadcrumb;
  bc.innerHTML = "";
  if (state.query) {
    const span = document.createElement("span");
    span.textContent = `Search: “${state.query}”`;
    bc.appendChild(span);
    return;
  }
  const parts = segments(state.cwd);
  const home = document.createElement("a");
  home.href = "#";
  home.textContent = "Root";
  home.addEventListener("click", (e) => { e.preventDefault(); navigateTo("/"); });
  bc.appendChild(home);
  let acc = "/";
  for (let i = 0; i < parts.length; i++) {
    const sep = document.createElement("span");
    sep.textContent = "›";
    sep.style.opacity = "0.6";
    sep.style.margin = "0 4px";
    bc.appendChild(sep);

    acc = pathJoin(acc, parts[i]);
    if (i === parts.length - 1) {
      const cur = document.createElement("span");
      cur.textContent = parts[i];
      bc.appendChild(cur);
    } else {
      const link = document.createElement("a");
      link.href = "#";
      link.textContent = parts[i];
      link.addEventListener("click", (e) => { e.preventDefault(); navigateTo(acc); });
      bc.appendChild(link);
    }
  }
}

function listChildren(path) {
  const node = getNode(path);
  if (!node || !node.isDir) return [];
  return Array.from(node.children.values());
}

function getNode(path) {
  let cur = state.root;
  if (!cur) return null;
  for (const segm of segments(path)) {
    cur = cur.children.get(segm);
    if (!cur) return null;
  }
  return cur;
}

function compare(a, b, sortKey) {
  const dirFirst = (x, y) => (x.isDir === y.isDir ? 0 : x.isDir ? -1 : 1);
  const nameCmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
  const typeCmp = a.type.localeCompare(b.type);

  switch (sortKey) {
    case "name-asc": return dirFirst(a,b) || nameCmp;
    case "name-desc": return dirFirst(a,b) || -nameCmp;
    case "size-asc": return dirFirst(a,b) || ((a.size||0)-(b.size||0)) || nameCmp;
    case "size-desc": return dirFirst(a,b) || ((b.size||0)-(a.size||0)) || nameCmp;
    case "date-asc": return dirFirst(a,b) || ((a.mtime||0)-(b.mtime||0)) || nameCmp;
    case "date-desc": return dirFirst(a,b) || ((b.mtime||0)-(a.mtime||0)) || nameCmp;
    case "type-asc": return dirFirst(a,b) || typeCmp || nameCmp;
    case "type-desc": return dirFirst(a,b) || -typeCmp || nameCmp;
    default: return dirFirst(a,b) || nameCmp;
  }
}

function formatSize(bytes) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB","MB","GB","TB"];
  let v = bytes/1024, i = 0;
  while (v >= 1024 && i < units.length-1) { v /= 1024; i++; }
  return `${v.toFixed(v>=100?0:v>=10?1:2)} ${units[i]}`;
}

function formatDate(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

function filteredItems() {
  const q = state.query.toLowerCase();
  if (!q) return listChildren(state.cwd);
  // Flatten search
  const results = [];
  function dfs(node) {
    if (!node) return;
    if (node !== state.root && node.name.toLowerCase().includes(q)) {
      results.push(node);
    }
    if (node.isDir) {
      for (const child of node.children.values()) dfs(child);
    }
  }
  dfs(getNode(state.cwd));
  return results;
}

function renderList() {
  const rows = filteredItems()
    .filter(n => state.showHidden || !isHidden(n.name))
    .sort((a,b) => compare(a,b, state.sort));

  els.list.innerHTML = "";
  rows.forEach((node, idx) => {
    const row = document.createElement("div");
    row.className = "row";
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", idx === state.selectionIndex ? "true" : "false");
    row.dataset.path = node.path;

    const icon = document.createElement("div");
    icon.className = "cell icon";
    icon.textContent = node.isDir ? "📁" : iconFor(node.type, node.name);

    const name = document.createElement("div");
    name.className = "cell name";
    name.textContent = node.name;

    const type = document.createElement("div");
    type.className = "cell type";
    type.textContent = node.isDir ? "Folder" : node.type.toUpperCase();

    const date = document.createElement("div");
    date.className = "cell date";
    date.textContent = formatDate(node.mtime);

    const size = document.createElement("div");
    size.className = "cell size";
    size.textContent = node.isDir ? "" : formatSize(node.size);

    row.append(icon, name, type, date, size);

    row.addEventListener("click", () => {
      state.selectionIndex = idx;
      renderListSelection(rows);
      if (!node.isDir) preview(node);
    });
    row.addEventListener("dblclick", () => {
      if (node.isDir) {
        navigateTo(node.path);
      } else {
        preview(node);
      }
    });
    els.list.appendChild(row);
  });

  status(`${rows.length} item${rows.length === 1 ? "" : "s"}`);
}

function renderListSelection(rows) {
  const children = Array.from(els.list.children);
  children.forEach((el, i) => el.setAttribute("aria-selected", i === state.selectionIndex ? "true" : "false"));
  const node = rows[state.selectionIndex];
  if (node && !node.isDir) preview(node);
}

function iconFor(type, name) {
  switch (type) {
    case "image": return "🖼️";
    case "video": return "🎞️";
    case "audio": return "🎵";
    case "pdf": return "📄";
    case "text": return "📄";
    default:
      return extOf(name) ? "📄" : "📦";
  }
}

function clearPreviewIfNotVisible() {
  if (!els.previewBody) return;
}

async function preview(node) {
  els.previewTitle.textContent = node.name;
  els.previewActions.innerHTML = "";
  els.previewBody.innerHTML = "";

  const url = fileUrl(node.path);
  const openBtn = document.createElement("a");
  openBtn.href = url;
  openBtn.target = "_blank";
  openBtn.rel = "noopener";
  openBtn.textContent = "Open";
  els.previewActions.appendChild(openBtn);

  if (node.isDir) {
    els.previewBody.innerHTML = `<div class="empty-preview">Folder</div>`;
    return;
  }

  const type = node.type;
  try {
    if (type === "image") {
      const img = new Image();
      img.src = url;
      img.alt = node.name;
      els.previewBody.appendChild(img);
    } else if (type === "video") {
      const v = document.createElement("video");
      v.controls = true;
      v.src = url;
      els.previewBody.appendChild(v);
    } else if (type === "audio") {
      const a = document.createElement("audio");
      a.controls = true;
      a.src = url;
      els.previewBody.appendChild(a);
    } else if (type === "pdf") {
      const iframe = document.createElement("iframe");
      iframe.src = url;
      iframe.style.border = "0";
      els.previewBody.appendChild(iframe);
    } else if (type === "text") {
      const maxBytes = 1024 * 1024; // 1MB
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      if (buf.byteLength > maxBytes) {
        const div = document.createElement("div");
        div.className = "empty-preview";
        div.textContent = `File too large to preview (${formatSize(buf.byteLength)}). Use Open to view.`;
        els.previewBody.appendChild(div);
        return;
      }
      const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
      const pre = document.createElement("pre");
      pre.textContent = text;
      els.previewBody.appendChild(pre);
    } else {
      const div = document.createElement("div");
      div.className = "empty-preview";
      div.textContent = "No preview available.";
      els.previewBody.appendChild(div);
    }
  } catch (e) {
    console.error(e);
    const div = document.createElement("div");
    div.className = "empty-preview";
    div.textContent = "Preview failed. Use Open to view.";
    els.previewBody.appendChild(div);
  }
}

function onKey(e) {
  const rows = filteredItems()
    .filter(n => state.showHidden || !isHidden(n.name))
    .sort((a,b) => compare(a,b, state.sort));

  if (e.key === "/" && document.activeElement !== els.search) {
    e.preventDefault();
    els.search.focus();
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    state.selectionIndex = Math.min(rows.length - 1, state.selectionIndex + 1);
    renderListSelection(rows);
    scrollRowIntoView(state.selectionIndex);
    return;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    state.selectionIndex = Math.max(0, state.selectionIndex - 1);
    renderListSelection(rows);
    scrollRowIntoView(state.selectionIndex);
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    const node = rows[state.selectionIndex];
    if (!node) return;
    if (node.isDir) navigateTo(node.path);
    else preview(node);
    return;
  }
  if (e.key === "Backspace" || (e.altKey && e.key === "ArrowLeft")) {
    e.preventDefault();
    if (state.cwd !== "/") navigateTo(parentOf(state.cwd));
    return;
  }
}

function scrollRowIntoView(index) {
  if (index < 0) return;
  const row = els.list.children[index];
  if (!row) return;
  const rect = row.getBoundingClientRect();
  const parentRect = els.list.getBoundingClientRect();
  if (rect.top < parentRect.top) row.scrollIntoView({ block: "nearest" });
  else if (rect.bottom > parentRect.bottom) row.scrollIntoView({ block: "nearest" });
}

document.addEventListener("DOMContentLoaded", main);
