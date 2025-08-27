// -----------------------
// Finder Pro - script.js
// -----------------------

let files = [];
let currentPath = "";
let viewMode = "list";
let sortMode = "name";
let searchTerm = "";
let selectedItems = new Set();
let renamingItem = null;

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

    render();
  } catch (err) {
    console.error("Error loading files:", err);
    files = [];
    render();
  }
}

function sortFiles(a, b) {
  if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
  if (sortMode === "name") return (a.name || "").localeCompare(b.name || "");
  if (sortMode === "type") return (a.type || "").localeCompare(b.type || "");
  if (sortMode === "size") return (a.size || 0) - (b.size || 0);
  if (sortMode === "date") return new Date(b.modified) - new Date(a.modified);
  return 0;
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

  filtered.forEach((file) => {
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

    item.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey) {
        toggleSelect(file.name);
      } else {
        clearSelection();
        toggleSelect(file.name);
      }
    });

    item.addEventListener("dblclick", () => {
      if (file.type === "folder") {
        loadFiles(file.path);
      } else {
        quickLook(file);
      }
    });

    item.appendChild(icon);
    item.appendChild(name);
    if (selectedItems.has(file.name)) item.classList.add("selected");
    view.appendChild(item);
  });

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

function quickLook(file) {
  const ql = document.getElementById("quicklook");
  const qlContent = ql.querySelector(".ql-content");
  qlContent.innerHTML = "";

  if (file.url) {
    if (file.url.match(/\.(jpg|jpeg|png|gif)$/i)) {
      const img = document.createElement("img");
      img.src = file.url;
      img.style.maxWidth = "100%";
      qlContent.appendChild(img);
    } else if (file.url.match(/\.pdf$/i)) {
      const iframe = document.createElement("iframe");
      iframe.src = file.url;
      iframe.style.width = "80vw";
      iframe.style.height = "80vh";
      qlContent.appendChild(iframe);
    } else {
      const link = document.createElement("a");
      link.href = file.url;
      link.textContent = "Open file";
      link.target = "_blank";
      qlContent.appendChild(link);
    }
  } else {
    qlContent.textContent = file.name;
  }

  ql.classList.remove("hidden");

  ql.addEventListener("click", (e) => {
    if (e.target === ql) ql.classList.add("hidden");
  });
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") ql.classList.add("hidden");
    },
    { once: true },
  );
}

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
  sortMode = e.target.value;
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
