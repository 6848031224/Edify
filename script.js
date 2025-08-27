let fileTree, currentPath = [], sortBy = 'name', sortAsc = true, selectedIdx = -1;

async function loadFiles() {
  const res = await fetch('files.json');
  fileTree = await res.json();
  navigateTo([]);
}

function getNodeByPath(path) {
  let node = fileTree;
  for (const seg of path) {
    node = node.children.find(c => c.name === seg && c.type === 'folder');
  }
  return node;
}

function navigateTo(path) {
  currentPath = [...path];
  render();
}

function render() {
  const breadcrumb = document.getElementById('breadcrumb');
  breadcrumb.style.opacity = 0; // fade effect
  setTimeout(() => {
    breadcrumb.innerHTML = currentPath.length
      ? `<span data-idx="-1">🏠</span> / ` + currentPath.map((p,i)=>`<span data-idx="${i}">${p}</span>`).join(' / ')
      : '🏠';
    breadcrumb.querySelectorAll('span').forEach(span => {
      span.onclick = () => {
        const idx = parseInt(span.dataset.idx);
        navigateTo(idx === -1 ? [] : currentPath.slice(0, idx+1));
      };
    });
    breadcrumb.style.opacity = 1;
  }, 150);

  const node = getNodeByPath(currentPath) || fileTree;
  let children = node.children || [];

  // search
  const term = document.getElementById('search').value.toLowerCase();
  if (term) children = children.filter(f => f.name.toLowerCase().includes(term));

  // sort
  children.sort((a,b)=>{
    let res = 0;
    if (sortBy === 'name') res = a.name.localeCompare(b.name);
    if (sortBy === 'type') res = a.type.localeCompare(b.type);
    if (sortBy === 'size') res = (a.size||0) - (b.size||0);
    if (sortBy === 'date') res = new Date(a.date||0) - new Date(b.date||0);
    return sortAsc ? res : -res;
  });

  // render table
  const tbody = document.querySelector('#file-table tbody');
  tbody.innerHTML = '';
  children.forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.tabIndex = 0;
    tr.innerHTML = `
      <td title="${item.url || ''}">${item.name}${item.label ? ` <span style="background:${item.labelColor||'#ccc'};padding:2px 6px;border-radius:4px;font-size:11px;">${item.label}</span>` : ''}</td>
      <td>${item.type}</td>
      <td>${item.size || ''}</td>
      <td>${item.date || ''}</td>
    `;
    tr.onclick = (e) => {
      if (e.ctrlKey || e.metaKey) {
        tr.classList.toggle('selected');
      } else {
        openItem(item);
      }
    };
    tr.onmouseover = () => selectedIdx = idx;
    tbody.appendChild(tr);
  });
}

function openItem(item) {
  if (item.type === 'folder') navigateTo([...currentPath, item.name]);
  else openFile(item);
}

function openFile(item) {
  const ext = item.name.split('.').pop().toLowerCase();
  if (['png','jpg','jpeg','gif','svg'].includes(ext)) {
    showQuickLook(`<img src="${item.url}" style="max-width:100%;">`);
  } else if (['txt','md'].includes(ext)) {
    fetch(item.url).then(r => r.text()).then(text => {
      if (ext === 'md') showQuickLook(`<div>${marked.parse(text)}</div>`);
      else showQuickLook(`<pre>${escapeHtml(text)}</pre>`);
    });
  } else {
    window.open(item.url, '_blank');
  }
}

function showQuickLook(content) {
  const ql = document.getElementById('quicklook');
  ql.querySelector('.ql-content').innerHTML = content;
  ql.classList.remove('hidden');
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerHTML;
}

// Keyboard nav
document.addEventListener('keydown', e => {
  const rows = document.querySelectorAll('#file-table tbody tr');
  if (!rows.length) return;
  if (e.key === 'ArrowDown') {
    selectedIdx = Math.min(rows.length-1, selectedIdx+1);
    rows[selectedIdx].focus();
  }
  if (e.key === 'ArrowUp') {
    selectedIdx = Math.max(0, selectedIdx-1);
    rows[selectedIdx].focus();
  }
  if (e.key === 'Enter' && selectedIdx >= 0) {
    rows[selectedIdx].click();
  }
  if (e.key === 'Escape') {
    document.getElementById('quicklook').classList.add('hidden');
  }
});

// Sorting via headers
document.querySelectorAll('#file-table th').forEach(th => {
  th.onclick = () => {
    const key = th.dataset.sort;
    if (sortBy === key) sortAsc = !sortAsc;
    else sortBy = key, sortAsc = true;
    render();
  };
});

// Up button
document.getElementById('up-btn').onclick = () => {
  if (currentPath.length) navigateTo(currentPath.slice(0, -1));
};

// Multi-open
document.getElementById('open-selected').onclick = () => {
  document.querySelectorAll('.selected').forEach(row => {
    const name = row
