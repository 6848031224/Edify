// -----------------------
// Finder Pro - script.js
// -----------------------

let files = [];
let currentPath = "";
let viewMode = "icon";
let sortConfig = { key: "name", order: "asc" };
let searchTerm = "";
let selectedItems = new Set();
let renamingItem = null;

// Keyboard nav state
let visibleFiles = [];
let focusedIndex = -1; // index in visibleFiles or -1 when none

// Recursively flatten the nested tree into a single array with paths
function flattenTree(node, parentPath = "") {
  const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
  const entry = {
    name: node.name,
    type: node.type,
    path: currentPath,
    modified: node.modified || null,
    size: node.size || null,
    url: node.url || null,
  };

  let list = [entry];
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      list = list.concat(flattenTree(child, currentPath));
    }
  }
  return list;
}

async function loadFiles(path = "") {
  try {
    const res = await fetch("files.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const root = await res.json();

    const allFiles = flattenTree(root);
    currentPath = path;
    const depth = path ? path.split("/").filter(Boolean).length + 1 : 1;

    files = allFiles.filter(
      (f) =>
        f.path.startsWith(path) &&
        f.path.split("/").filter(Boolean).length === depth,
    );

    // Reset keyboard focus when navigating folders
    focusedIndex = -1;
    render();
  } catch (err) {
    console.error("Error loading files:", err);
    files = [];
    focusedIndex = -1;
    render();
  }
}

function sortFiles(a, b) {
  // folders first
  if (a.type !== b.type) return a.type === "folder" ? -1 : 1;

  // compare value
  let result;
  const { key, order } = sortConfig;
  if (key === "name" || key === "type") {
    result = (a[key] || "").localeCompare(b[key] || "");
  } else if (key === "size") {
    result = (a.size || 0) - (b.size || 0);
  } else if (key === "date") {
    result = new Date(a.modified) - new Date(b.modified);
  }

  // stable fallback on name for equal
  if (result === 0) result = a.name.localeCompare(b.name);

  // flip for descending
  return order === "asc" ? result : -result;
}

// Get matching icon path for a file
function getIconForFile(file) {
  if (file.type === "folder") return "icons/FOLDER.svg";
  const ext = file.name.includes(".")
    ? file.name.split(".").pop().toUpperCase()
    : "";
  const availableIcons = [
    "AI",
    "AVI",
    "BMP",
    "CRD",
    "CSV",
    "DLL",
    "DOC",
    "DOCX",
    "DWG",
    "EPS",
    "EXE",
    "FLV",
    "FOLDER",
    "GIFF",
    "HTML",
    "ISO",
    "JAVA",
    "JPG",
    "MDB",
    "MID",
    "MOV",
    "MP3",
    "MP4",
    "MPEG",
    "PDF",
    "PNG",
    "PPT",
    "PS",
    "PSD",
    "PUB",
    "RAR",
    "RAW",
    "RSS",
    "SVG",
    "TIFF",
    "TXT",
    "WAV",
    "WMA",
    "XML",
    "XSL",
    "ZIP",
  ];
  if (availableIcons.includes(ext)) {
    return `icons/${ext}.svg`;
  }
  return "icons/TXT.svg"; // fallback
}

function render() {
  const view = document.getElementById("file-view");
  if (!view) return;
  view.innerHTML = "";

  let filtered = (files || [])
    .filter((f) => (f.name || "").toLowerCase().includes(searchTerm))
    .sort(sortFiles);

  // Expose for keyboard navigation
  visibleFiles = filtered;

  // Keep focusedIndex aligned with current selection if possible
  if (selectedItems.size === 1) {
    const selName = [...selectedItems][0];
    const idx = visibleFiles.findIndex((f) => f.name === selName);
    if (idx !== -1) {
      focusedIndex = idx;
    } else if (visibleFiles.length === 0) {
      focusedIndex = -1;
    } else {
      focusedIndex = Math.min(focusedIndex, visibleFiles.length - 1);
    }
  } else {
    // No single selection; clamp or reset focus
    focusedIndex = Math.min(focusedIndex, visibleFiles.length - 1);
    if (visibleFiles.length === 0) focusedIndex = -1;
  }

  filtered.forEach((file, idx) => {
    const item = document.createElement("div");
    item.className = `item ${viewMode}`;
    item.dataset.name = file.name;

    const icon = document.createElement("img");
    icon.src = getIconForFile(file);
    icon.alt = file.type;
    icon.className = "file-icon";

    const name = document.createElement("span");
    name.textContent = file.name;
    name.className = "filename";

    // Inline rename mode
    if (renamingItem === file.name) {
      const input = document.createElement("input");
      input.type = "text";
      input.value = file.name;
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          file.name = input.value.trim() || file.name;
          renamingItem = null;
          render();
        } else if (e.key === "Escape") {
          renamingItem = null;
          render();
        }
      });
      name.innerHTML = "";
      name.appendChild(input);
      setTimeout(() => input.focus(), 0);
    }

    // Selection click
    item.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey) {
        toggleSelect(file.name);
        if (selectedItems.size === 1) focusedIndex = idx;
      } else {
        clearSelection();
        toggleSelect(file.name);
        focusedIndex = idx;
      }
    });

    // Double-click: open folder or file in new tab
    item.addEventListener("dblclick", () => {
      openEntry(file);
    });

    item.appendChild(icon);
    item.appendChild(name);
    if (selectedItems.has(file.name)) item.classList.add("selected");
    view.appendChild(item);
  });

  // After render, keep focused item visible
  if (focusedIndex >= 0) {
    const nodes = view.querySelectorAll(".item");
    nodes[focusedIndex]?.scrollIntoView({ block: "nearest" });
  }

  updateBreadcrumb();
}

