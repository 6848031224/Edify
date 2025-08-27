async function loadFiles(path = "") {
  const res = await fetch("files.json");
  const data = await res.json();

  const files = path ? data.filter((f) => f.path.startsWith(path)) : data;
  renderBreadcrumb(path);
  renderFiles(files);
}

function renderBreadcrumb(path) {
  const breadcrumb = document.querySelector(".breadcrumb");
  const parts = path.split("/").filter(Boolean);
  breadcrumb.innerHTML = '<a href="#" data-path="">Home</a>';
  let currPath = "";
  parts.forEach((part, i) => {
    currPath += (currPath ? "/" : "") + part;
    breadcrumb.innerHTML += ` / <a href="#" data-path="${currPath}">${part}</a>`;
  });
}

function renderFiles(files) {
  const list = document.getElementById("file-list");
  list.innerHTML = "";
  const searchVal = document.getElementById("search").value.toLowerCase();
  const sortVal = document.getElementById("sort").value;

  files
    .filter((f) => f.name.toLowerCase().includes(searchVal))
    .sort((a, b) => {
      if (sortVal === "name") return a.name.localeCompare(b.name);
      if (sortVal === "type") return a.type.localeCompare(b.type);
      if (sortVal === "size") return a.size - b.size;
      if (sortVal === "date") return new Date(a.date) - new Date(b.date);
    })
    .forEach((f) => {
      const li = document.createElement("li");
      li.textContent = `${f.name} [${f.type}]`;
      li.addEventListener("click", () => handleFileClick(f));
      list.appendChild(li);
    });
}

function handleFileClick(file) {
  if (["jpg", "png"].includes(file.type)) {
    openModal(`<img src="${file.url}" style="max-width:100%;">`);
  } else if (["txt", "md"].includes(file.type)) {
    fetch(file.url)
      .then((r) => r.text())
      .then((text) => openModal(`<pre>${text}</pre>`));
  }
}

function openModal(content) {
  document.getElementById("preview").innerHTML = content;
  document.getElementById("modal").classList.remove("hidden");
}

document.getElementById("close").addEventListener("click", () => {
  document.getElementById("modal").classList.add("hidden");
});

document.getElementById("search").addEventListener("input", () => loadFiles());
document.getElementById("sort").addEventListener("change", () => loadFiles());

document.querySelector(".breadcrumb").addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    e.preventDefault();
    loadFiles(e.target.dataset.path);
  }
});

loadFiles();
