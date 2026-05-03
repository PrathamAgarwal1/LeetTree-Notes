// LeetTree Notes — Topic Tree Module

export class TopicTree {
  constructor(containerId, storage, callbacks) {
    this.container = document.getElementById(containerId);
    this.storage = storage;
    this.callbacks = callbacks; // { onSelectFolder }
    this.folders = {};
    this.selectedId = 'all'; // 'all', 'starred', 'revision', or folderId
    this.draggedFolderId = null;
  }

  async render() {
    this.folders = await this.storage.getFolders();
    this.container.innerHTML = '';
    
    // Add "All Problems" root-level item
    const allRow = this.createTreeRow('all', 'All Problems', `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`);
    this.container.appendChild(allRow);

    // Render tree recursively starting from root
    if (this.folders.root) {
      const rootEl = this.renderNode('root', 0);
      this.container.appendChild(rootEl);
    }
    
    this.setupDragAndDrop();
  }

  renderNode(folderId, depth) {
    const folder = this.folders[folderId];
    if (!folder) return null;

    const el = document.createElement('div');
    el.className = 'tree-item';
    el.dataset.id = folderId;

    // Folder icon
    const icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
    
    const row = this.createTreeRow(folderId, folder.name, icon, depth, folder.children.length > 0, folder.expanded);
    el.appendChild(row);

    if (folder.children && folder.children.length > 0) {
      const childrenContainer = document.createElement('div');
      childrenContainer.className = `tree-children ${folder.expanded ? 'expanded' : ''}`;
      
      // Sort children by order, then name
      const sortedChildren = [...folder.children].sort((a, b) => {
        const orderA = this.folders[a]?.order || 0;
        const orderB = this.folders[b]?.order || 0;
        if (orderA !== orderB) return orderA - orderB;
        return (this.folders[a]?.name || '').localeCompare(this.folders[b]?.name || '');
      });

      sortedChildren.forEach(childId => {
        const childEl = this.renderNode(childId, depth + 1);
        if (childEl) childrenContainer.appendChild(childEl);
      });
      el.appendChild(childrenContainer);
    }

    return el;
  }

  createTreeRow(id, name, iconHtml, depth = 0, hasChildren = false, expanded = false) {
    const row = document.createElement('div');
    row.className = `tree-row ${this.selectedId === id ? 'selected' : ''}`;
    row.dataset.id = id;
    row.draggable = id !== 'root' && id !== 'all';
    row.style.paddingLeft = `${depth * 16 + 10}px`;

    let html = '';
    
    // Toggle chevron
    if (hasChildren) {
      html += `<div class="tree-toggle ${expanded ? 'expanded' : ''}" data-action="toggle">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </div>`;
    } else {
      html += `<div class="tree-indent"></div>`;
    }

    html += `<div class="tree-icon">${iconHtml}</div>`;
    html += `<div class="tree-label">${name}</div>`;

    // Actions (Add subfolder, rename, delete)
    if (id !== 'all') {
      html += `<div class="tree-actions">`;
      html += `<button class="tree-btn" data-action="add" title="Add Subfolder"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>`;
      
      if (id !== 'root') {
        html += `<button class="tree-btn" data-action="rename" title="Rename"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>`;
        html += `<button class="tree-btn" data-action="delete" title="Delete"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>`;
      }
      html += `</div>`;
    }

    row.innerHTML = html;

    // Event listeners
    row.addEventListener('click', async (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      
      if (action === 'toggle') {
        e.stopPropagation();
        await this.storage.toggleFolderExpand(id);
        this.render();
      } else if (action === 'add') {
        e.stopPropagation();
        const name = prompt('Subfolder name:');
        if (name && name.trim()) {
          // Auto expand parent
          if (!this.folders[id].expanded) await this.storage.toggleFolderExpand(id);
          await this.storage.createFolder(name.trim(), id);
          this.render();
        }
      } else if (action === 'rename') {
        e.stopPropagation();
        const name = prompt('New name:', this.folders[id].name);
        if (name && name.trim()) {
          await this.storage.renameFolder(id, name.trim());
          this.render();
        }
      } else if (action === 'delete') {
        e.stopPropagation();
        if (confirm(`Delete folder "${this.folders[id].name}" and all subfolders? Problems will be moved to root.`)) {
          await this.storage.deleteFolder(id);
          if (this.selectedId === id) this.selectFolder('all');
          else this.render();
        }
      } else {
        this.selectFolder(id);
      }
    });

    return row;
  }

  selectFolder(id) {
    this.selectedId = id;
    
    // Update UI
    document.querySelectorAll('.tree-row').forEach(row => {
      row.classList.toggle('selected', row.dataset.id === id);
    });
    
    // Clear filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.remove('active'));
    if (id === 'all') {
      document.querySelector('.filter-chip[data-filter="all"]')?.classList.add('active');
    }

    if (this.callbacks.onSelectFolder) {
      this.callbacks.onSelectFolder(id);
    }
  }

  setupDragAndDrop() {
    let dragType = null; // 'folder' or 'problem'

    this.container.addEventListener('dragstart', (e) => {
      const row = e.target.closest('.tree-row');
      if (row && row.dataset.id && row.dataset.id !== 'root' && row.dataset.id !== 'all') {
        this.draggedFolderId = row.dataset.id;
        dragType = 'folder';
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'folder', id: this.draggedFolderId }));
        e.dataTransfer.effectAllowed = 'move';
        // Delay hiding the element
        setTimeout(() => row.style.opacity = '0.5', 0);
      }
    });

    this.container.addEventListener('dragend', (e) => {
      const row = e.target.closest('.tree-row');
      if (row) row.style.opacity = '1';
      this.draggedFolderId = null;
      document.querySelectorAll('.tree-row').forEach(el => el.classList.remove('drag-over'));
    });

    this.container.addEventListener('dragover', (e) => {
      e.preventDefault();
      const row = e.target.closest('.tree-row');
      if (!row) return;
      
      const targetId = row.dataset.id;
      if (targetId === 'all') return;
      
      // If dragging a folder, prevent dropping into itself or children
      if (this.draggedFolderId) {
        if (targetId === this.draggedFolderId) return;
        let check = targetId;
        while (check) {
          if (check === this.draggedFolderId) return;
          check = this.folders[check]?.parentId;
        }
      }

      e.dataTransfer.dropEffect = 'move';
      row.classList.add('drag-over');
    });

    this.container.addEventListener('dragleave', (e) => {
      const row = e.target.closest('.tree-row');
      if (row) row.classList.remove('drag-over');
    });

    this.container.addEventListener('drop', async (e) => {
      e.preventDefault();
      const row = e.target.closest('.tree-row');
      if (row) row.classList.remove('drag-over');
      
      if (!row || row.dataset.id === 'all') return;
      const targetId = row.dataset.id;

      try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        
        if (data.type === 'folder' && data.id) {
          if (data.id === targetId) return;
          await this.storage.moveFolder(data.id, targetId);
          this.render();
        } else if (data.type === 'problem' && data.id) {
          await this.storage.moveProblem(data.id, targetId);
          if (this.callbacks.onProblemMoved) {
            this.callbacks.onProblemMoved(data.id, targetId);
          }
        }
      } catch (err) {
        // Drop didn't contain our JSON structure
      }
    });
  }
}
