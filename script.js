let fileTree,
  currentPath = [];

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
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `
      <div class="filename">${item.name}
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

// Events (safe attachment)
const searchEl = document.getElementById("search");
if (searchEl) searchEl.addEventListener("input", render);

const sortEl = document.getElementById("sort");
if (sortEl) sortEl.addEventListener("change", render);

loadFiles();
