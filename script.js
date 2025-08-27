let fileTree,
  currentPath = [],
  historyStack = [],
  historyIndex = -1;
let filteredFiles = [];

async function loadFiles() {
  const res = await fetch("files.json");
  fileTree = await res.json();
  navigateTo([], true);
}

function getNodeByPath(pathArr) {
  let node = fileTree;
  for (const segment of pathArr) {
    node = node.children.find((c) => c.name === segment && c.type === "folder");
  }
  return node;
}

function navigateTo(pathArr, addToHistory = false) {
  currentPath = [...pathArr];
  if (addToHistory) {
    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push(currentPath);
    historyIndex++;
  }
  render();
}

function render() {
  const container = document.getElementById("file-view");
  const breadcrumb = document.getElementById("breadcrumb");

  const node = getNodeByPath(currentPath) || fileTree;
  let children = node.children || [];

  // Search filter
  const searchTerm = document.getElementById("search").value.toLowerCase();
  if (searchTerm) {
    children = children.filter((item) =>
      item.name.toLowerCase().includes(searchTerm),
    );
  }

  // Sorting
  const sortBy = document.getElementById("sort").value;
  children.sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "type") return a.type.localeCompare(b.type);
    if (sortBy === "size") return (a.size || 0) - (b.size || 0);
    if (sortBy === "date") return new Date(a.date || 0) - new Date(b.date || 0);
  });

  // Breadcrumb
  breadcrumb.innerHTML = currentPath.length
    ? `<span class="crumb" data-idx="-1">🏠</span> / ` +
      currentPath
        .map((p, i) => `<span class="crumb" data-idx="${i}">${p}</span>`)
        .join(" / ")
    : "🏠";

  breadcrumb.querySelectorAll(".crumb").forEach((span) => {
    span.addEventListener("click", () => {
      const idx = parseInt(span.dataset.idx);
      navigateTo(idx === -1 ? [] : currentPath.slice(0, idx + 1), true);
    });
  });

  // Files
  container.innerHTML = "";
  children.forEach((item) => {
    const div = document.createElement("div");
    div.className = "item";
    const icon = getIconForType(item);
    div.innerHTML = `
      <img src="${icon}" alt="">
      <div class="filename">${item.name}</div>
      ${item.label ? `<div class="label" style="background:${item.labelColor || "#ccc"}">${item.label}</div>` : ""}
    `;
    div.addEventListener("click", () => {
      if (item.type === "folder") navigateTo([...currentPath, item.name], true);
      else openFile(item);
    });
    container.appendChild(div);
  });
}

function getIconForType(item) {
  if (item.type === "folder") return "folder-icon.png";
  const ext = item.name.split(".").pop().toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "svg"].includes(ext))
    return "icon-image.png";
  if (["pdf"].includes(ext)) return "icon-pdf.png";
  if (["txt"].includes(ext)) return "icon-text.png";
  if (["md"].includes(ext)) return "icon-md.png";
  return "file-icon.png";
}

function openFile(item) {
  const ext = item.name.split(".").pop().toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "svg"].includes(ext)) {
    showQuickLook(`<img src="${item.url}" style="max-width:100%;">`);
  } else if (["txt", "md"].includes(ext)) {
    fetch(item.url)
      .then((r) => r.text())
      .then((text) => {
        if (ext === "md") {
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
  ql.querySelector(".ql-content").innerHTML = content;
  ql.classList.remove("hidden");
  ql.onclick = () => ql.classList.add("hidden");
}

function escapeHtml(text) {
  var div = document.createElement("div");
  div.innerText = text;
  return div.innerHTML;
}

// Event
