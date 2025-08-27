let fileTree;
let currentPath = [];

async function loadFiles() {
  const res = await fetch("files.json");
  fileTree = await res.json();
  render();
}

function getNodeByPath(pathArr) {
  let node = fileTree;
  for (const segment of pathArr) {
    node = node.children.find((c) => c.name === segment && c.type === "folder");
  }
  return node;
}

function render() {
  const container = document.getElementById("file-view");
  const breadcrumb = document.getElementById("breadcrumb");

  container.innerHTML = "";
  breadcrumb.innerHTML = currentPath.length
    ? `<span class="crumb" data-idx="-1">🏠</span> / ` +
      currentPath
        .map((p, i) => `<span class="crumb" data-idx="${i}">${p}</span>`)
        .join(" / ")
    : "🏠";

  const node = getNodeByPath(currentPath) || fileTree;
  if (!node.children) return;

  node.children.forEach((item) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <img src="${item.type === "folder" ? "folder-icon.png" : "file-icon.png"}" alt="">
      <div class="filename">${item.name}</div>
    `;
    div.addEventListener("click", () => {
      if (item.type === "folder") {
        currentPath.push(item.name);
        render();
      } else {
        window.open(item.url, "_blank");
      }
    });
    container.appendChild(div);
  });

  breadcrumb.querySelectorAll(".crumb").forEach((span) => {
    span.addEventListener("click", () => {
      const idx = parseInt(span.dataset.idx);
      if (idx === -1) {
        currentPath = [];
      } else {
        currentPath = currentPath.slice(0, idx + 1);
      }
      render();
    });
  });
}

loadFiles();
