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
  const node = getNodeByPath(currentPath) || fileTree;
  let children = node.children || [];

  // Search
  const term = document.getElementById("search").value.toLowerCase();
  if (term)
    children = children.filter((f) => f.name.toLowerCase().includes(term));

  // Sort
  const sortBy = document.getElementById("sort").value;
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

// Events
document.getElementById("search").addEventListener("input", render);
document.getElementById("sort").addEventListener("change", render);

loadFiles();