function updateBreadcrumb() {
  const bc = document.getElementById("breadcrumb");
  if (!bc) return;
  bc.innerHTML = "";

  const upBtn = document.createElement("span");
  upBtn.textContent = "⬆️ Up";
  upBtn.style.cursor = "pointer";
  upBtn.style.marginRight = "8px";
  upBtn.addEventListener("click", () => {
    if (!currentPath) return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    loadFiles(parts.join("/"));
  });
  bc.appendChild(upBtn);

  const parts = currentPath.split("/").filter(Boolean);
  let accum = "";
  const home = document.createElement("span");
  home.textContent = "🏠";
  home.addEventListener("click", () => loadFiles(""));
  bc.appendChild(home);

  parts.forEach((part) => {
    accum += part + "/";
    const span = document.createElement("span");
    span.textContent = " › " + part;
    span.addEventListener("click", () => loadFiles(accum));
    bc.appendChild(span);
  });
}

function toggleSelect(name) {
  if (selectedItems.has(name)) selectedItems.delete(name);
  else selectedItems.add(name);
  render();
}

function clearSelection() {
  selectedItems.clear();
}

// Open folder or file (file opens in new tab)
function openEntry(file) {
  if (file.type === "folder") {
    loadFiles(file.path);
  } else if (file.url) {
    window.open(file.url, "_blank");
  }
}

// Helpers
function setActiveIndex(next) {
  if (!visibleFiles.length) return;
  const clamped = Math.max(0, Math.min(next, visibleFiles.length - 1));
  focusedIndex = clamped;
  selectedItems.clear();
  selectedItems.add(visibleFiles[focusedIndex].name);
  render();
}

// Detect number of columns in the current icon grid by measuring the first row
function getIconGridColumns() {
  if (viewMode !== "icon") return 1;
  const view = document.getElementById("file-view");
  if (!view) return 1;
  const items = view.querySelectorAll(".item.icon");
  if (!items.length) return 1;
  const firstTop = items[0].offsetTop;
  let cols = 0;
  for (let i = 0; i < items.length; i++) {
    if (items[i].offsetTop !== firstTop) break;
    cols++;
  }
  return Math.max(1, cols);
}

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  // Avoid interfering with typing/renaming
  const target = e.target;
  if (
    target &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable)
  ) {
    return;
  }

  // Navigation only when we have files visible
  if (!visibleFiles || visibleFiles.length === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (viewMode === "icon") {
      const cols = getIconGridColumns();
      setActiveIndex(focusedIndex === -1 ? 0 : focusedIndex + cols);
    } else {
      setActiveIndex(focusedIndex === -1 ? 0 : focusedIndex + 1);
    }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (viewMode === "icon") {
      const cols = getIconGridColumns();
      setActiveIndex(focusedIndex === -1 ? 0 : focusedIndex - cols);
    } else {
      setActiveIndex(focusedIndex === -1 ? 0 : focusedIndex - 1);
    }
  } else if (e.key === "ArrowRight" && viewMode === "icon") {
    e.preventDefault();
    setActiveIndex(focusedIndex === -1 ? 0 : focusedIndex + 1);
  } else if (e.key === "ArrowLeft" && viewMode === "icon") {
    e.preventDefault();
    setActiveIndex(focusedIndex === -1 ? 0 : focusedIndex - 1);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (focusedIndex >= 0) openEntry(visibleFiles[focusedIndex]);
  }
});

// F2 rename (existing)
document.addEventListener("keydown", (e) => {
  if (e.key === "F2" && selectedItems.size === 1) {
    renamingItem = [...selectedItems][0];
    render();
  }
});

document.getElementById("search")?.addEventListener("input", (e) => {
  searchTerm = e.target.value.toLowerCase();
  render();
});

document.getElementById("sort")?.addEventListener("change", (e) => {
  sortConfig.key = e.target.value;
  render();
});

document.getElementById("sort-order")?.addEventListener("click", (e) => {
  // toggle between 'asc' and 'desc'
  sortConfig.order = sortConfig.order === "asc" ? "desc" : "asc";
  e.target.textContent = sortConfig.order === "asc" ? "▲" : "▼";
  render();
});

document.getElementById("view-toggle")?.addEventListener("click", () => {
  viewMode = viewMode === "list" ? "icon" : "list";
  document.getElementById("file-view").className = viewMode;
  document.getElementById("view-toggle").textContent =
    viewMode === "list" ? "📃" : "🗂️";
  render();
});

loadFiles();
