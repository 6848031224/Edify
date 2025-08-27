let fileTree,
  currentPath = [];

// Icon map
const fileIcons = {
  folder: "icons/FOLDER.svg",
  crd: "icons/CRD.svg",
  ai: "icons/AI.svg",
  avi: "icons/AVI.svg",
  bmp: "icons/BMP.svg",
  csv: "icons/CSV.svg",
  dll: "icons/DLL.svg",
  doc: "icons/DOC.svg",
  docx: "icons/DOCX.svg",
  dwg: "icons/DWG.svg",
  eps: "icons/EPS.svg",
  exe: "icons/EXE.svg",
  flv: "icons/FLV.svg",
  giff: "icons/GIFF.svg",
  gif: "icons/GIFF.svg",
  html: "icons/HTML.svg",
  iso: "icons/ISO.svg",
  java: "icons/JAVA.svg",
  jpg: "icons/JPG.svg",
  jpeg: "icons/JPG.svg",
  mdb: "icons/MDB.svg",
  mid: "icons/MID.svg",
  mov: "icons/MOV.svg",
  mp3: "icons/MP3.svg",
  mp4: "icons/MP4.svg",
  mpeg: "icons/MPEG.svg",
  pdf: "icons/PDF.svg",
  png: "icons/PNG.svg",
  ppt: "icons/PPT.svg",
  ps: "icons/PS.svg",
  psd: "icons/PSD.svg",
  pub: "icons/PUB.svg",
  rar: "icons/RAR.svg",
  raw: "icons/RAW.svg",
  rss: "icons/RSS.svg",
  svg: "icons/SVG.svg",
  tiff: "icons/TIFF.svg",
  txt: "icons/TXT.svg",
  wav: "icons/WAV.svg",
  wma: "icons/WMA.svg",
  xml: "icons/XML.svg",
  xsl: "icons/XSL.svg",
  zip: "icons/ZIP.svg",
  default: "icons/file.svg",
};

async function loadFiles() {
  const res = await fetch("files.json");
  fileTree = await res.json();
  navigateTo([]);
}

function getNodeByPath(path) {
  let node = fileTree;
  for (const seg of path) {
    node = node.children.find((c) => c.name === seg && c.type === "folder");
  }
  return node;
}

function navigateTo(path) {
  currentPath = [...path];
  render();
}

function render() {
  const container = document.getElementById("file-view");
  const breadcrumb = document.getElementById("breadcrumb");
  if (!container || !breadcrumb) return;

  const node = getNodeByPath(currentPath) || fileTree;
  let children = node.children || [];

  // Search
  const searchEl = document.getElementById("search");
  const term = searchEl ? searchEl.value.toLowerCase() : "";
  if (term) {
    children = children.filter((f) => f.name.toLowerCase().includes(term));
  }

  // Sort
  const sortEl = document.getElementById("sort");
  const sortBy = sortEl ? sortEl.value : "name";
  children.sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "type") return a.type.localeCompare(b.type);
    if (sortBy === "size") return (a.size || 0) - (b.size || 0);
    if (sortBy === "date") return new Date(a.date || 0) - new Date(b.date || 0);
  });

  // Breadcrumb
  breadcrumb.innerHTML = currentPath.length
    ? `<span data-idx="-1">🏠</span> / ` +
      currentPath.map((p, i) => `<span data-idx="${i}">${p}</span>`).join(" / ")
    : "🏠";

  breadcrumb.querySelectorAll("span").forEach((span) => {
    span.onclick = () => {
      const idx = parseInt(span.dataset.idx);
      navigateTo(idx === -1 ? [] : currentPath.slice(0, idx + 1));
    };
  });

  // Files
  container.innerHTML = "";
  children.forEach((item) => {
    const ext =
      item.type === "folder"
        ? "folder"
        : item.name.split(".").pop().toLowerCase();
    const iconSrc = fileIcons[ext] || fileIcons.default;

    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `
      <div class="filename">
        <img src="${iconSrc}" alt="" class="file-icon">
        ${item.name}
        ${item.label ? `<span class="label" style="background:${item.labelColor || "#ccc"}">${item.label}</span>` : ""}
      </div>
      <div class="details">${item.type} ${item.size ? `• ${item.size} KB` : ""} ${item.date ? `• ${item.date}` : ""}</div>
    `;
    row.onclick = () => {
      if (item.type === "folder") navigateTo([...currentPath, item.name]);
      else openFile(item);
    };
    container.appendChild(row);
  });
}

function openFile(item) {
  const ext = item.name.split(".").pop().toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "svg"].includes(ext)) {
    showQuickLook(`<img src="${item.url}" style="max-width:100%;">`);
  } else if (["txt", "md"].includes(ext)) {
    fetch(item.url)
      .then((r) => r.text())
      .then((text) => {
        if (ext === "md" && typeof marked !== "undefined") {
          showQuickLook(`<div>${marked.parse(text)}</div>`);
        } else {
          showQuickLook(`<pre>${escapeHtml(text)}</pre>`);
        }
      });
  } else {
    window.open(item.url, "_blank");
  }
}

function showQuickLook(content) {
  const ql = document.getElementById("quicklook");
  const qlContent = ql?.querySelector(".ql-content");
  if (!ql || !qlContent) return;

  qlContent.innerHTML = content;
  ql.classList.remove("hidden");
  ql.onclick = () => ql.classList.add("hidden");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerHTML;
}

// Events
const searchEl = document.getElementById("search");
if (searchEl) searchEl.addEventListener("input", render);

const sortEl = document.getElementById("sort");
if (sortEl) sortEl.addEventListener("change", render);

loadFiles();
